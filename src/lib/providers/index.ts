/**
 * Provider Module
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.3: Provider Implementations Are Swappable
 *
 * Main entry point for the provider abstraction layer.
 * Exports all types, services, and factory functions.
 *
 * ## Environment Variables
 *
 * Provider configuration via environment variables:
 *
 * ```bash
 * # Provider API Keys (used in Story 6.2-6.4)
 * GEMINI_API_KEY=xxx
 * YAHOO_FINANCE_API_KEY=xxx
 * EXCHANGE_RATE_API_KEY=xxx
 * OPEN_EXCHANGE_APP_ID=xxx
 *
 * # Timeouts and limits
 * PROVIDER_TIMEOUT_MS=10000          # Default: 10000 (10s)
 * PROVIDER_RETRY_ATTEMPTS=3          # Default: 3
 * CIRCUIT_BREAKER_THRESHOLD=5        # Default: 5
 * CIRCUIT_BREAKER_RESET_MS=300000    # Default: 300000 (5 minutes)
 *
 * # Cache TTLs
 * CACHE_TTL_PRICES=86400             # Default: 86400 (24 hours)
 * CACHE_TTL_EXCHANGE_RATES=86400     # Default: 86400 (24 hours)
 * CACHE_TTL_FUNDAMENTALS=604800      # Default: 604800 (7 days)
 * ```
 *
 * @module @/lib/providers
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Result types
  PriceResult,
  ExchangeRateResult,
  FundamentalsResult,
  FreshnessInfo,

  // Provider interfaces
  PriceProvider,
  ExchangeRateProvider,
  FundamentalsProvider,

  // Configuration types
  RetryConfig,
  CircuitBreakerConfig,
  CacheTTLConfig,
  ProviderServiceOptions,
  ProviderServiceResult,

  // Error types
  ProviderErrorCode,
} from "./types";

export {
  // Constants
  PROVIDER_ERROR_CODES,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_CACHE_TTL,

  // Error class
  ProviderError,
} from "./types";

// =============================================================================
// SERVICE EXPORTS
// =============================================================================

export { PriceService, type PriceServiceOptions, type PriceServiceResult } from "./price-service";

export {
  ExchangeRateService,
  type ExchangeRateServiceOptions,
  type ExchangeRateServiceResult,
} from "./exchange-rate-service";

export {
  FundamentalsService,
  type FundamentalsServiceOptions,
  type FundamentalsServiceResult,
} from "./fundamentals-service";

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { withRetry, createRetryWrapper, type RetryOptions } from "./retry";

export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitBreakerRegistry,
  type CircuitBreakerState,
  type CircuitBreakerOptions,
  type CircuitState,
} from "./circuit-breaker";

// =============================================================================
// MOCK PROVIDER EXPORTS (for testing)
// =============================================================================

export {
  MockPriceProvider,
  MockExchangeRateProvider,
  MockFundamentalsProvider,
  createSuccessfulPriceProvider,
  createFailingPriceProvider,
  createDelayedPriceProvider,
  createSuccessfulExchangeRateProvider,
  createFailingExchangeRateProvider,
  createSuccessfulFundamentalsProvider,
  createFailingFundamentalsProvider,
  type MockProviderConfig,
  DEFAULT_MOCK_CONFIG,
} from "./implementations/mock-provider";

// =============================================================================
// REAL PROVIDER EXPORTS (Story 6.2)
// =============================================================================

export {
  GeminiFundamentalsProvider,
  createGeminiFundamentalsProvider,
  type GeminiProviderConfig,
} from "./implementations/gemini-provider";

// =============================================================================
// PRICE PROVIDER EXPORTS (Story 6.3)
// =============================================================================

export {
  GeminiPriceProvider,
  createGeminiPriceProvider,
  type GeminiPriceProviderConfig,
} from "./implementations/gemini-price-provider";

export {
  YahooFinancePriceProvider,
  createYahooFinancePriceProvider,
  type YahooPriceProviderConfig,
} from "./implementations/yahoo-price-provider";

// =============================================================================
// CACHE EXPORTS (Story 6.2)
// =============================================================================

export {
  FundamentalsCache,
  fundamentalsCache,
  generateFundamentalsCacheKey,
  generateBatchCacheKey,
} from "./fundamentals-cache";

// =============================================================================
// CACHE EXPORTS (Story 6.3)
// =============================================================================

export {
  PricesCache,
  pricesCache,
  generatePricesCacheKey,
  generateBatchPricesCacheKey,
} from "./prices-cache";

// =============================================================================
// EXCHANGE RATE PROVIDER EXPORTS (Story 6.4)
// =============================================================================

export {
  ExchangeRateAPIProvider,
  createExchangeRateAPIProvider,
  SUPPORTED_CURRENCIES,
  getPreviousTradingDay,
  validateCurrency,
  type SupportedCurrency,
  type ExchangeRateAPIProviderConfig,
} from "./implementations/exchangerate-api-provider";

export {
  OpenExchangeRatesProvider,
  createOpenExchangeRatesProvider,
  type OpenExchangeRatesProviderConfig,
} from "./implementations/open-exchange-rates-provider";

// =============================================================================
// CACHE EXPORTS (Story 6.4)
// =============================================================================

export {
  ExchangeRatesCache,
  exchangeRatesCache,
  generateExchangeRatesCacheKey,
} from "./exchange-rates-cache";

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

import { cacheService } from "@/lib/cache";
import { PriceService, type PriceServiceOptions } from "./price-service";
import { ExchangeRateService, type ExchangeRateServiceOptions } from "./exchange-rate-service";
import { FundamentalsService, type FundamentalsServiceOptions } from "./fundamentals-service";
import {
  MockPriceProvider,
  MockExchangeRateProvider,
  MockFundamentalsProvider,
} from "./implementations/mock-provider";
import { GeminiFundamentalsProvider } from "./implementations/gemini-provider";
import { GeminiPriceProvider } from "./implementations/gemini-price-provider";
import { YahooFinancePriceProvider } from "./implementations/yahoo-price-provider";
import { ExchangeRateAPIProvider } from "./implementations/exchangerate-api-provider";
import { OpenExchangeRatesProvider } from "./implementations/open-exchange-rates-provider";
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG, DEFAULT_CACHE_TTL } from "./types";
import { logger } from "@/lib/telemetry/logger";

/**
 * Get retry configuration from environment or defaults
 */
