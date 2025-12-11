/**
 * ExchangeRate-API Provider
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.1: Rates Fetched for All Currencies in User Portfolios
 * AC-6.4.2: Rates Are Previous Trading Day Close (T-1)
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 * AC-6.4.5: Supported Currencies (USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF)
 *
 * Primary provider for fetching exchange rate data from ExchangeRate-API.
 * Implements ExchangeRateProvider interface with:
 * - Rate limit awareness (1500 requests/month)
 * - All numeric values as strings for decimal.js precision
 * - T-1 date calculation for rates
 *
 * @module @/lib/providers/implementations/exchangerate-api-provider
 */

import { logger } from "@/lib/telemetry/logger";
import type { ExchangeRateProvider, ExchangeRateResult } from "../types";
import { ProviderError, PROVIDER_ERROR_CODES } from "../types";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Supported currencies per AC-6.4.5
 */
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const DEFAULT_BASE_URL = "https://v6.exchangerate-api.com/v6";
const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * ExchangeRate-API response structure
 *
 * Per API docs: https://www.exchangerate-api.com/docs/overview
 */
interface ExchangeRateAPIResponse {
  result: "success" | "error";
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code?: string;
  conversion_rates?: Record<string, number>;
  // Error fields
  "error-type"?: string;
}

/**
 * Configuration for ExchangeRateAPIProvider
 */
export interface ExchangeRateAPIProviderConfig {
  /** ExchangeRate-API base URL */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate the previous trading day (T-1)
 *
 * AC-6.4.2: Weekend fetches use Friday's rates
 *
 * @param date - Reference date (defaults to now)
 * @returns Previous trading day date
 */
export function getPreviousTradingDay(date: Date = new Date()): Date {
  const day = date.getDay();

  // Calculate days to subtract:
  // Sunday (0) -> subtract 2 (to Friday)
  // Monday (1) -> subtract 3 (to Friday)
  // Other days -> subtract 1 (to previous day)
  const daysToSubtract = day === 0 ? 2 : day === 1 ? 3 : 1;

  const result = new Date(date);
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0); // Normalize to start of day

  return result;
}

/**
 * Validate currency code against supported currencies
 *
 * AC-6.4.5: Unsupported currencies rejected with clear error message
 */
export function validateCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

// =============================================================================
// EXCHANGERATE-API PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * ExchangeRate-API Provider
 *
 * Primary provider for exchange rates (1500 requests/month free tier)
 *
 * AC-6.4.1: Fetches rates for all requested currencies
 * AC-6.4.2: Returns T-1 rates with proper date handling
 * AC-6.4.4: Includes source attribution and timestamps
 * AC-6.4.5: Validates supported currencies
 *
 * @example
 * ```typescript
 * const provider = new ExchangeRateAPIProvider({
 *   apiKey: process.env.EXCHANGE_RATE_API_KEY,
 * });
 *
 * const result = await provider.fetchRates('USD', ['BRL', 'EUR', 'GBP']);
 * ```
 */
export class ExchangeRateAPIProvider implements ExchangeRateProvider {
  public readonly name = "exchangerate-api";

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(config: ExchangeRateAPIProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.EXCHANGE_RATE_API_URL ?? DEFAULT_BASE_URL;
    this.apiKey = config.apiKey ?? process.env.EXCHANGE_RATE_API_KEY;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (!this.apiKey) {
      logger.warn("ExchangeRateAPIProvider initialized without API key", {
        provider: this.name,
      });
    }
  }

