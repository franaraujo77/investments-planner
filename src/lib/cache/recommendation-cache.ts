/**
 * Recommendation Cache Service
 *
 * Story 8.3: Recommendation Pre-Generation
 * AC-8.3.3: Criteria Version Stored for Audit
 *
 * Story 8.4: Cache Warming (prepares data structure)
 * AC-8.4.1: Data stored in Vercel KV after recommendations generated
 * AC-8.4.2: Cache key follows pattern recs:${userId}
 * AC-8.4.3: Cache TTL is 24 hours
 * AC-8.4.4: Cache includes portfolio summary and data freshness timestamps
 *
 * Stores pre-generated recommendations in Vercel KV for instant dashboard load.
 */

import { kv } from "@vercel/kv";
import { logger } from "@/lib/telemetry/logger";
import type { GeneratedRecommendation } from "@/lib/services/batch-recommendation-service";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Cache key prefix for recommendations
 * AC-8.4.2: Key pattern is recs:${userId}
 */
const CACHE_KEY_PREFIX = "recs:";

/**
 * Cache key prefix for portfolio summary
 * AC-8.4.4: Portfolio summary cached separately
 */
const PORTFOLIO_CACHE_KEY_PREFIX = "portfolio:";

/**
 * Cache TTL in seconds (24 hours)
 * AC-8.4.3: Cache TTL is 24 hours
 */
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 86400 seconds

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cached recommendation structure
 * Matches tech spec CachedRecommendations interface
 */
export interface CachedRecommendations {
  userId: string;
  generatedAt: string; // ISO timestamp
  recommendations: Array<{
    assetId: string;
    symbol: string;
    score: string; // Decimal string
    amount: string; // Decimal string
    currency: string;
    allocationGap: string;
    breakdown: {
      criteriaCount: number;
      topContributor: string;
    };
    classAllocation: {
      className: string | null;
      currentPercent: string;
      targetMin: string;
      targetMax: string;
      gap: string;
    };
    isOverAllocated: boolean;
    isOverAllocatedExplanation: string | null;
  }>;
  portfolioSummary: {
    totalValue: string;
    baseCurrency: string;
    allocations: Record<string, string>; // class -> percentage
  };
  dataFreshness: {
    pricesAsOf: string;
    ratesAsOf: string;
    criteriaVersion: string;
  };
  totalInvestable: string;
  correlationId: string;
}

/**
 * Cached portfolio summary structure
 * AC-8.4.4: Portfolio summary cached for instant dashboard load
 */
export interface CachedPortfolioSummary {
  totalValue: string;
  assetCount: number;
  allocations: Array<{
    className: string;
    currentPercent: string;
    targetMin: string;
    targetMax: string;
  }>;
  baseCurrency: string;
  cachedAt: string; // ISO timestamp
}

/**
 * Result of cache get operation
 */
export interface CacheGetResult {
  data: CachedRecommendations | null;
  fromCache: boolean;
  error?: string;
}

/**
 * Result of portfolio cache get operation
 */
export interface PortfolioCacheGetResult {
  data: CachedPortfolioSummary | null;
  fromCache: boolean;
  error?: string;
}

/**
 * Result of cache set operation
 */
