/**
 * Data Refresh API Route
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Refresh Button Available on Dashboard and Portfolio
 * AC-6.6.2: Loading Spinner Shown During Refresh
 * AC-6.6.3: Success Toast with Timestamp
 * AC-6.6.4: Rate Limit of 5 Refreshes Per Hour Per User
 * AC-6.6.5: Rate Limit Exceeded Shows Countdown
 *
 * POST /api/data/refresh
 *
 * Request body:
 * {
 *   "type": "prices" | "rates" | "fundamentals" | "all",
 *   "symbols": ["PETR4", "VALE3"]  // optional
 * }
 *
 * Success response (200):
 * {
 *   "data": {
 *     "refreshed": true,
 *     "refreshedAt": "2025-12-10T14:30:00Z",
 *     "nextRefreshAvailable": "2025-12-10T15:30:00Z",
 *     "remaining": 4,
 *     "refreshedTypes": ["prices", "rates"],
 *     "providers": { "prices": "gemini-api", "rates": "exchangerate-api" }
 *   }
 * }
 *
 * Rate limit response (429):
 * {
 *   "error": "Refresh limit exceeded. Try again in 45 minutes.",
 *   "code": "RATE_LIMIT_EXCEEDED",
 *   "details": { "remaining": 0, "resetAt": "2025-12-10T15:30:00Z", "retryAfter": 2700 }
 * }
 *
 * @module @/app/api/data/refresh
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { refreshRateLimiter } from "@/lib/rate-limit";
import { dataRefreshService } from "@/lib/services/data-refresh-service";
import {
  safeParseRefreshRequest,
  buildRateLimitErrorResponse,
  buildRefreshSuccessResponse,
  type RefreshSuccessResponse,
  type RateLimitErrorResponse,
} from "@/lib/validations/refresh-schemas";
import { validationError, handleDbError, databaseError } from "@/lib/api/responses";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// TYPES
// =============================================================================

interface RefreshError {
  error: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// POST /api/data/refresh
// =============================================================================

/**
 * POST /api/data/refresh
 *
 * Force refresh of market data. Rate limited to 5 requests per hour per user.
 *
 * AC-6.6.4: Enforces rate limit at API level
 * AC-6.6.5: Returns countdown when rate limited
 */
export const POST = withAuth<
  RefreshSuccessResponse | RateLimitErrorResponse | RefreshError | AuthError
>(async (request, session) => {
  const userId = session.userId;

  logger.info("Data refresh requested", {
    userId,
    method: "POST",
  });

  // AC-6.6.4: Check rate limit before processing
  const rateLimitCheck = await refreshRateLimiter.checkLimit(userId);

  if (!rateLimitCheck.allowed) {
    logger.warn("Data refresh rate limited", {
      userId,
      remaining: rateLimitCheck.remaining,
      resetAt: rateLimitCheck.resetAt.toISOString(),
    });

    // AC-6.6.5: Return 429 with countdown
    const errorResponse = buildRateLimitErrorResponse(rateLimitCheck.resetAt);

    return NextResponse.json<RateLimitErrorResponse>(errorResponse, {
      status: 429,
      headers: {
        "Retry-After": String(errorResponse.details.retryAfter),
      },
    });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logger.warn("Invalid JSON in refresh request", { userId });
    return NextResponse.json<RefreshError>(
      {
        error: "Invalid JSON in request body",
        code: "VALIDATION_INVALID_INPUT",
      },
      { status: 400 }
    );
  }

  const parseResult = safeParseRefreshRequest(body);

  if (!parseResult.success) {
    logger.warn("Invalid refresh request", {
      userId,
      issueCount: parseResult.error.issues.length,
    });
    return validationError(parseResult.error.issues);
  }

  const { type, symbols } = parseResult.data;

  logger.info("Processing data refresh", {
    userId,
    type,
    symbolCount: symbols?.length ?? 0,
  });

  try {
    // Perform the refresh
    const refreshResult = await dataRefreshService.refresh({
      userId,
      type,
      symbols,
    });

    // Record the refresh for rate limiting (after successful refresh)
    await refreshRateLimiter.recordRefresh(userId);

    // Get updated rate limit status
    const updatedRateLimit = await refreshRateLimiter.checkLimit(userId);

    if (!refreshResult.success) {
      logger.error("Data refresh failed", {
        userId,
        type,
        error: refreshResult.error,
        durationMs: refreshResult.durationMs,
      });

      return NextResponse.json<RefreshError>(
        {
          error: refreshResult.error ?? "Data refresh failed",
          code: "EXTERNAL_SERVICE_ERROR",
          details: {
            type,
            providers: refreshResult.providers,
            durationMs: refreshResult.durationMs,
          },
        },
        { status: 502 }
      );
    }

    logger.info("Data refresh completed successfully", {
      userId,
      type,
      durationMs: refreshResult.durationMs,
      refreshedTypes: refreshResult.refreshedTypes.join(","),
      providersJson: JSON.stringify(refreshResult.providers),
      remaining: updatedRateLimit.remaining,
    });

    // AC-6.6.3: Return success response with timestamp
    const response = buildRefreshSuccessResponse({
      refreshedAt: refreshResult.refreshedAt,
      resetAt: updatedRateLimit.resetAt,
      remaining: Math.max(0, updatedRateLimit.remaining - 1),
      refreshedTypes: refreshResult.refreshedTypes,
      providers: refreshResult.providers,
    });

    return NextResponse.json<RefreshSuccessResponse>(response, { status: 200 });
  } catch (error) {
    const dbError = handleDbError(error, "refresh data", { userId: session.userId });
    return databaseError(dbError, "data refresh");
  }
});
