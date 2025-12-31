/**
 * Surplus Scoring Logic
 *
 * Story 4.6: Historical Surplus Scoring
 *
 * Implements bonus and penalty calculations for dividend surplus history:
 * - AC-4.6.1: +5 bonus points for 5+ consecutive years of dividend surplus
 * - AC-4.6.2: -2 penalty per missing year (up to -10 for 5 missing years)
 *
 * Uses Decimal.js for all financial calculations per project standards.
 */

import Decimal from "decimal.js";
import type { SurplusHistoryData, SurplusScoreResult } from "@/lib/validations/score-schemas";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Bonus points for 5+ consecutive years of dividend surplus
 * AC-4.6.1: +5 bonus points
 */
export const SURPLUS_CONSISTENCY_BONUS = 5;

/**
 * Minimum consecutive years required for bonus
 * AC-4.6.1: 5+ consecutive years
 */
export const MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS = 5;

/**
 * Penalty points per missing year of data
 * AC-4.6.2: -2 points per missing year
 */
export const PENALTY_PER_MISSING_YEAR = -2;

/**
 * Number of years expected for full data
 * AC-4.6.2: 5 years expected
 */
export const EXPECTED_YEARS_OF_DATA = 5;

// =============================================================================
// BONUS CALCULATION
// =============================================================================

/**
 * Evaluate surplus bonus for consistent dividend history
 *
 * AC-4.6.1: Bonus Points for Consistent Surplus History
 * - Given an asset has 5+ consecutive years of dividend surplus
 * - When the score is calculated
 * - Then the asset receives +5 bonus points for consistency
 *
 * @param history - The surplus history data for an asset
 * @returns Object with bonus points and breakdown details
 */
export function evaluateSurplusBonus(history: SurplusHistoryData): {
  bonusPoints: number;
  qualified: boolean;
  consecutiveYears: number;
} {
  const consecutiveYears = history.consecutiveSurplusYears;
  const qualified = consecutiveYears >= MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS;
  const bonusPoints = qualified ? SURPLUS_CONSISTENCY_BONUS : 0;

  return {
    bonusPoints,
    qualified,
    consecutiveYears,
  };
}

// =============================================================================
// PENALTY CALCULATION
// =============================================================================

/**
 * Evaluate surplus penalty for missing dividend data
 *
 * AC-4.6.2: Penalty Points for Missing Surplus Data
 * - Given an asset is missing dividend data for any of the last 5 years
 * - When the score is calculated
 * - Then the asset receives -2 points per missing year
 *
 * @param history - The surplus history data for an asset
 * @returns Object with penalty points and breakdown details
 */
export function evaluateSurplusPenalty(history: SurplusHistoryData): {
  penaltyPoints: number;
  missingYears: number;
  yearsAvailable: number;
} {
  const yearsAvailable = history.yearsAvailable;
  const missingYears = Math.max(0, EXPECTED_YEARS_OF_DATA - yearsAvailable);

  // Early return for complete data: explicitly return positive 0, not -0.
  // In JavaScript, 0 * -2 produces -0 (negative zero), which is a distinct value
  // from 0 (Object.is(0, -0) === false). While -0 === 0 is true, returning
  // explicit 0 avoids potential edge cases in serialization and comparisons.
  if (missingYears === 0) {
    return {
      penaltyPoints: 0,
      missingYears: 0,
      yearsAvailable,
    };
  }

  // Use Decimal.js for calculation per project standards
  const penaltyPoints = new Decimal(missingYears).times(PENALTY_PER_MISSING_YEAR).toNumber();

  return {
    penaltyPoints,
    missingYears,
    yearsAvailable,
  };
}

// =============================================================================
// COMBINED CALCULATION
// =============================================================================

/**
 * Calculate the complete surplus score combining bonus and penalty
 *
 * AC-4.6.1: +5 bonus for 5+ consecutive years
 * AC-4.6.2: -2 penalty per missing year
 * AC-4.6.3: Returns breakdown details for display
 *
 * Score impact range:
 * - Best case: +5 (5+ consecutive years, no missing data)
 * - Neutral: 0 (5 years data, no consecutive streak)
 * - Worst case: -10 (no data available = 5 missing years)
 *
 * @param history - The surplus history data for an asset
 * @returns Complete surplus score result with breakdown
 */
export function calculateSurplusScore(history: SurplusHistoryData): SurplusScoreResult {
  const bonusResult = evaluateSurplusBonus(history);
  const penaltyResult = evaluateSurplusPenalty(history);

  // Use Decimal.js to combine bonus and penalty
  const totalPoints = new Decimal(bonusResult.bonusPoints)
    .plus(penaltyResult.penaltyPoints)
    .toNumber();

  return {
    totalPoints,
    bonusApplied: bonusResult.bonusPoints,
    penaltyApplied: penaltyResult.penaltyPoints,
    yearsOfData: history.yearsAvailable,
    consecutiveYears: history.consecutiveSurplusYears,
  };
}

/**
 * Check if an asset has surplus history data
 *
 * Helper function to determine if surplus scoring should be applied
 *
 * @param surplusHistory - Optional surplus history data
 * @returns True if valid surplus history exists
 */
export function hasSurplusHistory(
  surplusHistory: SurplusHistoryData | undefined | null
): surplusHistory is SurplusHistoryData {
  return (
    surplusHistory !== null &&
    surplusHistory !== undefined &&
    typeof surplusHistory.yearsAvailable === "number" &&
    typeof surplusHistory.consecutiveSurplusYears === "number"
  );
}

/**
 * Create an empty/default surplus score result
 *
 * Used when no surplus history is available
 *
 * @returns Default SurplusScoreResult with all zeros
 */
export function createEmptySurplusScore(): SurplusScoreResult {
  return {
    totalPoints: 0,
    bonusApplied: 0,
    penaltyApplied: 0,
    yearsOfData: 0,
    consecutiveYears: 0,
  };
}
