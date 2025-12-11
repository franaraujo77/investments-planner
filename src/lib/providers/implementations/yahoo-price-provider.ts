/**
 * Yahoo Finance Price Provider
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.3: Yahoo Finance Fallback Used if Gemini Fails
 *
 * Fallback provider for fetching asset price data from Yahoo Finance API.
 * Implements PriceProvider interface with:
 * - Different response format mapping
 * - Rate limiting awareness (2000 requests/day)
 * - All numeric values as strings for decimal.js precision
 *
 * @module @/lib/providers/implementations/yahoo-price-provider
 */

import { logger } from "@/lib/telemetry/logger";
import type { PriceProvider, PriceResult } from "../types";
import { ProviderError, PROVIDER_ERROR_CODES } from "../types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Yahoo Finance API response for a single quote
 *
 * Per Yahoo Finance API docs: camelCase field names
 */
interface YahooQuoteResponse {
  symbol: string;
  regularMarketOpen?: number | null;
  regularMarketDayHigh?: number | null;
  regularMarketDayLow?: number | null;
  regularMarketPrice: number;
  regularMarketVolume?: number | null;
  currency: string;
  regularMarketTime?: number; // Unix timestamp
}

/**
 * Yahoo Finance batch API response
 */
interface YahooBatchResponse {
  quoteResponse: {
    result: YahooQuoteResponse[];
    error: string | null;
  };
}

/**
 * Configuration for YahooFinancePriceProvider
 */
export interface YahooPriceProviderConfig {
  /** Yahoo Finance API base URL */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum batch size per request */
  batchSize?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_BASE_URL = "https://query1.finance.yahoo.com";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_BATCH_SIZE = 50; // AC-6.3.5: Maximum 50 symbols per call

// =============================================================================
// YAHOO FINANCE PRICE PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * Yahoo Finance Price Provider
 *
 * AC-6.3.3: Fallback provider when Gemini fails
 * AC-6.3.1: Returns OHLCV data with all numeric values as strings
 *
 * @example
 * ```typescript
 * const provider = new YahooFinancePriceProvider({
 *   apiKey: process.env.YAHOO_FINANCE_API_KEY,
 * });
 *
 * const prices = await provider.fetchPrices(['PETR4.SA', 'VALE3.SA']);
 * ```
 */
export class YahooFinancePriceProvider implements PriceProvider {
  public readonly name = "yahoo-finance";

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly batchSize: number;

  constructor(config: YahooPriceProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.YAHOO_FINANCE_API_URL ?? DEFAULT_BASE_URL;
    this.apiKey = config.apiKey ?? process.env.YAHOO_FINANCE_API_KEY;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.batchSize = Math.min(
      config.batchSize ?? (parseInt(process.env.PRICES_BATCH_SIZE ?? "", 10) || DEFAULT_BATCH_SIZE),
      DEFAULT_BATCH_SIZE
    );

    if (!this.apiKey) {
      logger.warn("YahooFinancePriceProvider initialized without API key", {
        provider: this.name,
      });
    }
  }

  /**
   * Fetch prices for multiple symbols
   *
   * AC-6.3.1: Returns OHLCV data with all numeric values as strings
   * AC-6.3.3: Source attribution recorded as "yahoo-finance"
   *
   * @param symbols - Array of asset symbols to fetch
   * @returns Array of price results
   * @throws ProviderError on complete failure
   */
  async fetchPrices(symbols: string[]): Promise<PriceResult[]> {
    if (symbols.length === 0) {
      return [];
    }

    logger.info("Fetching prices from Yahoo Finance", {
      provider: this.name,
      symbolCount: symbols.length,
      symbols: symbols.slice(0, 10).join(",") + (symbols.length > 10 ? "..." : ""),
    });

    // Process in batches
    const results: PriceResult[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    for (let i = 0; i < symbols.length; i += this.batchSize) {
      const batch = symbols.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(symbols.length / this.batchSize);

      logger.debug("Processing Yahoo Finance batch", {
        provider: this.name,
        batch: batchNumber,
        totalBatches,
        batchSize: batch.length,
      });

      try {
        const batchResults = await this.fetchBatch(batch);
        results.push(...batchResults.results);
        errors.push(...batchResults.errors);
      } catch (error) {
        // Rate limiting should propagate immediately
        if (error instanceof ProviderError && error.code === PROVIDER_ERROR_CODES.RATE_LIMITED) {
          throw error;
        }

        // Partial failures in one batch don't affect other batches
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Yahoo Finance batch fetch failed", {
          provider: this.name,
          batchNumber,
          batchSize: batch.length,
          error: errorMessage,
        });

        for (const symbol of batch) {
          errors.push({ symbol, error: errorMessage });
        }
      }
    }

    // Log final results
    logger.info("Yahoo Finance prices fetch completed", {
      provider: this.name,
      successCount: results.length,
      errorCount: errors.length,
      failedSymbols: errors.length > 0 ? errors.map((e) => e.symbol).join(",") : undefined,
    });

