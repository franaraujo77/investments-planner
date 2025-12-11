/**
 * Open Exchange Rates Provider
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.3: Open Exchange Rates Fallback if Primary Fails
 *
 * Fallback provider for fetching exchange rate data from Open Exchange Rates.
 * Implements ExchangeRateProvider interface with:
 * - Rate limit awareness (1000 requests/month free tier)
 * - All numeric values as strings for decimal.js precision
 * - T-1 date calculation for rates
 *
 * NOTE: Free tier only supports USD as base currency
 * For non-USD base currencies, rates are converted through USD
 *
 * @module @/lib/providers/implementations/open-exchange-rates-provider
 */

import { logger } from "@/lib/telemetry/logger";
import type { ExchangeRateProvider, ExchangeRateResult } from "../types";
import { ProviderError, PROVIDER_ERROR_CODES } from "../types";
import {
  SUPPORTED_CURRENCIES,
  validateCurrency,
  getPreviousTradingDay,
} from "./exchangerate-api-provider";
import Decimal from "decimal.js";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_BASE_URL = "https://openexchangerates.org/api";
const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Open Exchange Rates API response structure
 *
 * Per API docs: https://docs.openexchangerates.org/
 */
interface OpenExchangeRatesResponse {
  disclaimer?: string;
  license?: string;
  timestamp?: number;
  base?: string;
  rates?: Record<string, number>;
  // Error fields
  error?: boolean;
  status?: number;
  message?: string;
  description?: string;
}

/**
 * Configuration for OpenExchangeRatesProvider
 */
export interface OpenExchangeRatesProviderConfig {
  /** Open Exchange Rates API base URL */
  baseUrl?: string;
  /** App ID for authentication */
  appId?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

// =============================================================================
// OPEN EXCHANGE RATES PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * Open Exchange Rates Provider
 *
 * Fallback provider for exchange rates (1000 requests/month free tier)
 *
 * AC-6.4.3: Acts as fallback when primary provider fails
 *
 * @example
 * ```typescript
 * const provider = new OpenExchangeRatesProvider({
 *   appId: process.env.OPEN_EXCHANGE_RATES_APP_ID,
 * });
 *
 * const result = await provider.fetchRates('USD', ['BRL', 'EUR', 'GBP']);
 * ```
 */
export class OpenExchangeRatesProvider implements ExchangeRateProvider {
  public readonly name = "open-exchange-rates";

  private readonly baseUrl: string;
  private readonly appId: string | undefined;
  private readonly timeoutMs: number;

  constructor(config: OpenExchangeRatesProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.OPEN_EXCHANGE_RATES_URL ?? DEFAULT_BASE_URL;
    this.appId = config.appId ?? process.env.OPEN_EXCHANGE_RATES_APP_ID;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (!this.appId) {
      logger.warn("OpenExchangeRatesProvider initialized without App ID", {
        provider: this.name,
      });
    }
  }

  /**
   * Fetch exchange rates for target currencies
   *
   * Note: Free tier only supports USD as base currency
   * For non-USD base currencies, we fetch USD rates and convert
   *
   * @param base - Base currency code (e.g., "USD")
   * @param targets - Array of target currency codes
   * @returns Exchange rate result
   * @throws ProviderError on failure
   */
  async fetchRates(base: string, targets: string[]): Promise<ExchangeRateResult> {
    // Validate base currency
    if (!validateCurrency(base)) {
      throw new ProviderError(
        `Unsupported base currency: ${base}. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
        PROVIDER_ERROR_CODES.INVALID_RESPONSE,
        this.name,
        { base, supportedCurrencies: [...SUPPORTED_CURRENCIES] }
      );
    }

    // Validate target currencies
    const invalidTargets = targets.filter((t) => !validateCurrency(t));
    if (invalidTargets.length > 0) {
      throw new ProviderError(
        `Unsupported target currencies: ${invalidTargets.join(", ")}. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
        PROVIDER_ERROR_CODES.INVALID_RESPONSE,
        this.name,
        { invalidTargets, supportedCurrencies: [...SUPPORTED_CURRENCIES] }
      );
    }

    if (!this.appId) {
      throw new ProviderError(
        "App ID is required for Open Exchange Rates",
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name
      );
    }

    logger.info("Fetching exchange rates from Open Exchange Rates", {
      provider: this.name,
      base,
      targets: targets.join(","),
    });

    // Free tier only supports USD as base
    // If base is not USD, we need to fetch USD rates and convert
    const needsConversion = base !== "USD";
    const fetchTargets = needsConversion ? [...new Set([...targets, base])] : targets;

    // Fetch rates from USD
    const usdRates = await this.fetchUSDRates(fetchTargets);

    // Transform to requested base currency
    const result = this.transformResponse(base, targets, usdRates, needsConversion);

    logger.info("Exchange rates fetch completed", {
      provider: this.name,
      base,
      rateCount: Object.keys(result.rates).length,
      rateDate: result.rateDate.toISOString().split("T")[0],
      needsConversion,
    });

    return result;
  }

