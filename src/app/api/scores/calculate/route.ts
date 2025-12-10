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
import { eq } from "drizzle-orm";
import { portfolioAssets, portfolios } from "@/lib/db/schema";

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

  // Get all assets from user's portfolios
  const portfolioIds = userPortfolios.map((p) => p.id);
  let assets = await db.select().from(portfolioAssets);
  assets = assets.filter((a) => portfolioIds.includes(a.portfolioId));

  // Filter by specific asset IDs if provided
  if (assetIds && assetIds.length > 0) {
    assets = assets.filter((a) => assetIds.includes(a.id));
  }

  // Convert to AssetWithFundamentals format
  // For now, use mock fundamentals since Epic 6 will provide real data
  // In production, this would fetch from external data providers
  return assets.map((asset) => ({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name ?? undefined,
    fundamentals: generateMockFundamentals(asset.symbol),
    targetMarket: undefined,
  }));
}

/**
 * Generate mock fundamentals for testing
 *
 * This is a placeholder until Epic 6 (Data Pipeline) provides real data.
 * In production, these would come from external data providers.
 */
function generateMockFundamentals(symbol: string): Record<string, number | null> {
  // Use symbol as seed for consistent but varied mock data
  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    dividend_yield: (seed % 10) + 1, // 1-10%
    pe_ratio: (seed % 30) + 5, // 5-35
    pb_ratio: (seed % 5) + 0.5, // 0.5-5.5
    market_cap: ((seed % 100) + 1) * 1_000_000_000, // 1B-100B
    roe: (seed % 25) + 5, // 5-30%
    roa: (seed % 15) + 2, // 2-17%
    debt_to_equity: (seed % 200) / 100, // 0-2
    current_ratio: (seed % 300) / 100 + 0.5, // 0.5-3.5
    gross_margin: (seed % 40) + 20, // 20-60%
    net_margin: (seed % 20) + 5, // 5-25%
    payout_ratio: (seed % 60) + 20, // 20-80%
    ev_ebitda: (seed % 15) + 5, // 5-20
    // Some metrics intentionally null to test missing fundamentals
    surplus_years: seed % 2 === 0 ? null : (seed % 10) + 1,
    revenue: seed % 3 === 0 ? null : ((seed % 50) + 1) * 1_000_000_000,
    earnings: seed % 4 === 0 ? null : ((seed % 20) + 1) * 1_000_000_000,
  };
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
