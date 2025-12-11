/**
 * Exchange Rate Service
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.3: Provider Implementations Are Swappable
 * AC-6.1.4: Retry Logic Applied
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Orchestrates exchange rate fetching with fallback chain:
 * Primary Provider → Fallback Provider → Cached Data (stale)
 *
 * @module @/lib/providers/exchange-rate-service
 */

import { logger } from "@/lib/telemetry/logger";
import { cacheService, type CacheService } from "@/lib/cache";
import type {
  ExchangeRateProvider,
  ExchangeRateResult,
  ProviderServiceOptions,
  FreshnessInfo,
} from "./types";
import { ProviderError, PROVIDER_ERROR_CODES, DEFAULT_CACHE_TTL } from "./types";
import { withRetry, type RetryOptions } from "./retry";
import { CircuitBreaker, type CircuitBreakerOptions } from "./circuit-breaker";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for ExchangeRateService construction
 */
export interface ExchangeRateServiceOptions {
  /** Primary exchange rate provider */
  primary: ExchangeRateProvider;
  /** Optional fallback provider */
  fallback?: ExchangeRateProvider;
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
 * Result from getRates operation
 */
export interface ExchangeRateServiceResult {
  /** Exchange rate result */
  rates: ExchangeRateResult;
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
 * Generate cache key for exchange rate data
 *
 * Per tech-spec: rates:${base}:${date}
 */
function generateCacheKey(base: string, targets: string[]): string {
  const sortedTargets = [...targets].sort().join(",");
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `rates:${base}:${date}:${sortedTargets}`;
}

// =============================================================================
// EXCHANGE RATE SERVICE CLASS
// =============================================================================

/**
 * Exchange Rate Service
 *
 * Orchestrates exchange rate fetching with:
 * - Primary → Fallback provider chain
 * - Retry logic with exponential backoff
 * - Circuit breaker for provider health
 * - Cache with stale fallback
 *
 * @example
 * ```typescript
 * const service = new ExchangeRateService({
 *   primary: exchangeRateApiProvider,
 *   fallback: openExchangeProvider,
 *   cache: cacheService,
 * });
 *
 * const result = await service.getRates('USD', ['BRL', 'EUR']);
 * ```
 */
export class ExchangeRateService {
  private readonly primary: ExchangeRateProvider;
  private readonly fallback: ExchangeRateProvider | null;
  private readonly cache: CacheService;
  private readonly cacheTtlSeconds: number;
  private readonly retryOptions: Partial<RetryOptions>;

  private readonly primaryBreaker: CircuitBreaker;
  private readonly fallbackBreaker: CircuitBreaker | null;

