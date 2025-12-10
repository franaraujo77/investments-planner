/**
 * Score Calculation API Routes
 *
 * Story 5.8: Score Calculation Engine
 *
 * POST /api/scores/calculate - Calculate scores for assets
 *
 * Task 3: Create Score Calculation API Endpoint (AC: 5.8.1, 5.8.5)
 *
 * Returns:
 * - 200: Scores calculated successfully
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: No criteria found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { calculateAndPersistScores } from "@/lib/services/score-service";
import { calculateScoresRequestSchema } from "@/lib/validations/score-schemas";
import type { AssetWithFundamentals } from "@/lib/validations/score-schemas";
import type { AuthError } from "@/lib/auth/types";
import { db } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { portfolioAssets, portfolios } from "@/lib/db/schema";
// TODO(epic-6): Replace mock fundamentals with real data from market data providers
import { generateMockFundamentals } from "@/lib/mocks/fundamentals";

/**
 * Response types
 */
interface CalculateResponse {
  data: {
    jobId: string;
    scores: Array<{
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
    }>;
    calculatedAt: string;
    correlationId: string;
    assetCount: number;
    duration: number;
  };
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Get assets with fundamentals for a user
 *
 * TODO(epic-6): Replace mock fundamentals with real data from market data providers.
 * For now, this uses mock fundamentals data since Epic 6 (Data Pipeline)
 * will provide the actual external data fetching.
 *
 * @param userId - User ID
 * @param assetIds - Optional specific asset IDs to fetch
 * @returns Array of assets with fundamentals
 */
async function getAssetsWithFundamentals(
  userId: string,
  assetIds?: string[]
): Promise<AssetWithFundamentals[]> {
  // Get user's portfolios
  const userPortfolios = await db.select().from(portfolios).where(eq(portfolios.userId, userId));

  if (userPortfolios.length === 0) {
    return [];
  }

  // Get assets from user's portfolios using database-level filtering for performance
  const portfolioIds = userPortfolios.map((p) => p.id);
  let assets = await db
    .select()
    .from(portfolioAssets)
    .where(inArray(portfolioAssets.portfolioId, portfolioIds));

  // Filter by specific asset IDs if provided (also at DB level for consistency)
  if (assetIds && assetIds.length > 0) {
    assets = assets.filter((a) => assetIds.includes(a.id));
  }

  // Convert to AssetWithFundamentals format
  // TODO(epic-6): Fetch real fundamentals from external data providers
  return assets.map((asset) => ({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name ?? undefined,
    fundamentals: generateMockFundamentals(asset.symbol),
    targetMarket: undefined,
  }));
}

/**
 * POST /api/scores/calculate
 *
 * Calculates scores for assets using the scoring engine.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.8.1: Criteria-Driven Algorithm
 * AC-5.8.4: Event Emission for Audit Trail
 * AC-5.8.5: Score Storage with Audit Trail
 *
 * Request Body:
 * - assetIds?: string[] - Optional array of asset IDs to calculate
 * - criteriaVersionId?: string - Optional specific criteria version to use
 * - targetMarket?: string - Optional target market filter
 *
 * Response:
 * - data: Calculation result with scores, correlationId, and timing
 */
export const POST = withAuth<CalculateResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json().catch(() => ({}));
      const validation = calculateScoresRequestSchema.safeParse(body);

      if (!validation.success) {
        logger.warn("Score calculation validation failed", {
          userId: session.userId,
          errors: validation.error.message,
        });

        return NextResponse.json(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: validation.error.message,
          },
          { status: 400 }
        );
      }

      const { assetIds, criteriaVersionId, targetMarket } = validation.data;

      // Get assets with fundamentals
      const assets = await getAssetsWithFundamentals(session.userId, assetIds);

      if (assets.length === 0) {
        logger.info("No assets found for score calculation", {
          userId: session.userId,
          requestedAssetIds: assetIds?.join(",") ?? "all",
        });

        return NextResponse.json(
          {
            error: "No assets found for calculation",
            code: "NO_ASSETS",
          },
          { status: 404 }
        );
      }

      // Calculate and persist scores
      const result = await calculateAndPersistScores({
        userId: session.userId,
        assets,
        criteriaVersionId,
        targetMarket,
      });

      logger.info("Scores calculated successfully", {
        userId: session.userId,
        correlationId: result.correlationId,
        assetCount: result.assetCount,
        duration: result.duration,
      });

      // Format response
      const response: CalculateResponse = {
        data: {
          jobId: result.jobId,
          scores: result.scores.map((s) => ({
            assetId: s.assetId,
            symbol: s.symbol,
            score: s.score,
            breakdown: s.breakdown.map((b) => ({
              criterionId: b.criterionId,
              criterionName: b.criterionName,
              matched: b.matched,
              pointsAwarded: b.pointsAwarded,
              actualValue: b.actualValue ?? null,
              skippedReason: b.skippedReason ?? null,
            })),
            criteriaVersionId: s.criteriaVersionId,
            calculatedAt: s.calculatedAt.toISOString(),
          })),
          calculatedAt: result.calculatedAt.toISOString(),
          correlationId: result.correlationId,
          assetCount: result.assetCount,
          duration: result.duration,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific errors
      if (errorMessage === "NO_CRITERIA") {
        logger.warn("No criteria found for score calculation", {
          userId: session.userId,
        });

        return NextResponse.json(
          {
            error: "No active criteria found. Please create scoring criteria first.",
            code: "NO_CRITERIA",
          },
          { status: 404 }
        );
      }

      if (errorMessage === "NO_ASSETS") {
        return NextResponse.json(
          {
            error: "No assets found for calculation",
            code: "NO_ASSETS",
          },
          { status: 404 }
        );
      }

      logger.error("Score calculation failed", {
        userId: session.userId,
        error: errorMessage,
      });

      return NextResponse.json(
        {
          error: "Score calculation failed",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
