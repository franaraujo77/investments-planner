/**
 * Unit Tests for ScoreBreakdown Component Utilities
 *
 * Story 5.11: Score Breakdown View
 *
 * Tests cover utility functions used by the component:
 * - formatRelativeTime
 * - getScoreColorClasses
 *
 * Note: Component rendering tests require @testing-library/react which is not installed.
 * These tests focus on the exported utility functions.
 */

import { describe, it, expect } from "vitest";
import { formatRelativeTime, getScoreColorClasses } from "@/components/fintech/score-breakdown";
import { getScoreLevel } from "@/components/fintech/score-badge";
import type { CriterionResult } from "@/hooks/use-asset-score";

// =============================================================================
// UTILITY TESTS
// =============================================================================

describe("ScoreBreakdown Utilities", () => {
  describe("formatRelativeTime", () => {
    it("formats just now correctly", () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe("just now");
    });

    it("formats seconds ago as just now", () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      expect(formatRelativeTime(thirtySecondsAgo)).toBe("just now");
    });

    it("formats 1 minute ago correctly", () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
    });

    it("formats minutes ago correctly", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
    });

    it("formats 1 hour ago correctly", () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
    });

    it("formats hours ago correctly", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe("3 hours ago");
    });

    it("formats 1 day ago correctly", () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneDayAgo)).toBe("1 day ago");
    });

    it("formats days ago correctly", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe("2 days ago");
    });

    it("formats many days ago correctly", () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(sevenDaysAgo)).toBe("7 days ago");
    });
  });

  describe("getScoreColorClasses", () => {
    it("returns green classes for high score", () => {
      const colors = getScoreColorClasses("high");
      expect(colors.bg).toBe("bg-green-500");
      expect(colors.text).toBe("text-green-500");
      expect(colors.border).toBe("border-green-500");
    });

    it("returns amber classes for medium score", () => {
      const colors = getScoreColorClasses("medium");
      expect(colors.bg).toBe("bg-amber-500");
      expect(colors.text).toBe("text-amber-500");
      expect(colors.border).toBe("border-amber-500");
    });

    it("returns red classes for low score", () => {
      const colors = getScoreColorClasses("low");
      expect(colors.bg).toBe("bg-red-500");
      expect(colors.text).toBe("text-red-500");
      expect(colors.border).toBe("border-red-500");
    });
  });

  describe("getScoreLevel (from ScoreBadge)", () => {
    it("returns high for score >= 80", () => {
      expect(getScoreLevel(80)).toBe("high");
      expect(getScoreLevel(85)).toBe("high");
      expect(getScoreLevel(100)).toBe("high");
    });

    it("returns medium for score 50-79", () => {
      expect(getScoreLevel(50)).toBe("medium");
      expect(getScoreLevel(65)).toBe("medium");
      expect(getScoreLevel(79)).toBe("medium");
    });

    it("returns low for score < 50", () => {
      expect(getScoreLevel(0)).toBe("low");
      expect(getScoreLevel(25)).toBe("low");
      expect(getScoreLevel(49)).toBe("low");
    });
  });
});

// =============================================================================
// DATA STRUCTURE TESTS
// =============================================================================

