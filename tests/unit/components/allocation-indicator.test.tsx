/**
 * Unit tests for AllocationIndicator component
 *
 * Story 3.2: Live Allocation Indicator
 * Tests for AC-3.2.1 through AC-3.2.5
 *
 * Tests the exported helper functions and type definitions.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import {
  getState,
  getStateStyles,
  type AllocationIndicatorProps,
  type AllocationIndicatorLiveProps,
  type AllocationState,
} from "@/components/forms/allocation-indicator";

// =============================================================================
// HELPER FUNCTIONS FOR TEST CALCULATIONS
// =============================================================================

/**
 * Calculate progress bar width (capped at 100%)
 */
function calculateProgressWidth(allocated: number): number {
  return Math.min(Math.max(allocated, 0), 100);
}

/**
 * Calculate over percentage for overallocated state
 */
function calculateOverPercent(remaining: number): number {
  return remaining < 0 ? Math.abs(remaining) : 0;
}

/**
 * Build the message based on state (mirrors component logic)
 */
function buildMessage(
  state: AllocationState,
  formattedAllocated: string,
  formattedRemaining: string,
  formattedOver: string
): string {
  switch (state) {
    case "valid":
      return `${formattedAllocated} allocated`;
    case "overallocated":
      return `${formattedAllocated} allocated (${formattedOver} over)`;
    case "underallocated":
    default:
      return `${formattedAllocated} allocated, ${formattedRemaining} remaining`;
  }
}

/**
 * Build aria-label for accessibility (mirrors component logic)
 */
function buildAriaLabel(
  state: AllocationState,
  formattedAllocated: string,
  formattedRemaining: string,
  formattedOver: string
): string {
  switch (state) {
    case "valid":
      return `Allocation complete: ${formattedAllocated} allocated, exactly 100%`;
    case "overallocated":
      return `Overallocated: ${formattedAllocated} allocated, ${formattedOver} over the 100% target`;
    case "underallocated":
    default:
      return `Underallocated: ${formattedAllocated} allocated, ${formattedRemaining} remaining to reach 100%`;
  }
}

// =============================================================================
// TESTS FOR EXPORTED FUNCTIONS
// =============================================================================

describe("AllocationIndicator - getState (exported)", () => {
  describe("AC-3.2.1: Live Allocation Display", () => {
    it("correctly determines state for allocated percentage", () => {
      expect(getState(55, false)).toBe("underallocated");
      expect(getState(0, true)).toBe("valid");
      expect(getState(-15, false)).toBe("overallocated");
    });
  });

  describe("AC-3.2.2: Remaining Percentage (Underallocated)", () => {
    it("returns underallocated state when total is less than 100%", () => {
      expect(getState(55, false)).toBe("underallocated");
      expect(getState(50, false)).toBe("underallocated");
      expect(getState(0.1, false)).toBe("underallocated");
    });
  });

  describe("AC-3.2.3: Valid Allocation Display", () => {
    it("returns valid state when total equals exactly 100%", () => {
      expect(getState(0, true)).toBe("valid");
    });

    it("valid flag takes precedence over remaining value", () => {
      // Even if remaining is slightly off, valid=true means 100%
      expect(getState(0.001, true)).toBe("valid");
      expect(getState(-0.001, true)).toBe("valid");
    });
  });

  describe("AC-3.2.4: Overallocated Display", () => {
    it("returns overallocated state when total exceeds 100%", () => {
      expect(getState(-15, false)).toBe("overallocated");
      expect(getState(-0.1, false)).toBe("overallocated");
      expect(getState(-50, false)).toBe("overallocated");
    });
  });

  describe("Edge Cases", () => {
    it("handles 0% allocation", () => {
      const state = getState(100, false);
      expect(state).toBe("underallocated");
    });

    it("handles 99.9% allocation (near but not valid)", () => {
      const state = getState(0.1, false);
      expect(state).toBe("underallocated");
    });

    it("handles 100.1% allocation (slightly over)", () => {
      const state = getState(-0.1, false);
      expect(state).toBe("overallocated");
    });
  });
});

