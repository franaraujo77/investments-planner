/**
 * Unit tests for AllocationGuidance component
 *
 * Story 3.4: Visual Status Feedback
 * Tests for AC-3.4.4: Error Messages with Guidance
 *
 * Tests the exported utility functions for guidance message generation.
 *
 * Note: AllocationGuidance and AllocationHealthIndicator are infrastructure
 * components for range-based allocation feedback. They are ready for use but
 * not yet integrated into pages (range-based allocation is a future feature).
 * E2E tests cover field-level styling (AC-3.4.5/3.4.6) on actual pages.
 */

import { describe, it, expect } from "vitest";
import {
  generateGuidanceMessage,
  getGuidanceState,
  type GuidanceState,
  type AllocationGuidanceProps,
} from "@/components/forms/allocation-guidance";

// =============================================================================
// TESTS FOR GUIDANCE MESSAGE GENERATION
// =============================================================================

describe("AllocationGuidance - generateGuidanceMessage", () => {
  // Mock formatPercent function for testing (mimics hook behavior)
  const mockFormatPercent = (value: number): string => {
    return `${Math.abs(value * 100).toFixed(0)}%`;
  };

  describe("AC-3.4.4: Underallocated Message", () => {
    it("generates message to add more allocation when underallocated", () => {
      const message = generateGuidanceMessage(45, 100, mockFormatPercent);
      expect(message).toBe("Add 55% more to reach 100%");
    });

    it("generates correct message for various underallocated values", () => {
      expect(generateGuidanceMessage(75, 100, mockFormatPercent)).toBe(
        "Add 25% more to reach 100%"
      );
      expect(generateGuidanceMessage(0, 100, mockFormatPercent)).toBe(
        "Add 100% more to reach 100%"
      );
      expect(generateGuidanceMessage(99, 100, mockFormatPercent)).toBe("Add 1% more to reach 100%");
    });

    it("handles small decimals correctly", () => {
      const message = generateGuidanceMessage(99.5, 100, mockFormatPercent);
      // 0.5% remaining, rounds to 1%
      expect(message).toBe("Add 1% more to reach 100%");
    });
  });

  describe("AC-3.4.4: Overallocated Message", () => {
    it("generates message to reduce allocation when overallocated", () => {
      const message = generateGuidanceMessage(115, 100, mockFormatPercent);
      expect(message).toBe("Reduce by 15% to reach 100%");
    });

    it("generates correct message for various overallocated values", () => {
      expect(generateGuidanceMessage(125, 100, mockFormatPercent)).toBe(
        "Reduce by 25% to reach 100%"
      );
      expect(generateGuidanceMessage(101, 100, mockFormatPercent)).toBe(
        "Reduce by 1% to reach 100%"
      );
      expect(generateGuidanceMessage(200, 100, mockFormatPercent)).toBe(
        "Reduce by 100% to reach 100%"
      );
    });
  });

  describe("AC-3.4.4: Range-Based Message", () => {
    it("generates message for below minimum range", () => {
      const message = generateGuidanceMessage(35, 100, mockFormatPercent, 40, 50, "Stocks");
      expect(message).toBe("Increase Stocks by 5% to reach minimum");
    });

    it("generates message for above maximum range", () => {
      const message = generateGuidanceMessage(60, 100, mockFormatPercent, 40, 50, "Bonds");
      expect(message).toBe("Reduce Bonds by 10% to reach maximum");
    });

    it("uses generic term when assetClassName not provided", () => {
      const messageBelowMin = generateGuidanceMessage(35, 100, mockFormatPercent, 40, 50);
      expect(messageBelowMin).toBe("Increase allocation by 5% to reach minimum");

      const messageAboveMax = generateGuidanceMessage(60, 100, mockFormatPercent, 40, 50);
      expect(messageAboveMax).toBe("Reduce allocation by 10% to reach maximum");
    });

    it("returns null when within range", () => {
      const message = generateGuidanceMessage(45, 100, mockFormatPercent, 40, 50);
      expect(message).toBeNull();
    });

    it("handles edge cases at range boundaries", () => {
      // At exact minimum - within range
      expect(generateGuidanceMessage(40, 100, mockFormatPercent, 40, 50)).toBeNull();
      // At exact maximum - within range
      expect(generateGuidanceMessage(50, 100, mockFormatPercent, 40, 50)).toBeNull();
      // Just below minimum
      expect(generateGuidanceMessage(39, 100, mockFormatPercent, 40, 50, "Stocks")).toBe(
        "Increase Stocks by 1% to reach minimum"
      );
      // Just above maximum
      expect(generateGuidanceMessage(51, 100, mockFormatPercent, 40, 50, "Stocks")).toBe(
        "Reduce Stocks by 1% to reach maximum"
      );
    });
  });

  describe("Valid Allocation (No Guidance Needed)", () => {
    it("returns null when current equals target", () => {
      const message = generateGuidanceMessage(100, 100, mockFormatPercent);
      expect(message).toBeNull();
    });

    it("handles floating-point tolerance (close to 100%)", () => {
      // Within 0.01 tolerance should be considered valid
      const message = generateGuidanceMessage(99.99, 100, mockFormatPercent);
      expect(message).toBeNull();
    });
  });
});

