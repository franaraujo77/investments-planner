/**
 * Dashboard API Route
 *
 * Story 8.5: Instant Dashboard Load
 *
 * GET /api/dashboard - Retrieve dashboard data with cache-first strategy
 *
 * AC-8.5.1: Dashboard API Reads from Cache First
 * AC-8.5.2: Dashboard API Falls Back to PostgreSQL
 * AC-8.5.3: Dashboard Response Includes Cache Indicator
 * AC-8.5.4: Dashboard Loads in Under 2 Seconds
 *
 * Returns:
 * - 200: Dashboard data retrieved successfully
 * - 401: Not authenticated
 * - 404: No recommendations available
 * - 500: Server error
 */

import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { successResponse, notFoundError, internalError } from "@/lib/api/responses";
import { dashboardService, type DashboardData } from "@/lib/services/dashboard-service";
import { NOT_FOUND_ERRORS } from "@/lib/api/error-codes";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Dashboard API response body
 * Matches tech spec DashboardResponse
 */
interface DashboardResponseBody {
  data: DashboardData;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/dashboard
 *
 * Retrieves dashboard data for the authenticated user.
 * Implements cache-first strategy:
 * 1. Try Vercel KV cache (recs:${userId})
 * 2. Fall back to PostgreSQL if cache miss
 *
 * AC-8.5.1: Reads from cache first
 * AC-8.5.2: Falls back to PostgreSQL
 * AC-8.5.3: Includes fromCache indicator
 * AC-8.5.4: Target <2s load time (cache hit <100ms)
 *
 * Response:
 * - 200: { data: DashboardData }
 * - 404: No recommendations available
 */
export const GET = withAuth<DashboardResponseBody | AuthError>(async (_request, session) => {
  const startTime = Date.now();

  try {
    logger.info("Dashboard API request", {
      userId: session.userId,
    });

    // Call dashboard service (cache-first strategy)
    const result = await dashboardService.getDashboardData(session.userId);

    if (!result.success) {
      logger.error("Dashboard service failed", {
        userId: session.userId,
        error: result.error,
      });
      return internalError("Failed to load dashboard data");
    }

    if (!result.data) {
      // No recommendations available
      logger.info("No dashboard data available", {
        userId: session.userId,
        durationMs: Date.now() - startTime,
      });

      return notFoundError("Recommendations", NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND);
    }

    const durationMs = Date.now() - startTime;

    // AC-8.5.3: Log cache hit/miss for monitoring
    logger.info("Dashboard data retrieved", {
      userId: session.userId,
      fromCache: result.data.fromCache,
      recommendationCount: result.data.recommendations.length,
      durationMs,
    });

    return successResponse(result.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;

    logger.error("Dashboard API error", {
      userId: session.userId,
      error: errorMessage,
      durationMs,
    });

    return internalError("Failed to load dashboard data");
  }
});
