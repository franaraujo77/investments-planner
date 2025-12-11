/**
 * Fundamentals Validation Schemas
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.1: Fundamentals Include Required Metrics
 *
 * Zod schemas for validating fundamentals API requests and responses.
 *
 * @module @/lib/validations/fundamentals-schemas
 */

import { z } from "zod";

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Request schema for GET /api/data/fundamentals
 *
 * Validates comma-separated symbols string
 */
export const fundamentalsRequestSchema = z.object({
  symbols: z
    .string()
    .min(1, "Symbols parameter is required")
    .max(1000, "Symbols parameter too long")
    .refine(
      (val) => {
        const symbols = val
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        return symbols.length > 0;
      },
      { message: "At least one valid symbol is required" }
    )
    .refine(
      (val) => {
        const symbols = val
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        return symbols.length <= 100;
      },
      { message: "Maximum 100 symbols per request" }
    ),
});

export type FundamentalsRequest = z.infer<typeof fundamentalsRequestSchema>;

// =============================================================================
// RESULT SCHEMAS
// =============================================================================

/**
 * Schema for individual fundamentals result
 *
 * AC-6.2.1: All required metrics included
 * AC-6.2.5: Source attribution recorded
 */
export const fundamentalsResultSchema = z.object({
  symbol: z.string(),
  peRatio: z.string().nullable().optional(),
  pbRatio: z.string().nullable().optional(),
  dividendYield: z.string().nullable().optional(),
  marketCap: z.string().nullable().optional(),
  revenue: z.string().nullable().optional(),
  earnings: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  source: z.string(),
  fetchedAt: z.string().datetime(),
  dataDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  isStale: z.boolean().optional(),
});

export type FundamentalsResultData = z.infer<typeof fundamentalsResultSchema>;

/**
 * Schema for freshness information
 */
export const freshnessSchema = z.object({
  source: z.string(),
  fetchedAt: z.string().datetime(),
  isStale: z.boolean(),
  staleSince: z.string().datetime().optional(),
});

export type FreshnessData = z.infer<typeof freshnessSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Response schema for GET /api/data/fundamentals
 */
export const fundamentalsResponseSchema = z.object({
  data: z.object({
    fundamentals: z.array(fundamentalsResultSchema),
    freshness: freshnessSchema,
  }),
});

export type FundamentalsResponse = z.infer<typeof fundamentalsResponseSchema>;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate fundamentals request
 *
 * @param data - Request data to validate
 * @returns Validation result
 */
export function validateFundamentalsRequest(data: unknown) {
  return fundamentalsRequestSchema.safeParse(data);
}

/**
 * Parse and validate symbols from request
 *
 * @param symbolsParam - Comma-separated symbols string
 * @returns Array of normalized symbols
 */
export function parseSymbols(symbolsParam: string): string[] {
  return symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0 && s.length <= 20);
}

/**
 * Schema for batch fundamentals request (POST)
 *
 * For future POST endpoint support
 */
export const batchFundamentalsRequestSchema = z.object({
  symbols: z
    .array(z.string().min(1).max(20))
    .min(1, "At least one symbol required")
    .max(100, "Maximum 100 symbols per request"),
  options: z
    .object({
      skipCache: z.boolean().optional(),
      includeHistory: z.boolean().optional(),
    })
    .optional(),
});

export type BatchFundamentalsRequest = z.infer<typeof batchFundamentalsRequestSchema>;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for fundamentals result
 */
export function isFundamentalsResult(value: unknown): value is FundamentalsResultData {
  return fundamentalsResultSchema.safeParse(value).success;
}

/**
 * Type guard for fundamentals response
 */
export function isFundamentalsResponse(value: unknown): value is FundamentalsResponse {
  return fundamentalsResponseSchema.safeParse(value).success;
}
