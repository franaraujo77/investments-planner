/**
 * Fundamentals Cache
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.2: Data Cached with 7-Day TTL
 *
 * Specialized caching layer for fundamentals data using Vercel KV.
 * Provides fundamentals-specific cache operations with 7-day TTL.
 *
 * @module @/lib/providers/fundamentals-cache
 */

import { cacheService, type CacheService } from "@/lib/cache";
import { logger } from "@/lib/telemetry/logger";
import type { FundamentalsResult } from "./types";
import { DEFAULT_CACHE_TTL } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Cache key prefix for fundamentals
 */
const CACHE_PREFIX = "fundamentals";

/**
 * Default TTL for fundamentals cache (7 days per tech-spec)
 */
const DEFAULT_FUNDAMENTALS_TTL = DEFAULT_CACHE_TTL.fundamentals; // 604800 seconds

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate cache key for single symbol fundamentals
 *
 * Per tech-spec: fundamentals:${symbol}:${YYYY-MM-DD}
 *
 * @param symbol - Asset symbol
 * @param date - Optional date, defaults to today
 * @returns Cache key string
 */
export function generateFundamentalsCacheKey(symbol: string, date?: Date): string {
  const dateString = (date ?? new Date()).toISOString().split("T")[0];
  return `${CACHE_PREFIX}:${symbol.toUpperCase()}:${dateString}`;
}

/**
 * Generate cache key for batch fundamentals
 *
 * @param symbols - Array of asset symbols
 * @param date - Optional date, defaults to today
 * @returns Cache key string
 */
export function generateBatchCacheKey(symbols: string[], date?: Date): string {
  const sortedSymbols = [...symbols]
    .map((s) => s.toUpperCase())
    .sort()
    .join(",");
  const dateString = (date ?? new Date()).toISOString().split("T")[0];
  return `${CACHE_PREFIX}:batch:${dateString}:${sortedSymbols}`;
}

// =============================================================================
// FUNDAMENTALS CACHE CLASS
// =============================================================================

/**
 * Fundamentals Cache
 *
 * AC-6.2.2: 7-day TTL, cache key pattern fundamentals:${symbol}:${date}
 *
 * Specialized caching for fundamentals data with:
 * - Single symbol get/set
 * - Batch get/set operations
 * - 7-day TTL per tech-spec
 *
 * @example
 * ```typescript
 * const cache = new FundamentalsCache();
 *
 * // Get single symbol
 * const fundamental = await cache.get('PETR4');
 *
 * // Get multiple symbols
 * const cached = await cache.getMultiple(['PETR4', 'VALE3']);
 *
 * // Cache result
 * await cache.set(fundamental);
 * ```
 */
export class FundamentalsCache {
  private readonly cache: CacheService;
  private readonly ttlSeconds: number;

  constructor(cache?: CacheService, ttlSeconds?: number) {
    this.cache = cache ?? cacheService;
    this.ttlSeconds =
      ttlSeconds ??
      (parseInt(process.env.FUNDAMENTALS_CACHE_TTL ?? "", 10) || DEFAULT_FUNDAMENTALS_TTL);
  }

  /**
   * Get cached fundamentals for a single symbol
   *
   * @param symbol - Asset symbol
   * @returns Cached fundamentals or null if not found/expired
   */
  async get(symbol: string): Promise<FundamentalsResult | null> {
    const key = generateFundamentalsCacheKey(symbol);

    try {
      const cached = await this.cache.get<FundamentalsResult>(key);

      if (cached) {
        logger.debug("Fundamentals cache hit", { symbol, key });
        // Restore Date objects from cached strings
        return this.restoreDates(cached.data);
      }

      logger.debug("Fundamentals cache miss", { symbol, key });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to get fundamentals from cache", {
        symbol,
        key,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache fundamentals for a single symbol
   *
   * @param fundamentals - Fundamentals result to cache
   * @param ttl - Optional TTL override in seconds
   */
  async set(fundamentals: FundamentalsResult, ttl?: number): Promise<void> {
    const key = generateFundamentalsCacheKey(fundamentals.symbol, fundamentals.dataDate);

    try {
      await this.cache.set(key, fundamentals, ttl ?? this.ttlSeconds, fundamentals.source);

      logger.debug("Cached fundamentals", {
        symbol: fundamentals.symbol,
        key,
        ttlSeconds: ttl ?? this.ttlSeconds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to cache fundamentals", {
        symbol: fundamentals.symbol,
        key,
        error: errorMessage,
      });
      // Don't throw - caching failures shouldn't break the operation
    }
  }

  /**
   * Get cached fundamentals for multiple symbols
   *
   * Returns a Map of symbol -> FundamentalsResult for cache hits.
   * Symbols not in the map are cache misses.
   *
   * @param symbols - Array of asset symbols
   * @returns Map of cached fundamentals
   */
  async getMultiple(symbols: string[]): Promise<Map<string, FundamentalsResult>> {
    const results = new Map<string, FundamentalsResult>();

    // Use Promise.allSettled for parallel fetches with individual error handling
    const fetchPromises = symbols.map(async (symbol) => {
      const cached = await this.get(symbol);
      return { symbol, cached };
    });

    const settled = await Promise.allSettled(fetchPromises);

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.cached) {
        results.set(result.value.symbol.toUpperCase(), result.value.cached);
      }
    }

    logger.debug("Batch fundamentals cache lookup", {
      requested: symbols.length,
      hits: results.size,
      misses: symbols.length - results.size,
    });

    return results;
  }

  /**
   * Cache multiple fundamentals results
   *
   * @param fundamentals - Array of fundamentals results
   * @param ttl - Optional TTL override in seconds
   */
  async setMultiple(fundamentals: FundamentalsResult[], ttl?: number): Promise<void> {
    // Use Promise.allSettled for parallel caching
    const cachePromises = fundamentals.map((f) => this.set(f, ttl));

    const settled = await Promise.allSettled(cachePromises);

    const successes = settled.filter((r) => r.status === "fulfilled").length;
    const failures = settled.filter((r) => r.status === "rejected").length;

    logger.debug("Batch fundamentals cache set", {
      total: fundamentals.length,
      successes,
      failures,
    });
  }

  /**
   * Delete cached fundamentals for a symbol
   *
   * @param symbol - Asset symbol
   */
  async delete(symbol: string): Promise<void> {
    const key = generateFundamentalsCacheKey(symbol);

    try {
      await this.cache.del(key);
      logger.debug("Deleted fundamentals cache", { symbol, key });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to delete fundamentals cache", {
        symbol,
        key,
        error: errorMessage,
      });
    }
  }

  /**
   * Restore Date objects from cached data
   *
   * JSON serialization converts Date to strings, so we need to restore them.
   */
  private restoreDates(data: FundamentalsResult): FundamentalsResult {
    return {
      ...data,
      fetchedAt: new Date(data.fetchedAt),
      dataDate: new Date(data.dataDate),
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default fundamentals cache instance
 */
export const fundamentalsCache = new FundamentalsCache();
