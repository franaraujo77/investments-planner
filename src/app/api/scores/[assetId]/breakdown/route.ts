/**
 * Score Breakdown API Routes
 *
 * Story 5.11: Score Breakdown View
 *
 * GET /api/scores/[assetId]/breakdown - Get detailed score breakdown
 *
 * Task 7: Implement Breakdown API Route
 *
 * Returns:
 * - 200: Breakdown found with full details
 * - 401: Not authenticated
 * - 404: No score found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getAssetScore } from "@/lib/services/score-service";
import { db } from "@/lib/db";
import { criteriaVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface GetBreakdownResponse {
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
    /** Target market from criteria version (for edit link navigation) */
    targetMarket: string | null;
    /** Asset type from criteria version */
    assetType: string | null;
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
 * GET /api/scores/[assetId]/breakdown
 *
 * Retrieves detailed score breakdown for an asset.
 * Includes additional metadata like target market for navigation.
 *
 * AC-5.11.1: Returns data for breakdown panel
 * AC-5.11.3: Returns criterion-by-criterion breakdown
 * AC-5.11.5: Returns skipped criteria with reasons
 * AC-5.11.6: Returns targetMarket for edit criteria link
 *
 * Path Parameters:
 * - assetId: UUID of the asset to get breakdown for
 *
 * Response:
 * - data: Full breakdown with metadata
 */
export const GET = withAuth<GetBreakdownResponse | ErrorResponse | AuthError>(
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
        return NextResponse.json(
          {
            error: "No score found for this asset",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Fetch criteria version to get target market
      let targetMarket: string | null = null;
      let assetType: string | null = null;

      if (score.criteriaVersionId) {
        const [criteriaVersion] = await db
          .select({
            targetMarket: criteriaVersions.targetMarket,
            assetType: criteriaVersions.assetType,
          })
          .from(criteriaVersions)
          .where(eq(criteriaVersions.id, score.criteriaVersionId))
          .limit(1);

        if (criteriaVersion) {
          targetMarket = criteriaVersion.targetMarket;
          assetType = criteriaVersion.assetType;
        }
      }

      // Format response
      const response: GetBreakdownResponse = {
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
          targetMarket,
          assetType,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const dbError = handleDbError(error, "get score breakdown");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "get score breakdown");
      }

      return NextResponse.json(
        {
          error: "Failed to retrieve breakdown",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