export interface CacheSetResult {
  success: boolean;
  key: string;
  error?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Recommendation Cache Service
 *
 * Manages recommendation storage in Vercel KV cache.
 *
 * @example
 * ```typescript
 * const cacheService = new RecommendationCacheService();
 *
 * // Store recommendations
 * await cacheService.set(userId, recommendation);
 *
 * // Retrieve recommendations
 * const result = await cacheService.get(userId);
 * if (result.data) {
 *   console.log('Recommendations loaded from cache');
 * }
 *
 * // Invalidate cache
 * await cacheService.invalidate(userId);
 * ```
 */
export class RecommendationCacheService {
  /**
   * Get cache key for a user's recommendations
   * AC-8.4.2: Key pattern is recs:${userId}
   */
  private getCacheKey(userId: string): string {
    return `${CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Get cache key for a user's portfolio summary
   * AC-8.4.4: Key pattern is portfolio:${userId}
   */
  private getPortfolioCacheKey(userId: string): string {
    return `${PORTFOLIO_CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Get cached recommendations for a user
   *
   * @param userId - User ID to retrieve recommendations for
   * @returns Cached recommendations or null if not found
   */
  async get(userId: string): Promise<CacheGetResult> {
    const key = this.getCacheKey(userId);

    try {
      const data = await kv.get<CachedRecommendations>(key);

      if (data) {
        logger.debug("Cache hit for recommendations", {
          userId,
          key,
          generatedAt: data.generatedAt,
        });

        return {
          data,
          fromCache: true,
        };
      }

      logger.debug("Cache miss for recommendations", { userId, key });

      return {
        data: null,
        fromCache: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Cache get failed", {
        userId,
        key,
        error: errorMessage,
      });

      return {
        data: null,
        fromCache: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Store recommendations in cache
   *
   * AC-8.4.1: Data stored in Vercel KV
   * AC-8.4.3: TTL is 24 hours
   * AC-8.4.4: Includes portfolio summary and data freshness
   *
   * @param userId - User ID
   * @param recommendation - Generated recommendation data
   * @returns Success/failure result
   */
  async set(userId: string, recommendation: GeneratedRecommendation): Promise<CacheSetResult> {
    const key = this.getCacheKey(userId);

    try {
      // Transform to cache format
      const cacheData = this.transformToCache(recommendation);

      // Store with TTL
      await kv.set(key, cacheData, { ex: CACHE_TTL_SECONDS });

      logger.debug("Cache set for recommendations", {
        userId,
        key,
        itemCount: cacheData.recommendations.length,
        ttlSeconds: CACHE_TTL_SECONDS,
      });

      return {
        success: true,
        key,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Cache set failed", {
        userId,
        key,
        error: errorMessage,
      });

      return {
        success: false,
        key,
        error: errorMessage,
      };
    }
  }

  /**
   * Invalidate cached recommendations for a user
   *
   * @param userId - User ID to invalidate cache for
   * @returns Success/failure result
   */
  async invalidate(userId: string): Promise<CacheSetResult> {
    const key = this.getCacheKey(userId);

    try {
      await kv.del(key);

      logger.debug("Cache invalidated", { userId, key });

      return {
        success: true,
        key,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Cache invalidation failed", {
        userId,
        key,
        error: errorMessage,
      });

      return {
        success: false,
        key,
        error: errorMessage,
      };
    }
  }

  /**
   * Invalidate all cached recommendations
   *
   * Note: This is an expensive operation and should be used sparingly
   */
  async invalidateAll(): Promise<{ success: boolean; keysDeleted: number }> {
    try {
      // Scan for all recommendation keys
      const keys: string[] = [];
      let cursor: number | string = 0;

      do {
        const result: [string, string[]] = await kv.scan(cursor, {
          match: `${CACHE_KEY_PREFIX}*`,
          count: 100,
        });
        cursor = Number(result[0]);
        keys.push(...result[1]);
      } while (cursor !== 0);

      // Delete all found keys
      if (keys.length > 0) {
        await kv.del(...keys);
      }

      logger.info("All recommendation caches invalidated", {
        keysDeleted: keys.length,
      });

      return {
        success: true,
        keysDeleted: keys.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Bulk cache invalidation failed", { error: errorMessage });

      return {
        success: false,
        keysDeleted: 0,
      };
    }
  }

  /**
   * Transform GeneratedRecommendation to CachedRecommendations format
   *
   * AC-8.3.3: Includes criteria version for audit
   * AC-8.4.4: Includes portfolio summary and data freshness
   */
  private transformToCache(recommendation: GeneratedRecommendation): CachedRecommendations {
    // Build portfolio allocations from allocation gaps
    const allocations: Record<string, string> = {};
    for (const gap of recommendation.allocationGaps) {
      allocations[gap.className] = gap.currentAllocation;
    }

    // Calculate total portfolio value from allocation gaps
    let totalValue = "0";
    for (const gap of recommendation.allocationGaps) {
      const current = parseFloat(gap.currentValue);
      totalValue = String(parseFloat(totalValue) + current);
    }

    // Transform recommendation items
    const recommendations = recommendation.items.map((item) => ({
      assetId: item.assetId,
      symbol: item.symbol,
      score: item.score,
      amount: item.recommendedAmount,
      currency: recommendation.baseCurrency,
      allocationGap: item.allocationGap,
      breakdown: {
        criteriaCount: Object.keys(item.breakdown || {}).length,
        topContributor: item.breakdown?.className || "Unknown",
      },
      classAllocation: item.classAllocation,
      isOverAllocated: item.isOverAllocated,
      isOverAllocatedExplanation: item.isOverAllocatedExplanation,
    }));

    return {
      userId: recommendation.userId,
      generatedAt: recommendation.generatedAt,
      recommendations,
      portfolioSummary: {
        totalValue,
        baseCurrency: recommendation.baseCurrency,
        allocations,
      },
      dataFreshness: {
        pricesAsOf: recommendation.auditTrail.pricesAsOf,
        ratesAsOf: recommendation.auditTrail.ratesAsOf,
        criteriaVersion: recommendation.auditTrail.criteriaVersionId || "",
      },
      totalInvestable: recommendation.totalInvestable,
      correlationId: recommendation.auditTrail.scoresCorrelationId,
    };
  }

  /**
   * Check if cache entry exists and is fresh
   *
   * @param userId - User ID to check
   * @returns Whether valid cache exists
   */
  async exists(userId: string): Promise<boolean> {
    const key = this.getCacheKey(userId);

    try {
      const exists = await kv.exists(key);
      return exists === 1;
    } catch (error) {
      logger.warn("Cache exists check failed", {
        userId,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get TTL remaining for a cached entry
   *
   * @param userId - User ID to check
   * @returns TTL in seconds, -2 if key doesn't exist, -1 if no TTL
   */
  async getTTL(userId: string): Promise<number> {
    const key = this.getCacheKey(userId);

    try {
      return await kv.ttl(key);
    } catch (error) {
      logger.warn("Cache TTL check failed", {
        userId,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return -2;
    }
  }

  // ==========================================================================
  // PORTFOLIO SUMMARY CACHE METHODS (AC-8.4.4)
  // ==========================================================================

  /**
   * Get cached portfolio summary for a user
   *
   * @param userId - User ID to retrieve portfolio summary for
   * @returns Cached portfolio summary or null if not found
   */
  async getPortfolio(userId: string): Promise<PortfolioCacheGetResult> {
    const key = this.getPortfolioCacheKey(userId);

    try {
      const data = await kv.get<CachedPortfolioSummary>(key);

      if (data) {
        logger.debug("Cache hit for portfolio summary", {
          userId,
          key,
          cachedAt: data.cachedAt,
        });

        return {
          data,
          fromCache: true,
        };
      }

      logger.debug("Cache miss for portfolio summary", { userId, key });

      return {
        data: null,
        fromCache: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Portfolio cache get failed", {
        userId,
        key,
        error: errorMessage,
      });

      return {
        data: null,
        fromCache: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Store portfolio summary in cache
   *
   * AC-8.4.4: Portfolio summary cached for instant dashboard load
   *
   * @param userId - User ID
   * @param portfolioSummary - Portfolio summary data
   * @returns Success/failure result
   */
  async setPortfolio(
    userId: string,
    portfolioSummary: CachedPortfolioSummary
  ): Promise<CacheSetResult> {
    const key = this.getPortfolioCacheKey(userId);

    try {
      // Store with TTL (same 24 hours as recommendations)
      await kv.set(key, portfolioSummary, { ex: CACHE_TTL_SECONDS });

      logger.debug("Portfolio cache set", {
        userId,
        key,
        allocationCount: portfolioSummary.allocations.length,
        ttlSeconds: CACHE_TTL_SECONDS,
      });

      return {
        success: true,
        key,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Portfolio cache set failed", {
        userId,
        key,
        error: errorMessage,
      });

      return {
        success: false,
        key,
        error: errorMessage,
      };
    }
  }

  /**
   * Store both recommendations and portfolio summary atomically
   *
   * AC-8.4.4: Cache both in a single operation for consistency
   *
   * @param userId - User ID
   * @param recommendation - Generated recommendation data
   * @returns Success/failure result with both keys
   */
  async setWithPortfolio(
    userId: string,
    recommendation: GeneratedRecommendation
  ): Promise<{ success: boolean; recsKey: string; portfolioKey: string; error?: string }> {
    const recsKey = this.getCacheKey(userId);
    const portfolioKey = this.getPortfolioCacheKey(userId);

    try {
      // Transform to cache format
      const cacheData = this.transformToCache(recommendation);

      // Build portfolio summary from recommendation data
      const portfolioSummary = this.buildPortfolioSummary(recommendation);

      // Use MSET equivalent - set both in parallel for better performance
      // Note: Vercel KV doesn't have MSET, so we use Promise.all
      await Promise.all([
        kv.set(recsKey, cacheData, { ex: CACHE_TTL_SECONDS }),
        kv.set(portfolioKey, portfolioSummary, { ex: CACHE_TTL_SECONDS }),
      ]);

      logger.debug("Cache set for recommendations and portfolio", {
        userId,
        recsKey,
        portfolioKey,
        itemCount: cacheData.recommendations.length,
        allocationCount: portfolioSummary.allocations.length,
        ttlSeconds: CACHE_TTL_SECONDS,
      });

      return {
        success: true,
        recsKey,
        portfolioKey,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Cache set with portfolio failed", {
        userId,
        recsKey,
        portfolioKey,
        error: errorMessage,
      });

      return {
        success: false,
        recsKey,
        portfolioKey,
        error: errorMessage,
      };
    }
  }

  /**
   * Build portfolio summary from recommendation data
   *
   * @param recommendation - Generated recommendation
   * @returns Portfolio summary for caching
   */
  private buildPortfolioSummary(recommendation: GeneratedRecommendation): CachedPortfolioSummary {
    // Build allocations array from allocation gaps
    const allocations = recommendation.allocationGaps.map((gap) => ({
      className: gap.className,
      currentPercent: gap.currentAllocation,
      targetMin: gap.targetMin,
      targetMax: gap.targetMax,
    }));

    // Calculate total value from allocation gaps
    let totalValue = 0;
    for (const gap of recommendation.allocationGaps) {
      totalValue += parseFloat(gap.currentValue);
    }

    return {
      totalValue: totalValue.toFixed(4),
      assetCount: recommendation.items.length,
      allocations,
      baseCurrency: recommendation.baseCurrency,
      cachedAt: new Date().toISOString(),
    };
  }

  /**
   * Invalidate both recommendations and portfolio cache for a user
   *
   * @param userId - User ID to invalidate cache for
   * @returns Success/failure result
   */
  async invalidateWithPortfolio(userId: string): Promise<CacheSetResult> {
    const recsKey = this.getCacheKey(userId);
    const portfolioKey = this.getPortfolioCacheKey(userId);

    try {
      await Promise.all([kv.del(recsKey), kv.del(portfolioKey)]);

      logger.debug("Cache invalidated (recommendations and portfolio)", {
        userId,
        recsKey,
        portfolioKey,
      });

      return {
        success: true,
        key: `${recsKey}, ${portfolioKey}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Cache invalidation with portfolio failed", {
        userId,
        recsKey,
        portfolioKey,
        error: errorMessage,
      });

      return {
        success: false,
        key: `${recsKey}, ${portfolioKey}`,
        error: errorMessage,
      };
    }
  }
}

/**
 * Default recommendation cache service instance
 */
export const recommendationCacheService = new RecommendationCacheService();