    // If ALL symbols failed, throw error
    if (results.length === 0 && errors.length > 0) {
      throw new ProviderError(
        `Failed to fetch prices for all symbols: ${errors[0]?.error}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name,
        { errors }
      );
    }

    return results;
  }

  /**
   * Fetch a batch of symbols
   */
  private async fetchBatch(
    symbols: string[]
  ): Promise<{ results: PriceResult[]; errors: Array<{ symbol: string; error: string }> }> {
    // Yahoo Finance uses comma-separated symbols in query param
    const symbolsParam = symbols.join(",");
    const url = `${this.baseUrl}/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      // Yahoo Finance RapidAPI requires different auth header
      if (this.apiKey) {
        headers["X-RapidAPI-Key"] = this.apiKey;
        headers["X-RapidAPI-Host"] = "apidojo-yahoo-finance-v1.p.rapidapi.com";
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data: YahooBatchResponse = await response.json();

      // Check for API-level errors
      if (data.quoteResponse.error) {
        throw new ProviderError(
          `Yahoo Finance API error: ${data.quoteResponse.error}`,
          PROVIDER_ERROR_CODES.PROVIDER_FAILED,
          this.name,
          { error: data.quoteResponse.error }
        );
      }

      // Transform successful results
      const results: PriceResult[] = [];
      const errors: Array<{ symbol: string; error: string }> = [];

      // Track which symbols were returned
      const returnedSymbols = new Set(data.quoteResponse.result.map((q) => q.symbol));

      for (const quote of data.quoteResponse.result) {
        try {
          results.push(this.transformResponse(quote));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ symbol: quote.symbol, error: errorMessage });
        }
      }

      // Mark missing symbols as errors
      for (const symbol of symbols) {
        if (!returnedSymbols.has(symbol)) {
          errors.push({ symbol, error: "Symbol not found in response" });
        }
      }

      return { results, errors };
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
          { symbols }
        );
      }

      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ProviderError(
        `Network error: ${errorMessage}`,
        PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        this.name,
        { symbols }
      );
    }
  }

  /**
   * Transform Yahoo Finance API response to PriceResult
   *
   * AC-6.3.1: All numeric values stored as strings for decimal.js precision
   * AC-6.3.3: Source recorded as "yahoo-finance"
   */
  private transformResponse(quote: YahooQuoteResponse): PriceResult {
    const now = new Date();

    // Convert Unix timestamp to Date, or use today
    const priceDate = quote.regularMarketTime
      ? new Date(quote.regularMarketTime * 1000)
      : new Date();

    // Normalize price date to start of day
    priceDate.setHours(0, 0, 0, 0);

    // Build result with only defined fields (exactOptionalPropertyTypes compliance)
    const result: PriceResult = {
      symbol: this.normalizeSymbol(quote.symbol),
      close: String(quote.regularMarketPrice),
      currency: quote.currency,
      source: this.name,
      fetchedAt: now,
      priceDate,
    };

    // AC-6.3.1: Add optional OHLCV fields only if they have values
    if (quote.regularMarketOpen != null) {
      result.open = String(quote.regularMarketOpen);
    }
    if (quote.regularMarketDayHigh != null) {
      result.high = String(quote.regularMarketDayHigh);
    }
    if (quote.regularMarketDayLow != null) {
      result.low = String(quote.regularMarketDayLow);
    }
    if (quote.regularMarketVolume != null) {
      result.volume = String(quote.regularMarketVolume);
    }

    return result;
  }

  /**
   * Normalize Yahoo Finance symbol format
   *
   * Yahoo Finance uses suffixes like .SA for Brazilian stocks.
   * This removes the suffix to return the base symbol.
   */
  private normalizeSymbol(yahooSymbol: string): string {
    // Remove exchange suffix (e.g., PETR4.SA -> PETR4)
    return yahooSymbol.split(".")[0] ?? yahooSymbol;
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
   */
  async healthCheck(): Promise<boolean> {
    // Yahoo Finance doesn't have a dedicated health endpoint
    // Try a simple quote request for a known symbol
    const url = `${this.baseUrl}/v7/finance/quote?symbols=AAPL`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(this.apiKey ? { "X-RapidAPI-Key": this.apiKey } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        logger.debug("Yahoo Finance health check passed", { provider: this.name });
        return true;
      }

      logger.warn("Yahoo Finance health check failed", {
        provider: this.name,
        status: response.status,
      });
      return false;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Yahoo Finance health check error", {
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
 * Create a Yahoo Finance price provider with environment configuration
 *
 * @returns Configured YahooFinancePriceProvider instance
 */
export function createYahooFinancePriceProvider(
  config?: YahooPriceProviderConfig
): YahooFinancePriceProvider {
  return new YahooFinancePriceProvider(config);
}
