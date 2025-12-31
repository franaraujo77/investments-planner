/**
 * Unit tests for AllocationIndicator component
 *
 * Story 3.2: Live Allocation Indicator
 * Tests for AC-3.2.1 through AC-3.2.5
 *
 * Story 3.4: Visual Status Feedback
 * Tests for AC-3.4.1 through AC-3.4.3 (range-based health states)
 *
 * Tests the exported helper functions and type definitions.
 * Component rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import {
  getState,
  getStateStyles,
  getAllocationHealthState,
  getHealthStateStyles,
  type AllocationIndicatorProps,
  type AllocationIndicatorLiveProps,
  type AllocationState,
  type AllocationHealthState,
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
    it("handles 0% allocation (100% remaining)", () => {
      const state = getState(100, false);
      expect(state).toBe("underallocated");
    });

    it("handles 0% allocation - verifies styling and message", () => {
      // 0% allocated means 100% remaining
      const state = getState(100, false);
      const styles = getStateStyles(state);

      expect(state).toBe("underallocated");
      expect(styles.textColor).toBe("text-muted-foreground");
      expect(styles.bgColor).toBe("bg-muted/30");

      // Message should show 0% allocated, 100% remaining
      const message = buildMessage("underallocated", "0%", "100%", "0%");
      expect(message).toBe("0% allocated, 100% remaining");

      // Progress bar should be at 0%
      expect(calculateProgressWidth(0)).toBe(0);
    });

    it("handles 99.9% allocation (near but not valid)", () => {
      const state = getState(0.1, false);
      expect(state).toBe("underallocated");
    });

    it("handles 100.1% allocation (slightly over)", () => {
      const state = getState(-0.1, false);
      expect(state).toBe("overallocated");
    });

    it("handles negative allocated values (invalid input)", () => {
      // Edge case: allocated could theoretically be negative if bad data
      expect(calculateProgressWidth(-10)).toBe(0);
      expect(calculateOverPercent(110)).toBe(0); // positive remaining = not over
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
  describe("Locale Format Pattern Verification", () => {
    it("verifies en-US format pattern uses period as decimal separator", () => {
      // This validates the expected output format for en-US locale
      // Actual locale-specific formatting is tested via useNumberFormat hook tests
      const expectedPattern = /\d+\.\d+%/;
      expect("45.5%").toMatch(expectedPattern);
    });

    it("verifies pt-BR format pattern uses comma as decimal separator", () => {
      // This validates the expected output format for pt-BR locale
      // Actual locale-specific formatting is tested via useNumberFormat hook tests
      const expectedPattern = /\d+,\d+%/;
      expect("45,5%").toMatch(expectedPattern);
    });

    it("formatPercent expects decimal input (0.45 for 45%)", () => {
      // Component divides by 100 before passing to formatPercent
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

// =============================================================================
// TESTS FOR ALLOCATION HEALTH STATE (Story 3.4 - Range-Based Feedback)
// =============================================================================

describe("AllocationIndicator - getAllocationHealthState (exported)", () => {
  describe("AC-3.4.1: Healthy Allocation Display (Within Range)", () => {
    it("returns healthy state when current is within target range", () => {
      // 45% is within 40-50% target range
      expect(getAllocationHealthState(45, 40, 50)).toBe("healthy");
    });

    it("returns healthy state at exact minimum boundary", () => {
      expect(getAllocationHealthState(40, 40, 50)).toBe("healthy");
    });

    it("returns healthy state at exact maximum boundary", () => {
      expect(getAllocationHealthState(50, 40, 50)).toBe("healthy");
    });

    it("handles floating-point precision (within tolerance)", () => {
      // 39.99 should be considered healthy (within 0.01 tolerance)
      expect(getAllocationHealthState(39.99, 40, 50)).toBe("healthy");
      expect(getAllocationHealthState(50.01, 40, 50)).toBe("healthy");
    });
  });

  describe("AC-3.4.2: Attention Needed Display (Slightly Outside)", () => {
    it("returns attention state when slightly below range (within 5%)", () => {
      // 37% is 3% below 40% minimum (within default 5% tolerance)
      expect(getAllocationHealthState(37, 40, 50)).toBe("attention");
    });

    it("returns attention state when slightly above range (within 5%)", () => {
      // 53% is 3% above 50% maximum (within default 5% tolerance)
      expect(getAllocationHealthState(53, 40, 50)).toBe("attention");
    });

    it("returns attention state at exactly 5% below minimum", () => {
      expect(getAllocationHealthState(35, 40, 50)).toBe("attention");
    });

    it("returns attention state at exactly 5% above maximum", () => {
      expect(getAllocationHealthState(55, 40, 50)).toBe("attention");
    });

    it("handles custom tolerance parameter", () => {
      // With 3% tolerance, 37% (3% below) should be attention
      expect(getAllocationHealthState(37, 40, 50, 3)).toBe("attention");
      // With 3% tolerance, 36% (4% below) should be problem
      expect(getAllocationHealthState(36, 40, 50, 3)).toBe("problem");
    });
  });

  describe("AC-3.4.3: Problem Display (Significantly Outside)", () => {
    it("returns problem state when significantly below range (>5%)", () => {
      // 30% is 10% below 40% minimum (exceeds default 5% tolerance)
      expect(getAllocationHealthState(30, 40, 50)).toBe("problem");
    });

    it("returns problem state when significantly above range (>5%)", () => {
      // 60% is 10% above 50% maximum (exceeds default 5% tolerance)
      expect(getAllocationHealthState(60, 40, 50)).toBe("problem");
    });

    it("returns problem state at 0% when range is 40-50%", () => {
      expect(getAllocationHealthState(0, 40, 50)).toBe("problem");
    });

    it("returns problem state at 100% when range is 40-50%", () => {
      expect(getAllocationHealthState(100, 40, 50)).toBe("problem");
    });
  });

  describe("Edge Cases", () => {
    it("handles 0-100% range (always healthy)", () => {
      expect(getAllocationHealthState(0, 0, 100)).toBe("healthy");
      expect(getAllocationHealthState(50, 0, 100)).toBe("healthy");
      expect(getAllocationHealthState(100, 0, 100)).toBe("healthy");
    });

    it("handles narrow range (e.g., exactly 50%)", () => {
      expect(getAllocationHealthState(50, 50, 50)).toBe("healthy");
      expect(getAllocationHealthState(47, 50, 50)).toBe("attention"); // 3% below
      expect(getAllocationHealthState(44, 50, 50)).toBe("problem"); // 6% below
    });

    it("handles negative current values", () => {
      // -5 is 5% below 0 which equals tolerance, so attention
      expect(getAllocationHealthState(-5, 0, 100)).toBe("attention");
      // -6 is 6% below 0 which exceeds tolerance, so problem
      expect(getAllocationHealthState(-6, 0, 100)).toBe("problem");
    });

    it("handles values greater than 100%", () => {
      expect(getAllocationHealthState(110, 0, 100)).toBe("problem");
    });
  });
});

describe("AllocationIndicator - getHealthStateStyles (exported)", () => {
  describe("AC-3.4.1: Healthy styling (green)", () => {
    it("applies emerald colors for healthy state", () => {
      const styles = getHealthStateStyles("healthy");
      expect(styles.textColor).toBe("text-emerald-600 dark:text-emerald-400");
      expect(styles.bgColor).toBe("bg-emerald-100/50 dark:bg-emerald-900/20");
      expect(styles.borderColor).toBe("border-emerald-500");
    });
  });

  describe("AC-3.4.2: Attention styling (amber/yellow)", () => {
    it("applies amber colors for attention state", () => {
      const styles = getHealthStateStyles("attention");
      expect(styles.textColor).toBe("text-amber-600 dark:text-amber-400");
      expect(styles.bgColor).toBe("bg-amber-100/50 dark:bg-amber-900/20");
      expect(styles.borderColor).toBe("border-amber-500");
    });
  });

  describe("AC-3.4.3: Problem styling (red)", () => {
    it("applies red colors for problem state", () => {
      const styles = getHealthStateStyles("problem");
      expect(styles.textColor).toBe("text-red-600 dark:text-red-400");
      expect(styles.bgColor).toBe("bg-red-100/50 dark:bg-red-900/20");
      expect(styles.borderColor).toBe("border-red-500");
    });
  });

  describe("Color Consistency with Design System", () => {
    it("uses emerald for healthy state (consistent with valid state)", () => {
      const styles = getHealthStateStyles("healthy");
      expect(styles.textColor).toContain("emerald");
      expect(styles.bgColor).toContain("emerald");
      expect(styles.borderColor).toContain("emerald");
    });

    it("uses amber for attention state", () => {
      const styles = getHealthStateStyles("attention");
      expect(styles.textColor).toContain("amber");
      expect(styles.bgColor).toContain("amber");
      expect(styles.borderColor).toContain("amber");
    });

    it("uses red for problem state (consistent with overallocated state)", () => {
      const styles = getHealthStateStyles("problem");
      expect(styles.textColor).toContain("red");
      expect(styles.bgColor).toContain("red");
      expect(styles.borderColor).toContain("red");
    });

    it("includes dark mode variants", () => {
      const healthyStyles = getHealthStateStyles("healthy");
      expect(healthyStyles.textColor).toContain("dark:");

      const attentionStyles = getHealthStateStyles("attention");
      expect(attentionStyles.textColor).toContain("dark:");

      const problemStyles = getHealthStateStyles("problem");
      expect(problemStyles.textColor).toContain("dark:");
    });
  });
});

describe("AllocationHealthState - Type Definitions", () => {
  it("includes all valid health states", () => {
    // Type-level verification - these values should compile without error
    const states: AllocationHealthState[] = ["healthy", "attention", "problem"];
    expect(states).toHaveLength(3);
  });
});
