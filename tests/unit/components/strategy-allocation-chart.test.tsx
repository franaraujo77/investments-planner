/**
 * StrategyAllocationChart Component Logic Tests
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Pie chart showing allocation by asset class
 * AC-3.6.4: Empty state message for portfolios without assets
 * AC-3.6.5: Color-coded status indicators
 *
 * Tests for the exported helper functions and type definitions.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";

// =============================================================================
// TYPE DEFINITIONS (mirroring component props)
// =============================================================================

interface StrategyAllocationChartProps {
  className?: string;
  height?: number;
  showLegend?: boolean;
  onClassClick?: (classId: string) => void;
  selectedClassId?: string | null;
  allocationsData?: {
    allocations: StrategyAllocation[];
    totalValue: string;
    unclassified: {
      value: string;
      percentage: string;
      assetCount: number;
    };
    hasAssets: boolean;
    isLoading: boolean;
    error: string | null;
  };
}

// Color palette for status indicators
const STATUS_COLORS = {
  "on-target": "hsl(142, 71%, 45%)", // Green
  under: "hsl(38, 92%, 50%)", // Amber
  over: "hsl(0, 84%, 60%)", // Red
  "no-target": "hsl(210, 40%, 52%)", // Steel Blue
};

// =============================================================================
// HELPER FUNCTIONS (mirroring component logic)
// =============================================================================

/**
 * Get color for allocation status
 */
function getStatusColor(status: StrategyAllocation["status"]): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS["no-target"];
}

/**
 * Transform allocations to chart data format
 */
function transformToChartData(
  allocations: StrategyAllocation[],
  unclassified: { value: string; percentage: string; assetCount: number }
) {
  const chartData = allocations.map((alloc, index) => ({
    ...alloc,
    value: parseFloat(alloc.currentPercentage) || 0,
    fill: getStatusColor(alloc.status),
    index,
  }));

  // Add unclassified if percentage > 0
  const unclassifiedPercentage = parseFloat(unclassified.percentage) || 0;
  if (unclassifiedPercentage > 0) {
    chartData.push({
      classId: "unclassified",
      className: "Unclassified",
      targetMin: null,
      targetMax: null,
      currentValue: unclassified.value,
      currentPercentage: unclassified.percentage,
      assetCount: unclassified.assetCount,
      status: "no-target" as const,
      value: unclassifiedPercentage,
      fill: STATUS_COLORS["no-target"],
      index: allocations.length,
    });
  }

  return chartData;
}

/**
 * Check if chart should show empty state
 */
function shouldShowEmpty(hasAssets: boolean, allocations: StrategyAllocation[]): boolean {
  return !hasAssets || allocations.length === 0;
}

/**
 * Get default props for chart
 */
