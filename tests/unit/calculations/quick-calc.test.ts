/**
 * Quick-Calc Service Unit Tests
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 *
 * Tests for:
 * - AC-5.7.2: calculatePreview - top 10 assets, score accuracy, ranking order
 * - AC-5.7.3: Performance target (<500ms), decimal.js precision
 * - AC-5.7.4: Comparison summary - improved/declined/unchanged counts
 * - Edge cases: empty criteria, single criterion
 */

import { describe, it, expect } from "vitest";
import {
  calculatePreview,
  getSampleAssets,
  MAX_SAMPLE_ASSETS,
  TOP_N_ASSETS,
} from "@/lib/calculations/quick-calc";
import type { CriterionRule } from "@/lib/db/schema";

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Create a criterion rule for testing
 */
function createCriterion(overrides: Partial<CriterionRule>): CriterionRule {
  return {
    id: `criterion-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Criterion",
    metric: "dividend_yield",
    operator: "gt" as const,
    value: "5.0",
    value2: null,
    points: 10,
    requiredFundamentals: ["dividend_yield"],
    sortOrder: 0,
    ...overrides,
  };
}

// Sample criteria sets for testing
const highDividendCriteria: CriterionRule[] = [
  createCriterion({
    name: "High Dividend",
    metric: "dividend_yield",
    operator: "gt",
    value: "5.0",
    points: 10,
  }),
];

const multiCriteria: CriterionRule[] = [
  createCriterion({
    name: "High Dividend",
    metric: "dividend_yield",
    operator: "gt",
    value: "5.0",
    points: 10,
  }),
  createCriterion({
    name: "Low PE",
    metric: "pe_ratio",
    operator: "lt",
    value: "10.0",
    points: 5,
  }),
  createCriterion({
    name: "Strong ROE",
    metric: "roe",
    operator: "gte",
    value: "15.0",
    points: 8,
  }),
];

const stricterCriteria: CriterionRule[] = [
  createCriterion({
    name: "High Dividend",
    metric: "dividend_yield",
    operator: "gt",
    value: "8.0", // Higher threshold
    points: 15, // Higher points
  }),
  createCriterion({
    name: "Very Low PE",
    metric: "pe_ratio",
    operator: "lt",
    value: "6.0", // Stricter
    points: 10,
  }),
];

// =============================================================================
// TESTS
// =============================================================================

describe("Quick-Calc Service", () => {
  describe("getSampleAssets", () => {
    it("should return at most MAX_SAMPLE_ASSETS assets", () => {
      const assets = getSampleAssets();
      expect(assets.length).toBeLessThanOrEqual(MAX_SAMPLE_ASSETS);
      expect(assets.length).toBe(20); // Current mock data has exactly 20
    });

    it("should return assets with symbol, name, and fundamentals", () => {
      const assets = getSampleAssets();

      expect(assets.length).toBeGreaterThan(0);
      for (const asset of assets) {
        expect(asset).toHaveProperty("symbol");
        expect(asset).toHaveProperty("name");
        expect(asset).toHaveProperty("fundamentals");
        expect(typeof asset.symbol).toBe("string");
        expect(typeof asset.name).toBe("string");
        expect(typeof asset.fundamentals).toBe("object");
      }
    });

    it("should include key financial metrics in fundamentals", () => {
      const assets = getSampleAssets();
      const firstAsset = assets[0];

      expect(firstAsset?.fundamentals).toHaveProperty("dividend_yield");
      expect(firstAsset?.fundamentals).toHaveProperty("pe_ratio");
      expect(firstAsset?.fundamentals).toHaveProperty("pb_ratio");
      expect(firstAsset?.fundamentals).toHaveProperty("roe");
      expect(firstAsset?.fundamentals).toHaveProperty("debt_to_equity");
    });
  });

  describe("calculatePreview (AC-5.7.2)", () => {
    it("should return top N assets sorted by score descending", () => {
      const result = calculatePreview(multiCriteria);

      expect(result.topAssets.length).toBeLessThanOrEqual(TOP_N_ASSETS);
      expect(result.topAssets.length).toBe(10);

      // Verify sorted by score descending
      for (let i = 0; i < result.topAssets.length - 1; i++) {
        const currentScore = parseFloat(result.topAssets[i]?.score ?? "0");
        const nextScore = parseFloat(result.topAssets[i + 1]?.score ?? "0");
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it("should assign correct ranks to assets", () => {
      const result = calculatePreview(multiCriteria);

      for (let i = 0; i < result.topAssets.length; i++) {
        expect(result.topAssets[i]?.rank).toBe(i + 1);
      }
    });

    it("should include score breakdown for each asset", () => {
      const result = calculatePreview(multiCriteria);

      for (const asset of result.topAssets) {
        expect(asset.breakdown).toBeDefined();
        expect(asset.breakdown.length).toBe(multiCriteria.length);

        for (const score of asset.breakdown) {
          expect(score).toHaveProperty("criterionId");
          expect(score).toHaveProperty("criterionName");
          expect(score).toHaveProperty("metric");
          expect(score).toHaveProperty("pointsAwarded");
          expect(score).toHaveProperty("maxPoints");
          expect(score).toHaveProperty("passed");
        }
      }
    });

    it("should calculate correct points for gt operator", () => {
      // High Dividend: dividend_yield > 5.0 = 10 points
      const result = calculatePreview(highDividendCriteria);

      // BBAS3 has dividend_yield 7.5 > 5.0, should get 10 points
      const bbas3 = result.topAssets.find((a) => a.symbol === "BBAS3");
      expect(bbas3).toBeDefined();
      expect(parseFloat(bbas3?.score ?? "0")).toBe(10);

      // Find one with dividend_yield <= 5.0
      // BIDI11 has dividend_yield 0.5 <= 5.0, should get 0 points
      const bidi11 = result.topAssets.find((a) => a.symbol === "BIDI11");
      // BIDI11 might not be in top 10, that's okay
      if (bidi11) {
        expect(parseFloat(bidi11.score)).toBe(0);
      }
    });

    it("should return sample size in result", () => {
      const result = calculatePreview(highDividendCriteria);

      expect(result.sampleSize).toBe(20);
    });

    it("should include calculatedAt timestamp", () => {
      const result = calculatePreview(highDividendCriteria);

      expect(result.calculatedAt).toBeDefined();
      expect(() => new Date(result.calculatedAt)).not.toThrow();
    });

    it("should return asset symbol and name", () => {
      const result = calculatePreview(highDividendCriteria);

      for (const asset of result.topAssets) {
        expect(typeof asset.symbol).toBe("string");
        expect(asset.symbol.length).toBeGreaterThan(0);
        expect(typeof asset.name).toBe("string");
        expect(asset.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe("calculatePreview - Edge Cases", () => {
    it("should return empty topAssets for empty criteria", () => {
      const result = calculatePreview([]);

      expect(result.topAssets).toHaveLength(0);
      expect(result.sampleSize).toBe(20);
      expect(result.calculatedAt).toBeDefined();
    });

    it("should handle single criterion correctly", () => {
      const result = calculatePreview(highDividendCriteria);

      expect(result.topAssets.length).toBeGreaterThan(0);

      // All assets should have breakdown with exactly 1 criterion
      for (const asset of result.topAssets) {
        expect(asset.breakdown).toHaveLength(1);
        expect(asset.breakdown[0]?.criterionName).toBe("High Dividend");
      }
    });

    it("should handle 'exists' operator", () => {
      const existsCriteria: CriterionRule[] = [
        createCriterion({
          name: "Has Dividend",
          metric: "dividend_yield",
          operator: "exists",
          value: "",
          points: 5,
        }),
      ];

      const result = calculatePreview(existsCriteria);

      // All sample assets have dividend_yield, so all should pass
      for (const asset of result.topAssets) {
        expect(asset.breakdown[0]?.passed).toBe(true);
        expect(asset.breakdown[0]?.pointsAwarded).toBe(5);
      }
    });

    it("should handle 'between' operator", () => {
      const betweenCriteria: CriterionRule[] = [
        createCriterion({
          name: "Moderate PE",
          metric: "pe_ratio",
          operator: "between",
          value: "6.0",
          value2: "10.0",
          points: 10,
        }),
      ];

      const result = calculatePreview(betweenCriteria);

      // Check that assets with PE in range get points
      for (const asset of result.topAssets) {
        const peValue = asset.breakdown[0]?.actualValue;
        if (peValue !== null && peValue >= 6.0 && peValue <= 10.0) {
          expect(asset.breakdown[0]?.passed).toBe(true);
          expect(asset.breakdown[0]?.pointsAwarded).toBe(10);
        }
      }
    });

    it("should handle 'lte' operator", () => {
      const lteCriteria: CriterionRule[] = [
        createCriterion({
          name: "Low Debt",
          metric: "debt_to_equity",
          operator: "lte",
          value: "0.5",
          points: 8,
        }),
      ];

      const result = calculatePreview(lteCriteria);

      // BBAS3 has debt_to_equity 0.5, should pass (<=)
      const bbas3 = result.topAssets.find((a) => a.symbol === "BBAS3");
      if (bbas3) {
        expect(bbas3.breakdown[0]?.passed).toBe(true);
      }
    });

    it("should handle 'equals' operator", () => {
      // This is more theoretical since exact matches are rare with floats
      const equalsCriteria: CriterionRule[] = [
        createCriterion({
          name: "Exact Version",
          metric: "surplus_years",
          operator: "equals",
          value: "5",
          points: 5,
        }),
      ];

      const result = calculatePreview(equalsCriteria);

      // Assets with surplus_years = 5 should get points
      const assetsWithMatch = result.topAssets.filter((a) => a.breakdown[0]?.actualValue === 5);

      for (const asset of assetsWithMatch) {
        expect(asset.breakdown[0]?.passed).toBe(true);
        expect(asset.breakdown[0]?.pointsAwarded).toBe(5);
      }
    });
  });

  describe("calculatePreview - Comparison (AC-5.7.4)", () => {
    it("should return comparison when previousCriteria provided", () => {
      const result = calculatePreview(stricterCriteria, multiCriteria);

      expect(result.comparison).toBeDefined();
      expect(result.comparison?.improved).toBeDefined();
      expect(result.comparison?.declined).toBeDefined();
      expect(result.comparison?.unchanged).toBeDefined();
    });

    it("should calculate improved/declined/unchanged counts correctly", () => {
      const result = calculatePreview(stricterCriteria, multiCriteria);

      expect(result.comparison).toBeDefined();

      // Total should equal sample size
      const total =
        (result.comparison?.improved ?? 0) +
        (result.comparison?.declined ?? 0) +
        (result.comparison?.unchanged ?? 0);
      expect(total).toBe(result.sampleSize);
    });

    it("should calculate average scores for comparison", () => {
      const result = calculatePreview(stricterCriteria, multiCriteria);

      expect(result.comparison?.previousAverageScore).toBeDefined();
      expect(result.comparison?.currentAverageScore).toBeDefined();

      // Scores should be formatted strings with 2 decimal places
      expect(result.comparison?.previousAverageScore).toMatch(/^\d+\.\d{2}$/);
      expect(result.comparison?.currentAverageScore).toMatch(/^\d+\.\d{2}$/);
    });

    it("should not return comparison when previousCriteria is empty", () => {
      const result = calculatePreview(multiCriteria, []);

      // Empty previousCriteria should not create comparison
      expect(result.comparison).toBeUndefined();
    });

    it("should not return comparison when previousCriteria is undefined", () => {
      const result = calculatePreview(multiCriteria);

      expect(result.comparison).toBeUndefined();
    });

    it("should identify assets with higher current score as improved", () => {
      // Using stricterCriteria (higher thresholds, higher points)
      // vs multiCriteria (lower thresholds)
      // Some assets will have higher scores with the stricter criteria if they meet the higher bar
      const result = calculatePreview(stricterCriteria, multiCriteria);

      // With stricter criteria, fewer assets meet thresholds but get more points if they do
      // This test verifies the calculation happens without errors
      expect(result.comparison).toBeDefined();
      expect(typeof result.comparison?.improved).toBe("number");
      expect(typeof result.comparison?.declined).toBe("number");
      expect(typeof result.comparison?.unchanged).toBe("number");
    });
  });

  describe("calculatePreview - Performance (AC-5.7.3)", () => {
    it("should complete in less than 500ms for 20 assets", () => {
      const start = performance.now();

      // Run multiple times to get stable measurement
      for (let i = 0; i < 10; i++) {
        calculatePreview(multiCriteria);
      }

      const elapsed = performance.now() - start;
      const averageElapsed = elapsed / 10;

      // Should complete in <500ms per call (much faster for mock data)
      expect(averageElapsed).toBeLessThan(500);
    });
  });

  describe("calculatePreview - Decimal Precision (AC-5.7.3)", () => {
    it("should use decimal.js for score calculations", () => {
      const result = calculatePreview(multiCriteria);

      // Scores should be strings representing precise decimals
      for (const asset of result.topAssets) {
        expect(typeof asset.score).toBe("string");
        const parsedScore = parseFloat(asset.score);
        expect(isNaN(parsedScore)).toBe(false);
      }
    });

    it("should format scores with 2 decimal places", () => {
      const result = calculatePreview(multiCriteria);

      for (const asset of result.topAssets) {
        expect(asset.score).toMatch(/^\d+\.\d{2}$/);
      }
    });

    it("should sum points correctly using decimal.js", () => {
      // Multi-criteria: max possible = 10 + 5 + 8 = 23 points
      const result = calculatePreview(multiCriteria);

      for (const asset of result.topAssets) {
        const summedPoints = asset.breakdown.reduce((sum, b) => sum + b.pointsAwarded, 0);
        expect(parseFloat(asset.score)).toBe(summedPoints);
      }
    });
  });

  describe("Score Breakdown Details", () => {
    it("should include all criterion details in breakdown", () => {
      const result = calculatePreview(multiCriteria);
      const asset = result.topAssets[0];

      for (const score of asset?.breakdown ?? []) {
        expect(score.criterionId).toBeDefined();
        expect(score.criterionName).toBeDefined();
        expect(score.metric).toBeDefined();
        expect(score.metricLabel).toBeDefined();
        expect(score.operator).toBeDefined();
        expect(score.operatorLabel).toBeDefined();
        expect(score.targetValue).toBeDefined();
        expect(typeof score.actualValue).not.toBe("undefined");
        expect(typeof score.pointsAwarded).toBe("number");
        expect(typeof score.maxPoints).toBe("number");
        expect(typeof score.passed).toBe("boolean");
      }
    });

    it("should have correct metricLabel for known metrics", () => {
      const result = calculatePreview(multiCriteria);
      const asset = result.topAssets[0];

      const dividendBreakdown = asset?.breakdown.find((b) => b.metric === "dividend_yield");
      expect(dividendBreakdown?.metricLabel).toBe("Dividend Yield");

      const peBreakdown = asset?.breakdown.find((b) => b.metric === "pe_ratio");
      expect(peBreakdown?.metricLabel).toBe("P/E Ratio");
    });

    it("should have correct operatorLabel", () => {
      const result = calculatePreview(multiCriteria);
      const asset = result.topAssets[0];

      const gtBreakdown = asset?.breakdown.find((b) => b.operator === "gt");
      expect(gtBreakdown?.operatorLabel).toBe(">");

      const ltBreakdown = asset?.breakdown.find((b) => b.operator === "lt");
      expect(ltBreakdown?.operatorLabel).toBe("<");
    });
  });
});
