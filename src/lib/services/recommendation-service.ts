/**
 * Recommendation Service
 *
 * Story 7.4: Generate Investment Recommendations
 * AC-7.4.1: Priority Ranking by Allocation Gap × Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.4: Minimum Allocation Values Enforced
 * AC-7.4.5: Event Sourcing for Audit Trail
 *
 * Orchestrates recommendation generation by:
 * 1. Gathering portfolio state and scores
 * 2. Calling recommendation engine for capital distribution
 * 3. Persisting results to database
 * 4. Caching in Vercel KV
 * 5. Emitting audit events
 */

import { db, type Database } from "@/lib/db";
import {
  recommendations,
  recommendationItems,
  portfolioAssets,
  assetClasses,
  assetSubclasses,
  assetScores,
  type NewRecommendation,
  type NewRecommendationItem,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { Decimal } from "@/lib/calculations/decimal-config";
import { parseDecimal, add } from "@/lib/calculations/decimal-utils";
import { generateRecommendationItems } from "@/lib/calculations/recommendations";
import { getPortfolioWithValues, type AssetWithValue } from "./portfolio-service";
import { getAllocationBreakdown } from "./allocation-service";
import { EventStore, eventStore } from "@/lib/events/event-store";
import type {
  CalcStartedEvent,
  CalcCompletedEvent,
  RecsInputsCapturedEvent,
  RecsComputedEvent,
} from "@/lib/events/types";
import type {
  GenerateRecommendationsInput,
  GenerateRecommendationsResult,
  AssetWithContext,
  RecommendationItemResult,
} from "@/lib/types/recommendations";
import { cacheSet, cacheGet, cacheDel } from "@/lib/cache/client";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cache key prefix for recommendations */
const CACHE_KEY_PREFIX = "recs";

/** TTL for cached recommendations (24 hours) */
const CACHE_TTL_SECONDS = 86400;

/** Recommendation expiry (24 hours from generation) */
const RECOMMENDATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Service for generating and managing investment recommendations
 */
export class RecommendationService {
  constructor(
    private database: Database = db,
    private events: EventStore = eventStore
  ) {}

  /**
   * Generate investment recommendations for a user's portfolio
   *
   * AC-7.4.1-7.4.5: Full recommendation generation with audit trail
   *
   * @param userId - User ID
   * @param input - Generation input (portfolioId, contribution, dividends)
   * @returns Complete recommendation result
   */
  async generateRecommendations(
    userId: string,
    input: GenerateRecommendationsInput
  ): Promise<GenerateRecommendationsResult> {
    const startTime = Date.now();
    const correlationId = randomUUID();
    const { portfolioId, contribution, dividends, baseCurrency } = input;

    // Calculate total investable
    const contributionDecimal = parseDecimal(contribution);
    const dividendsDecimal = parseDecimal(dividends);
    const totalInvestable = add(contributionDecimal, dividendsDecimal).toFixed(4);

    try {
      // 1. Emit CALC_STARTED event
      await this.emitCalcStarted(userId, correlationId);

      // 2. Gather portfolio state and context
      const { assets, assetsWithContext, portfolioState, allocationTargets, scoresSnapshot } =
        await this.gatherInputs(userId, portfolioId, baseCurrency);

      // 3. Emit RECS_INPUTS_CAPTURED event
      await this.emitInputsCaptured(
        userId,
        correlationId,
        portfolioState,
        allocationTargets,
        scoresSnapshot,
        totalInvestable,
        contribution,
        dividends
      );

      // 4. Generate recommendations using engine
      const recommendationItems = generateRecommendationItems(assetsWithContext, totalInvestable);

      // 5. Calculate total allocated
      let totalAllocated = new Decimal(0);
      for (const item of recommendationItems) {
        totalAllocated = add(totalAllocated, parseDecimal(item.recommendedAmount));
      }

      // 6. Persist to database
      const recommendation = await this.persistRecommendation(
        userId,
        portfolioId,
        contribution,
        dividends,
        totalInvestable,
        baseCurrency,
        correlationId,
        recommendationItems
      );

      // 7. Emit RECS_COMPUTED event
      await this.emitRecsComputed(
        userId,
        correlationId,
        recommendation.id,
        totalInvestable,
        totalAllocated.toFixed(4),
        recommendationItems
      );

      // 8. Cache in Vercel KV
      await this.cacheRecommendation(userId, recommendation.id);

      // 9. Calculate duration and emit CALC_COMPLETED
      const durationMs = Date.now() - startTime;
      await this.emitCalcCompleted(userId, correlationId, durationMs, assets.length, "success");

      // 10. Build and return result
      return {
        id: recommendation.id,
        userId,
        portfolioId,
        contribution,
        dividends,
        totalInvestable,
        baseCurrency,
        correlationId,
        status: "active",
        generatedAt: recommendation.generatedAt,
        expiresAt: recommendation.expiresAt,
        items: recommendationItems,
        durationMs,
      };
    } catch (error) {
      // Emit failure event
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.emitCalcCompleted(userId, correlationId, durationMs, 0, "failed", errorMessage);

      logger.error("Recommendation generation failed", {
        userId,
        portfolioId,
        correlationId,
        errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get cached recommendation for a user
   */
  async getCachedRecommendation(userId: string): Promise<GenerateRecommendationsResult | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}:${userId}`;
    const cached = await cacheGet<{ recommendationId: string }>(cacheKey);

    if (!cached) {
      return null;
    }

    // Fetch from database
    return this.getRecommendationById(userId, cached.data.recommendationId);
  }

  /**
   * Get recommendation by ID
   */
  async getRecommendationById(
    userId: string,
    recommendationId: string
  ): Promise<GenerateRecommendationsResult | null> {
    const rec = await this.database.query.recommendations.findFirst({
      where: and(eq(recommendations.id, recommendationId), eq(recommendations.userId, userId)),
      with: {
        items: true,
      },
    });

    if (!rec) {
      return null;
    }

    // Map to result format
    const items: RecommendationItemResult[] = rec.items.map((item) => ({
      assetId: item.assetId,
      symbol: item.symbol,
      score: item.score,
      currentAllocation: item.currentAllocation,
      targetAllocation: item.targetAllocation,
      allocationGap: item.allocationGap,
      recommendedAmount: item.recommendedAmount,
      isOverAllocated: item.isOverAllocated,
      breakdown: item.breakdown,
      sortOrder: item.sortOrder,
    }));

    return {
      id: rec.id,
      userId: rec.userId,
      portfolioId: rec.portfolioId,
      contribution: rec.contribution,
      dividends: rec.dividends,
      totalInvestable: rec.totalInvestable,
      baseCurrency: rec.baseCurrency,
      correlationId: rec.correlationId,
      status: rec.status as GenerateRecommendationsResult["status"],
      generatedAt: rec.generatedAt,
      expiresAt: rec.expiresAt,
      items,
      durationMs: 0, // Not stored, only relevant at generation time
    };
  }

  /**
   * Invalidate cached recommendation for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}:${userId}`;
    await cacheDel(cacheKey);
  }

  // ===========================================================================
  // PRIVATE METHODS - INPUT GATHERING
  // ===========================================================================

  /**
   * Gather all inputs needed for recommendation calculation
   */
  private async gatherInputs(
    userId: string,
    portfolioId: string,
    baseCurrency: string
  ): Promise<{
    assets: AssetWithValue[];
    assetsWithContext: AssetWithContext[];
    portfolioState: RecsInputsCapturedEvent["portfolioState"];
    allocationTargets: RecsInputsCapturedEvent["allocationTargets"];
    scoresSnapshot: RecsInputsCapturedEvent["scores"];
  }> {
    // Get portfolio with values
    const portfolioData = await getPortfolioWithValues(userId, portfolioId);
    const { assets, totalActiveValueBase } = portfolioData;

    // Get allocation breakdown (we'll use for context but not for asset-level class info)
    const _allocationBreakdown = await getAllocationBreakdown(userId, portfolioId);

    // Get portfolio assets from DB to get assetClassId and subclassId
    const assetIds = assets.map((a) => a.id);
    const dbAssets =
      assetIds.length > 0
        ? await this.database
            .select({
              id: portfolioAssets.id,
              assetClassId: portfolioAssets.assetClassId,
              subclassId: portfolioAssets.subclassId,
            })
            .from(portfolioAssets)
            .where(inArray(portfolioAssets.id, assetIds))
        : [];

    // Create a map of asset ID to class/subclass info
    const assetClassMap = new Map(
      dbAssets.map((a) => [a.id, { classId: a.assetClassId, subclassId: a.subclassId }])
    );

    // Get asset scores
    const scoresMap = await this.getAssetScores(
      userId,
      assets.map((a) => a.id)
    );

    // Get asset class configurations
    const classConfigs = await this.getAssetClassConfigs(userId);
    const subclassConfigs = await this.getSubclassConfigs(classConfigs.map((c) => c.id));

    // Build assets with context
    const assetsWithContext: AssetWithContext[] = [];

    for (const asset of assets) {
      if (asset.isIgnored) continue; // Skip ignored assets

      const classInfo = assetClassMap.get(asset.id);
      const assetClassId = classInfo?.classId ?? null;
      const assetSubclassId = classInfo?.subclassId ?? null;

      const classConfig = assetClassId ? classConfigs.find((c) => c.id === assetClassId) : null;
      const subclassConfig = assetSubclassId
        ? subclassConfigs.find((s) => s.id === assetSubclassId)
        : null;

      // Calculate current allocation
      const currentValue = parseDecimal(asset.valueBase);
      const totalValue = parseDecimal(totalActiveValueBase);
      const currentAllocation = totalValue.isZero()
        ? new Decimal(0)
        : currentValue.dividedBy(totalValue).times(100);

      // Calculate target allocation (use class midpoint or subclass midpoint)
      let targetMin = new Decimal(0);
      let targetMax = new Decimal(100);
      let minAllocationValue: string | null = null;

      if (subclassConfig?.targetMin && subclassConfig?.targetMax) {
        targetMin = parseDecimal(subclassConfig.targetMin);
        targetMax = parseDecimal(subclassConfig.targetMax);
        minAllocationValue = subclassConfig.minAllocationValue;
      } else if (classConfig?.targetMin && classConfig?.targetMax) {
        targetMin = parseDecimal(classConfig.targetMin);
        targetMax = parseDecimal(classConfig.targetMax);
        minAllocationValue = classConfig.minAllocationValue;
      }

      const targetMidpoint = targetMin.plus(targetMax).dividedBy(2);
      const allocationGap = targetMidpoint.minus(currentAllocation);

      // Determine if over-allocated
      const isOverAllocated = currentAllocation.greaterThan(targetMax);

      // Get score
      const scoreData = scoresMap.get(asset.id);
      const score = scoreData?.score ?? "50.0000"; // Default to 50 if no score

      assetsWithContext.push({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        classId: assetClassId,
        className: classConfig?.name ?? null,
        subclassId: assetSubclassId,
        subclassName: subclassConfig?.name ?? null,
        currentAllocation: currentAllocation.toFixed(4),
        targetAllocation: targetMidpoint.toFixed(4),
        allocationGap: allocationGap.toFixed(4),
        score,
        currentValue: asset.valueBase,
        minAllocationValue,
        isOverAllocated,
      });
    }

    // Build snapshots for event
    const portfolioState: RecsInputsCapturedEvent["portfolioState"] = {
      portfolioId,
      totalValue: totalActiveValueBase,
      baseCurrency,
      assets: assets
        .filter((a) => !a.isIgnored)
        .map((a) => ({
          assetId: a.id,
          symbol: a.symbol,
          currentValue: a.valueBase,
          currentAllocation:
            assetsWithContext.find((ac) => ac.id === a.id)?.currentAllocation ?? "0",
        })),
    };

    const allocationTargets: RecsInputsCapturedEvent["allocationTargets"] = {
      classes: classConfigs.map((c) => ({
        classId: c.id,
        className: c.name,
        targetMin: c.targetMin,
        targetMax: c.targetMax,
        minAllocationValue: c.minAllocationValue,
      })),
      subclasses: subclassConfigs.map((s) => ({
        subclassId: s.id,
        subclassName: s.name,
        classId: s.classId,
        targetMin: s.targetMin,
        targetMax: s.targetMax,
        minAllocationValue: s.minAllocationValue,
      })),
    };

    const scoresSnapshot: RecsInputsCapturedEvent["scores"] = Array.from(scoresMap.entries()).map(
      ([assetId, data]) => ({
        assetId,
        symbol: data.symbol,
        score: data.score,
        criteriaVersionId: data.criteriaVersionId,
      })
    );

    return {
      assets,
      assetsWithContext,
      portfolioState,
      allocationTargets,
      scoresSnapshot,
    };
  }

  /**
   * Get asset scores for given asset IDs
   */
  private async getAssetScores(
    userId: string,
    assetIds: string[]
  ): Promise<Map<string, { score: string; symbol: string; criteriaVersionId: string }>> {
    if (assetIds.length === 0) {
      return new Map();
    }

    const scores = await this.database
      .select()
      .from(assetScores)
      .where(eq(assetScores.userId, userId))
      .orderBy(desc(assetScores.calculatedAt));

    // Get latest score per asset
    const latestScores = new Map<string, (typeof scores)[0]>();
    for (const score of scores) {
      if (!latestScores.has(score.assetId)) {
        latestScores.set(score.assetId, score);
      }
    }

    const result = new Map<string, { score: string; symbol: string; criteriaVersionId: string }>();
    for (const [assetId, scoreData] of latestScores) {
      if (assetIds.includes(assetId)) {
        result.set(assetId, {
          score: scoreData.score,
          symbol: scoreData.symbol,
          criteriaVersionId: scoreData.criteriaVersionId,
        });
      }
    }

    return result;
  }

  /**
   * Get asset class configurations for user
   */
  private async getAssetClassConfigs(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      targetMin: string | null;
      targetMax: string | null;
      minAllocationValue: string | null;
    }>
  > {
    const classes = await this.database
      .select()
      .from(assetClasses)
      .where(eq(assetClasses.userId, userId));

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      targetMin: c.targetMin,
      targetMax: c.targetMax,
      minAllocationValue: c.minAllocationValue,
    }));
  }

  /**
   * Get subclass configurations for given class IDs
   */
  private async getSubclassConfigs(classIds: string[]): Promise<
    Array<{
      id: string;
      name: string;
      classId: string;
      targetMin: string | null;
      targetMax: string | null;
      minAllocationValue: string | null;
    }>
  > {
    if (classIds.length === 0) {
      return [];
    }

    const subclasses = await this.database.select().from(assetSubclasses);

    return subclasses
      .filter((s) => classIds.includes(s.classId))
      .map((s) => ({
        id: s.id,
        name: s.name,
        classId: s.classId,
        targetMin: s.targetMin,
        targetMax: s.targetMax,
        minAllocationValue: s.minAllocationValue,
      }));
  }

  // ===========================================================================
  // PRIVATE METHODS - PERSISTENCE
  // ===========================================================================

  /**
   * Persist recommendation to database
   */
  private async persistRecommendation(
    userId: string,
    portfolioId: string,
    contribution: string,
    dividends: string,
    totalInvestable: string,
    baseCurrency: string,
    correlationId: string,
    items: RecommendationItemResult[]
  ): Promise<{ id: string; generatedAt: Date; expiresAt: Date }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RECOMMENDATION_EXPIRY_MS);

    // Insert recommendation
    const newRec: NewRecommendation = {
      userId,
      portfolioId,
      contribution,
      dividends,
      totalInvestable,
      baseCurrency,
      correlationId,
      status: "active",
      generatedAt: now,
      expiresAt,
    };

    const [rec] = await this.database.insert(recommendations).values(newRec).returning();

    if (!rec) {
      throw new Error("Failed to insert recommendation");
    }

    // Insert recommendation items
    if (items.length > 0) {
      const newItems: NewRecommendationItem[] = items.map((item) => ({
        recommendationId: rec.id,
        assetId: item.assetId,
        symbol: item.symbol,
        score: item.score,
        currentAllocation: item.currentAllocation,
        targetAllocation: item.targetAllocation,
        allocationGap: item.allocationGap,
        recommendedAmount: item.recommendedAmount,
        isOverAllocated: item.isOverAllocated,
        breakdown: item.breakdown,
        sortOrder: item.sortOrder,
      }));

      await this.database.insert(recommendationItems).values(newItems);
    }

    return {
      id: rec.id,
      generatedAt: now,
      expiresAt,
    };
  }

  /**
   * Cache recommendation reference in Vercel KV
   */
  private async cacheRecommendation(userId: string, recommendationId: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}:${userId}`;
    await cacheSet(
      cacheKey,
      { recommendationId },
      {
        ttlSeconds: CACHE_TTL_SECONDS,
        source: "recommendation-service",
      }
    );
  }

  // ===========================================================================
  // PRIVATE METHODS - EVENT EMISSION
  // ===========================================================================

  /**
   * Emit CALC_STARTED event
   */
  private async emitCalcStarted(userId: string, correlationId: string): Promise<void> {
    const event: CalcStartedEvent = {
      type: "CALC_STARTED",
      correlationId,
      userId,
      timestamp: new Date(),
    };
    await this.events.append(userId, event);
  }

  /**
   * Emit RECS_INPUTS_CAPTURED event
   */
  private async emitInputsCaptured(
    userId: string,
    correlationId: string,
    portfolioState: RecsInputsCapturedEvent["portfolioState"],
    allocationTargets: RecsInputsCapturedEvent["allocationTargets"],
    scores: RecsInputsCapturedEvent["scores"],
    totalInvestable: string,
    contribution: string,
    dividends: string
  ): Promise<void> {
    const event: RecsInputsCapturedEvent = {
      type: "RECS_INPUTS_CAPTURED",
      correlationId,
      portfolioState,
      allocationTargets,
      scores,
      totalInvestable,
      contribution,
      dividends,
    };
    await this.events.append(userId, event);
  }

  /**
   * Emit RECS_COMPUTED event
   */
  private async emitRecsComputed(
    userId: string,
    correlationId: string,
    recommendationId: string,
    totalInvestable: string,
    totalAllocated: string,
    items: RecommendationItemResult[]
  ): Promise<void> {
    const event: RecsComputedEvent = {
      type: "RECS_COMPUTED",
      correlationId,
      recommendationId,
      totalInvestable,
      totalAllocated,
      assetCount: items.length,
      items: items.map((item) => ({
        assetId: item.assetId,
        symbol: item.symbol,
        recommendedAmount: item.recommendedAmount,
        priority: item.breakdown.priority,
        isOverAllocated: item.isOverAllocated,
      })),
    };
    await this.events.append(userId, event);
  }

  /**
   * Emit CALC_COMPLETED event
   */
  private async emitCalcCompleted(
    userId: string,
    correlationId: string,
    durationMs: number,
    assetCount: number,
    status: "success" | "partial" | "failed",
    errorMessage?: string
  ): Promise<void> {
    const event: CalcCompletedEvent = {
      type: "CALC_COMPLETED",
      correlationId,
      duration: durationMs,
      assetCount,
      status,
      ...(errorMessage !== undefined && { errorMessage }),
    };
    await this.events.append(userId, event);
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default recommendation service instance
 */
export const recommendationService = new RecommendationService();
