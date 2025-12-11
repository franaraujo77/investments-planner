/**
 * Price Service
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.3: Provider Implementations Are Swappable
 * AC-6.1.4: Retry Logic Applied
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Orchestrates price data fetching with fallback chain:
 * Primary Provider → Fallback Provider → Cached Data (stale)
 *
 * @module @/lib/providers/price-service
 */

import { logger } from "@/lib/telemetry/logger";
import { cacheService, type CacheService } from "@/lib/cache";
import type { PriceProvider, PriceResult, ProviderServiceOptions, FreshnessInfo } from "./types";
import { ProviderError, PROVIDER_ERROR_CODES, DEFAULT_CACHE_TTL } from "./types";
import { withRetry, type RetryOptions } from "./retry";
import { CircuitBreaker, type CircuitBreakerOptions } from "./circuit-breaker";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for PriceService construction
 */
export interface PriceServiceOptions {
  /** Primary price provider */
  primary: PriceProvider;
  /** Optional fallback provider */
  fallback?: PriceProvider;
  /** Cache service instance */
  cache?: CacheService;
  /** Cache TTL in seconds */
  cacheTtlSeconds?: number;
  /** Retry configuration */
  retryOptions?: Partial<RetryOptions>;
  /** Circuit breaker configuration */
  circuitBreakerOptions?: Partial<CircuitBreakerOptions>;
}

/**
 * Result from getPrices operation
 */
export interface PriceServiceResult {
  /** Price results */
  prices: PriceResult[];
  /** Whether data came from cache */
  fromCache: boolean;
  /** Freshness information */
  freshness: FreshnessInfo;
  /** Provider that served the data */
  provider: string;
}

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate cache key for price data
 *
 * Per tech-spec: prices:${symbol}:${date}
 */
function generateCacheKey(symbols: string[]): string {
  const sortedSymbols = [...symbols].sort().join(",");
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `prices:batch:${date}:${sortedSymbols}`;
}

/**
 * Generate cache key for single symbol
 */
function generateSingleCacheKey(symbol: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `prices:${symbol}:${date}`;
}

// =============================================================================
// PRICE SERVICE CLASS
// =============================================================================

/**
 * Price Service
 *
 * Orchestrates price data fetching with:
 * - Primary → Fallback provider chain
 * - Retry logic with exponential backoff
 * - Circuit breaker for provider health
 * - Cache with stale fallback
 *
 * @example
 * ```typescript
 * const service = new PriceService({
 *   primary: geminiProvider,
 *   fallback: yahooProvider,
 *   cache: cacheService,
 * });
 *
 * const result = await service.getPrices(['AAPL', 'GOOGL']);
 * ```
 */
export class PriceService {
  private readonly primary: PriceProvider;
  private readonly fallback: PriceProvider | null;
  private readonly cache: CacheService;
  private readonly cacheTtlSeconds: number;
  private readonly retryOptions: Partial<RetryOptions>;

  private readonly primaryBreaker: CircuitBreaker;
  private readonly fallbackBreaker: CircuitBreaker | null;

  constructor(options: PriceServiceOptions) {
    this.primary = options.primary;
    this.fallback = options.fallback ?? null;
    this.cache = options.cache ?? cacheService;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL.prices;
    this.retryOptions = options.retryOptions ?? {};

    // Initialize circuit breakers
    this.primaryBreaker = new CircuitBreaker({
      providerName: this.primary.name,
      ...options.circuitBreakerOptions,
    });

    this.fallbackBreaker = this.fallback
      ? new CircuitBreaker({
          providerName: this.fallback.name,
          ...options.circuitBreakerOptions,
        })
      : null;
  }

  /**
   * Get prices for multiple symbols
   *
   * AC-6.1.3: Provider chain - Primary → Fallback → Cache (stale)
   * AC-6.1.4: Retry logic with exponential backoff
   * AC-6.1.5: Circuit breaker for provider health
   *
   * @param symbols - Array of asset symbols
   * @param options - Optional service options
   * @returns Price results with metadata
   * @throws ProviderError if all providers fail and no cache available
   */
  async getPrices(
    symbols: string[],
    options: ProviderServiceOptions = {}
  ): Promise<PriceServiceResult> {
    const cacheKey = generateCacheKey(symbols);

    // Try cache first (unless skipCache is set)
    if (!options.skipCache) {
      const cached = await this.tryGetFromCache(cacheKey, symbols);
      if (cached && !this.isDataStale(cached.prices)) {
        logger.debug("Price data served from cache", {
          symbols: symbols.join(","),
          provider: cached.provider,
        });
        return cached;
      }
    }

    // Try primary provider
    const primaryResult = await this.tryProvider(this.primary, this.primaryBreaker, symbols);
    if (primaryResult) {
      await this.cacheResult(cacheKey, symbols, primaryResult);
      return primaryResult;
    }

    // Try fallback provider
    if (this.fallback && this.fallbackBreaker) {
      const fallbackResult = await this.tryProvider(this.fallback, this.fallbackBreaker, symbols);
      if (fallbackResult) {
        await this.cacheResult(cacheKey, symbols, fallbackResult);
        return fallbackResult;
      }
    }

    // All providers failed - try to return stale cached data
    const staleCache = await this.tryGetFromCache(cacheKey, symbols);
    if (staleCache) {
      logger.warn("Returning stale cached price data", {
        symbols: symbols.join(","),
        staleSince: staleCache.freshness.staleSince?.toISOString(),
      });

      // Mark all prices as stale
      const staleResult: PriceServiceResult = {
        ...staleCache,
        prices: staleCache.prices.map((p) => ({ ...p, isStale: true })),
        freshness: {
          ...staleCache.freshness,
          isStale: true,
          staleSince: staleCache.freshness.fetchedAt,
        },
      };

      return staleResult;
    }

    // No cache available - throw error
    logger.error("All price providers failed and no cache available", {
      symbols: symbols.join(","),
      primaryProvider: this.primary.name,
      fallbackProvider: this.fallback?.name ?? "none",
    });

    throw new ProviderError(
      `Failed to fetch prices for ${symbols.join(", ")}: all providers failed and no cache available`,
      PROVIDER_ERROR_CODES.ALL_PROVIDERS_FAILED,
      "price-service",
      {
        symbols,
        primaryProvider: this.primary.name,
        fallbackProvider: this.fallback?.name,
      }
    );
  }

