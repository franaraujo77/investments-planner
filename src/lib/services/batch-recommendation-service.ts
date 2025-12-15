/**
 * Batch Recommendation Service
 *
 * Story 8.3: Recommendation Pre-Generation
 * AC-8.3.1: Recommendations Generated from Latest Scores
 * AC-8.3.2: Default Contribution Amount Used
 * AC-8.3.3: Criteria Version Stored for Audit
 * AC-8.3.4: Allocation Gap Calculations Included
 *
 * Generates recommendations for users after overnight scoring.
 * Uses existing RecommendationEngine for core algorithm.
 */

import { db, type Database } from "@/lib/db";
import {
  users,
  portfolios,
  portfolioAssets,
  assetClasses,
  assetSubclasses,
  assetScores,
  assetPrices,
} from "@/lib/db/schema";
import { eq, and, inArray, desc, isNull } from "drizzle-orm";
import { Decimal } from "@/lib/calculations/decimal-config";
import { parseDecimal, add, subtract, divide, multiply } from "@/lib/calculations/decimal-utils";
import { generateRecommendationItems } from "@/lib/calculations/recommendations";
import type { AssetWithContext, RecommendationItemResult } from "@/lib/types/recommendations";
import type { ExchangeRatesMap, PricesMap } from "./batch-scoring-service";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Allocation target for an asset class
 */
export interface AllocationTarget {
  classId: string;
  className: string;
  targetMin: string | null;
  targetMax: string | null;
  minAllocationValue: string | null;
}

/**
 * Allocation target for a subclass
 */
export interface SubclassAllocationTarget extends AllocationTarget {
  subclassId: string;
  subclassName: string;
  parentClassId: string;
}

/**
 * Current allocation status for a class
 */
export interface AllocationStatus {
  classId: string;
  className: string;
  currentAllocation: string; // Current percentage
  targetMin: string;
  targetMax: string;
  targetMidpoint: string;
  allocationGap: string; // targetMidpoint - currentAllocation
  isOverAllocated: boolean;
  currentValue: string; // Total value in this class
}

/**
 * User data for recommendation generation
 */
export interface UserForRecommendation {
  userId: string;
  baseCurrency: string;
  defaultContribution: string | null;
  portfolioId: string;
  assets: Array<{
    assetId: string;
    symbol: string;
    name: string | null;
    quantity: string;
    currency: string;
    classId: string | null;
    className: string | null;
    subclassId: string | null;
    subclassName: string | null;
    score: string | null;
    criteriaVersionId: string | null;
    currentPrice: string | null;
  }>;
  allocationTargets: AllocationTarget[];
  subclassTargets: SubclassAllocationTarget[];
}

/**
 * Generated recommendation for a user
 */
export interface UserRecommendationResult {
  userId: string;
  success: boolean;
  correlationId: string;
  recommendationsGenerated: number;
  durationMs: number;
  error?: string;
  recommendations?: GeneratedRecommendation;
}

/**
 * Generated recommendations with audit data
 * AC-8.3.3: Includes criteria_version_id, exchange_rates snapshot, scores snapshot
 */
export interface GeneratedRecommendation {
  userId: string;
  portfolioId: string;
  generatedAt: string; // ISO timestamp
  totalInvestable: string;
  baseCurrency: string;
  items: RecommendationItemWithGap[];
  allocationGaps: AllocationStatus[];
  auditTrail: {
    criteriaVersionId: string | null;
    exchangeRatesSnapshot: ExchangeRatesMap;
    scoresCorrelationId: string;
    pricesAsOf: string;
    ratesAsOf: string;
  };
}

/**
 * Recommendation item with allocation gap details (AC-8.3.4)
 */
export interface RecommendationItemWithGap extends RecommendationItemResult {
  classAllocation: {
    className: string | null;
    currentPercent: string;
    targetMin: string;
    targetMax: string;
    gap: string;
  };
  isOverAllocatedExplanation: string | null;
}

