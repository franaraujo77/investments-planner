/**
 * Fundamentals Service
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.3: Provider Implementations Are Swappable
 * AC-6.1.4: Retry Logic Applied
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Orchestrates fundamentals data fetching with fallback chain:
 * Primary Provider → Fallback Provider → Cached Data (stale)
 *
 * @module @/lib/providers/fundamentals-service
 */

import { logger } from "@/lib/telemetry/logger";
import { cacheService, type CacheService } from "@/lib/cache";
import type {
  FundamentalsProvider,
  FundamentalsResult,
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
 * Options for FundamentalsService construction
 */
export interface FundamentalsServiceOptions {
  /** Primary fundamentals provider */
  primary: FundamentalsProvider;
  /** Optional fallback provider */
  fallback?: FundamentalsProvider;
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
 * Result from getFundamentals operation
 */
export interface FundamentalsServiceResult {
  /** Fundamentals results */
  fundamentals: FundamentalsResult[];
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
 * Generate cache key for fundamentals data
 *
 * Per tech-spec: fundamentals:${symbol}:${date}
 */
function generateCacheKey(symbols: string[]): string {
  const sortedSymbols = [...symbols].sort().join(",");
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `fundamentals:batch:${date}:${sortedSymbols}`;
}

/**
 * Generate cache key for single symbol
 */
function generateSingleCacheKey(symbol: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `fundamentals:${symbol}:${date}`;
}

// =============================================================================
// FUNDAMENTALS SERVICE CLASS
// =============================================================================

/**
 * Fundamentals Service
 *
 * Orchestrates fundamentals data fetching with:
 * - Primary → Fallback provider chain
 * - Retry logic with exponential backoff
 * - Circuit breaker for provider health
 * - Cache with stale fallback (7 day TTL per tech-spec)
 *
 * @example
 * ```typescript
 * const service = new FundamentalsService({
 *   primary: geminiProvider,
 *   fallback: alphaVantageProvider,
 *   cache: cacheService,
 * });
 *
 * const result = await service.getFundamentals(['AAPL', 'GOOGL']);
 * ```
 */
export class FundamentalsService {
  private readonly primary: FundamentalsProvider;
  private readonly fallback: FundamentalsProvider | null;
  private readonly cache: CacheService;
  private readonly cacheTtlSeconds: number;
  private readonly retryOptions: Partial<RetryOptions>;

  private readonly primaryBreaker: CircuitBreaker;
  private readonly fallbackBreaker: CircuitBreaker | null;

  constructor(options: FundamentalsServiceOptions) {
    this.primary = options.primary;
    this.fallback = options.fallback ?? null;
    this.cache = options.cache ?? cacheService;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL.fundamentals;
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
   * Get fundamentals for multiple symbols
   *
   * AC-6.1.3: Provider chain - Primary → Fallback → Cache (stale)
   * AC-6.1.4: Retry logic with exponential backoff
   * AC-6.1.5: Circuit breaker for provider health
   *
   * @param symbols - Array of asset symbols
   * @param options - Optional service options
   * @returns Fundamentals results with metadata
   * @throws ProviderError if all providers fail and no cache available
   */
  async getFundamentals(
    symbols: string[],
    options: ProviderServiceOptions = {}
  ): Promise<FundamentalsServiceResult> {
    const cacheKey = generateCacheKey(symbols);

    // Try cache first (unless skipCache is set)
    if (!options.skipCache) {
      const cached = await this.tryGetFromCache(cacheKey, symbols);
      if (cached && !this.isDataStale(cached.fundamentals)) {
        logger.debug("Fundamentals data served from cache", {
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
      logger.warn("Returning stale cached fundamentals data", {
        symbols: symbols.join(","),
        staleSince: staleCache.freshness.staleSince?.toISOString(),
      });

      // Mark all fundamentals as stale
      const staleResult: FundamentalsServiceResult = {
        ...staleCache,
        fundamentals: staleCache.fundamentals.map((f) => ({ ...f, isStale: true })),
        freshness: {
          ...staleCache.freshness,
          isStale: true,
          staleSince: staleCache.freshness.fetchedAt,
        },
      };

      return staleResult;
    }

    // No cache available - throw error
    logger.error("All fundamentals providers failed and no cache available", {
      symbols: symbols.join(","),
      primaryProvider: this.primary.name,
      fallbackProvider: this.fallback?.name ?? "none",
    });

    throw new ProviderError(
      `Failed to fetch fundamentals for ${symbols.join(", ")}: all providers failed and no cache available`,
      PROVIDER_ERROR_CODES.ALL_PROVIDERS_FAILED,
      "fundamentals-service",
      {
        symbols,
        primaryProvider: this.primary.name,
        fallbackProvider: this.fallback?.name,
      }
    );
  }

  /**
   * Get fundamentals for a single symbol
   */
  async getFundamental(
    symbol: string,
    options: ProviderServiceOptions = {}
  ): Promise<FundamentalsResult> {
    const result = await this.getFundamentals([symbol], options);
    const fundamental = result.fundamentals.find((f) => f.symbol === symbol);

    if (!fundamental) {
      throw new ProviderError(
        `Fundamentals not found for symbol: ${symbol}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        "fundamentals-service",
        { symbol }
      );
    }

    return fundamental;
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
    provider: FundamentalsProvider,
    breaker: CircuitBreaker,
    symbols: string[]
  ): Promise<FundamentalsServiceResult | null> {
    // Check circuit breaker
    if (breaker.isOpen()) {
      logger.debug("Provider circuit is open, skipping", {
        provider: provider.name,
        nextAttempt: breaker.getState().nextAttemptAt?.toISOString(),
      });
      return null;
    }

    try {
      logger.info("Attempting to fetch fundamentals from provider", {
        provider: provider.name,
        symbolCount: symbols.length,
        isHalfOpen: breaker.isHalfOpen(),
      });

      // Execute with retry logic
      const fundamentals = await withRetry(() => provider.fetchFundamentals(symbols), {
        ...this.retryOptions,
        providerName: provider.name,
        operationName: "fetchFundamentals",
      });

      // Record success
      breaker.recordSuccess();

      logger.info("Successfully fetched fundamentals from provider", {
        provider: provider.name,
        fundamentalsCount: fundamentals.length,
      });

      return {
        fundamentals,
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
      logger.warn("Provider failed to fetch fundamentals", {
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
  ): Promise<FundamentalsServiceResult | null> {
    try {
      const cached = await this.cache.get<FundamentalsResult[]>(cacheKey);

      if (!cached) {
        return null;
      }

      // Validate that cache has all requested symbols
      const cachedSymbols = new Set(cached.data.map((f) => f.symbol));
      const missingSymbols = symbols.filter((s) => !cachedSymbols.has(s));

      if (missingSymbols.length > 0) {
        logger.debug("Cache missing some symbols", {
          missingSymbols: missingSymbols.join(","),
        });
        return null;
      }

      // Filter to only requested symbols
      const filteredFundamentals = cached.data.filter((f) => symbols.includes(f.symbol));

      return {
        fundamentals: filteredFundamentals,
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
      logger.warn("Failed to get fundamentals from cache", {
        cacheKey,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache fundamentals results
   */
  private async cacheResult(
    batchKey: string,
    _symbols: string[],
    result: FundamentalsServiceResult
  ): Promise<void> {
    try {
      // Cache batch result
      await this.cache.set(batchKey, result.fundamentals, this.cacheTtlSeconds, result.provider);

      // Also cache individual fundamentals for single lookups
      for (const fundamental of result.fundamentals) {
        const singleKey = generateSingleCacheKey(fundamental.symbol);
        await this.cache.set(singleKey, fundamental, this.cacheTtlSeconds, result.provider);
      }

      logger.debug("Cached fundamentals results", {
        batchKey,
        fundamentalsCount: result.fundamentals.length,
        ttlSeconds: this.cacheTtlSeconds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't fail the operation if caching fails
      logger.warn("Failed to cache fundamentals results", {
        batchKey,
        error: errorMessage,
      });
    }
  }

  /**
   * Check if fundamentals data is stale
   *
   * Fundamentals data is considered stale if it's older than the cache TTL (7 days)
   */
  private isDataStale(fundamentals: FundamentalsResult[]): boolean {
    if (fundamentals.length === 0) return true;

    const now = Date.now();
    const ttlMs = this.cacheTtlSeconds * 1000;

    return fundamentals.some((f) => {
      const fetchedAt = new Date(f.fetchedAt).getTime();
      return now - fetchedAt > ttlMs;
    });
  }

  /**
   * Safe health check that won't throw
   */
  private async safeHealthCheck(provider: FundamentalsProvider): Promise<boolean> {
    try {
      return await provider.healthCheck();
    } catch {
      return false;
    }
  }
}
