/**
 * ScoreBadge Component Tests
 *
 * Story 5.10: View Asset Score
 * AC-5.10.1: Score Badge Display
 * AC-5.10.4: Score Freshness Timestamp
 *
 * Tests:
 * - Color coding thresholds (80+, 50-79, <50)
 * - Freshness indicator display
 * - Size variants
 * - Click handler
 * - Accessibility (aria-label)
 * - Score normalization (decimal to integer)
 */

import { describe, it, expect } from "vitest";
import {
  getScoreLevel,
  getScoreFreshnessLevel,
  normalizeScore,
} from "@/components/fintech/score-badge";

describe("ScoreBadge Utilities", () => {
  describe("getScoreLevel", () => {
    // AC-5.10.1: Color thresholds

    it("returns 'high' for scores >= 80", () => {
      expect(getScoreLevel(80)).toBe("high");
      expect(getScoreLevel(100)).toBe("high");
      expect(getScoreLevel(85.5)).toBe("high");
    });

    it("returns 'medium' for scores 50-79", () => {
      expect(getScoreLevel(50)).toBe("medium");
      expect(getScoreLevel(79)).toBe("medium");
      expect(getScoreLevel(65)).toBe("medium");
      expect(getScoreLevel(79.9)).toBe("medium");
    });

    it("returns 'low' for scores < 50", () => {
      expect(getScoreLevel(49)).toBe("low");
      expect(getScoreLevel(0)).toBe("low");
      expect(getScoreLevel(25)).toBe("low");
      expect(getScoreLevel(49.9)).toBe("low");
    });

    it("handles edge cases at boundaries", () => {
      expect(getScoreLevel(80)).toBe("high"); // Exactly 80 is high
      expect(getScoreLevel(50)).toBe("medium"); // Exactly 50 is medium
    });
  });

  describe("getScoreFreshnessLevel", () => {
    // AC-5.10.4: Freshness thresholds

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    it("returns 'fresh' for scores < 24 hours old", () => {
      const recentDate = new Date(now - 1 * oneHour); // 1 hour ago
      expect(getScoreFreshnessLevel(recentDate)).toBe("fresh");

      const justNow = new Date(now - 1000); // 1 second ago
      expect(getScoreFreshnessLevel(justNow)).toBe("fresh");

      const almostDay = new Date(now - 23 * oneHour); // 23 hours ago
      expect(getScoreFreshnessLevel(almostDay)).toBe("fresh");
    });

    it("returns 'stale' for scores 1-3 days old", () => {
      const oneDayAgo = new Date(now - 1 * oneDay); // exactly 1 day
      expect(getScoreFreshnessLevel(oneDayAgo)).toBe("stale");

      const twoDaysAgo = new Date(now - 2 * oneDay);
      expect(getScoreFreshnessLevel(twoDaysAgo)).toBe("stale");

      // Just under 3 days
      const almostThreeDays = new Date(now - 2.9 * oneDay);
      expect(getScoreFreshnessLevel(almostThreeDays)).toBe("stale");
    });

    it("returns 'very_stale' for scores 3-7 days old", () => {
      const threeDaysAgo = new Date(now - 3 * oneDay);
      expect(getScoreFreshnessLevel(threeDaysAgo)).toBe("very_stale");

      const fiveDaysAgo = new Date(now - 5 * oneDay);
      expect(getScoreFreshnessLevel(fiveDaysAgo)).toBe("very_stale");

      // Just under 7 days
      const almostSevenDays = new Date(now - 6.9 * oneDay);
      expect(getScoreFreshnessLevel(almostSevenDays)).toBe("very_stale");
    });

    it("returns 'warning' for scores > 7 days old", () => {
      const sevenDaysAgo = new Date(now - 7 * oneDay);
      expect(getScoreFreshnessLevel(sevenDaysAgo)).toBe("warning");

      const tenDaysAgo = new Date(now - 10 * oneDay);
      expect(getScoreFreshnessLevel(tenDaysAgo)).toBe("warning");

      const thirtyDaysAgo = new Date(now - 30 * oneDay);
      expect(getScoreFreshnessLevel(thirtyDaysAgo)).toBe("warning");
    });
  });

  describe("normalizeScore", () => {
    // AC-5.10.1: Scores display as integers (0-100 scale)

    it("rounds decimal scores to nearest integer", () => {
      expect(normalizeScore(85.5)).toBe(86);
      expect(normalizeScore(85.4)).toBe(85);
      expect(normalizeScore(85.49)).toBe(85);
      expect(normalizeScore(85.51)).toBe(86);
    });

    it("handles string scores", () => {
      expect(normalizeScore("85.5")).toBe(86);
      expect(normalizeScore("85.4")).toBe(85);
      expect(normalizeScore("100.0")).toBe(100);
      expect(normalizeScore("0.49")).toBe(0);
    });

    it("handles integer scores", () => {
      expect(normalizeScore(80)).toBe(80);
      expect(normalizeScore(0)).toBe(0);
      expect(normalizeScore(100)).toBe(100);
    });

    it("handles edge cases", () => {
      expect(normalizeScore(0.5)).toBe(1);
      expect(normalizeScore(99.9)).toBe(100);
      expect(normalizeScore("0.0")).toBe(0);
    });
  });
});

describe("ScoreBadge Color Mapping", () => {
  // Verify getScoreLevel returns correct levels for all thresholds

  const testCases = [
    // High scores (green)
    { score: 100, expected: "high" },
    { score: 95, expected: "high" },
    { score: 80, expected: "high" },
    // Medium scores (amber)
    { score: 79, expected: "medium" },
    { score: 65, expected: "medium" },
    { score: 50, expected: "medium" },
    // Low scores (red)
    { score: 49, expected: "low" },
    { score: 25, expected: "low" },
    { score: 0, expected: "low" },
  ];

  it.each(testCases)("score $score maps to $expected", ({ score, expected }) => {
    expect(getScoreLevel(score)).toBe(expected);
  });
});

describe("ScoreBadge Freshness Color Mapping", () => {
  // Verify freshness levels for different time periods

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  const testCases = [
    // Fresh (< 24h)
    { hoursAgo: 0.5, expected: "fresh" },
    { hoursAgo: 12, expected: "fresh" },
    { hoursAgo: 23, expected: "fresh" },
    // Stale (1-3 days)
    { hoursAgo: 25, expected: "stale" },
    { hoursAgo: 48, expected: "stale" },
    { hoursAgo: 71, expected: "stale" },
    // Very stale (3-7 days)
    { hoursAgo: 73, expected: "very_stale" },
    { hoursAgo: 120, expected: "very_stale" },
    { hoursAgo: 167, expected: "very_stale" },
    // Warning (> 7 days)
    { hoursAgo: 169, expected: "warning" },
    { hoursAgo: 240, expected: "warning" },
    { hoursAgo: 720, expected: "warning" },
  ];

  it.each(testCases)("$hoursAgo hours ago maps to $expected", ({ hoursAgo, expected }) => {
    const date = new Date(now - hoursAgo * oneHour);
    expect(getScoreFreshnessLevel(date)).toBe(expected);
  });
});
