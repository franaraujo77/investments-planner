/**
 * Score History API Routes
 *
 * Story 5.9: Store Historical Scores
 *
 * GET /api/scores/[assetId]/history - Get score history for a specific asset
 *
 * Task 3: Create History API Endpoint (AC: 5.9.2, 5.9.3)
 *
 * Query Parameters:
 * - days: 30 | 60 | 90 (default: 90) - Number of days of history
 * - startDate: ISO date string - Start of date range (overrides days)
 * - endDate: ISO date string - End of date range (default: now)
 * - includeTrend: boolean - Include trend analysis in response
 *
 * Returns:
 * - 200: History array (empty array if no history, not 404)
 * - 400: Invalid parameters
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getScoreHistory, calculateTrend, type TrendAnalysis } from "@/lib/services/score-service";
import type { AuthError } from "@/lib/auth/types";
import { historyQuerySchema } from "@/lib/validations/score-schemas";

/**
 * Response types
 */
interface GetHistoryResponse {
  data: {
    history: Array<{
      score: string;
      calculatedAt: string;
      criteriaVersionId: string;
    }>;
    trend?: TrendAnalysis;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * GET /api/scores/[assetId]/history
 *
 * Retrieves the score history for a specific asset.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.9.2: Point-in-Time Score Query
 * AC-5.9.3: Trend Query Support
 *
 * Path Parameters:
 * - assetId: UUID of the asset to get history for
 *
 * Query Parameters:
 * - days: 30 | 60 | 90 - Number of days (default: 90)
 * - startDate: ISO date string - Start of range
 * - endDate: ISO date string - End of range
 * - includeTrend: boolean - Include trend analysis
 *
 * Response:
 * - data.history: Array of score entries (empty if no history)
 * - data.trend: Optional trend analysis if requested
 */
export const GET = withAuth<GetHistoryResponse | ErrorResponse | AuthError>(
  async (request, session, routeParams) => {
    try {
      // Extract assetId from params
      const { assetId } = await (routeParams as RouteParams).params;

      if (!assetId || typeof assetId !== "string") {
        return NextResponse.json(
          {
            error: "Asset ID is required",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assetId)) {
        return NextResponse.json(
          {
            error: "Invalid asset ID format",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const rawParams = {
        days: searchParams.get("days"),
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
        includeTrend: searchParams.get("includeTrend"),
      };

      // Validate query params with Zod
      const parseResult = historyQuerySchema.safeParse({
        days: rawParams.days ? parseInt(rawParams.days, 10) : undefined,
        startDate: rawParams.startDate || undefined,
        endDate: rawParams.endDate || undefined,
        includeTrend: rawParams.includeTrend === "true",
      });

      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: parseResult.error.flatten(),
          },
          { status: 400 }
        );
      }

      const queryParams = parseResult.data;

      // Build service query
      const serviceQuery = {
        userId: session.userId,
        assetId,
        days: queryParams.days as 30 | 60 | 90 | undefined,
        startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
        endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
      };

      // Get history from service
      const history = await getScoreHistory(serviceQuery);

      // Build response
      const response: GetHistoryResponse = {
        data: {
          // AC-5.9.3: Array of (date, score) pairs in chronological order
          history: history.map((entry) => ({
            score: entry.score,
            calculatedAt: entry.calculatedAt.toISOString(),
            criteriaVersionId: entry.criteriaVersionId,
          })),
        },
      };

      // AC-5.9.3: Include trend analysis if requested
      if (queryParams.includeTrend && history.length >= 2) {
        const trend = calculateTrend(history);
        if (trend) {
          response.data.trend = trend;
        }
      }

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const dbError = handleDbError(error, "get score history", { userId: session.userId });
      return databaseError(dbError, "get score history");
    }
  }
);
