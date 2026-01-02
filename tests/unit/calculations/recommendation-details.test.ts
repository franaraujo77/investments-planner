/**
 * Recommendation Details Helper Functions Tests
 *
 * Story 6.4: Recommendation Details
 *
 * AC-6.4.1: Why This Recommendation Panel
 * AC-6.4.2: Allocation Math Display
 *
 * Tests for helper functions used by the RecommendationDetailsPanel.
 */

import { describe, it, expect } from "vitest";
import {
  calculateExpectedAllocation,
  getTopCriteria,
  calculateScoreRanking,
  formatAllocationChange,
} from "@/lib/calculations/recommendation-details";
import type { CriterionResult } from "@/hooks/use-asset-score";

describe("Recommendation Details Helper Functions (Story 6.4)", () => {
  describe("calculateExpectedAllocation", () => {
    it("calculates expected allocation after investment (AC-6.4.2)", () => {
      // Current: $1,000 out of $10,000 = 10%
      // Investing $500, total investable $1,000
      // New portfolio: $11,000, new asset value: $1,500
      // Expected: $1,500 / $11,000 = 13.64%
      const result = calculateExpectedAllocation(
        "1000.00", // currentValue
        "500.00", // recommendedAmount
        "10000.00", // portfolioTotal
        "1000.00" // totalInvestable
      );

      expect(parseFloat(result)).toBeCloseTo(13.64, 2);
    });

    it("handles zero recommended amount", () => {
      const result = calculateExpectedAllocation("1000.00", "0.00", "10000.00", "1000.00");

      // $1,000 / $11,000 = 9.09%
      expect(parseFloat(result)).toBeCloseTo(9.09, 2);
    });

    it("handles zero portfolio value (new portfolio)", () => {
      const result = calculateExpectedAllocation("0.00", "500.00", "0.00", "1000.00");

      // $500 / $1,000 = 50%
      expect(result).toBe("50");
    });

    it("handles zero investable amount", () => {
      const result = calculateExpectedAllocation("1000.00", "0.00", "10000.00", "0.00");

      // No change: $1,000 / $10,000 = 10%
      expect(result).toBe("10");
    });

    it("handles large amounts with Decimal precision", () => {
      const result = calculateExpectedAllocation(
        "1500000.00",
        "50000.00",
        "10000000.00",
        "100000.00"
      );

      // New value: $1,550,000
      // New portfolio: $10,100,000
      // Expected: 15.35%
      expect(parseFloat(result)).toBeCloseTo(15.35, 2);
    });

    it("avoids -0 edge case", () => {
      const result = calculateExpectedAllocation("0.00", "0.00", "10000.00", "0.00");

      expect(result).toBe("0");
      expect(Object.is(parseFloat(result), -0)).toBe(false);
    });
  });

  describe("getTopCriteria", () => {
    const sampleBreakdown: CriterionResult[] = [
      {
        criterionId: "1",
        criterionName: "P/E Ratio",
        matched: true,
        pointsAwarded: 10,
        actualValue: "15",
        skippedReason: null,
      },
      {
        criterionId: "2",
        criterionName: "Dividend Yield",
        matched: true,
        pointsAwarded: 5,
        actualValue: "3.5",
        skippedReason: null,
      },
      {
        criterionId: "3",
        criterionName: "Market Cap",
        matched: true,
        pointsAwarded: 15,
        actualValue: "500B",
        skippedReason: null,
      },
      {
        criterionId: "4",
        criterionName: "Debt Ratio",
        matched: true,
        pointsAwarded: 8,
        actualValue: "0.3",
        skippedReason: null,
      },
      {
        criterionId: "5",
        criterionName: "Beta",
        matched: false,
        pointsAwarded: 0,
        actualValue: "1.2",
        skippedReason: null,
      },
    ];

    it("extracts top 3 criteria by points awarded (AC-6.4.3)", () => {
      const result = getTopCriteria(sampleBreakdown, 3);

      expect(result).toHaveLength(3);
      expect(result[0]?.criterionName).toBe("Market Cap"); // 15 points
      expect(result[1]?.criterionName).toBe("P/E Ratio"); // 10 points
      expect(result[2]?.criterionName).toBe("Debt Ratio"); // 8 points
    });

    it("defaults to 3 criteria when count not specified", () => {
      const result = getTopCriteria(sampleBreakdown);

      expect(result).toHaveLength(3);
    });

    it("handles negative points (penalties)", () => {
      const breakdownWithPenalties: CriterionResult[] = [
        {
          criterionId: "1",
          criterionName: "Good",
          matched: true,
          pointsAwarded: 10,
          actualValue: "10",
          skippedReason: null,
        },
        {
          criterionId: "2",
          criterionName: "Penalty",
          matched: true,
          pointsAwarded: -8,
          actualValue: "50",
          skippedReason: null,
        },
        {
          criterionId: "3",
          criterionName: "Okay",
          matched: true,
          pointsAwarded: 5,
          actualValue: "5",
          skippedReason: null,
        },
      ];

      const result = getTopCriteria(breakdownWithPenalties, 3);

      expect(result).toHaveLength(3);
      expect(result[0]?.criterionName).toBe("Good"); // |10|
      expect(result[1]?.criterionName).toBe("Penalty"); // |-8| = 8
      expect(result[2]?.criterionName).toBe("Okay"); // |5|
    });

    it("filters out skipped criteria", () => {
      const breakdownWithSkipped: CriterionResult[] = [
        {
          criterionId: "1",
          criterionName: "Active",
          matched: true,
          pointsAwarded: 10,
          actualValue: "10",
          skippedReason: null,
        },
        {
          criterionId: "2",
          criterionName: "Skipped",
          matched: false,
          pointsAwarded: 15,
          actualValue: null,
          skippedReason: "DATA_UNAVAILABLE",
        },
        {
          criterionId: "3",
          criterionName: "Active2",
          matched: true,
          pointsAwarded: 5,
          actualValue: "5",
          skippedReason: null,
        },
      ];

      const result = getTopCriteria(breakdownWithSkipped, 3);

      expect(result).toHaveLength(2);
      expect(result.some((c) => c.criterionName === "Skipped")).toBe(false);
    });

    it("filters out zero-point criteria", () => {
      const result = getTopCriteria(sampleBreakdown, 5);

      // Beta has 0 points, should be excluded
      expect(result.some((c) => c.criterionName === "Beta")).toBe(false);
    });

    it("returns fewer than requested if not enough qualifying criteria", () => {
      const smallBreakdown: CriterionResult[] = [
        {
          criterionId: "1",
          criterionName: "Only One",
          matched: true,
          pointsAwarded: 10,
          actualValue: "10",
          skippedReason: null,
        },
      ];

      const result = getTopCriteria(smallBreakdown, 3);

      expect(result).toHaveLength(1);
    });

    it("returns empty array for empty breakdown", () => {
      const result = getTopCriteria([], 3);

      expect(result).toHaveLength(0);
    });
  });

  describe("calculateScoreRanking", () => {
    it("calculates percentile ranking among portfolio assets (AC-6.4.1)", () => {
      const allScores = ["90.0", "85.5", "80.0", "75.0", "60.0"];

      const result = calculateScoreRanking("85.5", allScores);

      expect(result.rank).toBe(2); // Second highest
      expect(result.total).toBe(5);
      expect(result.percentile).toBe(60); // (5-2)/5 * 100 = 60%
    });

    it("handles top score (rank 1)", () => {
      const allScores = ["90.0", "85.5", "80.0"];

      const result = calculateScoreRanking("90.0", allScores);

      expect(result.rank).toBe(1);
      expect(result.percentile).toBe(67); // (3-1)/3 * 100 ≈ 67%
    });

    it("handles lowest score", () => {
      const allScores = ["90.0", "80.0", "70.0", "60.0", "50.0"];

      const result = calculateScoreRanking("50.0", allScores);

      expect(result.rank).toBe(5);
      expect(result.percentile).toBe(0); // (5-5)/5 * 100 = 0%
    });

    it("handles single asset", () => {
      const result = calculateScoreRanking("85.5", ["85.5"]);

      expect(result.rank).toBe(1);
      expect(result.total).toBe(1);
      expect(result.percentile).toBe(0);
    });

    it("handles tied scores (uses first occurrence)", () => {
      const allScores = ["90.0", "80.0", "80.0", "70.0"];

      const result = calculateScoreRanking("80.0", allScores);

      expect(result.rank).toBe(2); // First 80.0 is rank 2
    });

    it("handles empty array gracefully", () => {
      const result = calculateScoreRanking("85.5", []);

      expect(result.rank).toBe(0);
      expect(result.total).toBe(0);
      expect(result.percentile).toBe(0);
    });
  });

  describe("formatAllocationChange", () => {
    it("formats positive change", () => {
      const result = formatAllocationChange("10.00", "15.00");

      expect(result).toBe("+5.00");
    });

    it("formats negative change", () => {
      const result = formatAllocationChange("15.00", "10.00");

      expect(result).toBe("-5.00");
    });

    it("formats zero change", () => {
      const result = formatAllocationChange("10.00", "10.00");

      expect(result).toBe("0.00");
    });

    it("handles decimal precision", () => {
      const result = formatAllocationChange("10.12", "15.34");

      expect(result).toBe("+5.22");
    });
  });
});