describe("AllocationGuidance - getGuidanceState", () => {
  describe("State Determination", () => {
    it("returns 'underallocated' when current < target", () => {
      expect(getGuidanceState(45, 100)).toBe("underallocated");
      expect(getGuidanceState(0, 100)).toBe("underallocated");
      expect(getGuidanceState(99, 100)).toBe("underallocated");
    });

    it("returns 'overallocated' when current > target", () => {
      expect(getGuidanceState(115, 100)).toBe("overallocated");
      expect(getGuidanceState(101, 100)).toBe("overallocated");
      expect(getGuidanceState(200, 100)).toBe("overallocated");
    });

    it("returns 'valid' when current equals target", () => {
      expect(getGuidanceState(100, 100)).toBe("valid");
    });

    it("returns 'valid' for floating-point near-equality", () => {
      expect(getGuidanceState(99.99, 100)).toBe("valid");
      expect(getGuidanceState(100.01, 100)).toBe("valid");
    });

    it("returns 'below-range' when current < targetMin", () => {
      expect(getGuidanceState(35, 100, 40, 50)).toBe("below-range");
      expect(getGuidanceState(0, 100, 40, 50)).toBe("below-range");
    });

    it("returns 'above-range' when current > targetMax", () => {
      expect(getGuidanceState(60, 100, 40, 50)).toBe("above-range");
      expect(getGuidanceState(100, 100, 40, 50)).toBe("above-range");
    });

    it("returns 'within-range' when current is within targetMin and targetMax", () => {
      expect(getGuidanceState(45, 100, 40, 50)).toBe("within-range");
      expect(getGuidanceState(40, 100, 40, 50)).toBe("within-range");
      expect(getGuidanceState(50, 100, 40, 50)).toBe("within-range");
    });
  });
});

describe("AllocationGuidance - Type Definitions", () => {
  describe("GuidanceState", () => {
    it("includes all valid guidance states", () => {
      const states: GuidanceState[] = [
        "valid",
        "underallocated",
        "overallocated",
        "within-range",
        "below-range",
        "above-range",
      ];
      expect(states).toHaveLength(6);
    });
  });

  describe("AllocationGuidanceProps", () => {
    it("requires current and target props", () => {
      const validProps: AllocationGuidanceProps = {
        current: 45,
        target: 100,
      };
      expect(validProps.current).toBe(45);
      expect(validProps.target).toBe(100);
    });

    it("accepts optional range-based props", () => {
      const propsWithRange: AllocationGuidanceProps = {
        current: 35,
        target: 100,
        targetMin: 40,
        targetMax: 50,
        assetClassName: "Stocks",
      };
      expect(propsWithRange.targetMin).toBe(40);
      expect(propsWithRange.targetMax).toBe(50);
      expect(propsWithRange.assetClassName).toBe("Stocks");
    });

    it("accepts optional className prop", () => {
      const propsWithClassName: AllocationGuidanceProps = {
        current: 45,
        target: 100,
        className: "custom-class",
      };
      expect(propsWithClassName.className).toBe("custom-class");
    });
  });
});
