/**
 * Recommendation Details Helper Functions
 *
 * Story 6.4: Recommendation Details
 *
 * AC-6.4.1: Why This Recommendation Panel
 * AC-6.4.2: Allocation Math Display
 * AC-6.4.3: Score Contribution Display
 * AC-6.4.4: Full Calculation Details
 *
 * Helper functions for the RecommendationDetailsPanel component.
 */

import Decimal from "decimal.js";
import type { CriterionResult } from "@/hooks/use-asset-score";
import type { TopCriterion, ScoreRanking } from "@/lib/types/recommendations";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default number of top criteria to display in recommendation details.
 * Used in AC-6.4.3 for "Top N criteria that contributed most to the score".
 */
export const DEFAULT_TOP_CRITERIA_COUNT = 3;

/**
 * Calculate expected allocation after investment
 *
 * Story 6.4 AC-6.4.2: Shows expected % after investment
 *
 * Formula:
 * 1. New asset value = current value + recommended amount
 * 2. New portfolio value = current portfolio + total investable
 * 3. Expected allocation = (new asset value / new portfolio value) × 100
 *
 * @param currentValue - Current asset value in base currency (decimal string)
 * @param recommendedAmount - Amount to invest in this asset (decimal string)
 * @param portfolioTotal - Current portfolio total value (decimal string)
 * @param totalInvestable - Total amount being invested (decimal string)
 * @returns Expected allocation percentage after investment (decimal string)
 */
export function calculateExpectedAllocation(
  currentValue: string,
  recommendedAmount: string,
  portfolioTotal: string,
  totalInvestable: string
): string {
  const current = new Decimal(currentValue);
  const recommended = new Decimal(recommendedAmount);
  const portfolio = new Decimal(portfolioTotal);
  const investable = new Decimal(totalInvestable);

  // Handle edge case: zero portfolio value (new portfolio)
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

  // Handle -0 edge case, standardize to "0.00" for financial data consistency
  return expected.isZero() ? "0.00" : expected.toString();
}

/**
 * Extract top N criteria by absolute points awarded
 *
 * Story 6.4 AC-6.4.3: Top 3 criteria that contributed most to the score
 *
 * @param breakdown - Array of criterion results from scoring
 * @param count - Number of top criteria to return (default: DEFAULT_TOP_CRITERIA_COUNT)
 * @returns Array of top criteria sorted by absolute points
 */
export function getTopCriteria(
  breakdown: CriterionResult[],
  count: number = DEFAULT_TOP_CRITERIA_COUNT
): TopCriterion[] {
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
 * Calculate score ranking among portfolio assets
 *
 * Story 6.4 AC-6.4.1: Score ranking (percentile) in the panel
 *
 * @param assetScore - The score of the asset being ranked (decimal string)
 * @param allScores - All asset scores in the portfolio (decimal strings)
 * @returns Score ranking information (rank, total, percentile)
 */
export function calculateScoreRanking(assetScore: string, allScores: string[]): ScoreRanking {
  if (allScores.length === 0) {
    return { percentile: 0, rank: 0, total: 0 };
  }

  const score = new Decimal(assetScore);
  const sorted = allScores.map((s) => new Decimal(s)).sort((a, b) => b.minus(a).toNumber());

  const rank = sorted.findIndex((s) => s.eq(score)) + 1;
  const total = sorted.length;

  // Percentile: (N - rank) / N × 100, clamped to 0-100
  const percentile = total > 0 ? Math.round(((total - rank) / total) * 100) : 0;

  return { percentile, rank, total };
}

/**
 * Format allocation change with sign
 *
 * Story 6.4 AC-6.4.2: Allocation Math Display
 *
 * @param before - Allocation before (decimal string)
 * @param after - Allocation after (decimal string)
 * @returns Formatted change string with +/- sign
 */
export function formatAllocationChange(before: string, after: string): string {
  const beforeVal = new Decimal(before);
  const afterVal = new Decimal(after);
  const change = afterVal.minus(beforeVal);

  // Handle -0 edge case
  if (change.isZero()) {
    return "0.00";
  }

  // Internal calculation formatting (not user-facing display), toFixed is appropriate here
  const formatted = change.toFixed(2);
  return change.isPositive() ? `+${formatted}` : formatted;
}