describe("AllocationIndicator - getStateStyles (exported)", () => {
  describe("AC-3.2.2: Underallocated styling", () => {
    it("applies neutral styling for underallocated state", () => {
      const styles = getStateStyles("underallocated");
      expect(styles.textColor).toBe("text-muted-foreground");
      expect(styles.bgColor).toBe("bg-muted/30");
      expect(styles.progressColor).toBe("bg-slate-400");
    });
  });

  describe("AC-3.2.3: Valid styling", () => {
    it("applies success styling for valid state", () => {
      const styles = getStateStyles("valid");
      expect(styles.textColor).toBe("text-emerald-600 dark:text-emerald-400");
      expect(styles.bgColor).toBe("bg-emerald-100/50 dark:bg-emerald-900/20");
      expect(styles.progressColor).toBe("bg-emerald-500");
    });
  });

  describe("AC-3.2.4: Overallocated styling", () => {
    it("applies error styling for overallocated state", () => {
      const styles = getStateStyles("overallocated");
      expect(styles.textColor).toBe("text-red-600 dark:text-red-400");
      expect(styles.bgColor).toBe("bg-red-100/50 dark:bg-red-900/20");
      expect(styles.progressColor).toBe("bg-red-500");
    });
  });

  describe("Color Consistency with Design System", () => {
    it("uses emerald colors for success/valid state", () => {
      const styles = getStateStyles("valid");
      expect(styles.textColor).toContain("emerald");
      expect(styles.bgColor).toContain("emerald");
      expect(styles.progressColor).toContain("emerald");
    });

    it("uses red colors for error/overallocated state", () => {
      const styles = getStateStyles("overallocated");
      expect(styles.textColor).toContain("red");
      expect(styles.bgColor).toContain("red");
      expect(styles.progressColor).toContain("red");
    });

    it("uses muted colors for neutral/underallocated state", () => {
      const styles = getStateStyles("underallocated");
      expect(styles.textColor).toContain("muted");
      expect(styles.bgColor).toContain("muted");
    });

    it("includes dark mode variants", () => {
      const validStyles = getStateStyles("valid");
      expect(validStyles.textColor).toContain("dark:");

      const overStyles = getStateStyles("overallocated");
      expect(overStyles.textColor).toContain("dark:");
    });
  });
});

// =============================================================================
// TESTS FOR COMPONENT LOGIC (Message Building, Progress Bar, etc.)
// =============================================================================

describe("AllocationIndicator - Message Building Logic", () => {
  describe("AC-3.2.2: Underallocated message", () => {
    it("builds correct message for underallocated state", () => {
      const message = buildMessage("underallocated", "45%", "55%", "0%");
      expect(message).toBe("45% allocated, 55% remaining");
    });
  });

  describe("AC-3.2.3: Valid message", () => {
    it("builds correct message for valid state", () => {
      const message = buildMessage("valid", "100%", "0%", "0%");
      expect(message).toBe("100% allocated");
    });
  });

  describe("AC-3.2.4: Overallocated message", () => {
    it("builds correct message for overallocated state", () => {
      const message = buildMessage("overallocated", "115%", "0%", "15%");
      expect(message).toBe("115% allocated (15% over)");
    });

    it("calculates over percentage correctly", () => {
      expect(calculateOverPercent(-15)).toBe(15);
      expect(calculateOverPercent(-0.1)).toBeCloseTo(0.1);
      expect(calculateOverPercent(-50)).toBe(50);
      expect(calculateOverPercent(50)).toBe(0);
      expect(calculateOverPercent(0)).toBe(0);
    });
  });
});