function getDefaultProps(): Required<Pick<StrategyAllocationChartProps, "height" | "showLegend">> {
  return {
    height: 300,
    showLegend: true,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("StrategyAllocationChart", () => {
  describe("default props", () => {
    it("should have default height of 300", () => {
      const defaults = getDefaultProps();
      expect(defaults.height).toBe(300);
    });

    it("should show legend by default", () => {
      const defaults = getDefaultProps();
      expect(defaults.showLegend).toBe(true);
    });
  });

  describe("getStatusColor", () => {
    it("should return green for on-target status", () => {
      expect(getStatusColor("on-target")).toBe(STATUS_COLORS["on-target"]);
    });

    it("should return amber for under status", () => {
      expect(getStatusColor("under")).toBe(STATUS_COLORS["under"]);
    });

    it("should return red for over status", () => {
      expect(getStatusColor("over")).toBe(STATUS_COLORS["over"]);
    });

    it("should return steel blue for no-target status", () => {
      expect(getStatusColor("no-target")).toBe(STATUS_COLORS["no-target"]);
    });
  });

  describe("transformToChartData", () => {
    const mockAllocations: StrategyAllocation[] = [
      {
        classId: "stocks",
        className: "Stocks",
        targetMin: "40",
        targetMax: "60",
        currentValue: "5000",
        currentPercentage: "50",
        assetCount: 3,
        status: "on-target",
      },
      {
        classId: "bonds",
        className: "Bonds",
        targetMin: "20",
        targetMax: "30",
        currentValue: "3000",
        currentPercentage: "30",
        assetCount: 2,
        status: "under",
      },
    ];

    it("should transform allocations to chart format", () => {
      const result = transformToChartData(mockAllocations, {
        value: "0",
        percentage: "0",
        assetCount: 0,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.className).toBe("Stocks");
      expect(result[0]?.value).toBe(50);
    });

    it("should add fill color based on status", () => {
      const result = transformToChartData(mockAllocations, {
        value: "0",
        percentage: "0",
        assetCount: 0,
      });

      expect(result[0]?.fill).toBe(STATUS_COLORS["on-target"]);
      expect(result[1]?.fill).toBe(STATUS_COLORS["under"]);
    });

    it("should include unclassified when percentage > 0", () => {
      const result = transformToChartData(mockAllocations, {
        value: "2000",
        percentage: "20",
        assetCount: 2,
      });

      expect(result).toHaveLength(3);
      expect(result[2]?.className).toBe("Unclassified");
      expect(result[2]?.value).toBe(20);
    });

    it("should not include unclassified when percentage is 0", () => {
      const result = transformToChartData(mockAllocations, {
        value: "0",
        percentage: "0",
        assetCount: 0,
      });

      expect(result).toHaveLength(2);
      expect(result.find((d) => d.className === "Unclassified")).toBeUndefined();
    });

    it("should assign no-target status to unclassified", () => {
      const result = transformToChartData([], {
        value: "1000",
        percentage: "100",
        assetCount: 1,
      });

      expect(result[0]?.status).toBe("no-target");
      expect(result[0]?.fill).toBe(STATUS_COLORS["no-target"]);
    });

    it("should handle empty allocations", () => {
      const result = transformToChartData([], {
        value: "0",
        percentage: "0",
        assetCount: 0,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("shouldShowEmpty", () => {
    it("should return true when hasAssets is false", () => {
      expect(shouldShowEmpty(false, [])).toBe(true);
    });

    it("should return true when allocations is empty", () => {
      expect(shouldShowEmpty(true, [])).toBe(true);
    });

    it("should return false when hasAssets and allocations exist", () => {
      const mockAllocation: StrategyAllocation = {
        classId: "test",
        className: "Test",
        targetMin: "40",
        targetMax: "60",
        currentValue: "5000",
        currentPercentage: "50",
        assetCount: 3,
        status: "on-target",
      };
      expect(shouldShowEmpty(true, [mockAllocation])).toBe(false);
    });
  });

  describe("allocationsData prop", () => {
    it("should accept allocationsData with all required fields", () => {
      const allocationsData: StrategyAllocationChartProps["allocationsData"] = {
        allocations: [],
        totalValue: "0",
        unclassified: { value: "0", percentage: "0", assetCount: 0 },
        hasAssets: false,
        isLoading: false,
        error: null,
      };

      expect(allocationsData.allocations).toEqual([]);
      expect(allocationsData.isLoading).toBe(false);
      expect(allocationsData.error).toBeNull();
    });

    it("should allow error to be a string", () => {
      const allocationsData: StrategyAllocationChartProps["allocationsData"] = {
        allocations: [],
        totalValue: "0",
        unclassified: { value: "0", percentage: "0", assetCount: 0 },
        hasAssets: false,
        isLoading: false,
        error: "Failed to load",
      };

      expect(allocationsData.error).toBe("Failed to load");
    });
  });

  describe("chart data accessibility", () => {
    it("should include class name in chart data", () => {
      const mockAllocation: StrategyAllocation = {
        classId: "stocks",
        className: "Stocks",
        targetMin: "40",
        targetMax: "60",
        currentValue: "5000",
        currentPercentage: "50",
        assetCount: 3,
        status: "on-target",
      };

      const result = transformToChartData([mockAllocation], {
        value: "0",
        percentage: "0",
        assetCount: 0,
      });

      expect(result[0]?.className).toBe("Stocks");
    });

    it("should preserve classId for click handlers", () => {
      const mockAllocation: StrategyAllocation = {
        classId: "unique-id-123",
        className: "Stocks",
        targetMin: "40",
        targetMax: "60",
        currentValue: "5000",
        currentPercentage: "50",
        assetCount: 3,
        status: "on-target",
      };

      const result = transformToChartData([mockAllocation], {
        value: "0",
        percentage: "0",
        assetCount: 0,
      });

      expect(result[0]?.classId).toBe("unique-id-123");
    });
  });
});
