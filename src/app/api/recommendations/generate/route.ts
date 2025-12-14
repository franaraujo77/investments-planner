/**
 * Recommendation Generation API Route
 *
 * Story 7.4: Generate Investment Recommendations
 *
 * POST /api/recommendations/generate - Generate investment recommendations
 *
 * AC-7.4.1: Priority Ranking by Allocation Gap × Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.4: Minimum Allocation Values Enforced
 * AC-7.4.5: Event Sourcing for Audit Trail
 *
 * Returns:
 * - 200: Recommendations generated successfully
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Portfolio not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import {
  handleDbError,
  databaseError,
  validationError,
  successResponse,
} from "@/lib/api/responses";
import { recommendationService } from "@/lib/services/recommendation-service";
import { PortfolioNotFoundError } from "@/lib/services/portfolio-service";
import type { AuthError } from "@/lib/auth/types";
import type {
  GenerateRecommendationsResponse,
  RecommendationValidationError,
} from "@/lib/types/recommendations";

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Request body schema for recommendation generation
 *
 * - contribution: Must be a valid decimal string > 0
 * - dividends: Must be a valid decimal string >= 0
 * - portfolioId: Required UUID of the portfolio
 */
const generateRecommendationsSchema = z.object({
  contribution: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Contribution must be a positive number"),
  dividends: z
    .string()
    .default("0")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, "Dividends must be a non-negative number"),
  portfolioId: z.string().uuid("Portfolio ID must be a valid UUID"),
});

// =============================================================================
// RESPONSE TYPES
// =============================================================================

type GenerateResponseData = GenerateRecommendationsResponse["data"];

interface GenerateResponseBody {
  data: GenerateResponseData;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/recommendations/generate
 *
 * Generates investment recommendations for a user's portfolio.
 * Requires authentication via withAuth middleware.
 *
 * Request Body:
 * - contribution: string - Monthly contribution amount (required, > 0)
 * - dividends: string - Dividends received (optional, >= 0, defaults to "0")
 * - portfolioId: string - UUID of portfolio to generate recommendations for
 *
 * Response:
 * - data: Recommendation result with items, totalInvestable, and timing
 */
export const POST = withAuth<GenerateResponseBody | RecommendationValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json().catch(() => ({}));
      const validation = generateRecommendationsSchema.safeParse(body);

      if (!validation.success) {
        logger.warn("Recommendation generation validation failed", {
          userId: session.userId,
          errors: validation.error.message,
        });

        return validationError(validation.error.issues);
      }

      const { contribution, dividends, portfolioId } = validation.data;

      // Get user's base currency (from session or default)
      // TODO: Fetch from user profile once user settings are available
      const baseCurrency = "USD";

      logger.info("Starting recommendation generation", {
        userId: session.userId,
        portfolioId,
        contribution,
        dividends,
      });

      // Generate recommendations
      const result = await recommendationService.generateRecommendations(session.userId, {
        portfolioId,
        contribution,
        dividends,
        baseCurrency,
      });

      logger.info("Recommendations generated successfully", {
        userId: session.userId,
        portfolioId,
        correlationId: result.correlationId,
        assetCount: result.items.length,
        durationMs: result.durationMs,
      });

      // Format response
      const responseData: GenerateResponseData = {
        id: result.id,
        contribution: result.contribution,
        dividends: result.dividends,
        totalInvestable: result.totalInvestable,
        baseCurrency: result.baseCurrency,
        generatedAt: result.generatedAt.toISOString(),
        expiresAt: result.expiresAt.toISOString(),
        items: result.items.map((item) => ({
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
      // Handle specific errors
      if (error instanceof PortfolioNotFoundError) {
        logger.warn("Portfolio not found for recommendation generation", {
          userId: session.userId,
        });

        return NextResponse.json(
          {
            error: "Portfolio not found",
            code: "NOT_FOUND_PORTFOLIO",
          },
          { status: 404 }
        );
      }

      // Handle database errors
      const dbError = handleDbError(error, "generate recommendations", {
        userId: session.userId,
      });
      return databaseError(dbError, "generate recommendations");
    }
  }
);
