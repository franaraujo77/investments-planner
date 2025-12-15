/**
 * Batch Scoring Service
 *
 * Story 8.2: Overnight Scoring Job
 * AC-8.2.3: User Portfolio Processing
 * AC-8.2.4: Event Sourcing Integration (4 events per user)
 * AC-8.2.5: Graceful Error Handling (continue on user failure)
 *
 * Processes scores for multiple users with event emission and error handling.
 */

import { db, type Database } from "@/lib/db";
import { assetScores, scoreHistory, assetFundamentals } from "@/lib/db/schema";
import type { NewAssetScore } from "@/lib/db/schema";
import { EventStore, eventStore } from "@/lib/events/event-store";
import { calculateScores, type AssetScoreResult } from "@/lib/calculations/scoring-engine";
import type { AssetWithFundamentals } from "@/lib/validations/score-schemas";
import type {
  CalcStartedEvent,
  InputsCapturedEvent,
  ScoresComputedEvent,
  CalcCompletedEvent,
  PriceSnapshot,
  ExchangeRateSnapshot,
} from "@/lib/events/types";
import type { ActiveUserForScoring } from "./user-query-service";
import { logger } from "@/lib/telemetry/logger";
import { inArray, desc } from "drizzle-orm";

/**
 * Exchange rates map (currency pair -> rate)
 */
export interface ExchangeRatesMap {
  [currencyPair: string]: string;
}

/**
 * Prices map (symbol -> price data)
 * Note: fetchedAt is stored as ISO string for JSON serialization (Inngest step results)
 */
export interface PricesMap {
  [symbol: string]: {
    price: string;
    currency: string;
    fetchedAt: string;
    source: string;
  };
}

/**
 * Result from processing a single user
 */
export interface UserProcessingResult {
  userId: string;
  success: boolean;
  correlationId: string;
  scoresComputed: number;
  durationMs: number;
  error?: string;
}

/**
 * Result from processing a batch of users
 */
export interface BatchProcessingResult {
  usersProcessed: number;
  usersSuccess: number;
  usersFailed: number;
  totalAssetsScored: number;
  totalDurationMs: number;
  results: UserProcessingResult[];
}

/**
 * Batch Scoring Service
 *
 * Processes scores for users in batches with:
 * - Event emission (4 events per user: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
 * - Graceful error handling (continue on user failure)
 * - Score storage with audit trail
 *
 * @example
 * ```typescript
 * const service = new BatchScoringService();
 *
 * const result = await service.processUserBatch(users, {
 *   exchangeRates,
 *   prices,
 * });
 *
 * console.log(`Processed ${result.usersSuccess}/${result.usersProcessed} users`);
 * ```
 */
export class BatchScoringService {
  constructor(
    private database: Database = db,
    private events: EventStore = eventStore
  ) {}

