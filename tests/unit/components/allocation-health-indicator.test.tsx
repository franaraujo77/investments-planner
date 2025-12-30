/**
 * Unit tests for AllocationHealthIndicator component
 *
 * Story 3.4: Visual Status Feedback
 * Tests for AC-3.4.1-3.4.3: Range-based health states
 *
 * Tests the exported utility functions for health indicator logic.
 *
 * Note: AllocationHealthIndicator is infrastructure for range-based allocation
 * feedback. It is ready for use but not yet integrated into pages (range-based
 * allocation is a future feature). E2E tests cover field-level styling
 * (AC-3.4.5/3.4.6) on actual pages.
 */

import { describe, it, expect } from "vitest";
import {
  computeHealthIndicatorData,
  type AllocationHealthIndicatorProps,
  type HealthIndicatorData,
} from "@/components/forms/allocation-health-indicator";
import {
  getAllocationHealthState,
  getHealthStateStyles,
} from "@/components/forms/allocation-indicator";

// =============================================================================
// TESTS FOR HEALTH INDICATOR DATA COMPUTATION
// =============================================================================

describe("AllocationHealthIndicator - computeHealthIndicatorData", () => {
  describe("AC-3.4.1: Healthy State (Within Range)", () => {
    it("computes healthy state when current is within range", () => {
      const data = computeHealthIndicatorData(45, 40, 50);

      expect(data.state).toBe("healthy");
      expect(data.styles.textColor).toContain("emerald");
    });

    it("computes healthy state at exact minimum boundary", () => {
      const data = computeHealthIndicatorData(40, 40, 50);

      expect(data.state).toBe("healthy");
    });

    it("computes healthy state at exact maximum boundary", () => {
      const data = computeHealthIndicatorData(50, 40, 50);

      expect(data.state).toBe("healthy");
    });
  });

  describe("AC-3.4.2: Attention State (Within 5%)", () => {
    it("computes attention state when slightly below range", () => {
      const data = computeHealthIndicatorData(37, 40, 50);

      expect(data.state).toBe("attention");
      expect(data.styles.textColor).toContain("amber");
    });

    it("computes attention state when slightly above range", () => {
      const data = computeHealthIndicatorData(53, 40, 50);

      expect(data.state).toBe("attention");
      expect(data.styles.textColor).toContain("amber");
    });

    it("uses custom tolerance when provided", () => {
      // 37% is 3% below 40%, within 3% tolerance
      const data = computeHealthIndicatorData(37, 40, 50, "Stocks", 3);
      expect(data.state).toBe("attention");

      // 36% is 4% below 40%, beyond 3% tolerance
      const data2 = computeHealthIndicatorData(36, 40, 50, "Stocks", 3);
      expect(data2.state).toBe("problem");
    });
  });

  describe("AC-3.4.3: Problem State (Beyond 5%)", () => {
    it("computes problem state when significantly below range", () => {
      const data = computeHealthIndicatorData(30, 40, 50);

      expect(data.state).toBe("problem");
      expect(data.styles.textColor).toContain("red");
    });

    it("computes problem state when significantly above range", () => {
      const data = computeHealthIndicatorData(60, 40, 50);

      expect(data.state).toBe("problem");
      expect(data.styles.textColor).toContain("red");
    });
  });

  describe("Computed Styles", () => {
    it("includes all required style properties", () => {
      const data = computeHealthIndicatorData(45, 40, 50);

      expect(data.styles).toHaveProperty("textColor");
      expect(data.styles).toHaveProperty("bgColor");
      expect(data.styles).toHaveProperty("borderColor");
    });

    it("styles match getHealthStateStyles output", () => {
      const data = computeHealthIndicatorData(45, 40, 50);
      const expectedStyles = getHealthStateStyles("healthy");

      expect(data.styles).toEqual(expectedStyles);
    });
  });

  describe("Label Property", () => {
    it("includes label when provided", () => {
      const data = computeHealthIndicatorData(45, 40, 50, "Stocks");

      expect(data.label).toBe("Stocks");
    });

    it("label is undefined when not provided", () => {
      const data = computeHealthIndicatorData(45, 40, 50);

      expect(data.label).toBeUndefined();
    });
  });
});

describe("AllocationHealthIndicator - Integration with getAllocationHealthState", () => {
  it("uses getAllocationHealthState correctly for state computation", () => {
    // Verify that computeHealthIndicatorData uses the shared function
    const expectedState = getAllocationHealthState(45, 40, 50);
    const data = computeHealthIndicatorData(45, 40, 50);

    expect(data.state).toBe(expectedState);
  });

  it("uses getHealthStateStyles correctly for styling", () => {
    const data = computeHealthIndicatorData(30, 40, 50);
    const expectedStyles = getHealthStateStyles("problem");

    expect(data.styles).toEqual(expectedStyles);
  });
});

describe("AllocationHealthIndicator - Type Definitions", () => {
  describe("AllocationHealthIndicatorProps", () => {
    it("requires current, targetMin, and targetMax props", () => {
      const validProps: AllocationHealthIndicatorProps = {
        current: 45,
        targetMin: 40,
        targetMax: 50,
      };

      expect(validProps.current).toBe(45);
      expect(validProps.targetMin).toBe(40);
      expect(validProps.targetMax).toBe(50);
    });

    it("accepts optional label prop", () => {
      const propsWithLabel: AllocationHealthIndicatorProps = {
        current: 45,
        targetMin: 40,
        targetMax: 50,
        label: "Stocks",
      };

      expect(propsWithLabel.label).toBe("Stocks");
    });

    it("accepts optional tolerance prop", () => {
      const propsWithTolerance: AllocationHealthIndicatorProps = {
        current: 45,
        targetMin: 40,
        targetMax: 50,
        tolerance: 3,
      };

      expect(propsWithTolerance.tolerance).toBe(3);
    });

    it("accepts optional showGuidance prop", () => {
      const propsWithGuidance: AllocationHealthIndicatorProps = {
        current: 45,
        targetMin: 40,
        targetMax: 50,
        showGuidance: true,
      };

      expect(propsWithGuidance.showGuidance).toBe(true);
    });

    it("accepts optional className prop", () => {
      const propsWithClassName: AllocationHealthIndicatorProps = {
        current: 45,
        targetMin: 40,
        targetMax: 50,
        className: "custom-class",
      };

      expect(propsWithClassName.className).toBe("custom-class");
    });
  });

  describe("HealthIndicatorData", () => {
    it("includes all required properties", () => {
      const data: HealthIndicatorData = {
        state: "healthy",
        styles: {
          textColor: "text-emerald-600",
          bgColor: "bg-emerald-100",
          borderColor: "border-emerald-500",
        },
        label: "Stocks",
      };

      expect(data.state).toBe("healthy");
      expect(data.styles).toBeDefined();
      expect(data.label).toBe("Stocks");
    });
  });
});