function getRetryConfig() {
  return {
    maxAttempts:
      parseInt(process.env.PROVIDER_RETRY_ATTEMPTS ?? "", 10) || DEFAULT_RETRY_CONFIG.maxAttempts,
    backoffMs: DEFAULT_RETRY_CONFIG.backoffMs,
    timeoutMs:
      parseInt(process.env.PROVIDER_TIMEOUT_MS ?? "", 10) || DEFAULT_RETRY_CONFIG.timeoutMs,
  };
}

/**
 * Get circuit breaker configuration from environment or defaults
 */
function getCircuitBreakerConfig() {
  return {
    failureThreshold:
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? "", 10) ||
      DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
    resetTimeoutMs:
      parseInt(process.env.CIRCUIT_BREAKER_RESET_MS ?? "", 10) ||
      DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs,
  };
}

/**
 * Get cache TTL configuration from environment or defaults
 */
function getCacheTTLConfig() {
  return {
    prices: parseInt(process.env.CACHE_TTL_PRICES ?? "", 10) || DEFAULT_CACHE_TTL.prices,
    exchangeRates:
      parseInt(process.env.CACHE_TTL_EXCHANGE_RATES ?? "", 10) || DEFAULT_CACHE_TTL.exchangeRates,
    fundamentals:
      parseInt(process.env.CACHE_TTL_FUNDAMENTALS ?? "", 10) || DEFAULT_CACHE_TTL.fundamentals,
  };
}

/**
 * Create a configured PriceService
 *
 * AC-6.1.3: Factory function for provider swapping
 * Story 6.3: Uses GeminiPriceProvider as primary, YahooFinancePriceProvider as fallback
 *
 * Provider selection:
 * - If GEMINI_API_KEY is set: Uses GeminiPriceProvider as primary
 * - If YAHOO_FINANCE_API_KEY is set: Uses YahooFinancePriceProvider as fallback
 * - Otherwise: Uses Mock providers for development/testing
 *
 * @param options - Optional overrides for service configuration
 * @returns Configured PriceService instance
 *
 * @example
 * ```typescript
 * // Use default configuration (auto-selects based on env)
 * const priceService = getPriceService();
 *
 * // Use custom providers
 * const priceService = getPriceService({
 *   primary: myGeminiProvider,
 *   fallback: myYahooProvider,
 * });
 * ```
 */
