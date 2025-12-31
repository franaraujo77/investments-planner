/**
 * Unit tests for StrategyAllocationBalanceIndicator component logic
 *
 * Story 3.7: Strategy Allocation Balance Indicator
 * Tests for AC-3.7.1 through AC-3.7.7
 *
 * Tests the component's logic for determining allocation states,
 * message building, and accessibility attributes.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  ALLOCATION_FP_TOLERANCE,
  getState,
  getStateStyles,
  type AllocationState,
} from "@/components/forms/allocation-indicator";

// =============================================================================
// TYPE DEFINITIONS (mirroring component props)
// =============================================================================

interface StrategyAllocationBalanceIndicatorProps {
  className?: string;
}

interface AllocationSummary {
  totalMinimums: string;
  totalMaximums: string;
  unallocatedMinimum: string;
  classCount: number;
  classesWithRanges: number;
}

// =============================================================================
// HELPER FUNCTIONS (mirroring component logic)
// =============================================================================

/**
 * Calculate state based on total minimum allocations
 * Mirrors component's useMemo logic
 */
function calculateState(summary: AllocationSummary | null): "empty" | "loading" | AllocationState {
  if (!summary) return "empty";

  const { totalMinimums, classCount } = summary;

  // Check if empty (no asset classes)
  if (classCount === 0) return "empty";

  const total = new Decimal(totalMinimums).toNumber();
  const remaining = 100 - total;

  // Check if valid (within floating-point tolerance of 100%)
  const isValid = Math.abs(total - 100) <= ALLOCATION_FP_TOLERANCE;

  return getState(remaining, isValid);
}

/**
 * Calculate derived values from allocation summary
 * Mirrors component's useMemo calculations
 */
function calculateDerivedValues(summary: AllocationSummary | null) {
  const totalMinimums = summary?.totalMinimums ?? "0";
  const classCount = summary?.classCount ?? 0;

  const totalDecimal = new Decimal(totalMinimums);
  const remainingDecimal = new Decimal(100).minus(totalDecimal);
  const totalNum = totalDecimal.toNumber();
  const remainingNum = remainingDecimal.toNumber();

  const isEmptyState = classCount === 0;
  const isValidState = !isEmptyState && Math.abs(totalNum - 100) <= ALLOCATION_FP_TOLERANCE;
  const isOverState = !isValidState && totalNum > 100;

  const overAmount = remainingNum < 0 ? Math.abs(remainingNum) : 0;
  const progressWidth = Math.min(Math.max(totalNum, 0), 100);

  return {
    total: totalNum,
    remaining: remainingNum,
    isValid: isValidState,
    isOver: isOverState,
    isEmpty: isEmptyState,
    overAmount,
    progressWidth,
  };
}

/**
 * Format percentage for display (mirrors useNumberFormat behavior)
 * @param value Decimal value (0-1 for 0-100%)
 */
function formatPercent(value: number): string {
  const percent = value * 100;
  if (percent === Math.floor(percent)) {
    return `${percent}%`;
  }
  return `${percent.toFixed(1)}%`;
}

/**
 * Build display message based on state
 * Mirrors component's message useMemo
 */
function buildMessage(summary: AllocationSummary | null): string {
  const { total, remaining, isEmpty, isValid, isOver, overAmount } =
    calculateDerivedValues(summary);

  if (isEmpty) {
    return "0% allocated — Add asset classes to get started";
  }

  if (isValid) {
    return `${formatPercent(total / 100)} allocated`;
  }

  if (isOver) {
    return `${formatPercent(total / 100)} allocated (${formatPercent(overAmount / 100)} over)`;
  }

  return `${formatPercent(total / 100)} allocated, ${formatPercent(Math.abs(remaining) / 100)} remaining`;
}

/**
 * Build aria-label for accessibility
 * Mirrors component's ariaLabel useMemo
 */
