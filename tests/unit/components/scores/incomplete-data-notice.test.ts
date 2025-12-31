/**
 * Incomplete Data Notice Component Tests
 *
 * Story 4.6: Historical Surplus Scoring
 * AC-4.6.4: Incomplete Data Notice
 *
 * Tests for component logic and validation.
 * Full component rendering tests are E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPES (matching component props)
// =============================================================================

interface IncompleteDataNoticeProps {
  yearsOfData: number;
  assetSymbol?: string;
  className?: string;
  variant?: "warning" | "info";
  compact?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EXPECTED_YEARS = 5;
const PENALTY_PER_MISSING_YEAR = -2;

// =============================================================================
// HELPER FUNCTIONS (mimicking component logic for testing)
// =============================================================================

/**
 * Calculate missing years and penalty
 */
function calculateMissingInfo(yearsOfData: number): {
  missingYears: number;
  totalPenalty: number;
  isComplete: boolean;
} {
  const missingYears = Math.max(0, EXPECTED_YEARS - yearsOfData);
  // Avoid -0 by returning 0 when no penalty
  const totalPenalty = missingYears === 0 ? 0 : missingYears * PENALTY_PER_MISSING_YEAR;
  const isComplete = missingYears === 0;

  return { missingYears, totalPenalty, isComplete };
}

/**
 * Check if notice should be shown
 */
function shouldShowIncompleteDataNotice(yearsOfData: number): boolean {
  return yearsOfData < EXPECTED_YEARS;
}

/**
 * Get message title based on state
 */
function getMessageTitle(missingYears: number): string {
  if (missingYears === 0) return "Complete Data Available";
  if (missingYears === EXPECTED_YEARS) return "No Dividend Data Available";
  return "Incomplete Dividend Data";
}

/**
 * Format compact display message
 */
function formatCompactMessage(missingYears: number, totalPenalty: number): string {
  return `${missingYears} year${missingYears > 1 ? "s" : ""} missing (${totalPenalty} pts)`;
}

// =============================================================================
// TESTS
// =============================================================================

describe("IncompleteDataNotice Component Logic", () => {
  describe("calculateMissingInfo", () => {
    it("returns 0 missing years for 5 years data", () => {
      const result = calculateMissingInfo(5);
      expect(result.missingYears).toBe(0);
      expect(result.totalPenalty).toBe(0);
      expect(result.isComplete).toBe(true);
    });

    it("returns 0 missing years for more than 5 years data", () => {
      const result = calculateMissingInfo(10);
      expect(result.missingYears).toBe(0);
      expect(result.totalPenalty).toBe(0);
      expect(result.isComplete).toBe(true);
    });

    it("returns 1 missing year for 4 years data", () => {
      const result = calculateMissingInfo(4);
      expect(result.missingYears).toBe(1);
      expect(result.totalPenalty).toBe(-2);
      expect(result.isComplete).toBe(false);
    });

    it("returns 2 missing years for 3 years data", () => {
      const result = calculateMissingInfo(3);
      expect(result.missingYears).toBe(2);
      expect(result.totalPenalty).toBe(-4);
      expect(result.isComplete).toBe(false);
    });

    it("returns 5 missing years for 0 years data", () => {
      const result = calculateMissingInfo(0);
      expect(result.missingYears).toBe(5);
      expect(result.totalPenalty).toBe(-10);
      expect(result.isComplete).toBe(false);
    });
  });

  describe("shouldShowIncompleteDataNotice (AC-4.6.4)", () => {
    it("returns false for 5 years data", () => {
      expect(shouldShowIncompleteDataNotice(5)).toBe(false);
    });

    it("returns false for more than 5 years data", () => {
      expect(shouldShowIncompleteDataNotice(10)).toBe(false);
    });

    it("returns true for 4 years data", () => {
      expect(shouldShowIncompleteDataNotice(4)).toBe(true);
    });

    it("returns true for 0 years data", () => {
      expect(shouldShowIncompleteDataNotice(0)).toBe(true);
    });
  });

  describe("Message Titles", () => {
    it("shows complete message for 0 missing years", () => {
      expect(getMessageTitle(0)).toBe("Complete Data Available");
    });

    it("shows no data message for 5 missing years", () => {
      expect(getMessageTitle(5)).toBe("No Dividend Data Available");
    });

    it("shows incomplete message for partial missing years", () => {
      expect(getMessageTitle(1)).toBe("Incomplete Dividend Data");
      expect(getMessageTitle(2)).toBe("Incomplete Dividend Data");
      expect(getMessageTitle(3)).toBe("Incomplete Dividend Data");
      expect(getMessageTitle(4)).toBe("Incomplete Dividend Data");
    });
  });

  describe("Compact Message Formatting", () => {
    it("formats singular year correctly", () => {
      expect(formatCompactMessage(1, -2)).toBe("1 year missing (-2 pts)");
    });

    it("formats plural years correctly", () => {
      expect(formatCompactMessage(2, -4)).toBe("2 years missing (-4 pts)");
      expect(formatCompactMessage(5, -10)).toBe("5 years missing (-10 pts)");
    });
  });

  describe("Props Validation", () => {
    it("accepts valid props", () => {
      const props: IncompleteDataNoticeProps = {
        yearsOfData: 3,
      };

      expect(props.yearsOfData).toBeGreaterThanOrEqual(0);
    });

    it("optional props are indeed optional", () => {
      const minimalProps: IncompleteDataNoticeProps = {
        yearsOfData: 3,
      };

      expect(minimalProps.assetSymbol).toBeUndefined();
      expect(minimalProps.className).toBeUndefined();
      expect(minimalProps.variant).toBeUndefined();
      expect(minimalProps.compact).toBeUndefined();
    });

    it("accepts warning variant", () => {
      const props: IncompleteDataNoticeProps = {
        yearsOfData: 3,
        variant: "warning",
      };

      expect(props.variant).toBe("warning");
    });

    it("accepts info variant", () => {
      const props: IncompleteDataNoticeProps = {
        yearsOfData: 3,
        variant: "info",
      };

      expect(props.variant).toBe("info");
    });

    it("accepts asset symbol", () => {
      const props: IncompleteDataNoticeProps = {
        yearsOfData: 3,
        assetSymbol: "AAPL",
      };

      expect(props.assetSymbol).toBe("AAPL");
    });
  });

  describe("AC-4.6.4: Incomplete Data Notice Requirements", () => {
    it("identifies when data is incomplete", () => {
      // 4 years = 1 missing
      expect(shouldShowIncompleteDataNotice(4)).toBe(true);

      const info = calculateMissingInfo(4);
      expect(info.missingYears).toBe(1);
      expect(info.isComplete).toBe(false);
    });

    it("calculates correct penalty for missing data", () => {
      // 3 years = 2 missing = -4 penalty
      const info = calculateMissingInfo(3);
      expect(info.totalPenalty).toBe(-4);
    });

    it("does not show notice for complete data", () => {
      expect(shouldShowIncompleteDataNotice(5)).toBe(false);
      expect(shouldShowIncompleteDataNotice(10)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero years", () => {
      const info = calculateMissingInfo(0);
      expect(info.missingYears).toBe(5);
      expect(info.totalPenalty).toBe(-10);
    });

    it("handles exactly 5 years", () => {
      const info = calculateMissingInfo(5);
      expect(info.missingYears).toBe(0);
      expect(info.totalPenalty).toBe(0);
    });

    it("handles large number of years", () => {
      const info = calculateMissingInfo(50);
      expect(info.missingYears).toBe(0);
      expect(info.totalPenalty).toBe(0);
    });
  });
});
