/**
 * Market Data Cache Service
 *
 * Story 5.2: Two-Tier Refresh Architecture
 * AC-5.2.3: Cache-First Fetch Semantics
 * AC-5.2.4: PostgreSQL Fallback
 *
 * Implements cache-first data access pattern:
 * 1. Check Vercel KV cache first (fast, ephemeral)
 * 2. Fall back to PostgreSQL (durable, persistent)
 * 3. Repopulate KV cache on PostgreSQL hit
 *
 * This service orchestrates the two-tier caching architecture for market data:
 * - Prices (24-hour TTL)
 * - Exchange Rates (24-hour TTL)
 * - Fundamentals (7-day TTL)
 *
 * @module @/lib/services/data-access/market-data-cache-service
 */

import { logger } from "@/lib/telemetry/logger";
import { pricesCache, generatePricesCacheKey } from "@/lib/providers/prices-cache";
import { exchangeRatesCache } from "@/lib/providers/exchange-rates-cache";
import { fundamentalsCache } from "@/lib/providers/fundamentals-cache";
import { pricesRepository, PricesRepository } from "@/lib/repositories/prices-repository";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import {
  fundamentalsRepository,
  FundamentalsRepository,
} from "@/lib/repositories/fundamentals-repository";
import type { PriceResult, ExchangeRateResult, FundamentalsResult } from "@/lib/providers/types";
import { DEFAULT_CACHE_TTL } from "@/lib/providers/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result wrapper indicating data source and freshness
 *
 * When `found` is true, `data` contains the fetched value.
 * When `found` is false, `data` is null.
 */
export interface CacheFirstResult<T> {
  /** The fetched data (null when not found) */
  data: T | null;
  /** Data source: 'kv' (Vercel KV), 'pg' (PostgreSQL), or 'miss' (not found) */
  source: "kv" | "pg" | "miss";
  /** Whether data was found */
  found: boolean;
  /**
   * Whether KV cache repopulation was triggered (non-blocking).
   * Note: This indicates the repopulation was initiated but may still fail.
   * Errors are logged but not awaited to maintain fast response times.
   */
  kvRepopulationTriggered?: boolean;
}

/**
 * Batch result for multiple items
 */
export interface BatchCacheFirstResult<T> {
  /** Map of key to result */
  results: Map<string, CacheFirstResult<T>>;
  /** Count of KV hits */
  kvHits: number;
  /** Count of PostgreSQL hits */
  pgHits: number;
  /** Count of misses */
  misses: number;
}

/**
 * Cache write result
 */
export interface CacheWriteResult {
  /** Whether KV write succeeded */
  kvWritten: boolean;
  /** Whether PostgreSQL write succeeded */
  pgWritten: boolean;
  /** Any error messages */
  errors: string[];
}

// =============================================================================
// MARKET DATA CACHE SERVICE
// =============================================================================

/**
 * Market Data Cache Service
 *
 * AC-5.2.3: Implements cache-first fetch semantics
 * AC-5.2.4: Falls back to PostgreSQL on KV miss
 *
 * Usage pattern:
 * 1. Request goes to KV first (sub-100ms)
 * 2. On KV miss, query PostgreSQL (durable store)
 * 3. On PostgreSQL hit, repopulate KV for future requests
 * 4. On complete miss, return null (caller should fetch from provider)
 *
 * @example
 * ```typescript
 * const service = new MarketDataCacheService();
 *
 * // Get price with cache-first semantics
 * const result = await service.getPrice('PETR4');
 * if (result.found) {
 *   console.log(`Price from ${result.source}: ${result.data.close}`);
 * }
 *
 * // Write to both tiers
 * await service.writePrice(priceResult);
 * ```
 */
export class MarketDataCacheService {
  // ==========================================================================
  // PRICE OPERATIONS
  // ==========================================================================