function buildAriaLabel(summary: AllocationSummary | null): string {
  const { total, remaining, isEmpty, isValid, isOver, overAmount } =
    calculateDerivedValues(summary);

  if (isEmpty) {
    return "No asset classes configured. 0% allocated. Add asset classes to define your investment strategy.";
  }

  if (isValid) {
    return `Strategy allocation complete: ${formatPercent(total / 100)} allocated across all asset classes. Configuration is balanced.`;
  }

  if (isOver) {
    return `Strategy overallocated: ${formatPercent(total / 100)} allocated, ${formatPercent(overAmount / 100)} over the 100% target. Reduce minimum allocations to reach 100%.`;
  }

  return `Strategy underallocated: ${formatPercent(total / 100)} allocated, ${formatPercent(Math.abs(remaining) / 100)} remaining to reach 100%. Add or increase asset class allocations.`;
}

/**
 * Get guidance message for overallocated state
 * Mirrors component's guidanceMessage useMemo
 */
function getGuidanceMessage(summary: AllocationSummary | null): string | null {
  const state = calculateState(summary);
  if (state === "overallocated") {
    return "Reduce allocations to reach 100%";
  }
  return null;
}

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createSummary = (overrides: Partial<AllocationSummary> = {}): AllocationSummary => ({
  totalMinimums: "50",
  totalMaximums: "60",
  unallocatedMinimum: "50",
  classCount: 2,
  classesWithRanges: 2,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe("StrategyAllocationBalanceIndicator", () => {
  describe("Props Type Definitions", () => {
    it("should accept optional className prop", () => {
      const props: StrategyAllocationBalanceIndicatorProps = {
        className: "custom-class",
      };
      expect(props.className).toBe("custom-class");
    });

    it("should allow empty props object", () => {
      const props: StrategyAllocationBalanceIndicatorProps = {};
      expect(props.className).toBeUndefined();
    });
  });

  describe("AC-3.7.1: Strategy Page Allocation Summary", () => {
    it("calculates total allocation from totalMinimums", () => {
      const summary = createSummary({ totalMinimums: "75" });
      const { total } = calculateDerivedValues(summary);
      expect(total).toBe(75);
    });

    it("calculates remaining allocation correctly", () => {
      const summary = createSummary({ totalMinimums: "60" });
      const { remaining } = calculateDerivedValues(summary);
      expect(remaining).toBe(40);
    });

    it("handles decimal values correctly", () => {
      const summary = createSummary({ totalMinimums: "45.5" });
      const { total, remaining } = calculateDerivedValues(summary);
      expect(total).toBe(45.5);
      expect(remaining).toBe(54.5);
    });
  });

  describe("AC-3.7.2: Underallocated State", () => {
    it("returns underallocated state when total < 100%", () => {
      const summary = createSummary({ totalMinimums: "45" });
      expect(calculateState(summary)).toBe("underallocated");
    });

    it("builds correct message for underallocated state", () => {
      const summary = createSummary({
        totalMinimums: "45",
        classCount: 2,
      });
      // remaining is calculated from Decimal.js, may have .0 suffix
      expect(buildMessage(summary)).toMatch(/45% allocated, 55(\.0)?% remaining/);
    });

    it("returns neutral styling for underallocated state", () => {
      const styles = getStateStyles("underallocated");
      expect(styles.textColor).toBe("text-muted-foreground");
      expect(styles.bgColor).toBe("bg-muted/30");
      expect(styles.progressColor).toBe("bg-slate-400");
    });

    it("calculates progress width correctly for underallocated", () => {
      const summary = createSummary({ totalMinimums: "30" });
      const { progressWidth } = calculateDerivedValues(summary);
      expect(progressWidth).toBe(30);
    });
  });

  describe("AC-3.7.3: Valid State (Exactly 100%)", () => {
    it("returns valid state when total equals 100%", () => {
      const summary = createSummary({ totalMinimums: "100", classCount: 3 });
      expect(calculateState(summary)).toBe("valid");
    });

    it("returns valid state within floating-point tolerance", () => {
      const summary = createSummary({ totalMinimums: "99.99", classCount: 3 });
      expect(calculateState(summary)).toBe("valid");
    });

    it("returns valid state for 100.01% (within tolerance)", () => {
      const summary = createSummary({ totalMinimums: "100.01", classCount: 3 });
      expect(calculateState(summary)).toBe("valid");
    });

    it("builds correct message for valid state", () => {
      const summary = createSummary({ totalMinimums: "100", classCount: 3 });
      expect(buildMessage(summary)).toBe("100% allocated");
    });

    it("returns success styling for valid state", () => {
      const styles = getStateStyles("valid");
      expect(styles.textColor).toBe("text-emerald-600 dark:text-emerald-400");
      expect(styles.bgColor).toBe("bg-emerald-100/50 dark:bg-emerald-900/20");
      expect(styles.progressColor).toBe("bg-emerald-500");
    });

    it("calculates progress width as 100 for valid state", () => {
      const summary = createSummary({ totalMinimums: "100", classCount: 3 });
      const { progressWidth } = calculateDerivedValues(summary);
      expect(progressWidth).toBe(100);
    });
  });

  describe("AC-3.7.4: Overallocated State", () => {
    it("returns overallocated state when total > 100%", () => {
      const summary = createSummary({ totalMinimums: "115", classCount: 4 });
      expect(calculateState(summary)).toBe("overallocated");
    });

    it("builds correct message for overallocated state", () => {
      const summary = createSummary({ totalMinimums: "115", classCount: 4 });
      // total may have .0 suffix from Decimal.js
      expect(buildMessage(summary)).toMatch(/115(\.0)?% allocated \(15% over\)/);
    });

    it("returns error styling for overallocated state", () => {
      const styles = getStateStyles("overallocated");
      expect(styles.textColor).toBe("text-red-600 dark:text-red-400");
      expect(styles.bgColor).toBe("bg-red-100/50 dark:bg-red-900/20");
      expect(styles.progressColor).toBe("bg-red-500");
    });

    it("provides guidance message for overallocated state", () => {
      const summary = createSummary({ totalMinimums: "110", classCount: 3 });
      expect(getGuidanceMessage(summary)).toBe("Reduce allocations to reach 100%");
    });

    it("does not provide guidance message for underallocated state", () => {
      const summary = createSummary({ totalMinimums: "50", classCount: 2 });
      expect(getGuidanceMessage(summary)).toBeNull();
    });

    it("does not provide guidance message for valid state", () => {
      const summary = createSummary({ totalMinimums: "100", classCount: 3 });
      expect(getGuidanceMessage(summary)).toBeNull();
    });

    it("caps progress width at 100% for overallocated", () => {
      const summary = createSummary({ totalMinimums: "150", classCount: 5 });
      const { progressWidth } = calculateDerivedValues(summary);
      expect(progressWidth).toBe(100);
    });

    it("calculates over amount correctly", () => {
      const summary = createSummary({ totalMinimums: "120", classCount: 4 });
      const { overAmount } = calculateDerivedValues(summary);
      expect(overAmount).toBe(20);
    });
  });

  describe("AC-3.7.5: Empty State", () => {
    it("returns empty state when classCount is 0", () => {
      const summary = createSummary({ totalMinimums: "0", classCount: 0 });
      expect(calculateState(summary)).toBe("empty");
    });

    it("returns empty state when summary is null", () => {
      expect(calculateState(null)).toBe("empty");
    });

    it("builds correct message for empty state", () => {
      const summary = createSummary({ totalMinimums: "0", classCount: 0 });
      expect(buildMessage(summary)).toBe("0% allocated — Add asset classes to get started");
    });

    it("calculates progress width as 0 for empty state", () => {
      const summary = createSummary({ totalMinimums: "0", classCount: 0 });
      const { progressWidth } = calculateDerivedValues(summary);
      expect(progressWidth).toBe(0);
    });
  });

  describe("AC-3.7.6: Real-Time Updates (calculation verification)", () => {
    it("recalculates state when totalMinimums changes", () => {
      // Initial: underallocated
      const initial = createSummary({ totalMinimums: "50", classCount: 2 });
      expect(calculateState(initial)).toBe("underallocated");

      // Updated: valid
      const updated = createSummary({ totalMinimums: "100", classCount: 3 });
      expect(calculateState(updated)).toBe("valid");
    });

    it("recalculates message when values change", () => {
      const initial = createSummary({ totalMinimums: "50", classCount: 2 });
      expect(buildMessage(initial)).toBe("50% allocated, 50% remaining");

      const updated = createSummary({ totalMinimums: "75", classCount: 3 });
      expect(buildMessage(updated)).toBe("75% allocated, 25% remaining");
    });
  });

  describe("AC-3.7.7: Screen Reader Accessibility", () => {
    it("builds descriptive aria-label for underallocated state", () => {
      const summary = createSummary({ totalMinimums: "45", classCount: 2 });
      const ariaLabel = buildAriaLabel(summary);
      expect(ariaLabel).toContain("underallocated");
      expect(ariaLabel).toContain("45%");
      expect(ariaLabel).toMatch(/55(\.0)?%/);
      expect(ariaLabel).toContain("remaining");
    });

    it("builds descriptive aria-label for valid state", () => {
      const summary = createSummary({ totalMinimums: "100", classCount: 3 });
      const ariaLabel = buildAriaLabel(summary);
      expect(ariaLabel).toContain("complete");
      expect(ariaLabel).toContain("100%");
      expect(ariaLabel).toContain("balanced");
    });

    it("builds descriptive aria-label for overallocated state", () => {
      const summary = createSummary({ totalMinimums: "115", classCount: 4 });
      const ariaLabel = buildAriaLabel(summary);
      expect(ariaLabel).toContain("overallocated");
      expect(ariaLabel).toMatch(/115(\.0)?%/);
      expect(ariaLabel).toContain("15%");
      expect(ariaLabel).toContain("over");
    });

    it("builds descriptive aria-label for empty state", () => {
      const summary = createSummary({ totalMinimums: "0", classCount: 0 });
      const ariaLabel = buildAriaLabel(summary);
      expect(ariaLabel).toContain("No asset classes configured");
      expect(ariaLabel).toContain("0%");
    });
  });

  describe("Edge Cases", () => {
    it("handles very small allocations (0.01%)", () => {
      const summary = createSummary({ totalMinimums: "0.01", classCount: 1 });
      expect(calculateState(summary)).toBe("underallocated");
      const { progressWidth } = calculateDerivedValues(summary);
      expect(progressWidth).toBeCloseTo(0.01, 2);
    });

    it("handles very large allocations (200%+)", () => {
      const summary = createSummary({ totalMinimums: "200", classCount: 5 });
      expect(calculateState(summary)).toBe("overallocated");
      expect(buildMessage(summary)).toBe("200% allocated (100% over)");
    });

    it("handles floating-point precision for near-100% values", () => {
      // 99.98 is within ALLOCATION_FP_TOLERANCE (0.02)
      const nearValid = createSummary({ totalMinimums: "99.98", classCount: 3 });
      expect(calculateState(nearValid)).toBe("valid");

      // 99.97 is outside ALLOCATION_FP_TOLERANCE
      const notValid = createSummary({ totalMinimums: "99.97", classCount: 3 });
      expect(calculateState(notValid)).toBe("underallocated");
    });

    it("handles 0% allocation correctly", () => {
      const summary = createSummary({
        totalMinimums: "0",
        classCount: 1, // Has class but 0% allocation
      });
      expect(calculateState(summary)).toBe("underallocated");
      expect(buildMessage(summary)).toBe("0% allocated, 100% remaining");
    });

    it("handles negative progress width gracefully", () => {
      // Edge case: if totalMinimums somehow becomes negative
      const summary = createSummary({ totalMinimums: "-10", classCount: 1 });
      const { progressWidth } = calculateDerivedValues(summary);
      expect(progressWidth).toBe(0); // Should clamp to 0
    });
  });

  describe("Decimal.js Precision", () => {
    it("uses Decimal.js for accurate calculations", () => {
      // Test a value that would have floating-point errors in JS
      const summary = createSummary({ totalMinimums: "33.33" });
      const { total, remaining } = calculateDerivedValues(summary);
      expect(total).toBe(33.33);
      expect(remaining).toBeCloseTo(66.67, 2);
    });

    it("maintains precision for percentage calculations", () => {
      const summary = createSummary({ totalMinimums: "99.99" });
      const { total, remaining } = calculateDerivedValues(summary);
      expect(total).toBe(99.99);
      expect(remaining).toBeCloseTo(0.01, 2);
    });
  });

  describe("Formatting", () => {
    it("formats integer percentages without decimal places", () => {
      expect(formatPercent(0.5)).toBe("50%");
      expect(formatPercent(1)).toBe("100%");
      expect(formatPercent(0)).toBe("0%");
    });

    it("formats decimal percentages with one decimal place", () => {
      expect(formatPercent(0.455)).toBe("45.5%");
      expect(formatPercent(0.999)).toBe("99.9%");
    });
  });

  describe("State Transitions", () => {
    it("transitions from underallocated to valid correctly", () => {
      const underallocated = createSummary({ totalMinimums: "80", classCount: 2 });
      const valid = createSummary({ totalMinimums: "100", classCount: 3 });

      expect(calculateState(underallocated)).toBe("underallocated");
      expect(calculateState(valid)).toBe("valid");
    });

    it("transitions from valid to overallocated correctly", () => {
      const valid = createSummary({ totalMinimums: "100", classCount: 3 });
      const overallocated = createSummary({ totalMinimums: "110", classCount: 4 });

      expect(calculateState(valid)).toBe("valid");
      expect(calculateState(overallocated)).toBe("overallocated");
    });

    it("transitions from empty to underallocated correctly", () => {
      const empty = createSummary({ totalMinimums: "0", classCount: 0 });
      const underallocated = createSummary({ totalMinimums: "50", classCount: 2 });

      expect(calculateState(empty)).toBe("empty");
      expect(calculateState(underallocated)).toBe("underallocated");
    });
  });

  describe("ALLOCATION_FP_TOLERANCE Integration", () => {
    it("uses the same tolerance constant as AllocationIndicator", () => {
      // Verify we're using the same tolerance
      expect(ALLOCATION_FP_TOLERANCE).toBe(0.02);
    });

    it("boundary test: exactly at tolerance boundary", () => {
      // 100 - 0.02 = 99.98 should be valid
      const atLowerBoundary = createSummary({ totalMinimums: "99.98", classCount: 3 });
      expect(calculateState(atLowerBoundary)).toBe("valid");

      // 100 + 0.02 = 100.02 should be valid
      const atUpperBoundary = createSummary({ totalMinimums: "100.02", classCount: 3 });
      expect(calculateState(atUpperBoundary)).toBe("valid");
    });

    it("boundary test: just outside tolerance", () => {
      // 100 - 0.021 = 99.979 should be underallocated
      const justBelowTolerance = createSummary({ totalMinimums: "99.97", classCount: 3 });
      expect(calculateState(justBelowTolerance)).toBe("underallocated");

      // 100 + 0.021 = 100.021 should be overallocated
      const justAboveTolerance = createSummary({ totalMinimums: "100.03", classCount: 3 });
      expect(calculateState(justAboveTolerance)).toBe("overallocated");
    });
  });
});
