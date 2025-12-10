/**
 * Individual Asset Score API Routes
 *
 * Story 5.8: Score Calculation Engine
 *
 * GET /api/scores/[assetId] - Get score for a specific asset
 *
 * Task 6: Create Score Endpoint for Individual Asset (AC: 5.8.5)
 *
 * Returns:
 * - 200: Score found
 * - 401: Not authenticated
 * - 404: No score found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { getAssetScore } from "@/lib/services/score-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface GetScoreResponse {
  data: {
    assetId: string;
    symbol: string;
    score: string;
    breakdown: Array<{
      criterionId: string;
      criterionName: string;
      matched: boolean;
      pointsAwarded: number;
      actualValue: string | null;
      skippedReason: string | null;
    }>;
    criteriaVersionId: string;
    calculatedAt: string;
    isFresh: boolean;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
}

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * GET /api/scores/[assetId]
 *
 * Retrieves the most recent score for a specific asset.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.8.5: Score Storage with Audit Trail
 * - Returns score, breakdown, criteriaVersionId, calculatedAt
 * - Returns 404 if no score exists
 * - Enforces user authorization (scoped by userId)
 *
 * Path Parameters:
 * - assetId: UUID of the asset to get score for
 *
 * Response:
 * - data: Score with breakdown and metadata
 */
export const GET = withAuth<GetScoreResponse | ErrorResponse | AuthError>(
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

      // Get the score (scoped by userId for multi-tenant isolation)
      const score = await getAssetScore(session.userId, assetId);

      if (!score) {
        logger.info("No score found for asset", {
          userId: session.userId,
          assetId,
        });

        return NextResponse.json(
          {
            error: "No score found for this asset",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      logger.debug("Score retrieved", {
        userId: session.userId,
        assetId,
        score: score.score,
        isFresh: score.isFresh,
      });

      // Format response
      const response: GetScoreResponse = {
        data: {
          assetId: score.assetId,
          symbol: score.symbol,
          score: score.score,
          breakdown: score.breakdown.map((b) => ({
            criterionId: b.criterionId,
            criterionName: b.criterionName,
            matched: b.matched,
            pointsAwarded: b.pointsAwarded,
            actualValue: b.actualValue ?? null,
            skippedReason: b.skippedReason ?? null,
          })),
          criteriaVersionId: score.criteriaVersionId,
          calculatedAt: score.calculatedAt.toISOString(),
          isFresh: score.isFresh,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logger.error("Failed to get asset score", {
        userId: session.userId,
        error: errorMessage,
      });

      return NextResponse.json(
        {
          error: "Failed to retrieve score",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
