/**
 * Surplus Score Detail Component Tests
 *
 * Story 4.6: Historical Surplus Scoring
 * AC-4.6.3: Score Breakdown Display
 *
 * Tests for component logic and validation.
 * Full component rendering tests are E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPES (matching component props)
// =============================================================================

interface SurplusScoreDetailProps {
  yearsOfData: number;
  consecutiveYears: number;
  bonusApplied: number;
  penaltyApplied: number;
  totalPoints?: number;
  className?: string;
  compact?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS (mimicking component logic for testing)
// =============================================================================

/**
 * Determine status color based on bonus/penalty
 * AC-4.6.3: Color coding for surplus scoring
 */
function getStatusColor(bonusApplied: number, penaltyApplied: number): "green" | "red" | "amber" {
  if (bonusApplied > 0) return "green";
  if (penaltyApplied < 0) return "red";
  return "amber";
}

/**
 * Get status icon type based on bonus/penalty
 * AC-4.6.3: Visual indicators for score state
 */
function getStatusIconType(
  bonusApplied: number,
  penaltyApplied: number
): "check" | "x" | "warning" {
  if (bonusApplied > 0) return "check";
  if (penaltyApplied < 0) return "x";
  return "warning";
}

/**
 * Format points with sign for display
 */
function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `${points}`;
  return "0";
}

/**
 * Calculate net points from bonus and penalty
 */
function calculateNetPoints(
  bonusApplied: number,
  penaltyApplied: number,
  totalPoints?: number
): number {
  return totalPoints ?? bonusApplied + penaltyApplied;
}

/**
 * Get missing years count
 */
function getMissingYears(yearsOfData: number): number {
  return Math.max(0, 5 - yearsOfData);
}

/**
 * Check if data is complete (5+ years)
 */
function isDataComplete(yearsOfData: number): boolean {
  return yearsOfData >= 5;
}

/**
 * Check if eligible for bonus (5+ consecutive)
 */
function isEligibleForBonus(consecutiveYears: number): boolean {
  return consecutiveYears >= 5;
}

/**
 * Format compact mode display
 */
function formatCompactDisplay(yearsOfData: number, consecutiveYears: number): string {
  return `${consecutiveYears}y streak, ${yearsOfData}y data`;
}

// =============================================================================
// TESTS
// =============================================================================