  /**
   * Get price for a single symbol
   */
  async getPrice(symbol: string, options: ProviderServiceOptions = {}): Promise<PriceResult> {
    const result = await this.getPrices([symbol], options);
    const price = result.prices.find((p) => p.symbol === symbol);

    if (!price) {
      throw new ProviderError(
        `Price not found for symbol: ${symbol}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        "price-service",
        { symbol }
      );
    }

    return price;
  }

  /**
   * Check health of all providers
   */
  async healthCheck(): Promise<{ primary: boolean; fallback: boolean | null }> {
    const primaryHealth = await this.safeHealthCheck(this.primary);
    const fallbackHealth = this.fallback ? await this.safeHealthCheck(this.fallback) : null;

    return {
      primary: primaryHealth,
      fallback: fallbackHealth,
    };
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): {
    primary: ReturnType<CircuitBreaker["getState"]>;
    fallback: ReturnType<CircuitBreaker["getState"]> | null;
  } {
    return {
      primary: this.primaryBreaker.getState(),
      fallback: this.fallbackBreaker?.getState() ?? null,
    };
  }

  /**
   * Try to fetch from a provider with retry and circuit breaker
   */
  private async tryProvider(
    provider: PriceProvider,
    breaker: CircuitBreaker,
    symbols: string[]
  ): Promise<PriceServiceResult | null> {
    // Check circuit breaker
    if (breaker.isOpen()) {
      logger.debug("Provider circuit is open, skipping", {
        provider: provider.name,
        nextAttempt: breaker.getState().nextAttemptAt?.toISOString(),
      });
      return null;
    }

    try {
      logger.info("Attempting to fetch prices from provider", {
        provider: provider.name,
        symbolCount: symbols.length,
        isHalfOpen: breaker.isHalfOpen(),
      });

      // Execute with retry logic
      const prices = await withRetry(() => provider.fetchPrices(symbols), {
        ...this.retryOptions,
        providerName: provider.name,
        operationName: "fetchPrices",
      });

      // Record success
      breaker.recordSuccess();

      logger.info("Successfully fetched prices from provider", {
        provider: provider.name,
        priceCount: prices.length,
      });

      return {
        prices,
        fromCache: false,
        freshness: {
          source: provider.name,
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: provider.name,
      };
    } catch (error) {
      // Record failure
      breaker.recordFailure();

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Provider failed to fetch prices", {
        provider: provider.name,
        error: errorMessage,
        circuitState: breaker.getState().state,
      });

      return null;
    }
  }

  /**
   * Try to get data from cache
   */
  private async tryGetFromCache(
    cacheKey: string,
    symbols: string[]
  ): Promise<PriceServiceResult | null> {
    try {
      const cached = await this.cache.get<PriceResult[]>(cacheKey);

      if (!cached) {
        return null;
      }

      // Validate that cache has all requested symbols
      const cachedSymbols = new Set(cached.data.map((p) => p.symbol));
      const missingSymbols = symbols.filter((s) => !cachedSymbols.has(s));

      if (missingSymbols.length > 0) {
        logger.debug("Cache missing some symbols", {
          missingSymbols: missingSymbols.join(","),
        });
        return null;
      }

      // Filter to only requested symbols
      const filteredPrices = cached.data.filter((p) => symbols.includes(p.symbol));

      return {
        prices: filteredPrices,
        fromCache: true,
        freshness: {
          source: cached.metadata?.source ?? "cache",
          fetchedAt: cached.metadata?.cachedAt ? new Date(cached.metadata.cachedAt) : new Date(),
          isStale: false,
        },
        provider: "cache",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to get prices from cache", {
        cacheKey,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache price results
   */
  private async cacheResult(
    batchKey: string,
    _symbols: string[],
    result: PriceServiceResult
  ): Promise<void> {
    try {
      // Cache batch result
      await this.cache.set(batchKey, result.prices, this.cacheTtlSeconds, result.provider);

      // Also cache individual prices for single lookups
      for (const price of result.prices) {
        const singleKey = generateSingleCacheKey(price.symbol);
        await this.cache.set(singleKey, price, this.cacheTtlSeconds, result.provider);
      }

      logger.debug("Cached price results", {
        batchKey,
        priceCount: result.prices.length,
        ttlSeconds: this.cacheTtlSeconds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't fail the operation if caching fails
      logger.warn("Failed to cache price results", {
        batchKey,
        error: errorMessage,
      });
    }
  }

  /**
   * Check if price data is stale
   *
   * Price data is considered stale if it's older than the cache TTL
   */
  private isDataStale(prices: PriceResult[]): boolean {
    if (prices.length === 0) return true;

    const now = Date.now();
    const ttlMs = this.cacheTtlSeconds * 1000;

    return prices.some((price) => {
      const fetchedAt = new Date(price.fetchedAt).getTime();
      return now - fetchedAt > ttlMs;
    });
  }

  /**
   * Safe health check that won't throw
   */
  private async safeHealthCheck(provider: PriceProvider): Promise<boolean> {
    try {
      return await provider.healthCheck();
    } catch {
      return false;
    }
  }
}