export function getPriceService(options?: Partial<PriceServiceOptions>): PriceService {
  const retryConfig = getRetryConfig();
  const circuitBreakerConfig = getCircuitBreakerConfig();
  const cacheTTL = getCacheTTLConfig();

  // Select primary provider based on API key availability
  let primary = options?.primary;
  let fallback = options?.fallback;

  if (!primary) {
    if (process.env.GEMINI_API_KEY) {
      // Story 6.3: Use Gemini as primary when API key is available
      primary = new GeminiPriceProvider();
      logger.info("PriceService initialized with GeminiPriceProvider", {
        primary: "gemini-api",
      });
    } else {
      // Development/testing mode: use mock providers
      primary = new MockPriceProvider("mock-primary-price");
      logger.info("PriceService initialized with MockProviders (no GEMINI_API_KEY)", {
        primary: "mock-primary-price",
      });
    }
  }

  if (!fallback) {
    if (process.env.YAHOO_FINANCE_API_KEY || process.env.GEMINI_API_KEY) {
      // Story 6.3: Use Yahoo Finance as fallback (AC-6.3.3)
      fallback = new YahooFinancePriceProvider();
      logger.info("PriceService fallback set to YahooFinancePriceProvider", {
        fallback: "yahoo-finance",
      });
    } else {
      // Development/testing mode: use mock providers
      fallback = new MockPriceProvider("mock-fallback-price");
    }
  }

  return new PriceService({
    primary,
    fallback,
    cache: options?.cache ?? cacheService,
    cacheTtlSeconds: options?.cacheTtlSeconds ?? cacheTTL.prices,
    retryOptions: options?.retryOptions ?? retryConfig,
    circuitBreakerOptions: options?.circuitBreakerOptions ?? circuitBreakerConfig,
  });
}

/**
 * Create a configured ExchangeRateService
 *
 * AC-6.1.3: Factory function for provider swapping
 * Story 6.4: Uses ExchangeRateAPIProvider as primary, OpenExchangeRatesProvider as fallback
 *
 * Provider selection:
 * - If EXCHANGE_RATE_API_KEY is set: Uses ExchangeRateAPIProvider as primary
 * - If OPEN_EXCHANGE_RATES_APP_ID is set: Uses OpenExchangeRatesProvider as fallback
 * - Otherwise: Uses Mock providers for development/testing
 *
 * @param options - Optional overrides for service configuration
 * @returns Configured ExchangeRateService instance
 *
 * @example
 * ```typescript
 * // Use default configuration (auto-selects based on env)
 * const exchangeRateService = getExchangeRateService();
 *
 * // Use custom providers
 * const exchangeRateService = getExchangeRateService({
 *   primary: myExchangeRateApiProvider,
 *   fallback: myOpenExchangeProvider,
 * });
 * ```
 */
export function getExchangeRateService(
  options?: Partial<ExchangeRateServiceOptions>
): ExchangeRateService {
  const retryConfig = getRetryConfig();
  const circuitBreakerConfig = getCircuitBreakerConfig();
  const cacheTTL = getCacheTTLConfig();

  // Select primary provider based on API key availability
  let primary = options?.primary;
  let fallback = options?.fallback;

  if (!primary) {
    if (process.env.EXCHANGE_RATE_API_KEY) {
      // Story 6.4: Use ExchangeRate-API as primary when API key is available
      primary = new ExchangeRateAPIProvider();
      logger.info("ExchangeRateService initialized with ExchangeRateAPIProvider", {
        primary: "exchangerate-api",
      });
    } else {
      // Development/testing mode: use mock providers
      primary = new MockExchangeRateProvider("mock-primary-exchange");
      logger.info("ExchangeRateService initialized with MockProviders (no EXCHANGE_RATE_API_KEY)", {
        primary: "mock-primary-exchange",
      });
    }
  }

  if (!fallback) {
    if (process.env.OPEN_EXCHANGE_RATES_APP_ID || process.env.EXCHANGE_RATE_API_KEY) {
      // Story 6.4: Use Open Exchange Rates as fallback (AC-6.4.3)
      fallback = new OpenExchangeRatesProvider();
      logger.info("ExchangeRateService fallback set to OpenExchangeRatesProvider", {
        fallback: "open-exchange-rates",
      });
    } else {
      // Development/testing mode: use mock providers
      fallback = new MockExchangeRateProvider("mock-fallback-exchange");
    }
  }

  return new ExchangeRateService({
    primary,
    fallback,
    cache: options?.cache ?? cacheService,
    cacheTtlSeconds: options?.cacheTtlSeconds ?? cacheTTL.exchangeRates,
    retryOptions: options?.retryOptions ?? retryConfig,
    circuitBreakerOptions: options?.circuitBreakerOptions ?? circuitBreakerConfig,
  });
}

