/**
 * Freshness API Schemas
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 *
 * Zod validation schemas for the freshness API endpoint.
 *
 * @module @/lib/validations/freshness-schemas
 */

import { z } from "zod";

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Freshness data types
 */
export const freshnessTypeSchema = z.enum(["prices", "rates", "fundamentals"]);
export type FreshnessDataType = z.infer<typeof freshnessTypeSchema>;

/**
 * Freshness query parameters schema
 *
 * GET /api/data/freshness?type=prices&symbols=PETR4,VALE3
 */
export const freshnessQuerySchema = z.object({
  /** Type of data to query freshness for */
  type: freshnessTypeSchema,
  /** Optional comma-separated list of symbols to filter */
  symbols: z.string().optional(),
});

export type FreshnessQuery = z.infer<typeof freshnessQuerySchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Single freshness info item
 */
export const freshnessInfoItemSchema = z.object({
  /** Provider source name */
  source: z.string(),
  /** When the data was fetched */
  fetchedAt: z.string().datetime(),
  /** Whether the data is stale */
  isStale: z.boolean(),
  /** When the data became stale (if applicable) */
  staleSince: z.string().datetime().optional(),
});

export type FreshnessInfoItem = z.infer<typeof freshnessInfoItemSchema>;

/**
 * Success response for freshness endpoint
 */
export const freshnessSuccessResponseSchema = z.object({
  data: z.record(z.string(), freshnessInfoItemSchema),
});

export type FreshnessSuccessResponse = z.infer<typeof freshnessSuccessResponseSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse and validate query parameters
 *
 * @param searchParams - URL search params
 * @returns Parsed query or error
 */
export function parseFreshnessQuery(searchParams: URLSearchParams):
  | {
      success: true;
      data: { type: FreshnessDataType; symbols?: string[] };
    }
  | {
      success: false;
      error: string;
    } {
  const type = searchParams.get("type");
  const symbolsParam = searchParams.get("symbols");

  // Validate type
  const typeResult = freshnessTypeSchema.safeParse(type);
  if (!typeResult.success) {
    return {
      success: false,
      error: "Invalid or missing 'type' parameter. Must be one of: prices, rates, fundamentals",
    };
  }

  // Parse symbols if provided
  const symbols = symbolsParam
    ? symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : undefined;

  // Build result with proper optional property handling
  const result: { type: FreshnessDataType; symbols?: string[] } = {
    type: typeResult.data,
  };

  if (symbols && symbols.length > 0) {
    result.symbols = symbols;
  }

  return {
    success: true,
    data: result,
  };
}

/**
 * Build freshness success response
 *
 * @param freshnessMap - Map of symbol to freshness info
 * @returns Formatted response
 */
export function buildFreshnessResponse(
  freshnessMap: Record<
    string,
    {
      source: string;
      fetchedAt: Date;
      isStale: boolean;
      staleSince?: Date;
    }
  >
): FreshnessSuccessResponse {
  const data: Record<string, FreshnessInfoItem> = {};

  for (const [symbol, info] of Object.entries(freshnessMap)) {
    const item: FreshnessInfoItem = {
      source: info.source,
      fetchedAt: info.fetchedAt.toISOString(),
      isStale: info.isStale,
    };

    if (info.staleSince) {
      item.staleSince = info.staleSince.toISOString();
    }

    data[symbol] = item;
  }

  return { data };
}
