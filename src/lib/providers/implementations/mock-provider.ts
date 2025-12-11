/**
 * Mock Providers for Testing
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.1, AC-6.1.2, AC-6.1.3: Provider Interface Implementation
 *
 * Provides mock implementations of provider interfaces for testing.
 * Supports configurable success/failure modes and delays.
 *
 * @module @/lib/providers/implementations/mock-provider
 */

import type {
  PriceProvider,
  PriceResult,
  ExchangeRateProvider,
  ExchangeRateResult,
  FundamentalsProvider,
  FundamentalsResult,
} from "../types";
import { ProviderError, PROVIDER_ERROR_CODES } from "../types";

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for mock provider behavior
 */
export interface MockProviderConfig {
  /** Whether the provider should succeed */
  shouldSucceed: boolean;
  /** Delay in milliseconds before responding */
  delayMs: number;
  /** Error message to use when failing */
  errorMessage?: string;
  /** Error code to use when failing */
  errorCode?: string;
  /** Whether health check should pass */
  isHealthy: boolean;
}

/**
 * Default mock provider configuration
 */
export const DEFAULT_MOCK_CONFIG: MockProviderConfig = {
  shouldSucceed: true,
  delayMs: 0,
  isHealthy: true,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// MOCK PRICE PROVIDER
// =============================================================================

/**
 * Mock Price Provider
 *
 * AC-6.1.1: Implements PriceProvider interface
 * AC-6.1.3: Can be swapped with other providers
 */
export class MockPriceProvider implements PriceProvider {
  public readonly name: string;
  private config: MockProviderConfig;
  private customPrices: Map<string, PriceResult> = new Map();

  constructor(name: string = "mock-price", config: Partial<MockProviderConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_MOCK_CONFIG, ...config };
  }

  /**
   * Update provider configuration
   */
  configure(config: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set success mode
   */
  setSuccess(): void {
    this.config.shouldSucceed = true;
  }

  /**
   * Set failure mode
   */
  setFailure(errorMessage?: string): void {
    this.config.shouldSucceed = false;
    this.config.errorMessage = errorMessage ?? "Mock provider failure";
  }

  /**
   * Set response delay
   */
  setDelay(delayMs: number): void {
    this.config.delayMs = delayMs;
  }

  /**
   * Set custom price data for a symbol
   */
  setPrice(symbol: string, price: Partial<PriceResult>): void {
    const now = new Date();
    this.customPrices.set(symbol, {
      symbol,
      close: "100.00",
      currency: "USD",
      source: this.name,
      fetchedAt: now,
      priceDate: now,
      ...price,
    });
  }

  /**
   * Fetch prices for symbols
   */
  async fetchPrices(symbols: string[]): Promise<PriceResult[]> {
    await sleep(this.config.delayMs);

    if (!this.config.shouldSucceed) {
      throw new ProviderError(
        this.config.errorMessage ?? "Mock provider failure",
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name
      );
    }

    const now = new Date();
    return symbols.map((symbol) => {
      // Return custom price if set
      const customPrice = this.customPrices.get(symbol);
      if (customPrice) {
        return { ...customPrice, fetchedAt: now };
      }

      // Generate default mock price
      return {
        symbol,
        open: "99.50",
        high: "101.00",
        low: "98.00",
        close: "100.00",
        volume: "1000000",
        currency: "USD",
        source: this.name,
        fetchedAt: now,
        priceDate: now,
      };
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    await sleep(this.config.delayMs);
    return this.config.isHealthy;
  }
}

// =============================================================================
// MOCK EXCHANGE RATE PROVIDER
// =============================================================================

/**
 * Mock Exchange Rate Provider
 *
 * AC-6.1.2: Implements ExchangeRateProvider interface
 * AC-6.1.3: Can be swapped with other providers
 */
export class MockExchangeRateProvider implements ExchangeRateProvider {
  public readonly name: string;
  private config: MockProviderConfig;
  private customRates: Map<string, string> = new Map();

  constructor(name: string = "mock-exchange", config: Partial<MockProviderConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_MOCK_CONFIG, ...config };
  }

  /**
   * Update provider configuration
   */
  configure(config: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set success mode
   */
  setSuccess(): void {
    this.config.shouldSucceed = true;
  }

  /**
   * Set failure mode
   */
  setFailure(errorMessage?: string): void {
    this.config.shouldSucceed = false;
    this.config.errorMessage = errorMessage ?? "Mock provider failure";
  }

  /**
   * Set response delay
   */
  setDelay(delayMs: number): void {
    this.config.delayMs = delayMs;
  }

  /**
   * Set custom exchange rate
   */
  setRate(currency: string, rate: string): void {
    this.customRates.set(currency, rate);
  }

  /**
   * Fetch exchange rates
   */
  async fetchRates(base: string, targets: string[]): Promise<ExchangeRateResult> {
    await sleep(this.config.delayMs);

    if (!this.config.shouldSucceed) {
      throw new ProviderError(
        this.config.errorMessage ?? "Mock provider failure",
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name
      );
    }

    const now = new Date();
    const rates: Record<string, string> = {};

    for (const target of targets) {
      // Use custom rate if set
      const customRate = this.customRates.get(target);
      if (customRate) {
        rates[target] = customRate;
      } else {
        // Generate default mock rate
        rates[target] = target === base ? "1.0000" : "1.2345";
      }
    }

    return {
      base,
      rates,
      source: this.name,
      fetchedAt: now,
      rateDate: now,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    await sleep(this.config.delayMs);
    return this.config.isHealthy;
  }
}

// =============================================================================
// MOCK FUNDAMENTALS PROVIDER
// =============================================================================

/**
 * Mock Fundamentals Provider
 *
 * Implements FundamentalsProvider interface for testing
 */
export class MockFundamentalsProvider implements FundamentalsProvider {
  public readonly name: string;
  private config: MockProviderConfig;
  private customFundamentals: Map<string, FundamentalsResult> = new Map();

  constructor(name: string = "mock-fundamentals", config: Partial<MockProviderConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_MOCK_CONFIG, ...config };
  }

  /**
   * Update provider configuration
   */
  configure(config: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set success mode
   */
  setSuccess(): void {
    this.config.shouldSucceed = true;
  }

  /**
   * Set failure mode
   */
  setFailure(errorMessage?: string): void {
    this.config.shouldSucceed = false;
    this.config.errorMessage = errorMessage ?? "Mock provider failure";
  }

  /**
   * Set response delay
   */
  setDelay(delayMs: number): void {
    this.config.delayMs = delayMs;
  }

  /**
   * Set custom fundamentals data for a symbol
   */
  setFundamentals(symbol: string, data: Partial<FundamentalsResult>): void {
    const now = new Date();
    this.customFundamentals.set(symbol, {
      symbol,
      source: this.name,
      fetchedAt: now,
      dataDate: now,
      ...data,
    });
  }

  /**
   * Fetch fundamentals for symbols
   */
  async fetchFundamentals(symbols: string[]): Promise<FundamentalsResult[]> {
    await sleep(this.config.delayMs);

    if (!this.config.shouldSucceed) {
      throw new ProviderError(
        this.config.errorMessage ?? "Mock provider failure",
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name
      );
    }

    const now = new Date();
    return symbols.map((symbol) => {
      // Return custom fundamentals if set
      const custom = this.customFundamentals.get(symbol);
      if (custom) {
        return { ...custom, fetchedAt: now };
      }

      // Generate default mock fundamentals
      return {
        symbol,
        peRatio: "15.50",
        pbRatio: "2.10",
        dividendYield: "2.50",
        marketCap: "1000000000",
        revenue: "500000000",
        earnings: "50000000",
        sector: "Technology",
        industry: "Software",
        source: this.name,
        fetchedAt: now,
        dataDate: now,
      };
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    await sleep(this.config.delayMs);
    return this.config.isHealthy;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a mock price provider that always succeeds
 */
export function createSuccessfulPriceProvider(name: string = "mock-price"): MockPriceProvider {
  return new MockPriceProvider(name, { shouldSucceed: true, isHealthy: true });
}

/**
 * Create a mock price provider that always fails
 */
export function createFailingPriceProvider(
  name: string = "mock-price-fail",
  errorMessage: string = "Provider unavailable"
): MockPriceProvider {
  return new MockPriceProvider(name, {
    shouldSucceed: false,
    errorMessage,
    isHealthy: false,
  });
}

/**
 * Create a mock price provider with delay
 */
export function createDelayedPriceProvider(
  name: string = "mock-price-slow",
  delayMs: number = 1000
): MockPriceProvider {
  return new MockPriceProvider(name, { shouldSucceed: true, delayMs, isHealthy: true });
}

/**
 * Create a mock exchange rate provider that always succeeds
 */
export function createSuccessfulExchangeRateProvider(
  name: string = "mock-exchange"
): MockExchangeRateProvider {
  return new MockExchangeRateProvider(name, { shouldSucceed: true, isHealthy: true });
}

/**
 * Create a mock exchange rate provider that always fails
 */
export function createFailingExchangeRateProvider(
  name: string = "mock-exchange-fail",
  errorMessage: string = "Provider unavailable"
): MockExchangeRateProvider {
  return new MockExchangeRateProvider(name, {
    shouldSucceed: false,
    errorMessage,
    isHealthy: false,
  });
}

/**
 * Create a mock fundamentals provider that always succeeds
 */
export function createSuccessfulFundamentalsProvider(
  name: string = "mock-fundamentals"
): MockFundamentalsProvider {
  return new MockFundamentalsProvider(name, { shouldSucceed: true, isHealthy: true });
}

/**
 * Create a mock fundamentals provider that always fails
 */
export function createFailingFundamentalsProvider(
  name: string = "mock-fundamentals-fail",
  errorMessage: string = "Provider unavailable"
): MockFundamentalsProvider {
  return new MockFundamentalsProvider(name, {
    shouldSucceed: false,
    errorMessage,
    isHealthy: false,
  });
}
