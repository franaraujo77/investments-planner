/**
 * Recommendations API Route
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 *
 * GET /api/recommendations - Retrieve existing recommendations
 *
 * AC-7.5.1: Focus Mode Header Display
 * AC-7.5.2: RecommendationCard Display
 * AC-7.5.3: Cards Sorted by Amount
 * AC-7.5.4: Balanced Portfolio Empty State
 * AC-7.5.5: Total Summary Display
 *
 * Returns:
 * - 200: Recommendations retrieved successfully
 * - 401: Not authenticated
 * - 404: No recommendations available
 * - 500: Server error
 */

import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { successResponse, notFoundError, handleDbError, databaseError } from "@/lib/api/responses";
import { recommendationService } from "@/lib/services/recommendation-service";
import { NOT_FOUND_ERRORS } from "@/lib/api/error-codes";
import type { AuthError } from "@/lib/auth/types";
import type { GenerateRecommendationsResponse } from "@/lib/types/recommendations";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

type GetResponseData = GenerateRecommendationsResponse["data"];

interface GetResponseBody {
  data: GetResponseData;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/recommendations
 *
 * Retrieves existing recommendations for the authenticated user.
 * Tries Vercel KV cache first, falls back to PostgreSQL.
 *
 * Response:
 * - 200: { data: Recommendation with items }
 * - 404: No recommendations available
 */
export const GET = withAuth<GetResponseBody | AuthError>(async (_request, session) => {
  try {
    logger.info("Fetching recommendations", {
      userId: session.userId,
    });

    // Try cache first, fallback to database via service
    const recommendation = await recommendationService.getCachedRecommendation(session.userId);

    if (!recommendation) {
      logger.info("No recommendations found for user", {
        userId: session.userId,
      });

      return notFoundError("Recommendations", NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND);
    }

    // Check if recommendation is expired
    if (recommendation.expiresAt < new Date()) {
      logger.info("Recommendations expired", {
        userId: session.userId,
        recommendationId: recommendation.id,
        expiresAt: recommendation.expiresAt.toISOString(),
      });

      return notFoundError("Recommendations", NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND);
    }

    logger.info("Recommendations retrieved successfully", {
      userId: session.userId,
      recommendationId: recommendation.id,
      itemCount: recommendation.items.length,
    });

    // Format response
    const responseData: GetResponseData = {
      id: recommendation.id,
      contribution: recommendation.contribution,
      dividends: recommendation.dividends,
      totalInvestable: recommendation.totalInvestable,
      baseCurrency: recommendation.baseCurrency,
      generatedAt: recommendation.generatedAt.toISOString(),
      expiresAt: recommendation.expiresAt.toISOString(),
      items: recommendation.items.map((item) => ({
        assetId: item.assetId,
        symbol: item.symbol,
        score: item.score,
        currentAllocation: item.currentAllocation,
        targetAllocation: item.targetAllocation,
        allocationGap: item.allocationGap,
        recommendedAmount: item.recommendedAmount,
        isOverAllocated: item.isOverAllocated,
      })),
    };

    return successResponse(responseData);
  } catch (error) {
    // Handle database errors
    const dbError = handleDbError(error, "get recommendations", {
      userId: session.userId,
    });
    return databaseError(dbError, "get recommendations");
  }
});