  /**
   * Fetch rates from USD base (required for free tier)
   */
  private async fetchUSDRates(targets: string[]): Promise<Record<string, number>> {
    const symbols = targets.join(",");
    const url = `${this.baseUrl}/latest.json?app_id=${this.appId}&symbols=${symbols}`;

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

      const data: OpenExchangeRatesResponse = await response.json();

      // Handle API-level errors
      if (data.error || !data.rates) {
        throw new ProviderError(
          `API error: ${data.message || data.description || "Unknown error"}`,
          PROVIDER_ERROR_CODES.INVALID_RESPONSE,
          this.name,
          { status: data.status, message: data.message, description: data.description }
        );
      }

      return data.rates;
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
          { targets }
        );
      }

      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ProviderError(
        `Network error: ${errorMessage}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name,
        { targets }
      );
    }
  }

  /**
   * Transform USD-based rates to requested base currency
   *
   * For base=EUR and target=BRL:
   * - We have USD/EUR and USD/BRL from API
   * - We need EUR/BRL = USD/BRL / USD/EUR
   */
  private transformResponse(
    base: string,
    targets: string[],
    usdRates: Record<string, number>,
    needsConversion: boolean
  ): ExchangeRateResult {
    const now = new Date();
    const rateDate = getPreviousTradingDay(now);

    const rates: Record<string, string> = {};

    if (needsConversion) {
      // Convert rates from USD to requested base
      const baseRateFromUSD = usdRates[base];

      if (!baseRateFromUSD) {
        throw new ProviderError(
          `Could not get USD to ${base} rate for conversion`,
          PROVIDER_ERROR_CODES.INVALID_RESPONSE,
          this.name,
          { base, availableRates: Object.keys(usdRates) }
        );
      }

      for (const target of targets) {
        if (target === base) {
          // Same currency = 1.0
          rates[target] = "1";
          continue;
        }

        const targetRateFromUSD = usdRates[target];
        if (targetRateFromUSD !== undefined) {
          // Convert: base/target = (USD/target) / (USD/base)
          const convertedRate = new Decimal(targetRateFromUSD).div(baseRateFromUSD);
          rates[target] = convertedRate.toString();
        } else {
          logger.warn("Missing rate for target currency", {
            provider: this.name,
            base,
            target,
          });
        }
      }
    } else {
      // USD is base, use rates directly
      for (const target of targets) {
        const rate = usdRates[target];
        if (rate !== undefined) {
          rates[target] = String(rate);
        } else {
          logger.warn("Missing rate for target currency", {
            provider: this.name,
            base,
            target,
          });
        }
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
          "Authentication failed - invalid or missing App ID",
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
   */
  async healthCheck(): Promise<boolean> {
    if (!this.appId) {
      logger.warn("Open Exchange Rates health check skipped - no App ID", {
        provider: this.name,
      });
      return false;
    }

    // Use a minimal request to check if API is responding
    const url = `${this.baseUrl}/latest.json?app_id=${this.appId}&symbols=USD`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
        const data: OpenExchangeRatesResponse = await response.json();
        if (!data.error && data.rates) {
          logger.debug("Open Exchange Rates health check passed", { provider: this.name });
          return true;
        }
      }

      logger.warn("Open Exchange Rates health check failed", {
        provider: this.name,
        status: response.status,
      });
      return false;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Open Exchange Rates health check error", {
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
 * Create an Open Exchange Rates provider with environment configuration
 *
 * @returns Configured OpenExchangeRatesProvider instance
 */
export function createOpenExchangeRatesProvider(
  config?: OpenExchangeRatesProviderConfig
): OpenExchangeRatesProvider {
  return new OpenExchangeRatesProvider(config);
}
