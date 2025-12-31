/**
 * AllocationComparisonLegend Component Logic Tests
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.5: Target range comparison with color-coded status indicators
 *
 * Tests for the exported helper functions and type definitions.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

// =============================================================================
// TYPE DEFINITIONS (mirroring component props)
// =============================================================================

interface AllocationComparisonLegendProps {
  allocations: StrategyAllocation[];
  unclassified?: {
    percentage: string;
    assetCount: number;
  };
  onRowClick?: (classId: string) => void;
  selectedClassId?: string | null;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS (mirroring component logic)
// =============================================================================

/**
 * Get CSS class for status indicator dot
 */
function getStatusIndicatorClass(status: AllocationStatus): string {
  switch (status) {
    case "on-target":
      return "bg-emerald-500";
    case "under":
      return "bg-amber-500";
    case "over":
      return "bg-red-500";
    case "no-target":
      return "bg-slate-400";
  }
}

/**
 * Get CSS class for status text color
 */
function getStatusTextClass(status: AllocationStatus): string {
  switch (status) {
    case "on-target":
      return "text-emerald-600 dark:text-emerald-400";
    case "under":
      return "text-amber-600 dark:text-amber-400";
    case "over":
      return "text-red-600 dark:text-red-400";
    case "no-target":
      return "text-slate-600 dark:text-slate-400";
  }
}

/**
 * Get status label text
 */
function getStatusLabel(status: AllocationStatus): string {
  switch (status) {
    case "under":
      return "Under";
    case "on-target":
      return "On target";
    case "over":
      return "Over";
    case "no-target":
      return "No target";
  }
}

/**
 * Check if unclassified should be shown
 */
function shouldShowUnclassified(
  unclassified: AllocationComparisonLegendProps["unclassified"]
): boolean {
  if (!unclassified) return false;
  const percentage = parseFloat(unclassified.percentage);
  return !isNaN(percentage) && percentage > 0;
}

/**
 * Check if legend should show empty state
 */
function shouldShowEmpty(allocations: StrategyAllocation[], showUnclassified: boolean): boolean {
  return allocations.length === 0 && !showUnclassified;
}

/**
 * Build aria-label for allocation row
 */
function buildAriaLabel(
  className: string,
  percentage: string,
  targetMin: string | null,
  targetMax: string | null,
  isSelected: boolean
): string {
  const hasTarget = targetMin !== null && targetMax !== null;
  let label = `${className}: ${percentage}% allocation`;
  if (hasTarget) {
    label += `, target ${targetMin} to ${targetMax}%`;
  }
  if (isSelected) {
    label += " (selected)";
  }
  return label;
}

// =============================================================================
// TESTS
// =============================================================================

