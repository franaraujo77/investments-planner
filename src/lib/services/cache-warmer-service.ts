/**
 * Cache Warmer Service
 *
 * Story 8.4: Cache Warming
 * AC-8.4.1: Recommendations Stored in Vercel KV
 * AC-8.4.2: Cache Key Pattern (recs:${userId})
 * AC-8.4.3: Cache TTL Configuration (24 hours)
 * AC-8.4.4: Cache Data Completeness (portfolio summary, data freshness)
 * AC-8.4.5: Cache Warming Performance (1000 users in <5 minutes)
 *
 * Warms Vercel KV cache with pre-generated recommendations after overnight processing.
 * Uses batch processing with parallelization for performance.
 */

import {
  RecommendationCacheService,
  recommendationCacheService,
} from "@/lib/cache/recommendation-cache";
import type { GeneratedRecommendation } from "@/lib/services/batch-recommendation-service";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of cache warming for a single user
 */
export interface UserCacheWarmResult {
  userId: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

/**
 * Batch cache warming result
 */
export interface BatchCacheWarmResult {
  batchNumber: number;
  usersProcessed: number;
  usersSuccess: number;
  usersFailed: number;
  durationMs: number;
  results: UserCacheWarmResult[];
}

/**
 * Overall cache warming metrics
 * AC-8.4.5: Track metrics for cache warming performance
 */
export interface CacheWarmingMetrics {
  usersCached: number;
  cacheFailures: number;
  durationMs: number;
  batchesProcessed: number;
  averageBatchDurationMs: number;
}

/**
 * Cache warming result
 */
export interface CacheWarmingResult {
  success: boolean;
  usersProcessed: number;
  usersCached: number;
  cacheFailures: number;
  durationMs: number;
  metrics: CacheWarmingMetrics;
  errors: Array<{ userId: string; message: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default batch size for cache warming
 * AC-8.4.5: Process users in batches for efficiency
 */
const DEFAULT_BATCH_SIZE = 50;

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Cache Warmer Service
 *
 * Warms Vercel KV cache with pre-generated recommendations.
 * Uses batch processing with parallelization for performance.
 *
 * @example
 * ```typescript
 * const service = new CacheWarmerService();
 *
 * // Warm cache for multiple users
 * const recommendations = new Map<string, GeneratedRecommendation>();
 * // ... populate with recommendations
 *
 * const result = await service.warmCacheForUsers(recommendations);
 * console.log(`Cached ${result.usersCached} users in ${result.durationMs}ms`);
 * ```
 */
export class CacheWarmerService {
  private readonly batchSize: number;

  constructor(
    private cacheService: RecommendationCacheService = recommendationCacheService,
    options: { batchSize?: number } = {}
  ) {
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  /**
   * Warm cache for multiple users
   *
   * AC-8.4.1: Stores recommendations in Vercel KV for all processed users
   * AC-8.4.5: Batch processing with parallelization, individual failures don't block
   *
   * @param userRecommendations - Map of userId to GeneratedRecommendation
   * @param correlationId - Optional correlation ID for logging
   * @returns Cache warming result with metrics
   */
  async warmCacheForUsers(
    userRecommendations: Map<string, GeneratedRecommendation>,
    correlationId?: string
  ): Promise<CacheWarmingResult> {
    const startTime = Date.now();
    const userIds = Array.from(userRecommendations.keys());
    const allErrors: Array<{ userId: string; message: string }> = [];
    const batchResults: BatchCacheWarmResult[] = [];

    let totalUsersCached = 0;
    let totalCacheFailures = 0;

    logger.info("Starting cache warming", {
      correlationId,
      totalUsers: userIds.length,
      batchSize: this.batchSize,
    });

    // Process users in batches
    // AC-8.4.5: Batch processing with parallelization
    for (let i = 0; i < userIds.length; i += this.batchSize) {
      const batchUserIds = userIds.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;

      const batchResult = await this.processBatch(
        batchUserIds,
        userRecommendations,
        batchNumber,
        correlationId
      );

      batchResults.push(batchResult);
      totalUsersCached += batchResult.usersSuccess;
      totalCacheFailures += batchResult.usersFailed;

      // Collect errors
      for (const result of batchResult.results) {
        if (!result.success && result.error) {
          allErrors.push({
            userId: result.userId,
            message: result.error,
          });
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    // Calculate metrics
    const averageBatchDurationMs =
      batchResults.length > 0
        ? batchResults.reduce((sum, b) => sum + b.durationMs, 0) / batchResults.length
        : 0;

    const metrics: CacheWarmingMetrics = {
      usersCached: totalUsersCached,
      cacheFailures: totalCacheFailures,
      durationMs: totalDurationMs,
      batchesProcessed: batchResults.length,
      averageBatchDurationMs: Math.round(averageBatchDurationMs),
    };

    logger.info("Cache warming completed", {
      correlationId,
      usersProcessed: userIds.length,
      usersCached: totalUsersCached,
      cacheFailures: totalCacheFailures,
      durationMs: totalDurationMs,
      batchesProcessed: batchResults.length,
    });

    return {
      success: totalCacheFailures === 0,
      usersProcessed: userIds.length,
      usersCached: totalUsersCached,
      cacheFailures: totalCacheFailures,
      durationMs: totalDurationMs,
      metrics,
      errors: allErrors,
    };
  }

  /**
   * Process a batch of users in parallel
   *
   * AC-8.4.5: Uses Promise.allSettled for parallel cache writes
   *           Individual user failures don't block other users
   */
  private async processBatch(
    userIds: string[],
    userRecommendations: Map<string, GeneratedRecommendation>,
    batchNumber: number,
    correlationId?: string
  ): Promise<BatchCacheWarmResult> {
    const batchStartTime = Date.now();

    logger.debug("Processing cache warming batch", {
      correlationId,
      batchNumber,
      batchSize: userIds.length,
    });

    // Create cache write promises for all users in batch
    const cachePromises = userIds.map((userId) => {
      const recommendation = userRecommendations.get(userId);
      if (!recommendation) {
        return Promise.resolve({
          userId,
          success: false,
          durationMs: 0,
          error: "Recommendation not found for user",
        } as UserCacheWarmResult);
      }
      return this.cacheUserRecommendation(userId, recommendation);
    });

    // Execute all cache writes in parallel
    // AC-8.4.5: Individual failures don't block other users
    const settledResults = await Promise.allSettled(cachePromises);

    // Process results
    const results: UserCacheWarmResult[] = settledResults.map((result, index) => {
      const userId = userIds[index]!;
      if (result.status === "fulfilled") {
        return result.value;
      }
      // Promise rejected - unexpected error
      return {
        userId,
        success: false,
        durationMs: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    const batchDurationMs = Date.now() - batchStartTime;
    const usersSuccess = results.filter((r) => r.success).length;
    const usersFailed = results.filter((r) => !r.success).length;

    logger.debug("Batch cache warming completed", {
      correlationId,
      batchNumber,
      usersProcessed: userIds.length,
      usersSuccess,
      usersFailed,
      durationMs: batchDurationMs,
    });

    return {
      batchNumber,
      usersProcessed: userIds.length,
      usersSuccess,
      usersFailed,
      durationMs: batchDurationMs,
      results,
    };
  }

  /**
   * Cache recommendation for a single user
   *
   * AC-8.4.1: Store in Vercel KV
   * AC-8.4.2: Key pattern recs:${userId}
   * AC-8.4.3: TTL 24 hours
   * AC-8.4.4: Include portfolio summary and data freshness
   */
  private async cacheUserRecommendation(
    userId: string,
    recommendation: GeneratedRecommendation
  ): Promise<UserCacheWarmResult> {
    const startTime = Date.now();

    try {
      // Validate recommendation data before caching
      // AC-8.4.4: Validate cache data completeness
      const validationError = this.validateRecommendation(recommendation);
      if (validationError) {
        return {
          userId,
          success: false,
          durationMs: Date.now() - startTime,
          error: validationError,
        };
      }

      // Use existing RecommendationCacheService to store both recommendations and portfolio
      // AC-8.4.1, AC-8.4.2, AC-8.4.3: Service handles key pattern and TTL
      // AC-8.4.4: Cache both recommendations and portfolio in single atomic operation
      const result = await this.cacheService.setWithPortfolio(userId, recommendation);

      if (!result.success) {
        return {
          userId,
          success: false,
          durationMs: Date.now() - startTime,
          error: result.error || "Cache set failed",
        };
      }

      return {
        userId,
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        userId,
        success: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate recommendation data completeness
   *
   * AC-8.4.4: Ensure cache includes all required fields
   */
  private validateRecommendation(recommendation: GeneratedRecommendation): string | null {
    if (!recommendation.userId) {
      return "Missing userId";
    }
    if (!recommendation.generatedAt) {
      return "Missing generatedAt timestamp";
    }
    if (!recommendation.items) {
      return "Missing recommendation items";
    }
    if (!recommendation.allocationGaps) {
      return "Missing allocation gaps";
    }
    if (!recommendation.auditTrail) {
      return "Missing audit trail";
    }
    if (!recommendation.baseCurrency) {
      return "Missing base currency";
    }
    return null; // Valid
  }

  /**
   * Warm cache for a single user (convenience method)
   */
  async warmCacheForUser(
    userId: string,
    recommendation: GeneratedRecommendation
  ): Promise<UserCacheWarmResult> {
    return this.cacheUserRecommendation(userId, recommendation);
  }
}

/**
 * Default cache warmer service instance
 */
export const cacheWarmerService = new CacheWarmerService();
