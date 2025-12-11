/**
 * Prices Cache
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.2: Prices Cached with 24-Hour TTL
 *
 * Specialized caching layer for price data using Vercel KV.
 * Provides price-specific cache operations with 24-hour TTL.
 *
 * @module @/lib/providers/prices-cache
 */

import { cacheService, type CacheService } from "@/lib/cache";
import { logger } from "@/lib/telemetry/logger";
import type { PriceResult } from "./types";
import { DEFAULT_CACHE_TTL } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Cache key prefix for prices
 */
const CACHE_PREFIX = "prices";

/**
 * Default TTL for prices cache (24 hours per tech-spec)
 */
const DEFAULT_PRICES_TTL = DEFAULT_CACHE_TTL.prices; // 86400 seconds

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate cache key for single symbol prices
 *
 * AC-6.3.2: Cache key pattern prices:${symbol}:${YYYY-MM-DD}
 *
 * @param symbol - Asset symbol
 * @param date - Optional date, defaults to today
 * @returns Cache key string
 */
export function generatePricesCacheKey(symbol: string, date?: Date): string {
  const dateString = (date ?? new Date()).toISOString().split("T")[0];
  return `${CACHE_PREFIX}:${symbol.toUpperCase()}:${dateString}`;
}

/**
 * Generate cache key for batch prices
 *
 * @param symbols - Array of asset symbols
 * @param date - Optional date, defaults to today
 * @returns Cache key string
 */
export function generateBatchPricesCacheKey(symbols: string[], date?: Date): string {
  const sortedSymbols = [...symbols]
    .map((s) => s.toUpperCase())
    .sort()
    .join(",");
  const dateString = (date ?? new Date()).toISOString().split("T")[0];
  return `${CACHE_PREFIX}:batch:${dateString}:${sortedSymbols}`;
}

// =============================================================================
// PRICES CACHE CLASS
// =============================================================================

/**
 * Prices Cache
 *
 * AC-6.3.2: 24-hour TTL, cache key pattern prices:${symbol}:${date}
 *
 * Specialized caching for price data with:
 * - Single symbol get/set
 * - Batch get/set operations
 * - 24-hour TTL per tech-spec
 *
 * @example
 * ```typescript
 * const cache = new PricesCache();
 *
 * // Get single symbol
 * const price = await cache.get('PETR4');
 *
 * // Get multiple symbols
 * const cached = await cache.getMultiple(['PETR4', 'VALE3']);
 *
 * // Cache result
 * await cache.set(price);
 * ```
 */
export class PricesCache {
  private readonly cache: CacheService;
  private readonly ttlSeconds: number;

  constructor(cache?: CacheService, ttlSeconds?: number) {
    this.cache = cache ?? cacheService;
    this.ttlSeconds =
      ttlSeconds ?? (parseInt(process.env.PRICES_CACHE_TTL ?? "", 10) || DEFAULT_PRICES_TTL);
  }

  /**
   * Get cached price for a single symbol
   *
   * @param symbol - Asset symbol
   * @param date - Optional date to look up (defaults to today)
   * @returns Cached price or null if not found/expired
   */
  async get(symbol: string, date?: Date): Promise<PriceResult | null> {
    const key = generatePricesCacheKey(symbol, date);

    try {
      const cached = await this.cache.get<PriceResult>(key);

      if (cached) {
        logger.debug("Prices cache hit", { symbol, key });
        // Restore Date objects from cached strings
        return this.restoreDates(cached.data);
      }

      logger.debug("Prices cache miss", { symbol, key });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to get price from cache", {
        symbol,
        key,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache price for a single symbol
   *
   * @param price - Price result to cache
   * @param ttl - Optional TTL override in seconds
   */
  async set(price: PriceResult, ttl?: number): Promise<void> {
    const key = generatePricesCacheKey(price.symbol, price.priceDate);

    try {
      await this.cache.set(key, price, ttl ?? this.ttlSeconds, price.source);

      logger.debug("Cached price", {
        symbol: price.symbol,
        key,
        ttlSeconds: ttl ?? this.ttlSeconds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to cache price", {
        symbol: price.symbol,
        key,
        error: errorMessage,
      });
      // Don't throw - caching failures shouldn't break the operation
    }
  }

  /**
   * Get cached prices for multiple symbols
   *
   * Returns a Map of symbol -> PriceResult for cache hits.
   * Symbols not in the map are cache misses.
   *
   * @param symbols - Array of asset symbols
   * @param date - Optional date to look up (defaults to today)
   * @returns Map of cached prices
   */
  async getMultiple(symbols: string[], date?: Date): Promise<Map<string, PriceResult>> {
    const results = new Map<string, PriceResult>();

    // Use Promise.allSettled for parallel fetches with individual error handling
    const fetchPromises = symbols.map(async (symbol) => {
      const cached = await this.get(symbol, date);
      return { symbol, cached };
    });

    const settled = await Promise.allSettled(fetchPromises);

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.cached) {
        results.set(result.value.symbol.toUpperCase(), result.value.cached);
      }
    }

    logger.debug("Batch prices cache lookup", {
      requested: symbols.length,
      hits: results.size,
      misses: symbols.length - results.size,
    });

    return results;
  }

  /**
   * Cache multiple price results
   *
   * @param prices - Array of price results
   * @param ttl - Optional TTL override in seconds
   */
  async setMultiple(prices: PriceResult[], ttl?: number): Promise<void> {
    // Use Promise.allSettled for parallel caching
    const cachePromises = prices.map((p) => this.set(p, ttl));

    const settled = await Promise.allSettled(cachePromises);

    const successes = settled.filter((r) => r.status === "fulfilled").length;
    const failures = settled.filter((r) => r.status === "rejected").length;

    logger.debug("Batch prices cache set", {
      total: prices.length,
      successes,
      failures,
    });
  }

  /**
   * Delete cached price for a symbol
   *
   * @param symbol - Asset symbol
   * @param date - Optional specific date to delete
   */
  async delete(symbol: string, date?: Date): Promise<void> {
    const key = generatePricesCacheKey(symbol, date);

    try {
      await this.cache.del(key);
      logger.debug("Deleted prices cache", { symbol, key });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to delete prices cache", {
        symbol,
        key,
        error: errorMessage,
      });
    }
  }

  /**
   * Get the TTL configured for this cache
   */
  getTtl(): number {
    return this.ttlSeconds;
  }

  /**
   * Restore Date objects from cached data
   *
   * JSON serialization converts Date to strings, so we need to restore them.
   */
  private restoreDates(data: PriceResult): PriceResult {
    return {
      ...data,
      fetchedAt: new Date(data.fetchedAt),
      priceDate: new Date(data.priceDate),
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default prices cache instance
 */
export const pricesCache = new PricesCache();
