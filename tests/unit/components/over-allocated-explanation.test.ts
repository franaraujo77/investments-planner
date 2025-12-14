/**
 * OverAllocatedExplanation Component Tests
 *
 * Story 7.6: Zero Buy Signal for Over-Allocated
 * AC-7.6.3: Click Shows Explanation
 *
 * Tests the component interface and utility functions.
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and utility functions.
 * Component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import {
  calculateTargetRange,
  generateGuidanceMessage,
} from "@/components/recommendations/over-allocated-explanation";
import type { OverAllocatedExplanationProps } from "@/components/recommendations/over-allocated-explanation";

describe("OverAllocatedExplanation", () => {
  describe("OverAllocatedExplanationProps Interface", () => {
    it("accepts valid over-allocated item props", () => {
      const props: OverAllocatedExplanationProps = {
        open: true,
        onOpenChange: () => {},
        symbol: "AAPL",
        currentAllocation: "55.0",
        targetAllocation: "45.0",
        allocationGap: "-10.0",
      };

      expect(props.open).toBe(true);
      expect(props.symbol).toBe("AAPL");
      expect(props.currentAllocation).toBe("55.0");
      expect(props.targetAllocation).toBe("45.0");
      expect(props.allocationGap).toBe("-10.0");
    });

    it("accepts onOpenChange callback", () => {
      let isOpen = true;
      const handleOpenChange = (open: boolean) => {
        isOpen = open;
      };

      const props: OverAllocatedExplanationProps = {
        open: isOpen,
        onOpenChange: handleOpenChange,
        symbol: "GOOGL",
        currentAllocation: "30.0",
        targetAllocation: "20.0",
        allocationGap: "-10.0",
      };

      expect(typeof props.onOpenChange).toBe("function");
      props.onOpenChange(false);
      expect(isOpen).toBe(false);
    });

    it("accepts closed state", () => {
      const props: OverAllocatedExplanationProps = {
        open: false,
        onOpenChange: () => {},
        symbol: "MSFT",
        currentAllocation: "25.0",
        targetAllocation: "15.0",
        allocationGap: "-10.0",
      };

      expect(props.open).toBe(false);
    });
  });

  describe("calculateTargetRange", () => {
    it("calculates target range with ±5% from midpoint", () => {
      const result = calculateTargetRange("45.0");
      expect(result.min).toBe("40.0");
      expect(result.max).toBe("50.0");
    });

    it("handles zero midpoint", () => {
      const result = calculateTargetRange("0.0");
      expect(result.min).toBe("0.0");
      expect(result.max).toBe("5.0");
    });

    it("clamps min at 0 for low targets", () => {
      const result = calculateTargetRange("3.0");
      expect(result.min).toBe("0.0");
      expect(result.max).toBe("8.0");
    });

    it("clamps max at 100 for high targets", () => {
      const result = calculateTargetRange("98.0");
      expect(result.min).toBe("93.0");
      expect(result.max).toBe("100.0");
    });

    it("handles string with decimal places", () => {
      const result = calculateTargetRange("25.5");
      expect(result.min).toBe("20.5");
      expect(result.max).toBe("30.5");
    });

    it("handles empty string gracefully", () => {
      const result = calculateTargetRange("");
      expect(result.min).toBe("0.0");
      expect(result.max).toBe("5.0");
    });

    it("handles invalid string gracefully", () => {
      const result = calculateTargetRange("invalid");
      expect(result.min).toBe("0.0");
      expect(result.max).toBe("5.0");
    });

    it("handles 50% midpoint (middle of range)", () => {
      const result = calculateTargetRange("50.0");
      expect(result.min).toBe("45.0");
      expect(result.max).toBe("55.0");
    });

    it("handles 100% target", () => {
      const result = calculateTargetRange("100.0");
      expect(result.min).toBe("95.0");
      expect(result.max).toBe("100.0");
    });
  });

  describe("generateGuidanceMessage", () => {
    it("generates message with correct allocation values", () => {
      const message = generateGuidanceMessage("55.0", "40.0", "50.0");

      expect(message).toContain("55.0%");
      expect(message).toContain("40.0%-50.0%");
    });

    it("includes rebalancing guidance text", () => {
      const message = generateGuidanceMessage("30.0", "15.0", "25.0");

      expect(message).toContain("over-allocated");
      expect(message).toContain("No additional investment is recommended");
      expect(message).toContain("naturally rebalance");
      expect(message).toContain("without needing to sell");
    });

    it("handles integer allocation values", () => {
      const message = generateGuidanceMessage("60", "40", "50");

      expect(message).toContain("60.0%");
      expect(message).toContain("40%-50%");
    });

    it("handles decimal allocation values", () => {
      const message = generateGuidanceMessage("55.5", "40.5", "50.5");

      expect(message).toContain("55.5%");
      expect(message).toContain("40.5%-50.5%");
    });

    it("handles edge case of 0% current allocation", () => {
      const message = generateGuidanceMessage("0", "0", "5");

      expect(message).toContain("0.0%");
    });

    it("formats high allocation percentages correctly", () => {
      const message = generateGuidanceMessage("95.0", "80.0", "90.0");

      expect(message).toContain("95.0%");
      expect(message).toContain("80.0%-90.0%");
    });
  });

  describe("Over-Allocation Detection Logic", () => {
    // Test the logic that determines over-allocation
    // (mirrors what happens in the recommendation engine)

    it("identifies over-allocation when current > target max", () => {
      const currentAllocation = 55.0;
      const targetMax = 50.0;
      const isOverAllocated = currentAllocation > targetMax;

      expect(isOverAllocated).toBe(true);
    });

    it("identifies within-range when current <= target max", () => {
      const currentAllocation = 45.0;
      const targetMax = 50.0;
      const isOverAllocated = currentAllocation > targetMax;

      expect(isOverAllocated).toBe(false);
    });

    it("identifies edge case at exactly target max", () => {
      const currentAllocation = 50.0;
      const targetMax = 50.0;
      const isOverAllocated = currentAllocation > targetMax;

      expect(isOverAllocated).toBe(false);
    });

    it("calculates negative allocation gap for over-allocated", () => {
      const currentAllocation = 55.0;
      const targetMidpoint = 45.0;
      const allocationGap = targetMidpoint - currentAllocation;

      expect(allocationGap).toBe(-10.0);
      expect(allocationGap < 0).toBe(true);
    });
  });

  describe("Rebalancing Philosophy Validation (AC-7.6.3)", () => {
    it("guidance message emphasizes not selling", () => {
      const message = generateGuidanceMessage("60.0", "40.0", "50.0");

      // Message should emphasize NOT needing to sell
      expect(message.toLowerCase()).toContain("without needing to sell");
      // Should not suggest reduction or liquidation
      expect(message.toLowerCase()).not.toContain("reduce");
      expect(message.toLowerCase()).not.toContain("liquidate");
    });

    it("guidance message suggests contribution-based rebalancing", () => {
      const message = generateGuidanceMessage("60.0", "40.0", "50.0");

      expect(message).toContain("contributing to other assets");
      expect(message).toContain("naturally rebalance");
    });

    it("guidance message mentions target allocation", () => {
      const message = generateGuidanceMessage("55.0", "40.0", "50.0");

      expect(message).toContain("target");
      expect(message).toContain("40.0%-50.0%");
    });
  });
});

describe("OverAllocatedExplanation Display Values", () => {
  describe("Allocation Formatting", () => {
    it("should display current allocation as percentage", () => {
      const currentAllocation = "55.0";
      const displayValue = `${parseFloat(currentAllocation).toFixed(1)}%`;

      expect(displayValue).toBe("55.0%");
    });

    it("should display target range correctly", () => {
      const { min, max } = calculateTargetRange("45.0");
      const displayRange = `${min}% - ${max}%`;

      expect(displayRange).toBe("40.0% - 50.0%");
    });

    it("should handle zero decimal allocations", () => {
      const currentAllocation = "50";
      const displayValue = `${parseFloat(currentAllocation).toFixed(1)}%`;

      expect(displayValue).toBe("50.0%");
    });
  });

  describe("Sample Data Scenarios", () => {
    // Test real-world scenarios

    const scenarios = [
      {
        name: "Significantly over-allocated equity",
        currentAllocation: "65.0",
        targetAllocation: "50.0",
        expectedOverBy: "10.0%", // Above max of 55%
      },
      {
        name: "Slightly over-allocated bond",
        currentAllocation: "35.0",
        targetAllocation: "25.0",
        expectedOverBy: "5.0%", // Above max of 30%
      },
      {
        name: "Very over-allocated tech sector",
        currentAllocation: "40.0",
        targetAllocation: "15.0",
        expectedOverBy: "20.0%", // Above max of 20%
      },
    ];

    scenarios.forEach(({ name, currentAllocation, targetAllocation, expectedOverBy }) => {
      it(`${name} - shows correct values`, () => {
        const { max } = calculateTargetRange(targetAllocation);
        const current = parseFloat(currentAllocation);
        const targetMax = parseFloat(max);
        const overBy = (current - targetMax).toFixed(1);

        expect(parseFloat(overBy)).toBeGreaterThan(0);
        expect(`${overBy}%`).toBe(expectedOverBy);
      });
    });
  });
});
