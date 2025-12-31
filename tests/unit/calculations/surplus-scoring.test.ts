/**
 * Surplus Scoring Unit Tests
 *
 * Story 4.6: Historical Surplus Scoring
 *
 * Tests for:
 * - AC-4.6.1: Bonus points for 5+ consecutive surplus years
 * - AC-4.6.2: Penalty points for missing surplus data
 * - Combined scoring calculation
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import {
  evaluateSurplusBonus,
  evaluateSurplusPenalty,
  calculateSurplusScore,
  hasSurplusHistory,
  createEmptySurplusScore,
  SURPLUS_CONSISTENCY_BONUS,
  MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS,
  PENALTY_PER_MISSING_YEAR,
  EXPECTED_YEARS_OF_DATA,
} from "@/lib/calculations/surplus-scoring";
import type { SurplusHistoryData } from "@/lib/validations/score-schemas";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createSurplusHistory(
  yearsAvailable: number,
  consecutiveSurplusYears: number,
  surplusByYear: Record<string, boolean | null> = {}
): SurplusHistoryData {
  return {
    yearsAvailable,
    consecutiveSurplusYears,
    surplusByYear,
    dataSource: "Test Data",
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Surplus Scoring Constants", () => {
  it("should have correct bonus value per AC-4.6.1", () => {
    expect(SURPLUS_CONSISTENCY_BONUS).toBe(5);
  });

  it("should require 5 consecutive years for bonus per AC-4.6.1", () => {
    expect(MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS).toBe(5);
  });

  it("should apply -2 penalty per missing year per AC-4.6.2", () => {
    expect(PENALTY_PER_MISSING_YEAR).toBe(-2);
  });

  it("should expect 5 years of data per AC-4.6.2", () => {
    expect(EXPECTED_YEARS_OF_DATA).toBe(5);
  });
});

// =============================================================================
// BONUS CALCULATION TESTS (AC-4.6.1)
// =============================================================================

describe("evaluateSurplusBonus", () => {
  it("should award +5 bonus for exactly 5 consecutive years", () => {
    const history = createSurplusHistory(5, 5);
    const result = evaluateSurplusBonus(history);

    expect(result.bonusPoints).toBe(5);
    expect(result.qualified).toBe(true);
    expect(result.consecutiveYears).toBe(5);
  });

  it("should award +5 bonus for more than 5 consecutive years", () => {
    const history = createSurplusHistory(7, 7);
    const result = evaluateSurplusBonus(history);

    expect(result.bonusPoints).toBe(5);
    expect(result.qualified).toBe(true);
    expect(result.consecutiveYears).toBe(7);
  });

  it("should NOT award bonus for 4 consecutive years", () => {
    const history = createSurplusHistory(5, 4);
    const result = evaluateSurplusBonus(history);

    expect(result.bonusPoints).toBe(0);
    expect(result.qualified).toBe(false);
    expect(result.consecutiveYears).toBe(4);
  });

  it("should NOT award bonus for 0 consecutive years", () => {
    const history = createSurplusHistory(5, 0);
    const result = evaluateSurplusBonus(history);

    expect(result.bonusPoints).toBe(0);
    expect(result.qualified).toBe(false);
    expect(result.consecutiveYears).toBe(0);
  });

  it("should NOT award bonus for 3 consecutive years even with 10 years data", () => {
    const history = createSurplusHistory(10, 3);
    const result = evaluateSurplusBonus(history);

    expect(result.bonusPoints).toBe(0);
    expect(result.qualified).toBe(false);
  });
});

// =============================================================================
// PENALTY CALCULATION TESTS (AC-4.6.2)
// =============================================================================

describe("evaluateSurplusPenalty", () => {
  it("should apply NO penalty for 5 years of data", () => {
    const history = createSurplusHistory(5, 5);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(0);
    expect(result.missingYears).toBe(0);
    expect(result.yearsAvailable).toBe(5);
  });

  it("should apply NO penalty for more than 5 years of data", () => {
    const history = createSurplusHistory(10, 5);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(0);
    expect(result.missingYears).toBe(0);
  });

  it("should apply -2 penalty for 4 years of data (1 missing)", () => {
    const history = createSurplusHistory(4, 4);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(-2);
    expect(result.missingYears).toBe(1);
    expect(result.yearsAvailable).toBe(4);
  });

  it("should apply -4 penalty for 3 years of data (2 missing)", () => {
    const history = createSurplusHistory(3, 3);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(-4);
    expect(result.missingYears).toBe(2);
  });

  it("should apply -6 penalty for 2 years of data (3 missing)", () => {
    const history = createSurplusHistory(2, 2);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(-6);
    expect(result.missingYears).toBe(3);
  });

  it("should apply -8 penalty for 1 year of data (4 missing)", () => {
    const history = createSurplusHistory(1, 1);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(-8);
    expect(result.missingYears).toBe(4);
  });

  it("should apply -10 penalty for 0 years of data (5 missing)", () => {
    const history = createSurplusHistory(0, 0);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(-10);
    expect(result.missingYears).toBe(5);
  });
});

// =============================================================================
// COMBINED CALCULATION TESTS
// =============================================================================

describe("calculateSurplusScore", () => {
  it("should return +5 for best case (5+ consecutive, no missing)", () => {
    const history = createSurplusHistory(5, 5);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(5);
    expect(result.bonusApplied).toBe(5);
    expect(result.penaltyApplied).toBe(0);
    expect(result.yearsOfData).toBe(5);
    expect(result.consecutiveYears).toBe(5);
  });

  it("should return 0 for neutral case (5 years, no consecutive streak)", () => {
    const history = createSurplusHistory(5, 0);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(0);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(0);
  });

  it("should return -10 for worst case (no data)", () => {
    const history = createSurplusHistory(0, 0);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(-10);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(-10);
    expect(result.yearsOfData).toBe(0);
    expect(result.consecutiveYears).toBe(0);
  });

  it("should combine bonus and penalty correctly", () => {
    // 4 years of data with all 4 consecutive
    // 4 consecutive = no bonus
    // 1 missing year = -2 penalty
    const history = createSurplusHistory(4, 4);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(-2);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(-2);
  });

  it("should return -4 for 3 years data with no consecutive streak", () => {
    const history = createSurplusHistory(3, 0);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(-4);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(-4);
  });

  it("should return +5 for 10 years with 7 consecutive", () => {
    const history = createSurplusHistory(10, 7);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(5);
    expect(result.bonusApplied).toBe(5);
    expect(result.penaltyApplied).toBe(0);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  it("should handle very large years of data", () => {
    const history = createSurplusHistory(50, 50);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(5);
    expect(result.bonusApplied).toBe(5);
    expect(result.penaltyApplied).toBe(0);
  });

  it("should handle 5 years data but only 4 consecutive", () => {
    const history = createSurplusHistory(5, 4);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(0);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(0);
  });

  it("should handle 5 consecutive years but only 4 years data (edge case)", () => {
    // This is a data inconsistency but we should handle it gracefully
    // If somehow consecutive years is 5 but only 4 years of data available
    const history = createSurplusHistory(4, 5);
    const result = calculateSurplusScore(history);

    // Bonus: 5 consecutive = +5
    // Penalty: 1 missing = -2
    // Total: +3
    expect(result.totalPoints).toBe(3);
    expect(result.bonusApplied).toBe(5);
    expect(result.penaltyApplied).toBe(-2);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("hasSurplusHistory", () => {
  it("should return true for valid surplus history", () => {
    const history = createSurplusHistory(5, 5);
    expect(hasSurplusHistory(history)).toBe(true);
  });

  it("should return false for null", () => {
    expect(hasSurplusHistory(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(hasSurplusHistory(undefined)).toBe(false);
  });

  it("should return false for invalid object", () => {
    const invalidHistory = { foo: "bar" } as unknown as SurplusHistoryData;
    expect(hasSurplusHistory(invalidHistory)).toBe(false);
  });
});

describe("createEmptySurplusScore", () => {
  it("should return all zeros", () => {
    const result = createEmptySurplusScore();

    expect(result.totalPoints).toBe(0);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(0);
    expect(result.yearsOfData).toBe(0);
    expect(result.consecutiveYears).toBe(0);
  });
});