  /**
   * Process a batch of users for scoring
   *
   * AC-8.2.3: For each active user with a portfolio: fetch prices, load criteria, calculate scores
   * AC-8.2.4: Emit 4 events per user via EventStore
   * AC-8.2.5: Continue processing remaining users if one fails
   *
   * @param users - Array of users to process
   * @param context - Shared context (exchange rates, prices)
   * @returns Batch processing result with success/failure counts
   */
  async processUserBatch(
    users: ActiveUserForScoring[],
    context: {
      exchangeRates: ExchangeRatesMap;
      prices: PricesMap;
    }
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: UserProcessingResult[] = [];
    let totalAssetsScored = 0;

    for (const user of users) {
      const userResult = await this.processUser(user, context);
      results.push(userResult);

      if (userResult.success) {
        totalAssetsScored += userResult.scoresComputed;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const usersSuccess = results.filter((r) => r.success).length;
    const usersFailed = results.filter((r) => !r.success).length;

    logger.info("Batch processing completed", {
      usersProcessed: users.length,
      usersSuccess,
      usersFailed,
      totalAssetsScored,
      totalDurationMs,
    });

    return {
      usersProcessed: users.length,
      usersSuccess,
      usersFailed,
      totalAssetsScored,
      totalDurationMs,
      results,
    };
  }

  /**
   * Process a single user's portfolio for scoring
   *
   * Emits 4 events per AC-8.2.4:
   * 1. CALC_STARTED - correlationId, userId, timestamp
   * 2. INPUTS_CAPTURED - criteriaVersionId, criteria, prices snapshot, rates snapshot, assetIds
   * 3. SCORES_COMPUTED - results array with assetId, score, breakdown
   * 4. CALC_COMPLETED - correlationId, duration, assetCount
   */
  private async processUser(
    user: ActiveUserForScoring,
    context: {
      exchangeRates: ExchangeRatesMap;
      prices: PricesMap;
    }
  ): Promise<UserProcessingResult> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Check if user has criteria
      if (!user.criteria) {
        logger.warn("User has no active criteria, skipping", {
          userId: user.userId,
          correlationId,
        });
        return {
          userId: user.userId,
          success: false,
          correlationId,
          scoresComputed: 0,
          durationMs: Date.now() - startTime,
          error: "No active criteria configured",
        };
      }

      // Check if user has assets
      if (user.assets.length === 0) {
        logger.warn("User has no assets, skipping", {
          userId: user.userId,
          correlationId,
        });
        return {
          userId: user.userId,
          success: false,
          correlationId,
          scoresComputed: 0,
          durationMs: Date.now() - startTime,
          error: "No assets in portfolio",
        };
      }

      // Event 1: CALC_STARTED
      const calcStartedEvent: CalcStartedEvent = {
        type: "CALC_STARTED",
        correlationId,
        userId: user.userId,
        timestamp: new Date(),
        market: user.criteria.targetMarket,
      };
      await this.events.append(user.userId, calcStartedEvent);

      // Get fundamentals for user's assets
      const assetsWithFundamentals = await this.getAssetsWithFundamentals(
        user.assets,
        context.prices
      );

      // Build price and rate snapshots for event
      const priceSnapshots = this.buildPriceSnapshots(user.assets, context.prices);
      const rateSnapshots = this.buildRateSnapshots(context.exchangeRates);

      // Event 2: INPUTS_CAPTURED
      const inputsCapturedEvent: InputsCapturedEvent = {
        type: "INPUTS_CAPTURED",
        correlationId,
        criteriaVersionId: user.criteria.versionId,
        criteria: {
          id: user.criteria.versionId,
          version: user.criteria.versionId,
          name: `${user.criteria.assetType} - ${user.criteria.targetMarket}`,
          criteria: user.criteria.rules.map((r) => ({
            id: r.id,
            name: r.name,
            operator:
              r.operator === "equals"
                ? "eq"
                : (r.operator as "gt" | "gte" | "lt" | "lte" | "eq" | "between"),
            value: r.operator === "between" && r.value2 ? [r.value, r.value2] : r.value,
            points: r.points,
            weight: 1,
          })),
        },
        prices: priceSnapshots,
        rates: rateSnapshots,
        assetIds: user.assets.map((a) => a.assetId),
      };
      await this.events.append(user.userId, inputsCapturedEvent);

      // Calculate scores
      const scores = calculateScores(
        user.criteria.rules,
        assetsWithFundamentals,
        user.criteria.versionId
      );

      // Event 3: SCORES_COMPUTED
      const maxPossibleScore = user.criteria.rules.reduce(
        (sum, r) => sum + Math.max(0, r.points),
        0
      );
      const scoresComputedEvent: ScoresComputedEvent = {
        type: "SCORES_COMPUTED",
        correlationId,
        results: scores.map((s) => ({
          assetId: s.assetId,
          symbol: s.symbol,
          score: s.score,
          maxPossibleScore: String(maxPossibleScore),
          percentage:
            maxPossibleScore > 0 ? String((parseFloat(s.score) / maxPossibleScore) * 100) : "0",
          breakdown: s.breakdown.map((b) => ({
            criterionId: b.criterionId,
            criterionName: b.criterionName,
            rawValue: b.actualValue ?? "0",
            passed: b.matched,
            pointsAwarded: b.pointsAwarded,
            maxPoints: user.criteria!.rules.find((r) => r.id === b.criterionId)?.points ?? 0,
          })),
        })),
      };
      await this.events.append(user.userId, scoresComputedEvent);

      // Store scores in database
      await this.storeScores(user.userId, scores);

      const durationMs = Date.now() - startTime;

      // Event 4: CALC_COMPLETED
      const calcCompletedEvent: CalcCompletedEvent = {
        type: "CALC_COMPLETED",
        correlationId,
        duration: durationMs,
        assetCount: scores.length,
        status: "success",
      };
      await this.events.append(user.userId, calcCompletedEvent);

      logger.debug("User scoring completed", {
        userId: user.userId,
        correlationId,
        assetsScored: scores.length,
        durationMs,
      });

      return {
        userId: user.userId,
        success: true,
        correlationId,
        scoresComputed: scores.length,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("User scoring failed", {
        userId: user.userId,
        correlationId,
        error: errorMessage,
        stage: "score-calculation",
      });

      // Emit CALC_COMPLETED with failure status
      try {
        const calcCompletedEvent: CalcCompletedEvent = {
          type: "CALC_COMPLETED",
          correlationId,
          duration: durationMs,
          assetCount: 0,
          status: "failed",
          errorMessage,
        };
        await this.events.append(user.userId, calcCompletedEvent);
      } catch (eventError) {
        // Log but don't fail - we've already recorded the error
        logger.warn("Failed to emit CALC_COMPLETED event for failed user", {
          userId: user.userId,
          error: eventError instanceof Error ? eventError.message : String(eventError),
        });
      }

      return {
        userId: user.userId,
        success: false,
        correlationId,
        scoresComputed: 0,
        durationMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Get assets with their fundamental data
   */
  private async getAssetsWithFundamentals(
    assets: Array<{ assetId: string; symbol: string }>,
    prices: PricesMap
  ): Promise<AssetWithFundamentals[]> {
    const symbols = assets.map((a) => a.symbol);

    // Get fundamentals from database
    const fundamentalsData = await this.database
      .select()
      .from(assetFundamentals)
      .where(inArray(assetFundamentals.symbol, symbols))
      .orderBy(desc(assetFundamentals.dataDate));

    // Create a map of latest fundamentals by symbol
    const fundamentalsMap = new Map<string, (typeof fundamentalsData)[0]>();
    for (const f of fundamentalsData) {
      if (!fundamentalsMap.has(f.symbol)) {
        fundamentalsMap.set(f.symbol, f);
      }
    }

    return assets.map((asset) => {
      const fundamentals = fundamentalsMap.get(asset.symbol);
      const price = prices[asset.symbol];

      const fundData: Record<string, number | null> = {
        pe_ratio: fundamentals?.peRatio ? parseFloat(fundamentals.peRatio) : null,
        pb_ratio: fundamentals?.pbRatio ? parseFloat(fundamentals.pbRatio) : null,
        dividend_yield: fundamentals?.dividendYield ? parseFloat(fundamentals.dividendYield) : null,
        market_cap: fundamentals?.marketCap ? parseFloat(fundamentals.marketCap) : null,
        revenue: fundamentals?.revenue ? parseFloat(fundamentals.revenue) : null,
        earnings: fundamentals?.earnings ? parseFloat(fundamentals.earnings) : null,
        // Add price if available
        price: price ? parseFloat(price.price) : null,
      };

      return {
        id: asset.assetId,
        symbol: asset.symbol,
        fundamentals: fundData,
      };
    });
  }

  /**
   * Build price snapshots for event
   */
  private buildPriceSnapshots(
    assets: Array<{ assetId: string; symbol: string }>,
    prices: PricesMap
  ): PriceSnapshot[] {
    return assets
      .filter((a) => prices[a.symbol])
      .map((a) => {
        const price = prices[a.symbol]!;
        return {
          assetId: a.assetId,
          symbol: a.symbol,
          price: price.price,
          currency: price.currency,
          fetchedAt: new Date(price.fetchedAt),
          source: price.source,
        };
      });
  }

  /**
   * Build rate snapshots for event
   */
  private buildRateSnapshots(exchangeRates: ExchangeRatesMap): ExchangeRateSnapshot[] {
    const snapshots: ExchangeRateSnapshot[] = [];

    for (const [pair, rate] of Object.entries(exchangeRates)) {
      // Pair format: "USD_BRL" -> ["USD", "BRL"]
      const [from, to] = pair.split("_");
      if (from && to) {
        snapshots.push({
          fromCurrency: from,
          toCurrency: to,
          rate,
          fetchedAt: new Date(),
          source: "overnight-job",
        });
      }
    }

    return snapshots;
  }

  /**
   * Store calculated scores in database
   */
  private async storeScores(userId: string, scores: AssetScoreResult[]): Promise<void> {
    if (scores.length === 0) return;

    const now = new Date();

    // Insert into asset_scores (current scores)
    const scoreInserts: NewAssetScore[] = scores.map((s) => ({
      userId,
      assetId: s.assetId,
      symbol: s.symbol,
      criteriaVersionId: s.criteriaVersionId,
      score: s.score,
      breakdown: s.breakdown,
      calculatedAt: s.calculatedAt,
    }));

    // Upsert scores - update if exists, insert if not
    for (const scoreInsert of scoreInserts) {
      await this.database
        .insert(assetScores)
        .values(scoreInsert)
        .onConflictDoUpdate({
          target: [assetScores.userId, assetScores.assetId],
          set: {
            score: scoreInsert.score,
            breakdown: scoreInsert.breakdown,
            criteriaVersionId: scoreInsert.criteriaVersionId,
            calculatedAt: scoreInsert.calculatedAt,
          },
        });
    }

    // Insert into score_history for audit trail
    const historyInserts = scores.map((s) => ({
      userId,
      assetId: s.assetId,
      symbol: s.symbol,
      score: s.score,
      criteriaVersionId: s.criteriaVersionId,
      calculatedAt: now,
    }));

    await this.database.insert(scoreHistory).values(historyInserts);
  }
}

/**
 * Default batch scoring service instance
 */
export const batchScoringService = new BatchScoringService();