  /**
   * Fetch exchange rates for target currencies
   *
   * AC-6.4.1: Returns rates for all requested target currencies
   * AC-6.4.2: Dates are T-1 (previous trading day)
   * AC-6.4.4: Source and timestamp included
   * AC-6.4.5: Validates all currencies
   *
   * @param base - Base currency code (e.g., "USD")
   * @param targets - Array of target currency codes
   * @returns Exchange rate result
   * @throws ProviderError on failure
   */
  async fetchRates(base: string, targets: string[]): Promise<ExchangeRateResult> {
    // AC-6.4.5: Validate base currency
    if (!validateCurrency(base)) {
      throw new ProviderError(
        `Unsupported base currency: ${base}. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
        PROVIDER_ERROR_CODES.INVALID_RESPONSE,
        this.name,
        { base, supportedCurrencies: [...SUPPORTED_CURRENCIES] }
      );
    }

    // AC-6.4.5: Validate target currencies
    const invalidTargets = targets.filter((t) => !validateCurrency(t));
    if (invalidTargets.length > 0) {
      throw new ProviderError(
        `Unsupported target currencies: ${invalidTargets.join(", ")}. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
        PROVIDER_ERROR_CODES.INVALID_RESPONSE,
        this.name,
        { invalidTargets, supportedCurrencies: [...SUPPORTED_CURRENCIES] }
      );
    }

    if (!this.apiKey) {
      throw new ProviderError(
        "API key is required for ExchangeRate-API",
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name
      );
    }

    logger.info("Fetching exchange rates from ExchangeRate-API", {
      provider: this.name,
      base,
      targets: targets.join(","),
    });

    const url = `${this.baseUrl}/${this.apiKey}/latest/${base}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": `rates-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data: ExchangeRateAPIResponse = await response.json();

      // Handle API-level errors
      if (data.result !== "success" || !data.conversion_rates) {
        throw new ProviderError(
          `API error: ${data["error-type"] || "Unknown error"}`,
          PROVIDER_ERROR_CODES.INVALID_RESPONSE,
          this.name,
          { errorType: data["error-type"] }
        );
      }

      // Transform to ExchangeRateResult
      const result = this.transformResponse(base, targets, data);

      logger.info("Exchange rates fetch completed", {
        provider: this.name,
        base,
        rateCount: Object.keys(result.rates).length,
        rateDate: result.rateDate.toISOString().split("T")[0],
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ProviderError) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderError(
          `Request timed out after ${this.timeoutMs}ms`,
          PROVIDER_ERROR_CODES.TIMEOUT,
          this.name,
          { base, targets }
        );
      }

      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ProviderError(
        `Network error: ${errorMessage}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name,
        { base, targets }
      );
    }
  }

  /**
   * Transform API response to ExchangeRateResult
   *
   * AC-6.4.2: Uses T-1 for rate date
   * AC-6.4.4: All values stored as strings for precision
   */
  private transformResponse(
    base: string,
    targets: string[],
    data: ExchangeRateAPIResponse
  ): ExchangeRateResult {
    const now = new Date();
    const rateDate = getPreviousTradingDay(now);

    // Build rates map with only requested targets
    const rates: Record<string, string> = {};

    for (const target of targets) {
      const rate = data.conversion_rates?.[target];
      if (rate !== undefined) {
        // AC-6.4.4: Store as string for decimal.js precision
        rates[target] = String(rate);
      } else {
        // AC-6.4.1: Log missing currencies but don't fail
        logger.warn("Missing rate for target currency", {
          provider: this.name,
          base,
          target,
        });
      }
    }

    return {
      base,
      rates,
      source: this.name,
      fetchedAt: now,
      rateDate,
    };
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "Unable to read error response";
    }

    // Specific error handling by status code
    switch (response.status) {
      case 401:
        throw new ProviderError(
          "Authentication failed - invalid or missing API key",
          PROVIDER_ERROR_CODES.PROVIDER_FAILED,
          this.name,
          { status: 401, body: errorBody }
        );

      case 429:
        throw new ProviderError(
          "Rate limit exceeded",
          PROVIDER_ERROR_CODES.RATE_LIMITED,
          this.name,
          { status: 429, body: errorBody }
        );

      case 500:
      case 502:
      case 503:
      case 504:
        throw new ProviderError(
          `Server error: ${response.status} ${response.statusText}`,
          PROVIDER_ERROR_CODES.PROVIDER_FAILED,
          this.name,
          { status: response.status, body: errorBody }
        );

      default:
        throw new ProviderError(
          `HTTP error: ${response.status} ${response.statusText}`,
          PROVIDER_ERROR_CODES.PROVIDER_FAILED,
          this.name,
          { status: response.status, body: errorBody }
        );
    }
  }

  /**
   * Check if provider is healthy and responsive
   *
   * AC-6.1.3: Provider health check support
   */
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      logger.warn("ExchangeRate-API health check skipped - no API key", {
        provider: this.name,
      });
      return false;
    }

    // Use a simple request to check if API is responding
    // ExchangeRate-API doesn't have a dedicated health endpoint,
    // so we use a minimal request for USD
    const url = `${this.baseUrl}/${this.apiKey}/latest/USD`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: ExchangeRateAPIResponse = await response.json();
        if (data.result === "success") {
          logger.debug("ExchangeRate-API health check passed", { provider: this.name });
          return true;
        }
      }

      logger.warn("ExchangeRate-API health check failed", {
        provider: this.name,
        status: response.status,
      });
      return false;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("ExchangeRate-API health check error", {
        provider: this.name,
        error: errorMessage,
      });
      return false;
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an ExchangeRate-API provider with environment configuration
 *
 * @returns Configured ExchangeRateAPIProvider instance
 */
export function createExchangeRateAPIProvider(
  config?: ExchangeRateAPIProviderConfig
): ExchangeRateAPIProvider {
  return new ExchangeRateAPIProvider(config);
}