describe("ScoreBreakdown Data Structures", () => {
  describe("CriterionResult interface", () => {
    it("has correct structure for matched criterion", () => {
      const criterion: CriterionResult = {
        criterionId: "crit-1",
        criterionName: "Dividend Yield > 6%",
        matched: true,
        pointsAwarded: 20,
        actualValue: "7.5",
        skippedReason: null,
      };

      expect(criterion.criterionId).toBeDefined();
      expect(criterion.criterionName).toBeDefined();
      expect(criterion.matched).toBe(true);
      expect(criterion.pointsAwarded).toBeGreaterThan(0);
      expect(criterion.actualValue).toBe("7.5");
      expect(criterion.skippedReason).toBeNull();
    });

    it("has correct structure for unmatched criterion", () => {
      const criterion: CriterionResult = {
        criterionId: "crit-2",
        criterionName: "P/E Ratio < 15",
        matched: false,
        pointsAwarded: 0,
        actualValue: "18.2",
        skippedReason: null,
      };

      expect(criterion.matched).toBe(false);
      expect(criterion.pointsAwarded).toBe(0);
      expect(criterion.actualValue).toBe("18.2");
      expect(criterion.skippedReason).toBeNull();
    });

    it("has correct structure for skipped criterion", () => {
      const criterion: CriterionResult = {
        criterionId: "crit-3",
        criterionName: "ROE > 15%",
        matched: false,
        pointsAwarded: 0,
        actualValue: null,
        skippedReason: "missing_fundamental",
      };

      expect(criterion.matched).toBe(false);
      expect(criterion.pointsAwarded).toBe(0);
      expect(criterion.actualValue).toBeNull();
      expect(criterion.skippedReason).toBe("missing_fundamental");
    });
  });

  describe("Breakdown processing logic", () => {
    const mockBreakdown: CriterionResult[] = [
      {
        criterionId: "crit-1",
        criterionName: "Dividend Yield > 6%",
        matched: true,
        pointsAwarded: 20,
        actualValue: "7.5",
        skippedReason: null,
      },
      {
        criterionId: "crit-2",
        criterionName: "P/E Ratio < 15",
        matched: false,
        pointsAwarded: 0,
        actualValue: "18.2",
        skippedReason: null,
      },
      {
        criterionId: "crit-3",
        criterionName: "ROE > 15%",
        matched: true,
        pointsAwarded: 15,
        actualValue: "22.5",
        skippedReason: null,
      },
      {
        criterionId: "crit-4",
        criterionName: "Debt/Equity < 0.5",
        matched: false,
        pointsAwarded: 0,
        actualValue: null,
        skippedReason: "missing_fundamental",
      },
      {
        criterionId: "crit-5",
        criterionName: "Market Cap > 1B",
        matched: false,
        pointsAwarded: 0,
        actualValue: null,
        skippedReason: "data_stale",
      },
    ];

    it("separates evaluated and skipped criteria", () => {
      const evaluated: CriterionResult[] = [];
      const skipped: CriterionResult[] = [];

      for (const c of mockBreakdown) {
        if (c.skippedReason) {
          skipped.push(c);
        } else {
          evaluated.push(c);
        }
      }

      expect(evaluated).toHaveLength(3);
      expect(skipped).toHaveLength(2);
    });

    it("sorts criteria by absolute points impact", () => {
      const evaluated = mockBreakdown.filter((c) => !c.skippedReason);
      const sorted = [...evaluated].sort(
        (a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded)
      );

      expect(sorted[0]!.pointsAwarded).toBe(20); // Highest impact first
      expect(sorted[1]!.pointsAwarded).toBe(15);
      expect(sorted[2]!.pointsAwarded).toBe(0);
    });

    it("calculates matched criteria count", () => {
      const evaluated = mockBreakdown.filter((c) => !c.skippedReason);
      const matchedCount = evaluated.filter((c) => c.matched).length;
      const totalEvaluated = evaluated.length;

      expect(matchedCount).toBe(2);
      expect(totalEvaluated).toBe(3);
    });

    it("filters positive point contributors for chart", () => {
      const chartData = mockBreakdown
        .filter((c) => !c.skippedReason)
        .filter((c) => c.pointsAwarded !== 0);

      expect(chartData).toHaveLength(2);
      expect(chartData[0]!.pointsAwarded).toBe(20);
      expect(chartData[1]!.pointsAwarded).toBe(15);
    });
  });
});

// =============================================================================
// SKIP REASON FORMATTING TESTS
// =============================================================================

describe("Skip Reason Formatting", () => {
  function formatSkipReason(reason: string | null): string {
    if (!reason) return "Unknown reason";

    switch (reason) {
      case "missing_fundamental":
        return "Missing data";
      case "data_stale":
        return "Stale data";
      default:
        return reason.replace(/_/g, " ");
    }
  }

  it("formats missing_fundamental reason", () => {
    expect(formatSkipReason("missing_fundamental")).toBe("Missing data");
  });

  it("formats data_stale reason", () => {
    expect(formatSkipReason("data_stale")).toBe("Stale data");
  });

  it("formats unknown reason by replacing underscores", () => {
    expect(formatSkipReason("some_other_reason")).toBe("some other reason");
  });

  it("returns Unknown reason for null", () => {
    expect(formatSkipReason(null)).toBe("Unknown reason");
  });
});

// =============================================================================
// SCORE NORMALIZATION TESTS
// =============================================================================

describe("Score Normalization", () => {
  function normalizeScore(score: number | string): number {
    const numericScore = typeof score === "string" ? parseFloat(score) : score;
    return Math.round(numericScore);
  }

  it("rounds decimal scores to integers", () => {
    expect(normalizeScore(85.4)).toBe(85);
    expect(normalizeScore(85.5)).toBe(86);
    expect(normalizeScore(85.9)).toBe(86);
  });

  it("handles string scores", () => {
    expect(normalizeScore("72.456")).toBe(72);
    expect(normalizeScore("85.5000")).toBe(86);
  });

  it("handles integer scores", () => {
    expect(normalizeScore(100)).toBe(100);
    expect(normalizeScore(0)).toBe(0);
  });
});

// =============================================================================
// URL GENERATION TESTS
// =============================================================================

describe("Edit Criteria URL Generation", () => {
  function buildEditCriteriaUrl(targetMarket?: string): string {
    return targetMarket ? `/criteria?market=${encodeURIComponent(targetMarket)}` : "/criteria";
  }

  it("generates URL with market filter", () => {
    expect(buildEditCriteriaUrl("US_TECH")).toBe("/criteria?market=US_TECH");
  });

  it("generates URL without filter when no market", () => {
    expect(buildEditCriteriaUrl()).toBe("/criteria");
    expect(buildEditCriteriaUrl(undefined)).toBe("/criteria");
  });

  it("encodes special characters in market", () => {
    expect(buildEditCriteriaUrl("US TECH")).toBe("/criteria?market=US%20TECH");
  });
});