/**
 * Create a configured FundamentalsService
 *
 * AC-6.1.3: Factory function for provider swapping
 * Story 6.2: Uses GeminiProvider as primary when GEMINI_API_KEY is set
 *
 * Provider selection:
 * - If GEMINI_API_KEY is set: Uses GeminiProvider as primary, Mock as fallback
 * - Otherwise: Uses Mock providers for development/testing
 *
 * @param options - Optional overrides for service configuration
 * @returns Configured FundamentalsService instance
 *
 * @example
 * ```typescript
 * // Use default configuration (auto-selects based on env)
 * const fundamentalsService = getFundamentalsService();
 *
 * // Use custom providers
 * const fundamentalsService = getFundamentalsService({
 *   primary: myGeminiProvider,
 *   fallback: myAlphaVantageProvider,
 * });
 * ```
 */
export function getFundamentalsService(
  options?: Partial<FundamentalsServiceOptions>
): FundamentalsService {
  const retryConfig = getRetryConfig();
  const circuitBreakerConfig = getCircuitBreakerConfig();
  const cacheTTL = getCacheTTLConfig();

  // Select primary provider based on API key availability
  let primary = options?.primary;
  let fallback = options?.fallback;

  if (!primary) {
    if (process.env.GEMINI_API_KEY) {
      // Story 6.2: Use Gemini as primary when API key is available
      primary = new GeminiFundamentalsProvider();
      fallback = fallback ?? new MockFundamentalsProvider("mock-fallback-fundamentals");
      logger.info("FundamentalsService initialized with GeminiProvider", {
        primary: "gemini-api",
        fallback: "mock-fallback-fundamentals",
      });
    } else {
      // Development/testing mode: use mock providers
      primary = new MockFundamentalsProvider("mock-primary-fundamentals");
      fallback = fallback ?? new MockFundamentalsProvider("mock-fallback-fundamentals");
      logger.info("FundamentalsService initialized with MockProviders (no GEMINI_API_KEY)", {
        primary: "mock-primary-fundamentals",
        fallback: "mock-fallback-fundamentals",
      });
    }
  }

  // Build options, only include fallback if defined
  const serviceOptions: FundamentalsServiceOptions = {
    primary,
    cache: options?.cache ?? cacheService,
    cacheTtlSeconds: options?.cacheTtlSeconds ?? cacheTTL.fundamentals,
    retryOptions: options?.retryOptions ?? retryConfig,
    circuitBreakerOptions: options?.circuitBreakerOptions ?? circuitBreakerConfig,
  };

  if (fallback) {
    serviceOptions.fallback = fallback;
  }

  return new FundamentalsService(serviceOptions);
}

// =============================================================================
// CURRENCY CONVERTER FACTORY (Story 6.5)
// =============================================================================

import {
  CurrencyConverter,
  type CurrencyConverterConfig,
} from "@/lib/calculations/currency-converter";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import { eventStore } from "@/lib/events/event-store";

/**
 * Create a configured CurrencyConverter
 *
 * Story 6.5: Currency Conversion Logic
 * AC-6.5.1: Uses decimal.js for all arithmetic
 * AC-6.5.4: Integrates with EventStore for audit trail
 * AC-6.5.5: Uses ExchangeRatesRepository for stored rates
 *
 * @param options - Optional overrides for converter configuration
 * @returns Configured CurrencyConverter instance
 *
 * @example
 * ```typescript
 * // Use default configuration
 * const converter = getCurrencyConverter();
 *
 * // Convert currency
 * const result = await converter.convert('1000', 'BRL', 'USD');
 * ```
 */
export function getCurrencyConverter(
  options?: Partial<CurrencyConverterConfig>
): CurrencyConverter {
  return new CurrencyConverter({
    repository: options?.repository ?? exchangeRatesRepository,
    eventStore: options?.eventStore ?? eventStore,
    emitEvents: options?.emitEvents ?? true,
  });
}

// Re-export currency converter types
export {
  CurrencyConverter,
  CurrencyConversionError,
  type CurrencyConversionResult,
  type ConversionOptions,
  type BatchConversionInput,
  type CurrencyConverterConfig,
} from "@/lib/calculations/currency-converter";
