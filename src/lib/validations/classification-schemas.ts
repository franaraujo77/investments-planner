/**
 * Classification Validation Schemas
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.5: Classification API
 *
 * Zod schemas for validating classification API requests and responses.
 *
 * @module @/lib/validations/classification-schemas
 */

import { z } from "zod";

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Request schema for GET /api/data/classifications
 *
 * Validates comma-separated symbols string
 */
export const classificationsRequestSchema = z.object({
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

export type ClassificationsRequest = z.infer<typeof classificationsRequestSchema>;

// =============================================================================
// RESULT SCHEMAS
// =============================================================================

/**
 * Schema for individual classification result
 *
 * AC-5.7.1: GICS three-tier hierarchy
 * AC-5.7.4: Asset-to-classification mapping
 */
export const classificationResultSchema = z.object({
  symbol: z.string(),
  gicsIndustryId: z.string().length(6),
  gicsIndustryGroupId: z.string().length(4),
  gicsSectorId: z.string().length(2),
  industryName: z.string(),
  industryGroupName: z.string(),
  sectorName: z.string(),
  confidence: z.string(),
  source: z.string(),
  fetchedAt: z.string().datetime(),
  isStale: z.boolean().optional(),
});

export type ClassificationResultData = z.infer<typeof classificationResultSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Response schema for GET /api/data/classifications
 */
export const classificationsResponseSchema = z.object({
  data: z.object({
    classifications: z.array(classificationResultSchema),
    stats: z.object({
      total: z.number(),
      found: z.number(),
      fromCache: z.number(),
      fromProvider: z.number(),
      stale: z.number(),
      failed: z.number(),
    }),
    failed: z.array(z.string()),
  }),
});

export type ClassificationsResponse = z.infer<typeof classificationsResponseSchema>;

/**
 * Response schema for GICS reference data
 */
export const gicsReferenceResponseSchema = z.object({
  data: z.object({
    sectors: z.array(
      z.object({
        id: z.string().length(2),
        name: z.string(),
        description: z.string().nullable().optional(),
      })
    ),
    industryGroups: z.array(
      z.object({
        id: z.string().length(4),
        name: z.string(),
        sectorId: z.string().length(2),
        description: z.string().nullable().optional(),
      })
    ),
    industries: z.array(
      z.object({
        id: z.string().length(6),
        name: z.string(),
        industryGroupId: z.string().length(4),
        description: z.string().nullable().optional(),
      })
    ),
  }),
});

export type GicsReferenceResponse = z.infer<typeof gicsReferenceResponseSchema>;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate classifications request
 *
 * @param data - Request data to validate
 * @returns Validation result
 */
export function validateClassificationsRequest(data: unknown) {
  return classificationsRequestSchema.safeParse(data);
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

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for classification result
 */
export function isClassificationResult(value: unknown): value is ClassificationResultData {
  return classificationResultSchema.safeParse(value).success;
}

/**
 * Type guard for classifications response
 */
export function isClassificationsResponse(value: unknown): value is ClassificationsResponse {
  return classificationsResponseSchema.safeParse(value).success;
}
