/**
 * Prices Validation Schemas
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.1: Prices Include OHLCV Data
 *
 * Zod schemas for validating price API requests and responses.
 * All price values are strings for decimal.js precision.
 *
 * @module @/lib/validations/prices-schemas
 */

import { z } from "zod";

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for GET /api/data/prices request parameters
 *
 * @example
 * ```typescript
 * // Valid: GET /api/data/prices?symbols=PETR4,VALE3,ITUB4
 * const params = PricesRequestSchema.parse({
 *   symbols: "PETR4,VALE3,ITUB4"
 * });
 * ```
 */
export const PricesRequestSchema = z.object({
  /**
   * Comma-separated list of asset symbols
   * Each symbol must be 1-20 characters, alphanumeric
   */
  symbols: z
    .string()
    .min(1, "At least one symbol is required")
    .transform((val) => val.split(",").map((s) => s.trim().toUpperCase()))
    .refine((symbols) => symbols.length > 0, "At least one symbol is required")
    .refine((symbols) => symbols.length <= 100, "Maximum 100 symbols per request")
    .refine(
      (symbols) => symbols.every((s) => /^[A-Z0-9.-]{1,20}$/.test(s)),
      "Invalid symbol format. Symbols must be 1-20 alphanumeric characters."
    ),
});

export type PricesRequest = z.infer<typeof PricesRequestSchema>;

/**
 * Schema for parsed request (after transform)
 */
export const ParsedPricesRequestSchema = z.object({
  symbols: z.array(z.string().min(1).max(20)),
});

export type ParsedPricesRequest = z.infer<typeof ParsedPricesRequestSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Schema for a single price result
 *
 * AC-6.3.1: All price values are strings for decimal.js precision
 */
export const PriceResultSchema = z.object({
  /** Asset symbol (e.g., "PETR4", "VALE3") */
  symbol: z.string(),
  /** Opening price (optional) - string for precision */
  open: z.string().optional(),
  /** High price (optional) - string for precision */
  high: z.string().optional(),
  /** Low price (optional) - string for precision */
  low: z.string().optional(),
  /** Closing price (required) - string for precision */
  close: z.string(),
  /** Trading volume (optional) - string for precision */
  volume: z.string().optional(),
  /** Currency code (e.g., "BRL", "USD") */
  currency: z.string().length(3),
  /** Provider source name (e.g., "gemini-api", "yahoo-finance") */
  source: z.string(),
  /** Timestamp when data was fetched */
  fetchedAt: z.string().or(z.date()),
  /** Date the price is for */
  priceDate: z.string().or(z.date()),
  /** Flag indicating if data is stale (from cache fallback) */
  isStale: z.boolean().optional(),
});

export type PriceResultResponse = z.infer<typeof PriceResultSchema>;

/**
 * Schema for freshness information
 */
export const FreshnessInfoSchema = z.object({
  /** Provider source name */
  source: z.string(),
  /** Timestamp when data was fetched */
  fetchedAt: z.string().or(z.date()),
  /** Whether the data is considered stale */
  isStale: z.boolean(),
  /** When the data became stale (if applicable) */
  staleSince: z.string().or(z.date()).optional(),
});

export type FreshnessInfoResponse = z.infer<typeof FreshnessInfoSchema>;

/**
 * Schema for successful prices response
 *
 * @example
 * ```typescript
 * // Response: 200 OK
 * {
 *   "data": {
 *     "prices": [
 *       {
 *         "symbol": "PETR4",
 *         "open": "37.50",
 *         "high": "39.00",
 *         "low": "37.25",
 *         "close": "38.45",
 *         "volume": "15000000",
 *         "currency": "BRL",
 *         "source": "gemini-api",
 *         "fetchedAt": "2025-12-10T04:00:00Z",
 *         "priceDate": "2025-12-09",
 *         "isStale": false
 *       }
 *     ],
 *     "fromCache": false,
 *     "freshness": {
 *       "source": "gemini-api",
 *       "fetchedAt": "2025-12-10T04:00:00Z",
 *       "isStale": false
 *     }
 *   }
 * }
 * ```
 */
export const PricesResponseSchema = z.object({
  data: z.object({
    /** Array of price results */
    prices: z.array(PriceResultSchema),
    /** Whether data came from cache */
    fromCache: z.boolean(),
    /** Freshness information */
    freshness: FreshnessInfoSchema,
    /** Provider that served the data */
    provider: z.string(),
  }),
});

export type PricesResponse = z.infer<typeof PricesResponseSchema>;

/**
 * Schema for error response
 */
export const PricesErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type PricesErrorResponse = z.infer<typeof PricesErrorResponseSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Parse and validate price request parameters
 *
 * @param params - Raw query parameters
 * @returns Parsed symbols array
 * @throws ZodError if validation fails
 */
export function parsePricesRequest(params: URLSearchParams): string[] {
  const symbols = params.get("symbols") ?? "";
  const parsed = PricesRequestSchema.parse({ symbols });
  return parsed.symbols;
}

/**
 * Serialize price result for JSON response
 *
 * Converts Date objects to ISO strings for JSON serialization.
 */
export function serializePriceResult(result: {
  symbol: string;
  open?: string;
  high?: string;
  low?: string;
  close: string;
  volume?: string;
  currency: string;
  source: string;
  fetchedAt: Date;
  priceDate: Date;
  isStale?: boolean;
}): PriceResultResponse {
  const serialized: PriceResultResponse = {
    symbol: result.symbol,
    close: result.close,
    currency: result.currency,
    source: result.source,
    fetchedAt: result.fetchedAt.toISOString(),
    priceDate: result.priceDate.toISOString().split("T")[0]!,
  };

  // Add optional fields only if present
  if (result.open !== undefined) {
    serialized.open = result.open;
  }
  if (result.high !== undefined) {
    serialized.high = result.high;
  }
  if (result.low !== undefined) {
    serialized.low = result.low;
  }
  if (result.volume !== undefined) {
    serialized.volume = result.volume;
  }
  if (result.isStale !== undefined) {
    serialized.isStale = result.isStale;
  }

  return serialized;
}
