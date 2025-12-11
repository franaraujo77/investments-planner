/**
 * Gemini Fundamentals Provider
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.1: Fundamentals Include Required Metrics
 * AC-6.2.5: Source Attribution Recorded
 *
 * Primary provider for fetching asset fundamental data from Gemini API.
 * Implements FundamentalsProvider interface with:
 * - Batch fetching support (POST /v1/fundamentals/batch)
 * - Rate limiting awareness (100 requests/minute)
 * - All numeric values as strings for decimal.js precision
 *
 * @module @/lib/providers/implementations/gemini-provider
 */

import { logger } from "@/lib/telemetry/logger";
import { getEnvInt, getEnvString } from "@/lib/utils/env";
import type { FundamentalsProvider, FundamentalsResult } from "../types";
import { ProviderError, PROVIDER_ERROR_CODES } from "../types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Gemini API response for a single fundamental
 *
 * Per API docs: snake_case field names from API
 */
interface GeminiFundamentalResponse {
  symbol: string;
  pe_ratio?: number | null;
  pb_ratio?: number | null;
  dividend_yield?: number | null;
  market_cap?: number | null;
  revenue?: number | null;
  net_income?: number | null;
  sector?: string | null;
  industry?: string | null;
  data_date: string;
}

/**
 * Gemini batch API response
 */
interface GeminiBatchResponse {
  data: GeminiFundamentalResponse[];
  errors?: Array<{
    symbol: string;
    error: string;
    code: string;
  }>;
}

/**
 * Configuration for GeminiFundamentalsProvider
 */
export interface GeminiProviderConfig {
  /** Gemini API base URL */
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

const DEFAULT_BASE_URL = "https://api.gemini.example.com";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_BATCH_SIZE = 50;

// =============================================================================
// GEMINI PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * Gemini Fundamentals Provider
 *
 * AC-6.2.1: Fetches P/E, P/B, dividend yield, market cap, revenue, earnings
 * AC-6.2.5: Records source as "gemini-api" with timestamps
 *
 * @example
 * ```typescript
 * const provider = new GeminiFundamentalsProvider({
 *   apiKey: process.env.GEMINI_API_KEY,
 * });
 *
 * const fundamentals = await provider.fetchFundamentals(['PETR4', 'VALE3']);
 * ```
 */
export class GeminiFundamentalsProvider implements FundamentalsProvider {
  public readonly name = "gemini-api";

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly batchSize: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? getEnvString("GEMINI_API_URL", DEFAULT_BASE_URL);
    this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.batchSize = config.batchSize ?? getEnvInt("FUNDAMENTALS_BATCH_SIZE", DEFAULT_BATCH_SIZE);

    if (!this.apiKey) {
      logger.warn("GeminiFundamentalsProvider initialized without API key", {
        provider: this.name,
      });
    }
  }

  /**
   * Fetch fundamentals for multiple symbols
   *
   * AC-6.2.1: Returns all required metrics
   * AC-6.2.4: Partial failures don't cascade - continues for other symbols
   * AC-6.2.5: Source attribution recorded
   *
   * @param symbols - Array of asset symbols to fetch
   * @returns Array of fundamentals results
   * @throws ProviderError on complete failure
   */
  async fetchFundamentals(symbols: string[]): Promise<FundamentalsResult[]> {
    if (symbols.length === 0) {
      return [];
    }

    logger.info("Fetching fundamentals from Gemini API", {
      provider: this.name,
      symbolCount: symbols.length,
      symbols: symbols.join(","),
    });

    // Process in batches if needed
    const results: FundamentalsResult[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    for (let i = 0; i < symbols.length; i += this.batchSize) {
      const batch = symbols.slice(i, i + this.batchSize);

      try {
        const batchResults = await this.fetchBatch(batch);
        results.push(...batchResults.results);
        errors.push(...batchResults.errors);
      } catch (error) {
        // Rate limiting should propagate immediately (don't retry other batches)
        if (error instanceof ProviderError && error.code === PROVIDER_ERROR_CODES.RATE_LIMITED) {
          throw error;
        }

        // Log batch failure but continue with other batches (AC-6.2.4)
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Batch fetch failed", {
          provider: this.name,
          batchStart: i,
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
    logger.info("Fundamentals fetch completed", {
      provider: this.name,
      successCount: results.length,
      errorCount: errors.length,
      failedSymbols: errors.map((e) => e.symbol).join(","),
    });

    // If ALL symbols failed, throw error
    if (results.length === 0 && errors.length > 0) {
      throw new ProviderError(
        `Failed to fetch fundamentals for all symbols: ${errors[0]?.error}`,
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
  ): Promise<{ results: FundamentalsResult[]; errors: Array<{ symbol: string; error: string }> }> {
    const url = `${this.baseUrl}/v1/fundamentals/batch`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          "X-Request-ID": `fundamentals-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
   * Transform Gemini API response to FundamentalsResult
   *
   * AC-6.2.1: All numeric values stored as strings for decimal.js precision
   * AC-6.2.5: Source and timestamps recorded
   */
  private transformResponse(item: GeminiFundamentalResponse): FundamentalsResult {
    const now = new Date();
    const dataDate = new Date(item.data_date);

    // Build result with only defined fields (exactOptionalPropertyTypes compliance)
    const result: FundamentalsResult = {
      symbol: item.symbol,
      source: this.name,
      fetchedAt: now,
      dataDate,
    };

    // Add optional fields only if they have values
    if (item.pe_ratio != null) {
      result.peRatio = String(item.pe_ratio);
    }
    if (item.pb_ratio != null) {
      result.pbRatio = String(item.pb_ratio);
    }
    if (item.dividend_yield != null) {
      result.dividendYield = String(item.dividend_yield);
    }
    if (item.market_cap != null) {
      result.marketCap = String(item.market_cap);
    }
    if (item.revenue != null) {
      result.revenue = String(item.revenue);
    }
    // Map net_income to earnings per story notes
    if (item.net_income != null) {
      result.earnings = String(item.net_income);
    }
    if (item.sector != null) {
      result.sector = item.sector;
    }
    if (item.industry != null) {
      result.industry = item.industry;
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
        logger.debug("Gemini health check passed", { provider: this.name });
        return true;
      }

      logger.warn("Gemini health check failed", {
        provider: this.name,
        status: response.status,
      });
      return false;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Gemini health check error", {
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
 * Create a Gemini fundamentals provider with environment configuration
 *
 * @returns Configured GeminiFundamentalsProvider instance
 */
export function createGeminiFundamentalsProvider(
  config?: GeminiProviderConfig
): GeminiFundamentalsProvider {
  return new GeminiFundamentalsProvider(config);
}
