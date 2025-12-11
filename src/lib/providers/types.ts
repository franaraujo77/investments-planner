/**
 * Provider Types
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.1: PriceProvider Interface
 * AC-6.1.2: ExchangeRateProvider Interface
 *
 * Defines interfaces and types for external data providers.
 * All price/rate values are stored as strings to preserve decimal.js precision.
 *
 * @module @/lib/providers/types
 */

// =============================================================================
// RESULT INTERFACES
// =============================================================================

/**
 * Price result from a provider
 *
 * AC-6.1.1: Technology-agnostic interface for price data
 * All numeric values are strings to preserve decimal.js precision
 */
export interface PriceResult {
  /** Asset symbol (e.g., "PETR4", "AAPL") */
  symbol: string;
  /** Opening price (optional) */
  open?: string;
  /** High price (optional) */
  high?: string;
  /** Low price (optional) */
  low?: string;
  /** Closing price (required) */
  close: string;
  /** Trading volume (optional) */
  volume?: string;
  /** Currency code (e.g., "BRL", "USD") */
  currency: string;
  /** Provider source name (e.g., "gemini", "yahoo") */
  source: string;
  /** Timestamp when data was fetched */
  fetchedAt: Date;
  /** Date the price is for */
  priceDate: Date;
  /** Flag indicating if data is stale (from cache fallback) */
  isStale?: boolean;
}

/**
 * Exchange rate result from a provider
 *
 * AC-6.1.2: Consistent data structure regardless of underlying provider
 */
export interface ExchangeRateResult {
  /** Base currency code (e.g., "USD") */
  base: string;
  /** Map of target currency to rate (e.g., { "BRL": "5.0123" }) */
  rates: Record<string, string>;
  /** Provider source name */
  source: string;
  /** Timestamp when data was fetched */
  fetchedAt: Date;
  /** Date the rates are for */
  rateDate: Date;
  /** Flag indicating if data is stale (from cache fallback) */
  isStale?: boolean;
}

/**
 * Fundamentals result from a provider
 *
 * Per tech-spec, includes P/E, P/B, dividend yield, market cap, etc.
 */
export interface FundamentalsResult {
  /** Asset symbol */
  symbol: string;
  /** Price-to-Earnings ratio */
  peRatio?: string;
  /** Price-to-Book ratio */
  pbRatio?: string;
  /** Dividend yield as percentage */
  dividendYield?: string;
  /** Market capitalization */
  marketCap?: string;
  /** Revenue */
  revenue?: string;
  /** Earnings */
  earnings?: string;
  /** Business sector */
  sector?: string;
  /** Industry within sector */
  industry?: string;
  /** Provider source name */
  source: string;
  /** Timestamp when data was fetched */
  fetchedAt: Date;
  /** Date the data is for */
  dataDate: Date;
  /** Flag indicating if data is stale (from cache fallback) */
  isStale?: boolean;
}

/**
 * Data freshness information
 *
 * Used to track when data was last updated and from where
 */
export interface FreshnessInfo {
  /** Provider source name */
  source: string;
  /** Timestamp when data was fetched */
  fetchedAt: Date;
  /** Whether the data is considered stale */
  isStale: boolean;
  /** When the data became stale (if applicable) */
  staleSince?: Date;
}

// =============================================================================
// PROVIDER INTERFACES
// =============================================================================

/**
 * Price provider interface
 *
 * AC-6.1.1: Technology-agnostic interface with fetchPrices() and healthCheck()
 */
export interface PriceProvider {
  /** Provider name for identification and logging */
  readonly name: string;

  /**
   * Fetch prices for multiple symbols
   *
   * @param symbols - Array of asset symbols to fetch
   * @returns Array of price results
   * @throws ProviderError on failure
   */
  fetchPrices(symbols: string[]): Promise<PriceResult[]>;

  /**
   * Check if provider is healthy and responsive
   *
   * @returns true if provider is available, false otherwise
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Exchange rate provider interface
 *
 * AC-6.1.2: Interface with fetchRates() and healthCheck()
 */
export interface ExchangeRateProvider {
  /** Provider name for identification and logging */
  readonly name: string;

