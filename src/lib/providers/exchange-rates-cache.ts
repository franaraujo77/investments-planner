/**
 * Exchange Rates Cache
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 *
 * Specialized caching layer for exchange rate data using Vercel KV.
 * Provides exchange rate-specific cache operations with 24-hour TTL.
 *
 * @module @/lib/providers/exchange-rates-cache
 */

import { cacheService, type CacheService } from "@/lib/cache";
import { logger } from "@/lib/telemetry/logger";
import type { ExchangeRateResult } from "./types";
import { DEFAULT_CACHE_TTL } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Cache key prefix for exchange rates
 */
const CACHE_PREFIX = "rates";

/**
 * Default TTL for exchange rates cache (24 hours per tech-spec)
 */
const DEFAULT_EXCHANGE_RATES_TTL = DEFAULT_CACHE_TTL.exchangeRates; // 86400 seconds

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate cache key for exchange rates
 *
 * Per tech-spec: Cache key pattern rates:${base}:${YYYY-MM-DD}
 *
 * @param base - Base currency code
 * @param date - Optional date, defaults to today
 * @returns Cache key string
 */
export function generateExchangeRatesCacheKey(base: string, date?: Date): string {
  const dateString = (date ?? new Date()).toISOString().split("T")[0];
  return `${CACHE_PREFIX}:${base.toUpperCase()}:${dateString}`;
}

// =============================================================================
// EXCHANGE RATES CACHE CLASS
// =============================================================================

/**
 * Exchange Rates Cache
 *
 * AC-6.4.4: 24-hour TTL, cache key pattern rates:${base}:${date}
 *
 * Specialized caching for exchange rate data with:
 * - Base currency-keyed get/set
 * - 24-hour TTL per tech-spec
 * - Stale data marking support
 *
 * @example
 * ```typescript
 * const cache = new ExchangeRatesCache();
 *
 * // Get cached rates
 * const rates = await cache.get('USD');
 *
 * // Cache result
 * await cache.set(result);
 * ```
 */
export class ExchangeRatesCache {
  private readonly cache: CacheService;
  private readonly ttlSeconds: number;

  constructor(cache?: CacheService, ttlSeconds?: number) {
    this.cache = cache ?? cacheService;
    this.ttlSeconds =
      ttlSeconds ??
      (parseInt(process.env.EXCHANGE_RATES_CACHE_TTL ?? "", 10) || DEFAULT_EXCHANGE_RATES_TTL);
  }

  /**
   * Get cached exchange rates for a base currency
   *
   * @param base - Base currency code
   * @param date - Optional date to look up (defaults to today)
   * @returns Cached rates or null if not found/expired
   */
  async get(base: string, date?: Date): Promise<ExchangeRateResult | null> {
    const key = generateExchangeRatesCacheKey(base, date);

    try {
      const cached = await this.cache.get<ExchangeRateResult>(key);

      if (cached) {
        logger.debug("Exchange rates cache hit", { base, key });
        // Restore Date objects from cached strings
        return this.restoreDates(cached.data);
      }

      logger.debug("Exchange rates cache miss", { base, key });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to get exchange rates from cache", {
        base,
        key,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache exchange rates result
   *
   * @param result - Exchange rate result to cache
   * @param ttl - Optional TTL override in seconds
   */
  async set(result: ExchangeRateResult, ttl?: number): Promise<void> {
    const key = generateExchangeRatesCacheKey(result.base, result.rateDate);

    try {
      await this.cache.set(key, result, ttl ?? this.ttlSeconds, result.source);

      logger.debug("Cached exchange rates", {
        base: result.base,
        key,
        rateCount: Object.keys(result.rates).length,
        ttlSeconds: ttl ?? this.ttlSeconds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to cache exchange rates", {
        base: result.base,
        key,
        error: errorMessage,
      });
      // Don't throw - caching failures shouldn't break the operation
    }
  }

  /**
   * Get cached exchange rates as stale data
   *
   * Returns cached data with isStale flag set to true.
   * Used when all providers fail but we can serve cached data.
   *
   * @param base - Base currency code
   * @param date - Optional date to look up
   * @returns Cached rates with stale flag or null if not found
   */
  async getAsStale(base: string, date?: Date): Promise<ExchangeRateResult | null> {
    const cached = await this.get(base, date);

    if (cached) {
      logger.info("Serving stale exchange rates from cache", {
        base,
        rateDate: cached.rateDate.toISOString().split("T")[0],
      });

      return {
        ...cached,
        isStale: true,
      };
    }

    return null;
  }

  /**
   * Delete cached rates for a base currency
   *
   * @param base - Base currency code
   * @param date - Optional specific date to delete
   */
  async delete(base: string, date?: Date): Promise<void> {
    const key = generateExchangeRatesCacheKey(base, date);

    try {
      await this.cache.del(key);
      logger.debug("Deleted exchange rates cache", { base, key });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to delete exchange rates cache", {
        base,
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
  private restoreDates(data: ExchangeRateResult): ExchangeRateResult {
    return {
      ...data,
      fetchedAt: new Date(data.fetchedAt),
      rateDate: new Date(data.rateDate),
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default exchange rates cache instance
 */
export const exchangeRatesCache = new ExchangeRatesCache();
