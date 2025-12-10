/**
 * Score History Service Tests
 *
 * Story 5.9: Store Historical Scores
 *
 * Tests for:
 * - AC-5.9.1: Score History Retention
 * - AC-5.9.2: Point-in-Time Score Query
 * - AC-5.9.3: Trend Query Support
 * - AC-5.9.4: History Append-Only
 * - AC-5.9.5: Database Indexing for Performance (implicit)
 */

import { describe, it, expect } from "vitest";
import { calculateTrend, type ScoreHistoryEntry } from "@/lib/services/score-service";

// Note: storeScoreHistory, getScoreHistory, getScoreAtDate are DB operations
// These tests focus on the pure function calculateTrend
// Integration tests with the actual DB are in api tests

describe("Story 5.9: Score History Service", () => {
  describe("calculateTrend", () => {
    describe("AC-5.9.3: Trend Query Support", () => {
      it("should calculate positive trend correctly", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "60.0000", calculatedAt: new Date("2024-01-15"), criteriaVersionId: "v1" },
          { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("up");
        expect(trend?.startScore).toBe("50.0000");
        expect(trend?.endScore).toBe("75.0000");
        // Change: 75 - 50 = 25; 25 / 50 * 100 = 50%
        expect(trend?.changePercent).toBe("50.00");
        expect(trend?.dataPoints).toBe(3);
      });

      it("should calculate negative trend correctly", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "100.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "80.0000", calculatedAt: new Date("2024-01-15"), criteriaVersionId: "v1" },
          { score: "60.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("down");
        expect(trend?.startScore).toBe("100.0000");
        expect(trend?.endScore).toBe("60.0000");
        // Change: 60 - 100 = -40; -40 / 100 * 100 = -40%
        expect(trend?.changePercent).toBe("-40.00");
        expect(trend?.dataPoints).toBe(3);
      });

      it("should calculate stable trend when change is minimal", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "50.00004999", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("stable");
      });

      it("should return null for insufficient data (< 2 entries)", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).toBeNull();
      });

      it("should return null for empty history", () => {
        const history: ScoreHistoryEntry[] = [];

        const trend = calculateTrend(history);

        expect(trend).toBeNull();
      });

      it("should handle zero starting score (edge case)", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "0.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "50.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("up");
        // When starting from zero, we use 100% as representation
        expect(trend?.changePercent).toBe("100.00");
      });

      it("should handle both scores being zero", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "0.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "0.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("stable");
        expect(trend?.changePercent).toBe("0.00");
      });

      it("should use decimal.js precision for calculations", () => {
        // Test that we don't get floating point errors
        const history: ScoreHistoryEntry[] = [
          { score: "33.3333", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "66.6666", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        // 66.6666 - 33.3333 = 33.3333; 33.3333 / 33.3333 * 100 = 100%
        expect(trend?.changePercent).toBe("100.00");
      });

      it("should handle negative scores correctly", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "-20.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "10.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("up");
        // Change: 10 - (-20) = 30; 30 / 20 (abs) * 100 = 150%
        expect(trend?.changePercent).toBe("150.00");
      });

      it("should correctly count data points", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "10.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "20.0000", calculatedAt: new Date("2024-01-02"), criteriaVersionId: "v1" },
          { score: "30.0000", calculatedAt: new Date("2024-01-03"), criteriaVersionId: "v1" },
          { score: "40.0000", calculatedAt: new Date("2024-01-04"), criteriaVersionId: "v1" },
          { score: "50.0000", calculatedAt: new Date("2024-01-05"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend?.dataPoints).toBe(5);
      });

      it("should format scores with exactly 4 decimal places", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "50", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "75", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend?.startScore).toBe("50.0000");
        expect(trend?.endScore).toBe("75.0000");
      });

      it("should format changePercent with exactly 2 decimal places", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "30.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "40.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        // 40 - 30 = 10; 10 / 30 * 100 = 33.3333...%
        expect(trend?.changePercent).toBe("33.33");
      });

      it("should handle large score changes", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "1.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "1000.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("up");
        // Change: 999 / 1 * 100 = 99900%
        expect(trend?.changePercent).toBe("99900.00");
      });

      it("should handle very small score changes with precision", () => {
        const history: ScoreHistoryEntry[] = [
          { score: "100.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
          { score: "100.0100", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
        ];

        const trend = calculateTrend(history);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe("up");
        // Change: 0.01 / 100 * 100 = 0.01%
        expect(trend?.changePercent).toBe("0.01");
      });
    });
  });

  describe("ScoreHistoryEntry type requirements", () => {
    it("should have required fields", () => {
      const entry: ScoreHistoryEntry = {
        score: "50.0000",
        calculatedAt: new Date("2024-01-01"),
        criteriaVersionId: "version-123",
      };

      expect(entry).toHaveProperty("score");
      expect(entry).toHaveProperty("calculatedAt");
      expect(entry).toHaveProperty("criteriaVersionId");
    });
  });

  describe("TrendAnalysis type requirements", () => {
    it("should have required fields when returned", () => {
      const history: ScoreHistoryEntry[] = [
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ];

      const trend = calculateTrend(history);

      expect(trend).toHaveProperty("startScore");
      expect(trend).toHaveProperty("endScore");
      expect(trend).toHaveProperty("changePercent");
      expect(trend).toHaveProperty("direction");
      expect(trend).toHaveProperty("dataPoints");
    });

    it("direction should only be up, down, or stable", () => {
      // Test up
      const historyUp: ScoreHistoryEntry[] = [
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ];
      expect(calculateTrend(historyUp)?.direction).toBe("up");

      // Test down
      const historyDown: ScoreHistoryEntry[] = [
        { score: "75.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "50.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ];
      expect(calculateTrend(historyDown)?.direction).toBe("down");

      // Test stable
      const historyStable: ScoreHistoryEntry[] = [
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "50.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ];
      expect(calculateTrend(historyStable)?.direction).toBe("stable");
    });
  });
});