  constructor(options: ExchangeRateServiceOptions) {
    this.primary = options.primary;
    this.fallback = options.fallback ?? null;
    this.cache = options.cache ?? cacheService;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL.exchangeRates;
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
   * Get exchange rates for a base currency to target currencies
   *
   * AC-6.1.3: Provider chain - Primary → Fallback → Cache (stale)
   * AC-6.1.4: Retry logic with exponential backoff
   * AC-6.1.5: Circuit breaker for provider health
   *
   * @param base - Base currency code (e.g., "USD")
   * @param targets - Array of target currency codes
   * @param options - Optional service options
   * @returns Exchange rate results with metadata
   * @throws ProviderError if all providers fail and no cache available
   */
  async getRates(
    base: string,
    targets: string[],
    options: ProviderServiceOptions = {}
  ): Promise<ExchangeRateServiceResult> {
    const cacheKey = generateCacheKey(base, targets);

    // Try cache first (unless skipCache is set)
    if (!options.skipCache) {
      const cached = await this.tryGetFromCache(cacheKey, base, targets);
      if (cached && !this.isDataStale(cached.rates)) {
        logger.debug("Exchange rate data served from cache", {
          base,
          targets: targets.join(","),
          provider: cached.provider,
        });
        return cached;
      }
    }

    // Try primary provider
    const primaryResult = await this.tryProvider(this.primary, this.primaryBreaker, base, targets);
    if (primaryResult) {
      await this.cacheResult(cacheKey, primaryResult);
      return primaryResult;
    }

    // Try fallback provider
    if (this.fallback && this.fallbackBreaker) {
      const fallbackResult = await this.tryProvider(
        this.fallback,
        this.fallbackBreaker,
        base,
        targets
      );
      if (fallbackResult) {
        await this.cacheResult(cacheKey, fallbackResult);
        return fallbackResult;
      }
    }

    // All providers failed - try to return stale cached data
    const staleCache = await this.tryGetFromCache(cacheKey, base, targets);
    if (staleCache) {
      logger.warn("Returning stale cached exchange rate data", {
        base,
        targets: targets.join(","),
        staleSince: staleCache.freshness.staleSince?.toISOString(),
      });

      // Mark rates as stale
      const staleResult: ExchangeRateServiceResult = {
        ...staleCache,
        rates: { ...staleCache.rates, isStale: true },
        freshness: {
          ...staleCache.freshness,
          isStale: true,
          staleSince: staleCache.freshness.fetchedAt,
        },
      };

      return staleResult;
    }

    // No cache available - throw error
    logger.error("All exchange rate providers failed and no cache available", {
      base,
      targets: targets.join(","),
      primaryProvider: this.primary.name,
      fallbackProvider: this.fallback?.name ?? "none",
    });

    throw new ProviderError(
      `Failed to fetch exchange rates for ${base} → ${targets.join(", ")}: all providers failed and no cache available`,
      PROVIDER_ERROR_CODES.ALL_PROVIDERS_FAILED,
      "exchange-rate-service",
      {
        base,
        targets,
        primaryProvider: this.primary.name,
        fallbackProvider: this.fallback?.name,
      }
    );
  }

  /**
   * Get a single exchange rate
   */
  async getRate(
    base: string,
    target: string,
    options: ProviderServiceOptions = {}
  ): Promise<string> {
    const result = await this.getRates(base, [target], options);
    const rate = result.rates.rates[target];

    if (rate === undefined) {
      throw new ProviderError(
        `Exchange rate not found for ${base} → ${target}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        "exchange-rate-service",
        { base, target }
      );
    }

    return rate;
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
    provider: ExchangeRateProvider,
    breaker: CircuitBreaker,
    base: string,
    targets: string[]
  ): Promise<ExchangeRateServiceResult | null> {
    // Check circuit breaker
    if (breaker.isOpen()) {
      logger.debug("Provider circuit is open, skipping", {
        provider: provider.name,
        nextAttempt: breaker.getState().nextAttemptAt?.toISOString(),
      });
      return null;
    }

    try {
      logger.info("Attempting to fetch exchange rates from provider", {
        provider: provider.name,
        base,
        targetCount: targets.length,
        isHalfOpen: breaker.isHalfOpen(),
      });

      // Execute with retry logic
      const rates = await withRetry(() => provider.fetchRates(base, targets), {
        ...this.retryOptions,
        providerName: provider.name,
        operationName: "fetchRates",
      });

      // Record success
      breaker.recordSuccess();

      logger.info("Successfully fetched exchange rates from provider", {
        provider: provider.name,
        base,
        rateCount: Object.keys(rates.rates).length,
      });

      return {
        rates,
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
      logger.warn("Provider failed to fetch exchange rates", {
        provider: provider.name,
        base,
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
    base: string,
    targets: string[]
  ): Promise<ExchangeRateServiceResult | null> {
    try {
      const cached = await this.cache.get<ExchangeRateResult>(cacheKey);

      if (!cached) {
        return null;
      }

      // Validate that cache has all requested targets
      const cachedTargets = new Set(Object.keys(cached.data.rates));
      const missingTargets = targets.filter((t) => !cachedTargets.has(t));

      if (missingTargets.length > 0) {
        logger.debug("Cache missing some targets", {
          missingTargets: missingTargets.join(","),
        });
        return null;
      }

      // Validate base currency matches
      if (cached.data.base !== base) {
        logger.debug("Cache base currency mismatch", {
          expected: base,
          cached: cached.data.base,
        });
        return null;
      }

      // Filter to only requested targets
      const filteredRates: Record<string, string> = {};
      for (const target of targets) {
        if (cached.data.rates[target] !== undefined) {
          filteredRates[target] = cached.data.rates[target];
        }
      }

      return {
        rates: {
          ...cached.data,
          rates: filteredRates,
        },
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
      logger.warn("Failed to get exchange rates from cache", {
        cacheKey,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache exchange rate results
   */
  private async cacheResult(cacheKey: string, result: ExchangeRateServiceResult): Promise<void> {
    try {
      await this.cache.set(cacheKey, result.rates, this.cacheTtlSeconds, result.provider);

      logger.debug("Cached exchange rate results", {
        cacheKey,
        base: result.rates.base,
        rateCount: Object.keys(result.rates.rates).length,
        ttlSeconds: this.cacheTtlSeconds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't fail the operation if caching fails
      logger.warn("Failed to cache exchange rate results", {
        cacheKey,
        error: errorMessage,
      });
    }
  }

  /**
   * Check if exchange rate data is stale
   */
  private isDataStale(rates: ExchangeRateResult): boolean {
    const now = Date.now();
    const ttlMs = this.cacheTtlSeconds * 1000;
    const fetchedAt = new Date(rates.fetchedAt).getTime();
    return now - fetchedAt > ttlMs;
  }

  /**
   * Safe health check that won't throw
   */
  private async safeHealthCheck(provider: ExchangeRateProvider): Promise<boolean> {
    try {
      return await provider.healthCheck();
    } catch {
      return false;
    }
  }
}