  /**
   * Get price with cache-first semantics
   *
   * AC-5.2.3: KV first, then PostgreSQL
   * AC-5.2.4: Repopulate KV on PostgreSQL hit
   *
   * @param symbol - Asset symbol
   * @param date - Optional specific date (defaults to today)
   * @returns Cache-first result with source indication
   */
  async getPrice(symbol: string, date?: Date): Promise<CacheFirstResult<PriceResult>> {
    const upperSymbol = symbol.toUpperCase();
    const targetDate = date ?? new Date();
    const cacheKey = generatePricesCacheKey(upperSymbol, targetDate);

    // Step 1: Check KV cache
    try {
      const kvResult = await pricesCache.get(upperSymbol);
      if (kvResult) {
        logger.debug("Price KV cache hit", { symbol: upperSymbol, cacheKey });
        return {
          data: kvResult,
          source: "kv",
          found: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Price KV cache error, falling back to PostgreSQL", {
        symbol: upperSymbol,
        error: errorMessage,
      });
    }

    // Step 2: Query PostgreSQL
    try {
      const pgResult = await pricesRepository.getPriceBySymbol(upperSymbol, targetDate);
      if (pgResult) {
        const priceResult = PricesRepository.toPriceResult(pgResult);

        logger.debug("Price PostgreSQL hit", { symbol: upperSymbol });

        // Step 3: Repopulate KV cache (non-blocking)
        this.repopulateKvPrice(priceResult).catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.warn("Failed to repopulate KV price cache", {
            symbol: upperSymbol,
            error: errorMessage,
          });
        });

        return {
          data: priceResult,
          source: "pg",
          found: true,
          kvRepopulationTriggered: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Price PostgreSQL error", {
        symbol: upperSymbol,
        error: errorMessage,
      });
    }

    // Step 4: Not found in either tier
    logger.debug("Price not found in cache", { symbol: upperSymbol });
    return {
      data: null,
      source: "miss",
      found: false,
    };
  }

  /**
   * Get prices for multiple symbols with cache-first semantics
   *
   * @param symbols - Array of asset symbols
   * @param date - Optional specific date
   * @returns Batch result with per-symbol sources
   */
  async getPrices(symbols: string[], date?: Date): Promise<BatchCacheFirstResult<PriceResult>> {
    const results = new Map<string, CacheFirstResult<PriceResult>>();
    let kvHits = 0;
    let pgHits = 0;
    let misses = 0;

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const targetDate = date ?? new Date();

    // Step 1: Batch check KV cache
    const kvResults = await pricesCache.getMultiple(upperSymbols);
    const kvMisses: string[] = [];

    for (const symbol of upperSymbols) {
      const kvResult = kvResults.get(symbol);
      if (kvResult) {
        results.set(symbol, { data: kvResult, source: "kv", found: true });
        kvHits++;
      } else {
        kvMisses.push(symbol);
      }
    }

    // Step 2: Query PostgreSQL for KV misses
    if (kvMisses.length > 0) {
      try {
        const pgResults = await pricesRepository.getPricesBySymbols(kvMisses, targetDate);
        const pgResultsMap = new Map(pgResults.map((r) => [r.symbol, r]));
        const pricesForRepopulation: PriceResult[] = [];

        for (const symbol of kvMisses) {
          const pgResult = pgResultsMap.get(symbol);
          if (pgResult) {
            const priceResult = PricesRepository.toPriceResult(pgResult);
            results.set(symbol, {
              data: priceResult,
              source: "pg",
              found: true,
              kvRepopulationTriggered: true,
            });
            pgHits++;
            pricesForRepopulation.push(priceResult);
          } else {
            results.set(symbol, {
              data: null,
              source: "miss",
              found: false,
            });
            misses++;
          }
        }

        // Step 3: Repopulate KV cache for PostgreSQL hits (non-blocking)
        if (pricesForRepopulation.length > 0) {
          this.repopulateKvPrices(pricesForRepopulation).catch((err) => {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.warn("Failed to repopulate KV prices cache", {
              count: pricesForRepopulation.length,
              error: errorMessage,
            });
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Batch price PostgreSQL error", {
          symbolCount: kvMisses.length,
          error: errorMessage,
        });
        // Mark all as misses on error
        for (const symbol of kvMisses) {
          if (!results.has(symbol)) {
            results.set(symbol, {
              data: null,
              source: "miss",
              found: false,
            });
            misses++;
          }
        }
      }
    }

    logger.debug("Batch price cache lookup complete", {
      total: symbols.length,
      kvHits,
      pgHits,
      misses,
    });

    return { results, kvHits, pgHits, misses };
  }

  /**
   * Write price to both cache tiers
   *
   * AC-5.2.1: PostgreSQL as durable storage
   * AC-5.2.2: KV as hot cache
   *
   * @param price - Price result to cache
   * @returns Write result indicating success/failure per tier
   */
  async writePrice(price: PriceResult): Promise<CacheWriteResult> {
    const errors: string[] = [];
    let kvWritten = false;
    let pgWritten = false;

    // Write to PostgreSQL first (durable)
    try {
      await pricesRepository.upsertPrices([price]);
      pgWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`PostgreSQL write failed: ${errorMessage}`);
      logger.error("Failed to write price to PostgreSQL", {
        symbol: price.symbol,
        error: errorMessage,
      });
    }

    // Write to KV (hot cache)
    try {
      await pricesCache.set(price);
      kvWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`KV write failed: ${errorMessage}`);
      logger.warn("Failed to write price to KV cache", {
        symbol: price.symbol,
        error: errorMessage,
      });
    }

    return { kvWritten, pgWritten, errors };
  }

  /**
   * Write multiple prices to both cache tiers
   *
   * @param prices - Array of price results
   * @returns Aggregate write result
   */
  async writePrices(prices: PriceResult[]): Promise<CacheWriteResult> {
    if (prices.length === 0) {
      return { kvWritten: true, pgWritten: true, errors: [] };
    }

    const errors: string[] = [];
    let kvWritten = false;
    let pgWritten = false;

    // Write to PostgreSQL first (durable)
    try {
      await pricesRepository.upsertPrices(prices);
      pgWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`PostgreSQL batch write failed: ${errorMessage}`);
      logger.error("Failed to write prices to PostgreSQL", {
        count: prices.length,
        error: errorMessage,
      });
    }

    // Write to KV (hot cache)
    try {
      await pricesCache.setMultiple(prices);
      kvWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`KV batch write failed: ${errorMessage}`);
      logger.warn("Failed to write prices to KV cache", {
        count: prices.length,
        error: errorMessage,
      });
    }

    logger.info("Batch prices written to cache tiers", {
      count: prices.length,
      pgWritten,
      kvWritten,
    });

    return { kvWritten, pgWritten, errors };
  }

  // ==========================================================================
  // EXCHANGE RATE OPERATIONS
  // ==========================================================================

  /**
   * Get exchange rate with cache-first semantics
   *
   * @param base - Base currency code
   * @param target - Target currency code
   * @param date - Optional specific date
   * @returns Cache-first result
   */
  async getExchangeRate(
    base: string,
    target: string,
    date?: Date
  ): Promise<CacheFirstResult<{ rate: string; source: string; fetchedAt: Date }>> {
    const upperBase = base.toUpperCase();
    const upperTarget = target.toUpperCase();

    // Step 1: Check KV cache
    try {
      const kvResult = await exchangeRatesCache.get(upperBase, date);
      const targetRate = kvResult?.rates[upperTarget];
      if (targetRate) {
        logger.debug("Exchange rate KV cache hit", { base: upperBase, target: upperTarget });
        return {
          data: {
            rate: targetRate,
            source: kvResult.source,
            fetchedAt: kvResult.fetchedAt,
          },
          source: "kv",
          found: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Exchange rate KV cache error", {
        base: upperBase,
        target: upperTarget,
        error: errorMessage,
      });
    }

    // Step 2: Query PostgreSQL
    try {
      const pgResult = await exchangeRatesRepository.getRate(upperBase, upperTarget, date);
      if (pgResult) {
        logger.debug("Exchange rate PostgreSQL hit", { base: upperBase, target: upperTarget });

        // Repopulate KV (non-blocking)
        const rateResult: ExchangeRateResult = {
          base: pgResult.baseCurrency,
          rates: { [pgResult.targetCurrency]: pgResult.rate },
          source: pgResult.source,
          fetchedAt: pgResult.fetchedAt,
          rateDate: new Date(pgResult.rateDate),
        };
        this.repopulateKvExchangeRate(rateResult).catch((err) => {
          logger.warn("Failed to repopulate KV exchange rate", {
            base: upperBase,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        return {
          data: {
            rate: pgResult.rate,
            source: pgResult.source,
            fetchedAt: pgResult.fetchedAt,
          },
          source: "pg",
          found: true,
          kvRepopulationTriggered: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Exchange rate PostgreSQL error", {
        base: upperBase,
        target: upperTarget,
        error: errorMessage,
      });
    }

    return {
      data: null,
      source: "miss",
      found: false,
    };
  }

  /**
   * Write exchange rates to both cache tiers
   *
   * @param result - Exchange rate result from provider
   * @returns Write result
   */
  async writeExchangeRates(result: ExchangeRateResult): Promise<CacheWriteResult> {
    const errors: string[] = [];
    let kvWritten = false;
    let pgWritten = false;

    // Write to PostgreSQL first
    try {
      await exchangeRatesRepository.upsertRates(result);
      pgWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`PostgreSQL write failed: ${errorMessage}`);
      logger.error("Failed to write exchange rates to PostgreSQL", {
        base: result.base,
        error: errorMessage,
      });
    }

    // Write to KV
    try {
      await exchangeRatesCache.set(result);
      kvWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`KV write failed: ${errorMessage}`);
      logger.warn("Failed to write exchange rates to KV cache", {
        base: result.base,
        error: errorMessage,
      });
    }

    return { kvWritten, pgWritten, errors };
  }

  // ==========================================================================
  // FUNDAMENTALS OPERATIONS
  // ==========================================================================

  /**
   * Get fundamentals with cache-first semantics
   *
   * @param symbol - Asset symbol
   * @returns Cache-first result
   */
  async getFundamentals(symbol: string): Promise<CacheFirstResult<FundamentalsResult>> {
    const upperSymbol = symbol.toUpperCase();

    // Step 1: Check KV cache
    try {
      const kvResult = await fundamentalsCache.get(upperSymbol);
      if (kvResult) {
        logger.debug("Fundamentals KV cache hit", { symbol: upperSymbol });
        return {
          data: kvResult,
          source: "kv",
          found: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Fundamentals KV cache error", {
        symbol: upperSymbol,
        error: errorMessage,
      });
    }

    // Step 2: Query PostgreSQL
    try {
      const pgResult = await fundamentalsRepository.getFundamentalsBySymbol(upperSymbol);
      if (pgResult) {
        const fundamentalsResult = FundamentalsRepository.toFundamentalsResult(pgResult);

        logger.debug("Fundamentals PostgreSQL hit", { symbol: upperSymbol });

        // Repopulate KV (non-blocking)
        this.repopulateKvFundamentals(fundamentalsResult).catch((err) => {
          logger.warn("Failed to repopulate KV fundamentals", {
            symbol: upperSymbol,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        return {
          data: fundamentalsResult,
          source: "pg",
          found: true,
          kvRepopulationTriggered: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Fundamentals PostgreSQL error", {
        symbol: upperSymbol,
        error: errorMessage,
      });
    }

    return {
      data: null,
      source: "miss",
      found: false,
    };
  }

  /**
   * Get fundamentals for multiple symbols
   *
   * @param symbols - Array of asset symbols
   * @returns Batch result
   */
  async getFundamentalsBatch(
    symbols: string[]
  ): Promise<BatchCacheFirstResult<FundamentalsResult>> {
    const results = new Map<string, CacheFirstResult<FundamentalsResult>>();
    let kvHits = 0;
    let pgHits = 0;
    let misses = 0;

    const upperSymbols = symbols.map((s) => s.toUpperCase());

    // Step 1: Batch check KV cache
    const kvResults = await fundamentalsCache.getMultiple(upperSymbols);
    const kvMisses: string[] = [];

    for (const symbol of upperSymbols) {
      const kvResult = kvResults.get(symbol);
      if (kvResult) {
        results.set(symbol, { data: kvResult, source: "kv", found: true });
        kvHits++;
      } else {
        kvMisses.push(symbol);
      }
    }

    // Step 2: Query PostgreSQL for KV misses
    if (kvMisses.length > 0) {
      try {
        const pgResults = await fundamentalsRepository.getFundamentalsBySymbols(kvMisses);
        const pgResultsMap = new Map(pgResults.map((r) => [r.symbol, r]));
        const fundamentalsForRepopulation: FundamentalsResult[] = [];

        for (const symbol of kvMisses) {
          const pgResult = pgResultsMap.get(symbol);
          if (pgResult) {
            const fundamentalsResult = FundamentalsRepository.toFundamentalsResult(pgResult);
            results.set(symbol, {
              data: fundamentalsResult,
              source: "pg",
              found: true,
              kvRepopulationTriggered: true,
            });
            pgHits++;
            fundamentalsForRepopulation.push(fundamentalsResult);
          } else {
            results.set(symbol, {
              data: null,
              source: "miss",
              found: false,
            });
            misses++;
          }
        }

        // Repopulate KV (non-blocking)
        if (fundamentalsForRepopulation.length > 0) {
          this.repopulateKvFundamentalsBatch(fundamentalsForRepopulation).catch((err) => {
            logger.warn("Failed to repopulate KV fundamentals batch", {
              count: fundamentalsForRepopulation.length,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Batch fundamentals PostgreSQL error", {
          symbolCount: kvMisses.length,
          error: errorMessage,
        });
        for (const symbol of kvMisses) {
          if (!results.has(symbol)) {
            results.set(symbol, {
              data: null,
              source: "miss",
              found: false,
            });
            misses++;
          }
        }
      }
    }

    logger.debug("Batch fundamentals cache lookup complete", {
      total: symbols.length,
      kvHits,
      pgHits,
      misses,
    });

    return { results, kvHits, pgHits, misses };
  }

  /**
   * Write fundamentals to both cache tiers
   *
   * @param fundamentals - Fundamentals result
   * @returns Write result
   */
  async writeFundamentals(fundamentals: FundamentalsResult): Promise<CacheWriteResult> {
    const errors: string[] = [];
    let kvWritten = false;
    let pgWritten = false;

    // Write to PostgreSQL first
    try {
      await fundamentalsRepository.upsertFundamentals([fundamentals]);
      pgWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`PostgreSQL write failed: ${errorMessage}`);
      logger.error("Failed to write fundamentals to PostgreSQL", {
        symbol: fundamentals.symbol,
        error: errorMessage,
      });
    }

    // Write to KV
    try {
      await fundamentalsCache.set(fundamentals);
      kvWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`KV write failed: ${errorMessage}`);
      logger.warn("Failed to write fundamentals to KV cache", {
        symbol: fundamentals.symbol,
        error: errorMessage,
      });
    }

    return { kvWritten, pgWritten, errors };
  }

  /**
   * Write multiple fundamentals to both cache tiers
   *
   * @param fundamentals - Array of fundamentals results
   * @returns Write result
   */
  async writeFundamentalsBatch(fundamentals: FundamentalsResult[]): Promise<CacheWriteResult> {
    if (fundamentals.length === 0) {
      return { kvWritten: true, pgWritten: true, errors: [] };
    }

    const errors: string[] = [];
    let kvWritten = false;
    let pgWritten = false;

    // Write to PostgreSQL first
    try {
      await fundamentalsRepository.upsertFundamentals(fundamentals);
      pgWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`PostgreSQL batch write failed: ${errorMessage}`);
      logger.error("Failed to write fundamentals batch to PostgreSQL", {
        count: fundamentals.length,
        error: errorMessage,
      });
    }

    // Write to KV
    try {
      await fundamentalsCache.setMultiple(fundamentals);
      kvWritten = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`KV batch write failed: ${errorMessage}`);
      logger.warn("Failed to write fundamentals batch to KV cache", {
        count: fundamentals.length,
        error: errorMessage,
      });
    }

    logger.info("Batch fundamentals written to cache tiers", {
      count: fundamentals.length,
      pgWritten,
      kvWritten,
    });

    return { kvWritten, pgWritten, errors };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Repopulate KV cache for a single price
   */
  private async repopulateKvPrice(price: PriceResult): Promise<void> {
    await pricesCache.set(price, DEFAULT_CACHE_TTL.prices);
  }

  /**
   * Repopulate KV cache for multiple prices
   */
  private async repopulateKvPrices(prices: PriceResult[]): Promise<void> {
    await pricesCache.setMultiple(prices, DEFAULT_CACHE_TTL.prices);
  }

  /**
   * Repopulate KV cache for exchange rate
   */
  private async repopulateKvExchangeRate(result: ExchangeRateResult): Promise<void> {
    await exchangeRatesCache.set(result, DEFAULT_CACHE_TTL.exchangeRates);
  }

  /**
   * Repopulate KV cache for fundamentals
   */
  private async repopulateKvFundamentals(fundamentals: FundamentalsResult): Promise<void> {
    await fundamentalsCache.set(fundamentals, DEFAULT_CACHE_TTL.fundamentals);
  }

  /**
   * Repopulate KV cache for multiple fundamentals
   */
  private async repopulateKvFundamentalsBatch(fundamentals: FundamentalsResult[]): Promise<void> {
    await fundamentalsCache.setMultiple(fundamentals, DEFAULT_CACHE_TTL.fundamentals);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default market data cache service instance
 */
export const marketDataCacheService = new MarketDataCacheService();
