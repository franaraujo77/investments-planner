/**
 * Gemini Price Provider
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.1: Prices Include OHLCV Data
 * AC-6.3.5: Batch Requests Limited to 50 Symbols Per Call
 *
 * Primary provider for fetching asset price data from Gemini API.
 * Implements PriceProvider interface with:
 * - Batch fetching support (POST /v1/prices/batch)
 * - Rate limiting awareness (100 requests/minute)
 * - All numeric values as strings for decimal.js precision
 *
 * @module @/lib/providers/implementations/gemini-price-provider
 */

import { logger } from "@/lib/telemetry/logger";
import type { PriceProvider, PriceResult } from "../types";
import { ProviderError, PROVIDER_ERROR_CODES } from "../types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Gemini API response for a single price
 *
 * Per API docs: snake_case field names from API
 */
interface GeminiPriceResponse {
  symbol: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
  currency: string;
  price_date: string;
}

/**
 * Gemini batch API response
 */
interface GeminiBatchResponse {
  data: GeminiPriceResponse[];
  errors?: Array<{
    symbol: string;
    error: string;
    code: string;
  }>;
}

/**
 * Configuration for GeminiPriceProvider
 */
export interface GeminiPriceProviderConfig {
  /** Gemini API base URL */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum batch size per request (AC-6.3.5: max 50) */
  batchSize?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_BASE_URL = "https://api.gemini.example.com";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_BATCH_SIZE = 50; // AC-6.3.5: Maximum 50 symbols per call

// =============================================================================
// GEMINI PRICE PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * Gemini Price Provider
 *
 * AC-6.3.1: Fetches OHLCV data (open, high, low, close, volume)
 * AC-6.3.5: Limits batches to 50 symbols per request
 *
 * @example
 * ```typescript
 * const provider = new GeminiPriceProvider({
 *   apiKey: process.env.GEMINI_API_KEY,
 * });
 *
 * const prices = await provider.fetchPrices(['PETR4', 'VALE3']);
 * ```
 */
export class GeminiPriceProvider implements PriceProvider {
  public readonly name = "gemini-api";

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly batchSize: number;

  constructor(config: GeminiPriceProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.GEMINI_API_URL ?? DEFAULT_BASE_URL;
    this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // AC-6.3.5: Maximum 50 symbols per request
    this.batchSize = Math.min(
      config.batchSize ?? (parseInt(process.env.PRICES_BATCH_SIZE ?? "", 10) || DEFAULT_BATCH_SIZE),
      DEFAULT_BATCH_SIZE
    );

    if (!this.apiKey) {
      logger.warn("GeminiPriceProvider initialized without API key", {
        provider: this.name,
      });
    }
  }

  /**
   * Fetch prices for multiple symbols
   *
   * AC-6.3.1: Returns OHLCV data with all numeric values as strings
   * AC-6.3.5: Batches symbols into groups of 50 or fewer
   *
   * @param symbols - Array of asset symbols to fetch
   * @returns Array of price results
   * @throws ProviderError on complete failure
   */
  async fetchPrices(symbols: string[]): Promise<PriceResult[]> {
    if (symbols.length === 0) {
      return [];
    }

    logger.info("Fetching prices from Gemini API", {
      provider: this.name,
      symbolCount: symbols.length,
      symbols: symbols.slice(0, 10).join(",") + (symbols.length > 10 ? "..." : ""),
      batchSize: this.batchSize,
    });

    // AC-6.3.5: Process in batches of 50 or fewer
    const results: PriceResult[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    for (let i = 0; i < symbols.length; i += this.batchSize) {
      const batch = symbols.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(symbols.length / this.batchSize);

      logger.debug("Processing price batch", {
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
        // Rate limiting should propagate immediately (don't retry other batches)
        if (error instanceof ProviderError && error.code === PROVIDER_ERROR_CODES.RATE_LIMITED) {
          throw error;
        }

        // AC-6.3.5: Partial failures in one batch don't affect other batches
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Batch fetch failed", {
          provider: this.name,
          batchNumber,
          batchSize: batch.length,
          error: errorMessage,
        });

        // Mark all symbols in failed batch as errors
        for (const symbol of batch) {
          errors.push({ symbol, error: errorMessage });
        }
      }
    }

    // Log final results
    logger.info("Prices fetch completed", {
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
    const url = `${this.baseUrl}/v1/prices/batch`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          "X-Request-ID": `prices-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({ symbols }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data: GeminiBatchResponse = await response.json();

      // Transform successful results
      const results = data.data.map((item) => this.transformResponse(item));

      // Collect errors from response
      const errors =
        data.errors?.map((e) => ({
          symbol: e.symbol,
          error: e.error,
        })) ?? [];

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
   * Transform Gemini API response to PriceResult
   *
   * AC-6.3.1: All numeric values stored as strings for decimal.js precision
   * AC-6.3.1: Currency recorded with each price
   */
  private transformResponse(item: GeminiPriceResponse): PriceResult {
    const now = new Date();
    const priceDate = new Date(item.price_date);

    // Build result with only defined fields (exactOptionalPropertyTypes compliance)
    const result: PriceResult = {
      symbol: item.symbol,
      close: String(item.close),
      currency: item.currency,
      source: this.name,
      fetchedAt: now,
      priceDate,
    };

    // AC-6.3.1: Add optional OHLCV fields only if they have values
    if (item.open != null) {
      result.open = String(item.open);
    }
    if (item.high != null) {
      result.high = String(item.high);
    }
    if (item.low != null) {
      result.low = String(item.low);
    }
    if (item.volume != null) {
      result.volume = String(item.volume);
    }

    return result;
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
    const url = `${this.baseUrl}/v1/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        logger.debug("Gemini price health check passed", { provider: this.name });
        return true;
      }

      logger.warn("Gemini price health check failed", {
        provider: this.name,
        status: response.status,
      });
      return false;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Gemini price health check error", {
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
 * Create a Gemini price provider with environment configuration
 *
 * @returns Configured GeminiPriceProvider instance
 */
export function createGeminiPriceProvider(config?: GeminiPriceProviderConfig): GeminiPriceProvider {
  return new GeminiPriceProvider(config);
}
