/**
 * Source Attribution Zod Schemas
 *
 * Story 7.1: Data Source Attribution
 * Task 7.4: Zod Schemas for Source Attribution
 *
 * Validation schemas for source attribution types used in API responses.
 * These schemas enable runtime validation of attribution data.
 *
 * @module @/lib/validations/source-attribution-schemas
 */

import { z } from "zod";

// =============================================================================
// DOCUMENT REFERENCE SCHEMAS
// =============================================================================

/**
 * Document type enum
 *
 * AC-7.1.3: Investor Relations Document Types
 */
export const DocumentTypeSchema = z.enum([
  "earnings",
  "annual-report",
  "filing",
  "press-release",
  "ir-presentation",
]);

/**
 * Document reference schema
 *
 * AC-7.1.3: Document title and publication date
 * AC-7.1.5: Include enough info for independent verification
 */
export const DocumentReferenceSchema = z.object({
  /** Document title (e.g., "Q3 2024 Earnings Report") */
  title: z.string().min(1),
  /** Document type */
  type: DocumentTypeSchema,
  /** Publication date of the document */
  publicationDate: z.string().datetime().or(z.date()),
  /** Optional URL to original document */
  url: z.string().url().optional(),
  /** Optional filing reference (e.g., SEC/CVM filing ID) */
  filingId: z.string().optional(),
});

// =============================================================================
// SOURCE ATTRIBUTION SCHEMAS
// =============================================================================

/**
 * Data type enum for source attribution
 */
export const SourceDataTypeSchema = z.enum(["price", "rate", "fundamentals", "score"]);

/**
 * Source attribution schema
 *
 * AC-7.1.1: Source provider name
 * AC-7.1.2: Timestamp of last update
 * AC-7.1.3: Optional document reference
 */
export const SourceAttributionSchema = z.object({
  /** Type of data this attribution applies to */
  dataType: SourceDataTypeSchema,
  /** Source provider identifier (e.g., "gemini", "yahoo") */
  source: z.string().min(1),
  /** Timestamp when data was fetched/updated */
  timestamp: z.string().datetime().or(z.date()).optional(),
  /** Optional document reference for IR data */
  documentRef: DocumentReferenceSchema.optional(),
});

// =============================================================================
// INPUT SOURCES SCHEMA
// =============================================================================

/**
 * Individual data source information
 *
 * Used for score breakdown input sources display
 */
export const DataSourceInfoSchema = z.object({
  /** Human-readable label (e.g., "Current Price") */
  label: z.string(),
  /** The value being attributed */
  value: z.string(),
  /** Currency code (for price/rate data) */
  currency: z.string().optional(),
  /** Source provider */
  source: z.string(),
  /** When the data was fetched */
  fetchedAt: z.string().datetime().or(z.date()),
});

/**
 * Input sources for score calculation
 *
 * Groups data by category for display in score breakdown
 */
export const InputSourcesSchema = z.object({
  /** Price data source */
  price: DataSourceInfoSchema.optional(),
  /** Exchange rate data source */
  exchangeRate: DataSourceInfoSchema.optional(),
  /** Fundamentals data source (P/E, P/B, etc.) */
  fundamentals: DataSourceInfoSchema.optional(),
  /** Criteria version source */
  criteria: DataSourceInfoSchema.optional(),
});

// =============================================================================
// FRESHNESS INFO SCHEMA
// =============================================================================

/**
 * Freshness information schema
 *
 * AC-7.1.2: Timestamp visibility
 */
export const FreshnessInfoSchema = z.object({
  /** Source provider */
  source: z.string(),
  /** When data was fetched */
  fetchedAt: z.string().datetime().or(z.date()),
  /** Whether data is stale */
  isStale: z.boolean(),
  /** When data became stale (optional) */
  staleSince: z.string().datetime().or(z.date()).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type DocumentReference = z.infer<typeof DocumentReferenceSchema>;
export type SourceDataType = z.infer<typeof SourceDataTypeSchema>;
export type SourceAttribution = z.infer<typeof SourceAttributionSchema>;
export type DataSourceInfo = z.infer<typeof DataSourceInfoSchema>;
export type InputSources = z.infer<typeof InputSourcesSchema>;
export type FreshnessInfo = z.infer<typeof FreshnessInfoSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Parse and validate source attribution data
 */
export function parseSourceAttribution(data: unknown): SourceAttribution | null {
  const result = SourceAttributionSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Parse and validate input sources data
 */
export function parseInputSources(data: unknown): InputSources | null {
  const result = InputSourcesSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Parse and validate freshness info
 */
export function parseFreshnessInfo(data: unknown): FreshnessInfo | null {
  const result = FreshnessInfoSchema.safeParse(data);
  return result.success ? result.data : null;
}