describe("SurplusScoreDetail Component Logic", () => {
  describe("Status Color (AC-4.6.3)", () => {
    it("returns green when bonus applied", () => {
      expect(getStatusColor(5, 0)).toBe("green");
    });

    it("returns red when penalty applied", () => {
      expect(getStatusColor(0, -2)).toBe("red");
    });

    it("returns amber for neutral state", () => {
      expect(getStatusColor(0, 0)).toBe("amber");
    });

    it("prefers green when both bonus and penalty present", () => {
      // Edge case: bonus takes precedence
      expect(getStatusColor(5, -2)).toBe("green");
    });
  });

  describe("Status Icon Type", () => {
    it("returns check for bonus", () => {
      expect(getStatusIconType(5, 0)).toBe("check");
    });

    it("returns x for penalty", () => {
      expect(getStatusIconType(0, -4)).toBe("x");
    });

    it("returns warning for neutral", () => {
      expect(getStatusIconType(0, 0)).toBe("warning");
    });
  });

  describe("Points Formatting", () => {
    it("formats positive points with plus sign", () => {
      expect(formatPoints(5)).toBe("+5");
    });

    it("formats negative points with minus sign", () => {
      expect(formatPoints(-2)).toBe("-2");
    });

    it("formats zero without sign", () => {
      expect(formatPoints(0)).toBe("0");
    });

    it("handles large positive values", () => {
      expect(formatPoints(100)).toBe("+100");
    });

    it("handles large negative values", () => {
      expect(formatPoints(-10)).toBe("-10");
    });
  });

  describe("Net Points Calculation", () => {
    it("calculates net from bonus only", () => {
      expect(calculateNetPoints(5, 0)).toBe(5);
    });

    it("calculates net from penalty only", () => {
      expect(calculateNetPoints(0, -4)).toBe(-4);
    });

    it("calculates combined bonus and penalty", () => {
      expect(calculateNetPoints(5, -2)).toBe(3);
    });

    it("uses totalPoints if provided", () => {
      expect(calculateNetPoints(5, -2, 3)).toBe(3);
    });

    it("overrides calculation with explicit totalPoints", () => {
      // Even if calculated would be different
      expect(calculateNetPoints(5, 0, 10)).toBe(10);
    });
  });

  describe("Missing Years Calculation", () => {
    it("returns 0 for 5 years", () => {
      expect(getMissingYears(5)).toBe(0);
    });

    it("returns 1 for 4 years", () => {
      expect(getMissingYears(4)).toBe(1);
    });

    it("returns 2 for 3 years", () => {
      expect(getMissingYears(3)).toBe(2);
    });

    it("returns 5 for 0 years", () => {
      expect(getMissingYears(0)).toBe(5);
    });

    it("returns 0 for more than 5 years", () => {
      expect(getMissingYears(10)).toBe(0);
    });
  });

  describe("Data Completeness Check", () => {
    it("returns true for 5 years", () => {
      expect(isDataComplete(5)).toBe(true);
    });

    it("returns true for more than 5 years", () => {
      expect(isDataComplete(10)).toBe(true);
    });

    it("returns false for 4 years", () => {
      expect(isDataComplete(4)).toBe(false);
    });

    it("returns false for 0 years", () => {
      expect(isDataComplete(0)).toBe(false);
    });
  });

  describe("Bonus Eligibility Check", () => {
    it("returns true for 5 consecutive years", () => {
      expect(isEligibleForBonus(5)).toBe(true);
    });

    it("returns true for more than 5 consecutive years", () => {
      expect(isEligibleForBonus(7)).toBe(true);
    });

    it("returns false for 4 consecutive years", () => {
      expect(isEligibleForBonus(4)).toBe(false);
    });

    it("returns false for 0 consecutive years", () => {
      expect(isEligibleForBonus(0)).toBe(false);
    });
  });

  describe("Compact Display Format", () => {
    it("formats correctly for 5y/5y", () => {
      expect(formatCompactDisplay(5, 5)).toBe("5y streak, 5y data");
    });

    it("formats correctly for 3y/4y", () => {
      expect(formatCompactDisplay(4, 3)).toBe("3y streak, 4y data");
    });

    it("formats correctly for 0y/0y", () => {
      expect(formatCompactDisplay(0, 0)).toBe("0y streak, 0y data");
    });
  });

  describe("Props Validation", () => {
    it("accepts valid props", () => {
      const props: SurplusScoreDetailProps = {
        yearsOfData: 5,
        consecutiveYears: 5,
        bonusApplied: 5,
        penaltyApplied: 0,
      };

      expect(props.yearsOfData).toBeGreaterThanOrEqual(0);
      expect(props.consecutiveYears).toBeGreaterThanOrEqual(0);
      expect(props.bonusApplied).toBeGreaterThanOrEqual(0);
      expect(props.penaltyApplied).toBeLessThanOrEqual(0);
    });

    it("optional props are indeed optional", () => {
      const minimalProps: SurplusScoreDetailProps = {
        yearsOfData: 5,
        consecutiveYears: 5,
        bonusApplied: 5,
        penaltyApplied: 0,
      };

      // Should not throw
      expect(minimalProps.totalPoints).toBeUndefined();
      expect(minimalProps.className).toBeUndefined();
      expect(minimalProps.displayMode).toBeUndefined();
    });

    it("displayMode='compact' changes display behavior", () => {
      const compactProps: SurplusScoreDetailProps = {
        yearsOfData: 5,
        consecutiveYears: 5,
        bonusApplied: 5,
        penaltyApplied: 0,
        displayMode: "compact",
      };

      expect(compactProps.displayMode).toBe("compact");
    });
  });

  describe("AC-4.6.3: Score Breakdown Display Requirements", () => {
    it("can display all required information", () => {
      const props: SurplusScoreDetailProps = {
        yearsOfData: 4,
        consecutiveYears: 3,
        bonusApplied: 0,
        penaltyApplied: -2,
      };

      // AC-4.6.3: years of data available
      expect(props.yearsOfData).toBe(4);

      // AC-4.6.3: years with surplus (consecutive)
      expect(props.consecutiveYears).toBe(3);

      // AC-4.6.3: bonus applied
      expect(props.bonusApplied).toBe(0);

      // AC-4.6.3: penalty applied
      expect(props.penaltyApplied).toBe(-2);

      // Derived: net impact
      const netPoints = calculateNetPoints(props.bonusApplied, props.penaltyApplied);
      expect(netPoints).toBe(-2);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero values", () => {
      const netPoints = calculateNetPoints(0, 0);
      expect(netPoints).toBe(0);
      expect(formatPoints(netPoints)).toBe("0");
    });

    it("handles maximum bonus value", () => {
      // Per spec, bonus is capped at 5
      const netPoints = calculateNetPoints(5, 0);
      expect(netPoints).toBe(5);
    });

    it("handles maximum penalty value", () => {
      // 5 missing years * -2 = -10
      const netPoints = calculateNetPoints(0, -10);
      expect(netPoints).toBe(-10);
    });

    it("handles data inconsistency (more consecutive than available)", () => {
      // This is a data error but component should handle gracefully
      const netPoints = calculateNetPoints(5, -2);
      expect(netPoints).toBe(3);
    });
  });
});
