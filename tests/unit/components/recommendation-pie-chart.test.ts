/**
 * RecommendationPieChart Component Tests
 *
 * Story 6.3: Recommendation Display
 * AC-6.3.2: Pie Chart Visualization
 *
 * Tests:
 * - Data transformation from recommendation items to chart format
 * - Color assignment using CHART_COLORS palette
 * - Filtering of over-allocated items (zero amounts)
 * - Percentage calculation for each item
 */

import { describe, it, expect } from "vitest";
import { transformToChartData } from "@/components/recommendations/recommendation-pie-chart";
import { CHART_COLORS } from "@/components/portfolio/allocation-pie-chart";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TEST DATA
// =============================================================================

const mockItems: RecommendationDisplayItem[] = [
  {
    assetId: "asset-1",
    symbol: "AAPL",
    score: "85.0",
    currentAllocation: "15.0",
    targetAllocation: "20.0",
    allocationGap: "5.0",
    recommendedAmount: "500.00",
    isOverAllocated: false,
  },
  {
    assetId: "asset-2",
    symbol: "MSFT",
    score: "90.0",
    currentAllocation: "5.0",
    targetAllocation: "20.0",
    allocationGap: "15.0",
    recommendedAmount: "300.00",
    isOverAllocated: false,
  },
  {
    assetId: "asset-3",
    symbol: "GOOGL",
    score: "75.0",
    currentAllocation: "10.0",
    targetAllocation: "15.0",
    allocationGap: "5.0",
    recommendedAmount: "200.00",
    isOverAllocated: false,
  },
];

const mockItemWithOverAllocated: RecommendationDisplayItem[] = [
  ...mockItems,
  {
    assetId: "asset-over",
    symbol: "TSLA",
    score: "45.0",
    currentAllocation: "35.0",
    targetAllocation: "20.0",
    allocationGap: "-15.0",
    recommendedAmount: "0.00",
    isOverAllocated: true,
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe("transformToChartData", () => {
  describe("basic transformation", () => {
    it("transforms recommendation items to chart data format", () => {
      const totalInvestable = "1000.00";
      const result = transformToChartData(mockItems, totalInvestable);

      expect(result).toHaveLength(3);

      // Check first item
      expect(result[0]).toMatchObject({
        classId: "asset-1",
        className: "AAPL",
        value: "500.00",
        assetCount: 1,
        targetMin: null,
        targetMax: null,
        status: "on-target",
      });

      // Check second item
      expect(result[1]).toMatchObject({
        classId: "asset-2",
        className: "MSFT",
        value: "300.00",
      });
    });

    it("calculates percentage based on total investable", () => {
      const totalInvestable = "1000.00";
      const result = transformToChartData(mockItems, totalInvestable);

      // 500 / 1000 = 50%
      expect(result[0]?.percentage).toBe("50.0");

      // 300 / 1000 = 30%
      expect(result[1]?.percentage).toBe("30.0");

      // 200 / 1000 = 20%
      expect(result[2]?.percentage).toBe("20.0");
    });

    it("assigns colors from CHART_COLORS palette", () => {
      const totalInvestable = "1000.00";
      const result = transformToChartData(mockItems, totalInvestable);

      expect(result[0]?.color).toBe(CHART_COLORS[0]);
      expect(result[1]?.color).toBe(CHART_COLORS[1]);
      expect(result[2]?.color).toBe(CHART_COLORS[2]);
    });
  });

  describe("filtering over-allocated items", () => {
    it("excludes over-allocated items from chart data", () => {
      const totalInvestable = "1000.00";
      const result = transformToChartData(mockItemWithOverAllocated, totalInvestable);

      // Should only have 3 items (not 4)
      expect(result).toHaveLength(3);

      // Should not include over-allocated item
      const assetIds = result.map((r) => r.classId);
      expect(assetIds).not.toContain("asset-over");
    });

    it("excludes items with zero recommended amount", () => {
      const itemsWithZero: RecommendationDisplayItem[] = [
        ...mockItems,
        {
          assetId: "asset-zero",
          symbol: "NVDA",
          score: "80.0",
          currentAllocation: "20.0",
          targetAllocation: "20.0",
          allocationGap: "0.0",
          recommendedAmount: "0.00",
          isOverAllocated: false, // Not marked as over-allocated but has 0 amount
        },
      ];

      const result = transformToChartData(itemsWithZero, "1000.00");

      expect(result).toHaveLength(3);
      const assetIds = result.map((r) => r.classId);
      expect(assetIds).not.toContain("asset-zero");
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no investable items", () => {
      const onlyOverAllocated: RecommendationDisplayItem[] = [
        {
          assetId: "asset-over",
          symbol: "TSLA",
          score: "45.0",
          currentAllocation: "35.0",
          targetAllocation: "20.0",
          allocationGap: "-15.0",
          recommendedAmount: "0.00",
          isOverAllocated: true,
        },
      ];

      const result = transformToChartData(onlyOverAllocated, "1000.00");

      expect(result).toHaveLength(0);
    });

    it("handles zero total investable", () => {
      const result = transformToChartData(mockItems, "0.00");

      // Should have 0 items since all percentages would be 0
      expect(result).toHaveLength(3);
      expect(result[0]?.percentage).toBe("0");
    });

    it("returns empty array for empty items", () => {
      const result = transformToChartData([], "1000.00");

      expect(result).toHaveLength(0);
    });

    it("handles many items (color cycling)", () => {
      // Create more items than colors available
      const manyItems: RecommendationDisplayItem[] = Array.from({ length: 15 }, (_, i) => ({
        assetId: `asset-${i}`,
        symbol: `SYM${i}`,
        score: "80.0",
        currentAllocation: "5.0",
        targetAllocation: "10.0",
        allocationGap: "5.0",
        recommendedAmount: "100.00",
        isOverAllocated: false,
      }));

      const result = transformToChartData(manyItems, "1500.00");

      expect(result).toHaveLength(15);

      // Colors should cycle (item 10 should have same color as item 0)
      expect(result[10]?.color).toBe(result[0]?.color);
    });
  });

  describe("percentage precision", () => {
    it("formats percentage with 1 decimal place", () => {
      const items: RecommendationDisplayItem[] = [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "85.0",
          currentAllocation: "15.0",
          targetAllocation: "20.0",
          allocationGap: "5.0",
          recommendedAmount: "333.33",
          isOverAllocated: false,
        },
      ];

      const result = transformToChartData(items, "1000.00");

      // 333.33 / 1000 = 33.333% → should be "33.3"
      expect(result[0]?.percentage).toBe("33.3");
    });

    it("handles very small percentages", () => {
      const items: RecommendationDisplayItem[] = [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "85.0",
          currentAllocation: "15.0",
          targetAllocation: "20.0",
          allocationGap: "5.0",
          recommendedAmount: "1.00",
          isOverAllocated: false,
        },
      ];

      const result = transformToChartData(items, "10000.00");

      // 1 / 10000 = 0.01%
      expect(result[0]?.percentage).toBe("0.0");
    });
  });
});