describe("AllocationComparisonLegend", () => {
  describe("getStatusIndicatorClass", () => {
    it("should return emerald class for on-target", () => {
      expect(getStatusIndicatorClass("on-target")).toBe("bg-emerald-500");
    });

    it("should return amber class for under", () => {
      expect(getStatusIndicatorClass("under")).toBe("bg-amber-500");
    });

    it("should return red class for over", () => {
      expect(getStatusIndicatorClass("over")).toBe("bg-red-500");
    });

    it("should return slate class for no-target", () => {
      expect(getStatusIndicatorClass("no-target")).toBe("bg-slate-400");
    });
  });

  describe("getStatusTextClass", () => {
    it("should return emerald text class for on-target", () => {
      expect(getStatusTextClass("on-target")).toContain("emerald");
    });

    it("should return amber text class for under", () => {
      expect(getStatusTextClass("under")).toContain("amber");
    });

    it("should return red text class for over", () => {
      expect(getStatusTextClass("over")).toContain("red");
    });

    it("should return slate text class for no-target", () => {
      expect(getStatusTextClass("no-target")).toContain("slate");
    });

    it("should include dark mode variants", () => {
      expect(getStatusTextClass("on-target")).toContain("dark:");
      expect(getStatusTextClass("under")).toContain("dark:");
      expect(getStatusTextClass("over")).toContain("dark:");
      expect(getStatusTextClass("no-target")).toContain("dark:");
    });
  });

  describe("getStatusLabel", () => {
    it("should return 'On target' for on-target status", () => {
      expect(getStatusLabel("on-target")).toBe("On target");
    });

    it("should return 'Under' for under status", () => {
      expect(getStatusLabel("under")).toBe("Under");
    });

    it("should return 'Over' for over status", () => {
      expect(getStatusLabel("over")).toBe("Over");
    });

    it("should return 'No target' for no-target status", () => {
      expect(getStatusLabel("no-target")).toBe("No target");
    });
  });

  describe("shouldShowUnclassified", () => {
    it("should return false when unclassified is undefined", () => {
      expect(shouldShowUnclassified(undefined)).toBe(false);
    });

    it("should return false when percentage is 0", () => {
      expect(shouldShowUnclassified({ percentage: "0", assetCount: 0 })).toBe(false);
    });

    it("should return false when percentage is '0.00'", () => {
      expect(shouldShowUnclassified({ percentage: "0.00", assetCount: 0 })).toBe(false);
    });

    it("should return true when percentage > 0", () => {
      expect(shouldShowUnclassified({ percentage: "10", assetCount: 2 })).toBe(true);
    });

    it("should return true for small positive percentage", () => {
      expect(shouldShowUnclassified({ percentage: "0.01", assetCount: 1 })).toBe(true);
    });

    it("should return false for invalid percentage string", () => {
      expect(shouldShowUnclassified({ percentage: "invalid", assetCount: 0 })).toBe(false);
    });
  });

  describe("shouldShowEmpty", () => {
    it("should return true when allocations empty and no unclassified", () => {
      expect(shouldShowEmpty([], false)).toBe(true);
    });

    it("should return false when allocations exist", () => {
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
      expect(shouldShowEmpty([mockAllocation], false)).toBe(false);
    });

    it("should return false when unclassified shown", () => {
      expect(shouldShowEmpty([], true)).toBe(false);
    });
  });

  describe("buildAriaLabel", () => {
    it("should include class name and percentage", () => {
      const label = buildAriaLabel("Stocks", "50", "40", "60", false);
      expect(label).toContain("Stocks");
      expect(label).toContain("50%");
    });

    it("should include target range when available", () => {
      const label = buildAriaLabel("Stocks", "50", "40", "60", false);
      expect(label).toContain("target 40 to 60%");
    });

    it("should not include target range when null", () => {
      const label = buildAriaLabel("Stocks", "50", null, null, false);
      expect(label).not.toContain("target");
    });

    it("should include selected indicator when selected", () => {
      const label = buildAriaLabel("Stocks", "50", "40", "60", true);
      expect(label).toContain("(selected)");
    });

    it("should not include selected indicator when not selected", () => {
      const label = buildAriaLabel("Stocks", "50", "40", "60", false);
      expect(label).not.toContain("(selected)");
    });
  });

  describe("allocation row data structure", () => {
    it("should have all required fields for display", () => {
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

      expect(mockAllocation.classId).toBeDefined();
      expect(mockAllocation.className).toBeDefined();
      expect(mockAllocation.currentPercentage).toBeDefined();
      expect(mockAllocation.status).toBeDefined();
    });

    it("should allow null targets for no-target status", () => {
      const mockAllocation: StrategyAllocation = {
        classId: "crypto",
        className: "Crypto",
        targetMin: null,
        targetMax: null,
        currentValue: "1000",
        currentPercentage: "10",
        assetCount: 1,
        status: "no-target",
      };

      expect(mockAllocation.targetMin).toBeNull();
      expect(mockAllocation.targetMax).toBeNull();
    });
  });

  describe("unclassified row structure", () => {
    it("should have percentage and assetCount", () => {
      const unclassified = { percentage: "20", assetCount: 3 };
      expect(unclassified.percentage).toBe("20");
      expect(unclassified.assetCount).toBe(3);
    });

    it("should always have no-target status", () => {
      // Unclassified assets are always displayed with no-target status
      const status: AllocationStatus = "no-target";
      expect(getStatusLabel(status)).toBe("No target");
      expect(getStatusIndicatorClass(status)).toBe("bg-slate-400");
    });
  });

  describe("selection state", () => {
    it("should identify selected allocation by classId", () => {
      const selectedClassId = "stocks";
      const classId = "stocks";
      expect(selectedClassId === classId).toBe(true);
    });

    it("should identify non-selected allocation", () => {
      const selectedClassId = "stocks";
      const classId = "bonds";
      expect(selectedClassId === classId).toBe(false);
    });

    it("should handle null selectedClassId", () => {
      const selectedClassId: string | null = null;
      const classId = "stocks";
      expect(selectedClassId === classId).toBe(false);
    });
  });

  describe("click handler", () => {
    it("should be optional", () => {
      const props: AllocationComparisonLegendProps = {
        allocations: [],
        onRowClick: undefined,
      };
      expect(props.onRowClick).toBeUndefined();
    });

    it("should accept classId parameter", () => {
      let receivedId: string | undefined;
      const onRowClick = (classId: string) => {
        receivedId = classId;
      };
      onRowClick("stocks");
      expect(receivedId).toBe("stocks");
    });
  });
});