  /**
   * Fetch exchange rates from base currency to target currencies
   *
   * @param base - Base currency code (e.g., "USD")
   * @param targets - Array of target currency codes
   * @returns Exchange rate result
   * @throws ProviderError on failure
   */
  fetchRates(base: string, targets: string[]): Promise<ExchangeRateResult>;

  /**
   * Check if provider is healthy and responsive
   *
   * @returns true if provider is available, false otherwise
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Fundamentals provider interface
 *
 * For fetching company/asset fundamental data
 */
export interface FundamentalsProvider {
  /** Provider name for identification and logging */
  readonly name: string;

  /**
   * Fetch fundamentals for multiple symbols
   *
   * @param symbols - Array of asset symbols to fetch
   * @returns Array of fundamentals results
   * @throws ProviderError on failure
   */
  fetchFundamentals(symbols: string[]): Promise<FundamentalsResult[]>;

  /**
   * Check if provider is healthy and responsive
   *
   * @returns true if provider is available, false otherwise
   */
  healthCheck(): Promise<boolean>;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error codes specific to provider operations
 */
export const PROVIDER_ERROR_CODES = {
  /** Provider request failed after all retries */
  PROVIDER_FAILED: "PROVIDER_FAILED",
  /** Provider circuit breaker is open */
  CIRCUIT_OPEN: "PROVIDER_CIRCUIT_OPEN",
  /** Provider request timed out */
  TIMEOUT: "PROVIDER_TIMEOUT",
  /** All providers failed and no cache available */
  ALL_PROVIDERS_FAILED: "ALL_PROVIDERS_FAILED",
  /** Invalid response from provider */
  INVALID_RESPONSE: "PROVIDER_INVALID_RESPONSE",
  /** Provider rate limit exceeded */
  RATE_LIMITED: "PROVIDER_RATE_LIMITED",
} as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[keyof typeof PROVIDER_ERROR_CODES];

/**
 * Custom error class for provider failures
 *
 * Per architecture, extends a consistent error pattern with code and statusCode
 */
export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly statusCode: number;
  public readonly provider: string;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: ProviderErrorCode,
    provider: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.provider = provider;
    this.statusCode = 502; // Bad Gateway - appropriate for external service failures
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, ProviderError);
  }

  /**
   * Convert to JSON-serializable object for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      code: this.code,
      provider: this.provider,
      details: this.details,
    };
  }
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Retry configuration for provider requests
 *
 * Per tech-spec: 3 attempts, exponential backoff (1s, 2s, 4s), 10s timeout
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Backoff delays in milliseconds for each retry */
  backoffMs: number[];
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Default retry configuration per tech-spec
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMs: [1000, 2000, 4000],
  timeoutMs: 10000,
};

/**
 * Circuit breaker configuration
 *
 * Per tech-spec: 5 failures to open, 5 minute reset timeout
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds before circuit transitions to half-open */
  resetTimeoutMs: number;
}

/**
 * Default circuit breaker configuration per tech-spec
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Cache TTL configuration in seconds
 */
export interface CacheTTLConfig {
  /** TTL for price data (24 hours) */
  prices: number;
  /** TTL for exchange rate data (24 hours) */
  exchangeRates: number;
  /** TTL for fundamentals data (7 days) */
  fundamentals: number;
}

/**
 * Default cache TTL configuration per tech-spec
 */
export const DEFAULT_CACHE_TTL: CacheTTLConfig = {
  prices: 24 * 60 * 60, // 24 hours in seconds
  exchangeRates: 24 * 60 * 60, // 24 hours in seconds
  fundamentals: 7 * 24 * 60 * 60, // 7 days in seconds
};

// =============================================================================
// SERVICE TYPES
// =============================================================================

/**
 * Options for provider service operations
 */
export interface ProviderServiceOptions {
  /** Whether to skip cache and fetch fresh data */
  skipCache?: boolean;
  /** Custom cache TTL override in seconds */
  cacheTtl?: number;
}

/**
 * Result wrapper indicating data source
 */
export interface ProviderServiceResult<T> {
  /** The fetched data */
  data: T;
  /** Whether data came from cache */
  fromCache: boolean;
  /** Freshness information */
  freshness: FreshnessInfo;
}