/**
 * Batch processing result
 */
export interface BatchRecommendationResult {
  usersProcessed: number;
  usersSuccess: number;
  usersFailed: number;
  totalRecommendationsGenerated: number;
  totalDurationMs: number;
  results: UserRecommendationResult[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PERCENTAGE_PRECISION = 4;
const MONETARY_PRECISION = 4;
const DEFAULT_TARGET_MIN = "0";
const DEFAULT_TARGET_MAX = "100";

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Batch Recommendation Service
 *
 * Generates recommendations for multiple users using:
 * - Latest scores from overnight scoring
 * - User's allocation targets
 * - User's default contribution amount
 *
 * @example
 * ```typescript
 * const service = new BatchRecommendationService();
 *
 * const result = await service.generateRecommendationsForUsers(users, {
 *   exchangeRates,
 *   prices,
 *   correlationId,
 * });
 *
 * console.log(`Generated recommendations for ${result.usersSuccess} users`);
 * ```
 */
export class BatchRecommendationService {
  constructor(private database: Database = db) {}

  /**
   * Generate recommendations for a batch of users
   *
   * AC-8.3.1: Uses latest scores from overnight run
   * AC-8.3.5: Continue processing remaining users if one fails
   */
  async generateRecommendationsForUsers(
    userIds: string[],
    context: {
      exchangeRates: ExchangeRatesMap;
      prices: PricesMap;
      correlationId: string;
    }
  ): Promise<BatchRecommendationResult> {
    const startTime = Date.now();
    const results: UserRecommendationResult[] = [];
    let totalRecommendationsGenerated = 0;

    for (const userId of userIds) {
      const userResult = await this.generateRecommendationsForUser(userId, context);
      results.push(userResult);

      if (userResult.success) {
        totalRecommendationsGenerated += userResult.recommendationsGenerated;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const usersSuccess = results.filter((r) => r.success).length;
    const usersFailed = results.filter((r) => !r.success).length;

    logger.info("Batch recommendation generation completed", {
      correlationId: context.correlationId,
      usersProcessed: userIds.length,
      usersSuccess,
      usersFailed,
      totalRecommendationsGenerated,
      totalDurationMs,
    });

    return {
      usersProcessed: userIds.length,
      usersSuccess,
      usersFailed,
      totalRecommendationsGenerated,
      totalDurationMs,
      results,
    };
  }

  /**
   * Generate recommendations for a single user
   *
   * AC-8.3.1: Recommendations generated using latest scores, allocation targets, portfolio allocations
   * AC-8.3.2: Uses default contribution amount
   * AC-8.3.3: Stores criteria version for audit
   * AC-8.3.4: Includes allocation gap calculations
   */
  async generateRecommendationsForUser(
    userId: string,
    context: {
      exchangeRates: ExchangeRatesMap;
      prices: PricesMap;
      correlationId: string;
    }
  ): Promise<UserRecommendationResult> {
    const startTime = Date.now();
    const userCorrelationId = `${context.correlationId}:rec:${userId.slice(0, 8)}`;

    try {
      // Step 1: Load user data with all needed relationships
      const userData = await this.loadUserData(userId, context.prices);

      if (!userData) {
        return {
          userId,
          success: false,
          correlationId: userCorrelationId,
          recommendationsGenerated: 0,
          durationMs: Date.now() - startTime,
          error: "User not found or no portfolio",
        };
      }

      if (userData.assets.length === 0) {
        return {
          userId,
          success: false,
          correlationId: userCorrelationId,
          recommendationsGenerated: 0,
          durationMs: Date.now() - startTime,
          error: "No assets in portfolio",
        };
      }

      // Step 2: Calculate current allocations and gaps (AC-8.3.4)
      const allocationStatus = this.calculateAllocationStatus(userData, context.exchangeRates);

      // Step 3: Determine total investable (AC-8.3.2)
      const totalInvestable = userData.defaultContribution || "0";

      // Step 4: Build assets with context for recommendation engine
      const assetsWithContext = this.buildAssetsWithContext(userData, allocationStatus);

      // Step 5: Generate recommendations using existing engine
      const recommendationItems = generateRecommendationItems(assetsWithContext, totalInvestable);

      // Step 6: Enhance with allocation gap details (AC-8.3.4)
      const enhancedItems = this.enhanceWithAllocationGaps(
        recommendationItems,
        allocationStatus,
        userData
      );

      // Step 7: Build audit trail (AC-8.3.3)
      const criteriaVersionId = this.extractCriteriaVersionId(userData);
      const pricesAsOf = this.extractPricesTimestamp(context.prices);

      const recommendation: GeneratedRecommendation = {
        userId,
        portfolioId: userData.portfolioId,
        generatedAt: new Date().toISOString(),
        totalInvestable,
        baseCurrency: userData.baseCurrency,
        items: enhancedItems,
        allocationGaps: allocationStatus,
        auditTrail: {
          criteriaVersionId,
          exchangeRatesSnapshot: context.exchangeRates,
          scoresCorrelationId: context.correlationId,
          pricesAsOf,
          ratesAsOf: new Date().toISOString(),
        },
      };

      const durationMs = Date.now() - startTime;

      logger.debug("User recommendation generation completed", {
        userId,
        correlationId: userCorrelationId,
        recommendationsGenerated: enhancedItems.length,
        totalInvestable,
        durationMs,
      });

      return {
        userId,
        success: true,
        correlationId: userCorrelationId,
        recommendationsGenerated: enhancedItems.length,
        durationMs,
        recommendations: recommendation,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("User recommendation generation failed", {
        userId,
        correlationId: userCorrelationId,
        error: errorMessage,
      });

      return {
        userId,
        success: false,
        correlationId: userCorrelationId,
        recommendationsGenerated: 0,
        durationMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Load all user data needed for recommendation generation
   */
  private async loadUserData(
    userId: string,
    prices: PricesMap
  ): Promise<UserForRecommendation | null> {
    // Get user with default contribution
    const userResult = await this.database
      .select({
        userId: users.id,
        baseCurrency: users.baseCurrency,
        defaultContribution: users.defaultContribution,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0]!;

    // Get user's portfolio
    const portfolioResult = await this.database
      .select({
        portfolioId: portfolios.id,
      })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);

    if (portfolioResult.length === 0) {
      return null;
    }

    const portfolio = portfolioResult[0]!;

    // Get portfolio assets with class info
    const assetsResult = await this.database
      .select({
        assetId: portfolioAssets.id,
        symbol: portfolioAssets.symbol,
        name: portfolioAssets.name,
        quantity: portfolioAssets.quantity,
        currency: portfolioAssets.currency,
        classId: portfolioAssets.assetClassId,
        subclassId: portfolioAssets.subclassId,
        isIgnored: portfolioAssets.isIgnored,
      })
      .from(portfolioAssets)
      .where(eq(portfolioAssets.portfolioId, portfolio.portfolioId));

    // Filter out ignored assets
    const activeAssets = assetsResult.filter((a) => !a.isIgnored);

    if (activeAssets.length === 0) {
      return {
        userId: user.userId,
        baseCurrency: user.baseCurrency,
        defaultContribution: user.defaultContribution,
        portfolioId: portfolio.portfolioId,
        assets: [],
        allocationTargets: [],
        subclassTargets: [],
      };
    }

    // Get asset classes for this user
    const classResults = await this.database
      .select({
        classId: assetClasses.id,
        className: assetClasses.name,
        targetMin: assetClasses.targetMin,
        targetMax: assetClasses.targetMax,
        minAllocationValue: assetClasses.minAllocationValue,
      })
      .from(assetClasses)
      .where(eq(assetClasses.userId, userId));

    // Get subclasses
    const classIds = classResults.map((c) => c.classId);
    let subclassResults: (typeof assetSubclasses.$inferSelect)[] = [];
    if (classIds.length > 0) {
      subclassResults = await this.database
        .select()
        .from(assetSubclasses)
        .where(inArray(assetSubclasses.classId, classIds));
    }

    // Get latest scores for these assets
    const assetIds = activeAssets.map((a) => a.assetId);
    const scoresResult = await this.database
      .select({
        assetId: assetScores.assetId,
        score: assetScores.score,
        criteriaVersionId: assetScores.criteriaVersionId,
      })
      .from(assetScores)
      .where(and(eq(assetScores.userId, userId), inArray(assetScores.assetId, assetIds)));

    const scoresMap = new Map(scoresResult.map((s) => [s.assetId, s]));

    // Get latest prices from database if not in prices map
    const symbols = activeAssets.map((a) => a.symbol);
    const pricesResult = await this.database
      .select({
        symbol: assetPrices.symbol,
        close: assetPrices.close,
      })
      .from(assetPrices)
      .where(inArray(assetPrices.symbol, symbols))
      .orderBy(desc(assetPrices.priceDate));

    // Create a map of latest prices by symbol
    const dbPricesMap = new Map<string, string>();
    for (const p of pricesResult) {
      if (!dbPricesMap.has(p.symbol) && p.close) {
        dbPricesMap.set(p.symbol, p.close);
      }
    }

    // Build class name map
    const classNameMap = new Map(classResults.map((c) => [c.classId, c.className]));

    // Build subclass name map
    const subclassNameMap = new Map(subclassResults.map((s) => [s.id, s.name]));

    // Build assets array with all data
    const assetsWithData = activeAssets.map((asset) => {
      const score = scoresMap.get(asset.assetId);
      const priceFromContext = prices[asset.symbol];
      const priceFromDb = dbPricesMap.get(asset.symbol);
      const currentPrice = priceFromContext?.price || priceFromDb || null;

      return {
        assetId: asset.assetId,
        symbol: asset.symbol,
        name: asset.name,
        quantity: asset.quantity,
        currency: asset.currency,
        classId: asset.classId,
        className: asset.classId ? classNameMap.get(asset.classId) || null : null,
        subclassId: asset.subclassId,
        subclassName: asset.subclassId ? subclassNameMap.get(asset.subclassId) || null : null,
        score: score?.score || null,
        criteriaVersionId: score?.criteriaVersionId || null,
        currentPrice,
      };
    });

    // Build allocation targets
    const allocationTargets: AllocationTarget[] = classResults.map((c) => ({
      classId: c.classId,
      className: c.className,
      targetMin: c.targetMin,
      targetMax: c.targetMax,
      minAllocationValue: c.minAllocationValue,
    }));

    // Build subclass targets
    const subclassTargets: SubclassAllocationTarget[] = subclassResults.map((s) => ({
      classId: s.id,
      className: s.name,
      targetMin: s.targetMin,
      targetMax: s.targetMax,
      minAllocationValue: s.minAllocationValue,
      subclassId: s.id,
      subclassName: s.name,
      parentClassId: s.classId,
    }));

    return {
      userId: user.userId,
      baseCurrency: user.baseCurrency,
      defaultContribution: user.defaultContribution,
      portfolioId: portfolio.portfolioId,
      assets: assetsWithData,
      allocationTargets,
      subclassTargets,
    };
  }

  /**
   * Calculate current allocation status for each asset class (AC-8.3.4)
   */
  private calculateAllocationStatus(
    userData: UserForRecommendation,
    exchangeRates: ExchangeRatesMap
  ): AllocationStatus[] {
    // Calculate total portfolio value
    let totalValue = new Decimal(0);
    const classValues = new Map<string, Decimal>();

    for (const asset of userData.assets) {
      if (!asset.currentPrice) continue;

      const quantity = parseDecimal(asset.quantity);
      const price = parseDecimal(asset.currentPrice);
      let assetValue = multiply(quantity, price);

      // Convert to base currency if needed
      if (asset.currency !== userData.baseCurrency) {
        const ratePair = `${asset.currency}_${userData.baseCurrency}`;
        const rate = exchangeRates[ratePair];
        if (rate) {
          assetValue = multiply(assetValue, parseDecimal(rate));
        }
      }

      totalValue = add(totalValue, assetValue);

      // Accumulate by class
      const classId = asset.classId || "unclassified";
      const currentClassValue = classValues.get(classId) || new Decimal(0);
      classValues.set(classId, add(currentClassValue, assetValue));
    }

    // Build allocation status for each class
    const allocationStatus: AllocationStatus[] = [];

    // Include configured classes
    for (const target of userData.allocationTargets) {
      const classValue = classValues.get(target.classId) || new Decimal(0);
      const currentAllocation = totalValue.isZero()
        ? new Decimal(0)
        : multiply(divide(classValue, totalValue), new Decimal(100));

      const targetMin = target.targetMin || DEFAULT_TARGET_MIN;
      const targetMax = target.targetMax || DEFAULT_TARGET_MAX;
      const targetMidpoint = divide(
        add(parseDecimal(targetMin), parseDecimal(targetMax)),
        new Decimal(2)
      );

      const allocationGap = subtract(targetMidpoint, currentAllocation);
      const isOverAllocated = currentAllocation.greaterThan(parseDecimal(targetMax));

      allocationStatus.push({
        classId: target.classId,
        className: target.className,
        currentAllocation: currentAllocation.toFixed(PERCENTAGE_PRECISION),
        targetMin,
        targetMax,
        targetMidpoint: targetMidpoint.toFixed(PERCENTAGE_PRECISION),
        allocationGap: allocationGap.toFixed(PERCENTAGE_PRECISION),
        isOverAllocated,
        currentValue: classValue.toFixed(MONETARY_PRECISION),
      });
    }

    // Include unclassified if present
    const unclassifiedValue = classValues.get("unclassified");
    if (unclassifiedValue && unclassifiedValue.greaterThan(0)) {
      const currentAllocation = totalValue.isZero()
        ? new Decimal(0)
        : multiply(divide(unclassifiedValue, totalValue), new Decimal(100));

      allocationStatus.push({
        classId: "unclassified",
        className: "Unclassified",
        currentAllocation: currentAllocation.toFixed(PERCENTAGE_PRECISION),
        targetMin: "0",
        targetMax: "0",
        targetMidpoint: "0",
        allocationGap: subtract(new Decimal(0), currentAllocation).toFixed(PERCENTAGE_PRECISION),
        isOverAllocated: true, // Unclassified is always considered over-allocated
        currentValue: unclassifiedValue.toFixed(MONETARY_PRECISION),
      });
    }

    return allocationStatus;
  }

  /**
   * Build assets with context for the recommendation engine
   */
  private buildAssetsWithContext(
    userData: UserForRecommendation,
    allocationStatus: AllocationStatus[]
  ): AssetWithContext[] {
    const allocationMap = new Map(allocationStatus.map((a) => [a.classId, a]));

    // Calculate total portfolio value for allocation percentages
    let totalValue = new Decimal(0);
    const assetValues = new Map<string, Decimal>();

    for (const asset of userData.assets) {
      if (!asset.currentPrice) continue;

      const quantity = parseDecimal(asset.quantity);
      const price = parseDecimal(asset.currentPrice);
      const assetValue = multiply(quantity, price);

      assetValues.set(asset.assetId, assetValue);
      totalValue = add(totalValue, assetValue);
    }

    return userData.assets
      .filter((asset) => asset.currentPrice && asset.score)
      .map((asset) => {
        const classId = asset.classId || "unclassified";
        const classAllocation = allocationMap.get(classId);
        const assetValue = assetValues.get(asset.assetId) || new Decimal(0);

        // Calculate individual asset allocation
        const currentAllocation = totalValue.isZero()
          ? new Decimal(0)
          : multiply(divide(assetValue, totalValue), new Decimal(100));

        // Get class allocation targets
        const targetMin = classAllocation?.targetMin || DEFAULT_TARGET_MIN;
        const targetMax = classAllocation?.targetMax || DEFAULT_TARGET_MAX;
        const targetMidpoint = divide(
          add(parseDecimal(targetMin), parseDecimal(targetMax)),
          new Decimal(2)
        );

        // Calculate asset-level allocation gap using class-level gap
        const allocationGap = classAllocation?.allocationGap || "0";
        const isOverAllocated = classAllocation?.isOverAllocated || false;

        // Get minimum allocation value from class
        const classTarget = userData.allocationTargets.find((t) => t.classId === asset.classId);
        const minAllocationValue = classTarget?.minAllocationValue || null;

        return {
          id: asset.assetId,
          symbol: asset.symbol,
          name: asset.name,
          classId: asset.classId,
          className: asset.className,
          subclassId: asset.subclassId,
          subclassName: asset.subclassName,
          currentAllocation: currentAllocation.toFixed(PERCENTAGE_PRECISION),
          targetAllocation: targetMidpoint.toFixed(PERCENTAGE_PRECISION),
          allocationGap,
          score: asset.score!,
          currentValue: assetValue.toFixed(MONETARY_PRECISION),
          minAllocationValue,
          isOverAllocated,
        };
      });
  }

  /**
   * Enhance recommendation items with allocation gap details (AC-8.3.4)
   */
  private enhanceWithAllocationGaps(
    items: RecommendationItemResult[],
    allocationStatus: AllocationStatus[],
    userData: UserForRecommendation
  ): RecommendationItemWithGap[] {
    const allocationMap = new Map(allocationStatus.map((a) => [a.classId, a]));

    // Build asset class map
    const assetClassMap = new Map(
      userData.assets.map((a) => [a.assetId, a.classId || "unclassified"])
    );
    const assetClassNameMap = new Map(userData.assets.map((a) => [a.assetId, a.className]));

    return items.map((item) => {
      const classId = assetClassMap.get(item.assetId) || "unclassified";
      const className = assetClassNameMap.get(item.assetId) || null;
      const classAllocation = allocationMap.get(classId);

      const classAllocationData = {
        className,
        currentPercent: classAllocation?.currentAllocation || "0",
        targetMin: classAllocation?.targetMin || "0",
        targetMax: classAllocation?.targetMax || "100",
        gap: classAllocation?.allocationGap || "0",
      };

      // Generate explanation for over-allocated classes (AC-8.3.4)
      let isOverAllocatedExplanation: string | null = null;
      if (item.isOverAllocated) {
        isOverAllocatedExplanation = `${className || "This class"} is currently at ${classAllocationData.currentPercent}%, which exceeds the target maximum of ${classAllocationData.targetMax}%. No additional investment recommended.`;
      }

      return {
        ...item,
        classAllocation: classAllocationData,
        isOverAllocatedExplanation,
      };
    });
  }

  /**
   * Extract criteria version ID from user data
   */
  private extractCriteriaVersionId(userData: UserForRecommendation): string | null {
    // Find the first asset with a criteria version ID
    for (const asset of userData.assets) {
      if (asset.criteriaVersionId) {
        return asset.criteriaVersionId;
      }
    }
    return null;
  }

  /**
   * Extract prices timestamp from context
   */
  private extractPricesTimestamp(prices: PricesMap): string {
    for (const price of Object.values(prices)) {
      if (price.fetchedAt) {
        return price.fetchedAt;
      }
    }
    return new Date().toISOString();
  }
}

/**
 * Default batch recommendation service instance
 */
export const batchRecommendationService = new BatchRecommendationService();
