/**
 * Score Validation Schemas
 *
 * Story 5.8: Score Calculation Engine
 *
 * Zod schemas for score-related API requests and responses.
 * Task 7: Create Zod Schemas for Score Operations
 */

import { z } from "zod";

// =============================================================================
// CRITERION RESULT SCHEMA
// =============================================================================

/**
 * Schema for a single criterion evaluation result
 *
 * AC-5.8.5: breakdown includes criterionId, criterionName, matched, pointsAwarded, actualValue, skippedReason
 */
export const criterionResultSchema = z.object({
  criterionId: z.string().uuid(),
  criterionName: z.string().min(1).max(100),
  matched: z.boolean(),
  pointsAwarded: z.number(),
  actualValue: z.string().nullable().optional(),
  skippedReason: z
    .enum(["missing_fundamental", "data_stale", "invalid_value", "evaluation_error"])
    .nullable()
    .optional(),
});

export type CriterionResultInput = z.infer<typeof criterionResultSchema>;

// =============================================================================
// CALCULATE SCORES REQUEST SCHEMA
// =============================================================================

/**
 * Schema for POST /api/scores/calculate request
 *
 * AC-5.8.1: Supports specifying assets and criteria version
 */
export const calculateScoresRequestSchema = z.object({
  assetIds: z.array(z.string().uuid()).optional(),
  criteriaVersionId: z.string().uuid().optional(),
  targetMarket: z.string().min(1).max(50).optional(),
});

export type CalculateScoresRequest = z.infer<typeof calculateScoresRequestSchema>;

// =============================================================================
// ASSET SCORE RESPONSE SCHEMA
// =============================================================================

/**
 * Schema for individual asset score in response
 *
 * AC-5.8.5: Score includes breakdown with all criterion results
 */
export const assetScoreSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  criteriaVersionId: z.string().uuid(),
  score: z.string(), // Decimal string for precision
  breakdown: z.array(criterionResultSchema),
  calculatedAt: z.string().datetime(),
});

export type AssetScoreOutput = z.infer<typeof assetScoreSchema>;

// =============================================================================
// CALCULATE SCORES RESPONSE SCHEMA
// =============================================================================

/**
 * Schema for POST /api/scores/calculate response
 *
 * AC-5.8.4: Includes correlationId for audit replay
 */
export const calculateScoresResponseSchema = z.object({
  data: z.object({
    jobId: z.string().uuid(),
    scores: z.array(assetScoreSchema),
    calculatedAt: z.string().datetime(),
    correlationId: z.string().uuid(),
    assetCount: z.number().int().nonnegative(),
    duration: z.number().nonnegative(), // milliseconds
  }),
});

export type CalculateScoresResponse = z.infer<typeof calculateScoresResponseSchema>;

// =============================================================================
// GET SCORE RESPONSE SCHEMA
// =============================================================================

/**
 * Schema for GET /api/scores/[assetId] response
 *
 * AC-5.8.5: Returns score with breakdown and audit info
 */
export const getScoreResponseSchema = z.object({
  data: z.object({
    assetId: z.string().uuid(),
    symbol: z.string(),
    score: z.string(),
    breakdown: z.array(criterionResultSchema),
    criteriaVersionId: z.string().uuid(),
    calculatedAt: z.string().datetime(),
  }),
});

export type GetScoreResponse = z.infer<typeof getScoreResponseSchema>;

// =============================================================================
// ERROR RESPONSE SCHEMA
// =============================================================================

/**
 * Schema for error responses
 */
export const scoreErrorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "UNAUTHORIZED",
    "NO_CRITERIA",
    "NO_ASSETS",
    "CALCULATION_FAILED",
    "INTERNAL_ERROR",
  ]),
  details: z.unknown().optional(),
});

export type ScoreErrorResponse = z.infer<typeof scoreErrorResponseSchema>;

// =============================================================================
// ASSET WITH FUNDAMENTALS SCHEMA
// =============================================================================

/**
 * Schema for asset data with fundamentals
 *
 * Used internally by scoring engine
 */
export const assetWithFundamentalsSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  name: z.string().optional(),
  fundamentals: z.record(z.string(), z.number().nullable()),
  targetMarket: z.string().optional(),
});

export type AssetWithFundamentals = z.infer<typeof assetWithFundamentalsSchema>;

// =============================================================================
// SCORING ENGINE CONFIG SCHEMA
// =============================================================================

/**
 * Schema for scoring engine configuration
 *
 * AC-5.8.1: Configuration for criteria-driven algorithm
 */
export const scoringEngineConfigSchema = z.object({
  userId: z.string().uuid(),
  criteriaVersionId: z.string().uuid(),
  targetMarket: z.string().optional(),
});

export type ScoringEngineConfig = z.infer<typeof scoringEngineConfigSchema>;

// =============================================================================
// SCORE HISTORY SCHEMAS (Story 5.9)
// =============================================================================

/**
 * Schema for history query parameters
 *
 * AC-5.9.2: Point-in-Time Score Query
 * AC-5.9.3: Trend Query Support
 *
 * Supports:
 * - days: 30 | 60 | 90 (default 90)
 * - startDate/endDate: ISO date strings for custom range
 * - includeTrend: boolean to include trend analysis
 */
export const historyQuerySchema = z.object({
  days: z
    .union([z.literal(30), z.literal(60), z.literal(90)])
    .optional()
    .default(90),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeTrend: z.boolean().optional().default(false),
});

export type HistoryQueryParams = z.infer<typeof historyQuerySchema>;

/**
 * Schema for a single score history entry
 *
 * AC-5.9.2: Returns exact score from that date
 */
export const scoreHistoryEntrySchema = z.object({
  score: z.string(), // Decimal string for precision
  calculatedAt: z.string().datetime(),
  criteriaVersionId: z.string().uuid(),
});

export type ScoreHistoryEntryOutput = z.infer<typeof scoreHistoryEntrySchema>;

/**
 * Schema for trend analysis result
 *
 * AC-5.9.3: Supports calculating trend percentage
 */
export const trendAnalysisSchema = z.object({
  startScore: z.string(), // Decimal string
  endScore: z.string(), // Decimal string
  changePercent: z.string(), // Decimal string with 2 decimal places
  direction: z.enum(["up", "down", "stable"]),
  dataPoints: z.number().int().positive(),
});

export type TrendAnalysisOutput = z.infer<typeof trendAnalysisSchema>;

/**
 * Schema for GET /api/scores/:assetId/history response
 *
 * AC-5.9.3: Returns array of (date, score) pairs in chronological order
 */
export const getHistoryResponseSchema = z.object({
  data: z.object({
    history: z.array(scoreHistoryEntrySchema),
    trend: trendAnalysisSchema.optional(),
  }),
});

export type GetHistoryResponse = z.infer<typeof getHistoryResponseSchema>;
