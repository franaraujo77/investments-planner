/**
 * Recommendation Breakdown API Route
 *
 * Story 7.7: View Recommendation Breakdown
 * Story 6.4: Recommendation Details (Extended Fields)
 *
 * GET /api/recommendations/:id/breakdown?itemId=uuid
 *
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * AC-7.7.3: Formula Display
 * AC-7.7.4: Audit Trail Information
 * AC-6.4.1: Score ranking (percentile among portfolio assets)
 * AC-6.4.2: Expected allocation after investment
 * AC-6.4.3: Top 3 scoring criteria
 * AC-6.4.4: Full calculation details
 *
 * Returns:
 * - 200: Breakdown retrieved successfully
 * - 400: Invalid request (missing itemId)
 * - 401: Not authenticated
 * - 404: Recommendation or item not found
 * - 500: Server error
 */

import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import {
  successResponse,
  notFoundError,
  validationError,
  handleDbError,
  databaseError,
} from "@/lib/api/responses";
import { NOT_FOUND_ERRORS } from "@/lib/api/error-codes";
import { db } from "@/lib/db";
import { recommendations, recommendationItems, assetScores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { AuthError } from "@/lib/auth/types";
import type {
  ExtendedBreakdown,
  CalculationStep,
  AuditTrailInfo,
  CalculationInputs,
  BreakdownResponse,
  TopCriterion,
  ScoreRanking,
} from "@/lib/types/recommendations";
import type { CriterionResult } from "@/hooks/use-asset-score";
import Decimal from "decimal.js";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const queryParamsSchema = z.object({
  itemId: z.string().uuid("Invalid item ID format"),
});

// =============================================================================
// RESPONSE TYPES
// =============================================================================

type GetResponseBody = BreakdownResponse | AuthError;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build calculation steps from recommendation breakdown
 */
function buildCalculationSteps(
  allocationGap: string,
  score: string,
  recommendedAmount: string,
  totalInvestable: string
): CalculationStep[] {
  const gapValue = parseFloat(allocationGap);
  const scoreValue = parseFloat(score);
  const amountValue = parseFloat(recommendedAmount);
  const totalValue = parseFloat(totalInvestable);

  // Calculate the score contribution (gap * score/100)
  const scoreContribution = gapValue * (scoreValue / 100);

  return [
    {
      step: "Calculate allocation gap",
      value: `${Math.abs(gapValue).toFixed(2)}%`,
      formula: "target_midpoint - current_allocation",
    },
    {
      step: "Apply score weighting",
      value: scoreContribution.toFixed(4),
      formula: "allocation_gap × (score / 100)",
    },
    {
      step: "Distribute capital proportionally",
      value: `$${amountValue.toFixed(2)}`,
      formula:
        totalValue > 0
          ? "weighted_priority ÷ total_priority × total_investable"
          : "N/A (no investable capital)",
    },
  ];
}

/**
 * Generate reasoning text for the recommendation
 */
function generateReasoning(
  score: string,
  allocationGap: string,
  isOverAllocated: boolean,
  recommendedAmount: string
): string {
  const gapValue = parseFloat(allocationGap);
  const scoreValue = parseFloat(score);
  const amountValue = parseFloat(recommendedAmount);

  if (isOverAllocated) {
    return `Asset is ${Math.abs(gapValue).toFixed(1)}% above target allocation. No investment recommended to allow natural rebalancing.`;
  }

  if (amountValue === 0) {
    return "Asset is at or above target allocation. No additional investment needed.";
  }

  const scoreLevel = scoreValue >= 80 ? "high" : scoreValue >= 50 ? "moderate" : "low";
  const gapDescription = Math.abs(gapValue) >= 5 ? "significantly" : "slightly";

  return `Asset is ${gapDescription} ${gapValue > 0 ? "below" : "above"} target allocation (${Math.abs(gapValue).toFixed(1)}%) with ${scoreLevel} score (${scoreValue.toFixed(1)}).`;
}

/**
 * Calculate target range from midpoint (±5% with bounds)
 */
function calculateTargetRange(targetMidpoint: string): { min: string; max: string } {
  const midpoint = parseFloat(targetMidpoint) || 0;
  const min = Math.max(midpoint - 5, 0).toFixed(1);
  const max = Math.min(midpoint + 5, 100).toFixed(1);
  return { min, max };
}

// =============================================================================
// STORY 6.4: EXTENDED BREAKDOWN HELPERS
// =============================================================================

/**
 * Extract top N criteria by absolute points awarded
 *
 * Story 6.4 AC-6.4.3: Top 3 criteria that contributed most to the score
 */
function getTopCriteria(breakdown: CriterionResult[], count: number = 3): TopCriterion[] {
  return breakdown
    .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
    .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
    .slice(0, count)
    .map((c) => ({
      criterionId: c.criterionId,
      criterionName: c.criterionName,
      pointsAwarded: c.pointsAwarded,
      actualValue: c.actualValue,
    }));
}

/**
 * Calculate expected allocation after investment
 *
 * Story 6.4 AC-6.4.2: Shows expected % after investment
 *
 * Formula:
 * 1. New asset value = current value + recommended amount
 * 2. New portfolio value = current portfolio + total investable
 * 3. Expected allocation = (new asset value / new portfolio value) × 100
 */
function calculateExpectedAllocationAfter(
  currentValue: string,
  recommendedAmount: string,
  portfolioTotal: string,
  totalInvestable: string
): string {
  const current = new Decimal(currentValue);
  const recommended = new Decimal(recommendedAmount);
  const portfolio = new Decimal(portfolioTotal);
  const investable = new Decimal(totalInvestable);

  // Handle edge case: zero portfolio value
  if (portfolio.isZero()) {
    if (investable.isZero()) return "0.00";
    return recommended.dividedBy(investable).times(100).toDecimalPlaces(2).toString();
  }

  // Calculate new values
  const newValue = current.plus(recommended);
  const newPortfolio = portfolio.plus(investable);

  // Handle edge case: no new portfolio value
  if (newPortfolio.isZero()) {
    return "0.00";
  }

  // Calculate expected allocation
  const expected = newValue.dividedBy(newPortfolio).times(100).toDecimalPlaces(2);

  // Handle -0 edge case
  return expected.isZero() ? "0.00" : expected.toString();
}

/**
 * Calculate score ranking among portfolio assets
 *
 * Story 6.4 AC-6.4.1: Score ranking (percentile) in the panel
 */
function calculateScoreRanking(assetScore: string, allScores: string[]): ScoreRanking {
  const score = new Decimal(assetScore);
  const sorted = allScores.map((s) => new Decimal(s)).sort((a, b) => b.minus(a).toNumber());

  const rank = sorted.findIndex((s) => s.eq(score)) + 1;
  const total = sorted.length;

  // Percentile: (N - rank) / N × 100, clamped to 0-100
  const percentile = total > 0 ? Math.round(((total - rank) / total) * 100) : 0;

  return { percentile, rank, total };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recommendations/:id/breakdown
 *
 * Retrieves detailed breakdown for a specific recommendation item.
 *
 * Query parameters:
 * - itemId: UUID of the recommendation item
 *
 * Response:
 * - 200: { data: DetailedBreakdown }
 * - 404: Recommendation or item not found
 */
export const GET = withAuth<GetResponseBody>(async (request, session, context) => {
  try {
    // Extract route params
    const { id: recommendationId } = await (context as unknown as RouteContext).params;

    // Parse query parameters
    const url = new URL(request.url);
    const itemId = url.searchParams.get("itemId");

    // Validate itemId
    const validation = queryParamsSchema.safeParse({ itemId });
    if (!validation.success) {
      return validationError(validation.error.issues);
    }

    logger.info("Fetching recommendation breakdown", {
      userId: session.userId,
      recommendationId,
      itemId,
    });

    // Fetch recommendation (verify ownership)
    const recommendation = await db.query.recommendations.findFirst({
      where: and(
        eq(recommendations.id, recommendationId),
        eq(recommendations.userId, session.userId)
      ),
    });

    if (!recommendation) {
      logger.info("Recommendation not found", {
        userId: session.userId,
        recommendationId,
      });
      return notFoundError("Recommendation", NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND);
    }

    // Fetch recommendation item
    const item = await db.query.recommendationItems.findFirst({
      where: and(
        eq(recommendationItems.id, itemId!),
        eq(recommendationItems.recommendationId, recommendationId)
      ),
    });

    if (!item) {
      logger.info("Recommendation item not found", {
        userId: session.userId,
        recommendationId,
        itemId,
      });
      return notFoundError("Recommendation item", NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND);
    }

    // Fetch asset score to get criteria version
    const assetScore = await db.query.assetScores.findFirst({
      where: and(eq(assetScores.userId, session.userId), eq(assetScores.assetId, item.assetId)),
    });

    // Build target range from breakdown or targetAllocation
    const targetRange = calculateTargetRange(
      item.breakdown.targetMidpoint || item.targetAllocation
    );

    // Build calculation inputs
    const inputs: CalculationInputs = {
      currentValue: item.breakdown.currentValue,
      portfolioTotal: recommendation.totalInvestable, // Total investable as reference
      currentPercentage: item.currentAllocation,
      targetRange,
      score: item.score,
      criteriaVersion: assetScore?.criteriaVersionId || "unknown",
    };

    // Build calculation steps
    const steps = buildCalculationSteps(
      item.allocationGap,
      item.score,
      item.recommendedAmount,
      recommendation.totalInvestable
    );

    // Build reasoning
    const reasoning = generateReasoning(
      item.score,
      item.allocationGap,
      item.isOverAllocated,
      item.recommendedAmount
    );

    // Build audit trail
    const auditTrail: AuditTrailInfo = {
      correlationId: recommendation.correlationId,
      generatedAt: recommendation.generatedAt.toISOString(),
      criteriaVersionId: assetScore?.criteriaVersionId || "unknown",
    };

    // =================================================================
    // STORY 6.4: Extended Breakdown Fields
    // =================================================================

    // AC-6.4.3: Top 3 scoring criteria
    const topCriteria = assetScore?.breakdown
      ? getTopCriteria(assetScore.breakdown as CriterionResult[], 3)
      : [];

    // AC-6.4.2: Calculate expected allocation after investment
    // Need to fetch portfolio value from recommendation items total
    const allItems = await db.query.recommendationItems.findMany({
      where: eq(recommendationItems.recommendationId, recommendationId),
    });

    // Calculate portfolio total from item breakdown data
    const portfolioTotal = allItems.reduce((sum, i) => {
      return sum + parseFloat(i.breakdown.currentValue || "0");
    }, 0);

    const expectedAllocationAfter = calculateExpectedAllocationAfter(
      item.breakdown.currentValue,
      item.recommendedAmount,
      portfolioTotal.toString(),
      recommendation.totalInvestable
    );

    // AC-6.4.1: Calculate score ranking among portfolio assets
    const allScores = allItems.map((i) => i.score);
    const scoreRanking = calculateScoreRanking(item.score, allScores);

    // Build extended breakdown
    const breakdown: ExtendedBreakdown = {
      item: {
        assetId: item.assetId,
        symbol: item.symbol,
        score: item.score,
        currentAllocation: item.currentAllocation,
        targetAllocation: item.targetAllocation,
        allocationGap: item.allocationGap,
        recommendedAmount: item.recommendedAmount,
        isOverAllocated: item.isOverAllocated,
      },
      calculation: {
        inputs,
        steps,
        result: {
          recommendedAmount: item.recommendedAmount,
          reasoning,
        },
      },
      auditTrail,
      // Story 6.4 extended fields
      topCriteria,
      expectedAllocationAfter,
      scoreRanking,
    };

    logger.info("Recommendation breakdown retrieved successfully", {
      userId: session.userId,
      recommendationId,
      itemId,
      symbol: item.symbol,
      topCriteriaCount: topCriteria.length,
      expectedAllocationAfter,
      scoreRank: scoreRanking.rank,
    });

    return successResponse(breakdown);
  } catch (error) {
    const dbError = handleDbError(error, "get recommendation breakdown", {
      userId: session.userId,
    });
    return databaseError(dbError, "get recommendation breakdown");
  }
});
