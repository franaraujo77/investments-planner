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
  it("should apply NO penalty for complete years of data", () => {
    const history = createSurplusHistory(EXPECTED_YEARS_OF_DATA, EXPECTED_YEARS_OF_DATA);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(0);
    expect(result.missingYears).toBe(0);
    expect(result.yearsAvailable).toBe(EXPECTED_YEARS_OF_DATA);
  });

  it("should apply NO penalty for more than expected years of data", () => {
    const history = createSurplusHistory(10, EXPECTED_YEARS_OF_DATA);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(0);
    expect(result.missingYears).toBe(0);
  });

  it("should apply penalty for 1 missing year", () => {
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 1;
    const history = createSurplusHistory(yearsAvailable, yearsAvailable);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(PENALTY_PER_MISSING_YEAR * 1);
    expect(result.missingYears).toBe(1);
    expect(result.yearsAvailable).toBe(yearsAvailable);
  });

  it("should apply penalty for 2 missing years", () => {
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 2;
    const history = createSurplusHistory(yearsAvailable, yearsAvailable);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(PENALTY_PER_MISSING_YEAR * 2);
    expect(result.missingYears).toBe(2);
  });

  it("should apply penalty for 3 missing years", () => {
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 3;
    const history = createSurplusHistory(yearsAvailable, yearsAvailable);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(PENALTY_PER_MISSING_YEAR * 3);
    expect(result.missingYears).toBe(3);
  });

  it("should apply penalty for 4 missing years", () => {
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 4;
    const history = createSurplusHistory(yearsAvailable, yearsAvailable);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(PENALTY_PER_MISSING_YEAR * 4);
    expect(result.missingYears).toBe(4);
  });

  it("should apply maximum penalty for 0 years of data", () => {
    const history = createSurplusHistory(0, 0);
    const result = evaluateSurplusPenalty(history);

    expect(result.penaltyPoints).toBe(PENALTY_PER_MISSING_YEAR * EXPECTED_YEARS_OF_DATA);
    expect(result.missingYears).toBe(EXPECTED_YEARS_OF_DATA);
  });
});

// =============================================================================
// COMBINED CALCULATION TESTS
// =============================================================================

describe("calculateSurplusScore", () => {
  it("should return bonus for best case (consecutive years met, no missing)", () => {
    const history = createSurplusHistory(
      EXPECTED_YEARS_OF_DATA,
      MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS
    );
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(SURPLUS_CONSISTENCY_BONUS);
    expect(result.bonusApplied).toBe(SURPLUS_CONSISTENCY_BONUS);
    expect(result.penaltyApplied).toBe(0);
    expect(result.yearsOfData).toBe(EXPECTED_YEARS_OF_DATA);
    expect(result.consecutiveYears).toBe(MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS);
  });

  it("should return 0 for neutral case (complete years, no consecutive streak)", () => {
    const history = createSurplusHistory(EXPECTED_YEARS_OF_DATA, 0);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(0);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(0);
  });

  it("should return maximum penalty for worst case (no data)", () => {
    const history = createSurplusHistory(0, 0);
    const result = calculateSurplusScore(history);

    const maxPenalty = PENALTY_PER_MISSING_YEAR * EXPECTED_YEARS_OF_DATA;
    expect(result.totalPoints).toBe(maxPenalty);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(maxPenalty);
    expect(result.yearsOfData).toBe(0);
    expect(result.consecutiveYears).toBe(0);
  });

  it("should combine bonus and penalty correctly", () => {
    // 1 year missing = 1 missing year penalty, 4 consecutive = no bonus
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 1;
    const history = createSurplusHistory(yearsAvailable, yearsAvailable);
    const result = calculateSurplusScore(history);

    const expectedPenalty = PENALTY_PER_MISSING_YEAR * 1;
    expect(result.totalPoints).toBe(expectedPenalty);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(expectedPenalty);
  });

  it("should return penalty for missing years with no consecutive streak", () => {
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 2;
    const history = createSurplusHistory(yearsAvailable, 0);
    const result = calculateSurplusScore(history);

    const expectedPenalty = PENALTY_PER_MISSING_YEAR * 2;
    expect(result.totalPoints).toBe(expectedPenalty);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(expectedPenalty);
  });

  it("should return bonus for excess years with sufficient consecutive streak", () => {
    const history = createSurplusHistory(10, 7);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(SURPLUS_CONSISTENCY_BONUS);
    expect(result.bonusApplied).toBe(SURPLUS_CONSISTENCY_BONUS);
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

    expect(result.totalPoints).toBe(SURPLUS_CONSISTENCY_BONUS);
    expect(result.bonusApplied).toBe(SURPLUS_CONSISTENCY_BONUS);
    expect(result.penaltyApplied).toBe(0);
  });

  it("should handle complete years data but insufficient consecutive streak", () => {
    const consecutiveYears = MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS - 1;
    const history = createSurplusHistory(EXPECTED_YEARS_OF_DATA, consecutiveYears);
    const result = calculateSurplusScore(history);

    expect(result.totalPoints).toBe(0);
    expect(result.bonusApplied).toBe(0);
    expect(result.penaltyApplied).toBe(0);
  });

  it("should handle bonus-qualifying streak with missing data (edge case)", () => {
    // This is a data inconsistency but we should handle it gracefully
    // If somehow consecutive years qualifies for bonus but years of data has penalty
    const yearsAvailable = EXPECTED_YEARS_OF_DATA - 1;
    const history = createSurplusHistory(yearsAvailable, MINIMUM_CONSECUTIVE_YEARS_FOR_BONUS);
    const result = calculateSurplusScore(history);

    // Bonus: meets consecutive threshold = +SURPLUS_CONSISTENCY_BONUS
    // Penalty: 1 missing = PENALTY_PER_MISSING_YEAR
    // Total: bonus + penalty
    const expectedTotal = SURPLUS_CONSISTENCY_BONUS + PENALTY_PER_MISSING_YEAR;
    expect(result.totalPoints).toBe(expectedTotal);
    expect(result.bonusApplied).toBe(SURPLUS_CONSISTENCY_BONUS);
    expect(result.penaltyApplied).toBe(PENALTY_PER_MISSING_YEAR);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("hasSurplusHistory", () => {
  it("should return true for valid surplus history", () => {
    const history = createSurplusHistory(EXPECTED_YEARS_OF_DATA, EXPECTED_YEARS_OF_DATA);
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