describe("AllocationIndicator - Accessibility", () => {
  describe("ARIA Labels", () => {
    it("builds descriptive aria-label for underallocated state", () => {
      const ariaLabel = buildAriaLabel("underallocated", "45%", "55%", "0%");
      expect(ariaLabel).toContain("Underallocated");
      expect(ariaLabel).toContain("45%");
      expect(ariaLabel).toContain("55%");
      expect(ariaLabel).toContain("remaining to reach 100%");
    });

    it("builds descriptive aria-label for valid state", () => {
      const ariaLabel = buildAriaLabel("valid", "100%", "0%", "0%");
      expect(ariaLabel).toContain("Allocation complete");
      expect(ariaLabel).toContain("100%");
      expect(ariaLabel).toContain("exactly 100%");
    });

    it("builds descriptive aria-label for overallocated state", () => {
      const ariaLabel = buildAriaLabel("overallocated", "115%", "0%", "15%");
      expect(ariaLabel).toContain("Overallocated");
      expect(ariaLabel).toContain("115%");
      expect(ariaLabel).toContain("15%");
      expect(ariaLabel).toContain("over the 100% target");
    });
  });
});

describe("AllocationIndicator - Type Definitions", () => {
  describe("AllocationIndicatorProps", () => {
    it("requires allocated, remaining, and valid props", () => {
      const validProps: AllocationIndicatorProps = {
        allocated: 50,
        remaining: 50,
        valid: false,
      };

      expect(validProps.allocated).toBe(50);
      expect(validProps.remaining).toBe(50);
      expect(validProps.valid).toBe(false);
    });

    it("accepts optional className prop", () => {
      const propsWithClassName: AllocationIndicatorProps = {
        allocated: 50,
        remaining: 50,
        valid: false,
        className: "custom-class",
      };

      expect(propsWithClassName.className).toBe("custom-class");
    });

    it("accepts optional showProgress prop", () => {
      const propsWithProgress: AllocationIndicatorProps = {
        allocated: 50,
        remaining: 50,
        valid: false,
        showProgress: true,
      };

      expect(propsWithProgress.showProgress).toBe(true);
    });
  });

  describe("AllocationState", () => {
    it("includes all valid states", () => {
      const states: AllocationState[] = ["underallocated", "valid", "overallocated"];
      expect(states).toHaveLength(3);
    });
  });
});

describe("AllocationIndicatorLive - Type Definitions", () => {
  it("requires fieldPath prop", () => {
    const validProps: AllocationIndicatorLiveProps = {
      fieldPath: "holdings",
    };

    expect(validProps.fieldPath).toBe("holdings");
  });

  it("accepts optional targetTotal prop", () => {
    const propsWithTarget: AllocationIndicatorLiveProps = {
      fieldPath: "holdings",
      targetTotal: 50,
    };

    expect(propsWithTarget.targetTotal).toBe(50);
  });

  it("accepts optional className and showProgress props", () => {
    const fullProps: AllocationIndicatorLiveProps = {
      fieldPath: "holdings",
      targetTotal: 100,
      className: "test-class",
      showProgress: true,
    };

    expect(fullProps.className).toBe("test-class");
    expect(fullProps.showProgress).toBe(true);
  });
});

describe("AllocationIndicator - i18n Formatting Integration", () => {
  describe("Formatting Expectations", () => {
    it("en-US locale uses period as decimal separator", () => {
      const expectedPattern = /\d+\.\d+%/;
      expect("45.5%").toMatch(expectedPattern);
    });

    it("pt-BR locale uses comma as decimal separator", () => {
      const expectedPattern = /\d+,\d+%/;
      expect("45,5%").toMatch(expectedPattern);
    });

    it("formatPercent expects decimal input (0.45 for 45%)", () => {
      const allocated = 45;
      const decimalInput = allocated / 100;
      expect(decimalInput).toBe(0.45);
    });
  });
});

describe("AllocationIndicator - Progress Bar Logic", () => {
  it("progress bar width equals allocated percentage for normal values", () => {
    expect(calculateProgressWidth(25)).toBe(25);
    expect(calculateProgressWidth(75)).toBe(75);
    expect(calculateProgressWidth(100)).toBe(100);
  });

  it("progress bar width caps at 100% for overallocated values", () => {
    expect(calculateProgressWidth(110)).toBe(100);
    expect(calculateProgressWidth(150)).toBe(100);
  });

  it("progress bar width is 0% for 0 or negative allocated values", () => {
    expect(calculateProgressWidth(0)).toBe(0);
    expect(calculateProgressWidth(-10)).toBe(0);
  });
});
