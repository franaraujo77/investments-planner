/**
 * Refresh Validation Schemas
 *
 * Story 6.6: Force Data Refresh
 * Zod schemas for request/response validation
 *
 * @module @/lib/validations/refresh-schemas
 */

import { z } from "zod";

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Valid refresh types
 */
export const RefreshTypeSchema = z.enum(["prices", "rates", "fundamentals", "all"]);
export type RefreshType = z.infer<typeof RefreshTypeSchema>;

/**
 * Refresh request body schema
 *
 * Validates POST /api/data/refresh requests
 */
export const RefreshRequestSchema = z.object({
  /** Type of data to refresh */
  type: RefreshTypeSchema,
  /** Optional specific symbols to refresh */
  symbols: z.array(z.string().min(1).max(20)).optional(),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Provider info in response
 */
export const ProvidersSchema = z.object({
  prices: z.string().optional(),
  rates: z.string().optional(),
  fundamentals: z.string().optional(),
});

/**
 * Successful refresh response schema
 */
export const RefreshResponseDataSchema = z.object({
  /** Whether the refresh was successful */
  refreshed: z.boolean(),
  /** ISO timestamp when refresh completed */
  refreshedAt: z.string(),
  /** ISO timestamp when next refresh will be available */
  nextRefreshAvailable: z.string(),
  /** Number of refreshes remaining in the current window */
  remaining: z.number().int().min(0),
  /** Which data types were refreshed */
  refreshedTypes: z.array(RefreshTypeSchema),
  /** Providers that served the data */
  providers: ProvidersSchema,
});

export type RefreshResponseData = z.infer<typeof RefreshResponseDataSchema>;

/**
 * Full success response wrapper
 */
export const RefreshSuccessResponseSchema = z.object({
  data: RefreshResponseDataSchema,
});

export type RefreshSuccessResponse = z.infer<typeof RefreshSuccessResponseSchema>;

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

/**
 * Rate limit error details
 */
export const RateLimitDetailsSchema = z.object({
  /** Remaining refreshes (0 when rate limited) */
  remaining: z.literal(0),
  /** ISO timestamp when rate limit resets */
  resetAt: z.string(),
  /** Seconds until rate limit resets */
  retryAfter: z.number().int().positive(),
});

export type RateLimitDetails = z.infer<typeof RateLimitDetailsSchema>;

/**
 * Rate limit error response schema (429)
 */
export const RateLimitErrorResponseSchema = z.object({
  /** Human-readable error message */
  error: z.string(),
  /** Error code */
  code: z.literal("RATE_LIMIT_EXCEEDED"),
  /** Rate limit details */
  details: RateLimitDetailsSchema,
});

export type RateLimitErrorResponse = z.infer<typeof RateLimitErrorResponseSchema>;

/**
 * Generic error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate refresh request body
 */
export function validateRefreshRequest(body: unknown): RefreshRequest {
  return RefreshRequestSchema.parse(body);
}

/**
 * Safe parse refresh request
 */
export function safeParseRefreshRequest(body: unknown) {
  return RefreshRequestSchema.safeParse(body);
}

/**
 * Format countdown message for rate limit
 *
 * @param resetAt - Date when rate limit resets
 * @returns Human-readable countdown message
 */
export function formatRateLimitCountdown(resetAt: Date): string {
  const now = new Date();
  const diffMs = resetAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Try again now";
  }

  const diffMinutes = Math.ceil(diffMs / (60 * 1000));

  if (diffMinutes === 1) {
    return "Try again in 1 minute";
  }

  return `Try again in ${diffMinutes} minutes`;
}

/**
 * Build rate limit error response
 *
 * @param resetAt - Date when rate limit resets
 * @returns Rate limit error response object
 */
export function buildRateLimitErrorResponse(resetAt: Date): RateLimitErrorResponse {
  const now = new Date();
  const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
  const countdown = formatRateLimitCountdown(resetAt);

  return {
    error: `Refresh limit exceeded. ${countdown}.`,
    code: "RATE_LIMIT_EXCEEDED",
    details: {
      remaining: 0,
      resetAt: resetAt.toISOString(),
      retryAfter: Math.max(1, retryAfter),
    },
  };
}

/**
 * Build success response
 *
 * @param params - Response parameters
 * @returns Success response object
 */
export function buildRefreshSuccessResponse(params: {
  refreshedAt: Date;
  resetAt: Date;
  remaining: number;
  refreshedTypes: RefreshType[];
  providers: {
    prices?: string;
    rates?: string;
    fundamentals?: string;
  };
}): RefreshSuccessResponse {
  return {
    data: {
      refreshed: true,
      refreshedAt: params.refreshedAt.toISOString(),
      nextRefreshAvailable: params.resetAt.toISOString(),
      remaining: params.remaining,
      refreshedTypes: params.refreshedTypes,
      providers: params.providers,
    },
  };
}
