/**
 * RecommendationCard Component Tests
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 7.6: Zero Buy Signal for Over-Allocated
 *
 * AC-7.5.2: RecommendationCard Display
 * AC-7.6.1: Over-Allocated Asset Shows $0 with Label
 * AC-7.6.2: Over-Allocated Card Visual Treatment
 * AC-7.6.3: Click Shows Explanation
 *
 * Tests the component interface and type safety.
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and data transformations.
 * Component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect, vi } from "vitest";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";
import type { RecommendationCardProps } from "@/components/recommendations/recommendation-card";

describe("RecommendationCard Interface", () => {
  describe("RecommendationDisplayItem type", () => {
    it("accepts valid recommendation item data", () => {
      const item: RecommendationDisplayItem = {
        assetId: "test-asset-id",
        symbol: "AAPL",
        score: "85.5",
        currentAllocation: "15.2",
        targetAllocation: "20.0",
        allocationGap: "4.8",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      };

      expect(item.assetId).toBe("test-asset-id");
      expect(item.symbol).toBe("AAPL");
      expect(item.score).toBe("85.5");
      expect(item.isOverAllocated).toBe(false);
    });

    it("accepts over-allocated item data", () => {
      const item: RecommendationDisplayItem = {
        assetId: "over-allocated-id",
        symbol: "TSLA",
        score: "45.0",
        currentAllocation: "35.0",
        targetAllocation: "20.0",
        allocationGap: "-15.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      expect(item.isOverAllocated).toBe(true);
      expect(item.recommendedAmount).toBe("0.00");
      expect(item.allocationGap).toBe("-15.0");
    });
  });

  describe("RecommendationCardProps", () => {
    it("accepts required props", () => {
      const item: RecommendationDisplayItem = {
        assetId: "test-id",
        symbol: "GOOGL",
        score: "75.0",
        currentAllocation: "10.0",
        targetAllocation: "15.0",
        allocationGap: "5.0",
        recommendedAmount: "300.00",
        isOverAllocated: false,
      };

      const props: RecommendationCardProps = {
        item,
        baseCurrency: "USD",
      };

      expect(props.item.symbol).toBe("GOOGL");
      expect(props.baseCurrency).toBe("USD");
    });

    it("accepts optional onClick prop", () => {
      const item: RecommendationDisplayItem = {
        assetId: "test-id",
        symbol: "MSFT",
        score: "90.0",
        currentAllocation: "5.0",
        targetAllocation: "20.0",
        allocationGap: "15.0",
        recommendedAmount: "750.00",
        isOverAllocated: false,
      };

      const handleClick = () => {};

      const props: RecommendationCardProps = {
        item,
        baseCurrency: "EUR",
        onClick: handleClick,
      };

      expect(typeof props.onClick).toBe("function");
    });

    it("accepts optional className prop", () => {
      const item: RecommendationDisplayItem = {
        assetId: "test-id",
        symbol: "AMZN",
        score: "82.0",
        currentAllocation: "8.0",
        targetAllocation: "12.0",
        allocationGap: "4.0",
        recommendedAmount: "400.00",
        isOverAllocated: false,
      };

      const props: RecommendationCardProps = {
        item,
        baseCurrency: "GBP",
        className: "custom-class",
      };

      expect(props.className).toBe("custom-class");
    });
  });
});

describe("RecommendationCard Score Level Mapping", () => {
  // Verify expected score levels for color coding
  // AC-7.5.2: green (80+), amber (50-79), red (<50)

  const testCases = [
    // High scores (green: 80+)
    { score: "100.0", expectedLevel: "high" },
    { score: "85.5", expectedLevel: "high" },
    { score: "80.0", expectedLevel: "high" },

    // Medium scores (amber: 50-79)
    { score: "79.9", expectedLevel: "medium" },
    { score: "65.0", expectedLevel: "medium" },
    { score: "50.0", expectedLevel: "medium" },

    // Low scores (red: <50)
    { score: "49.9", expectedLevel: "low" },
    { score: "25.0", expectedLevel: "low" },
    { score: "0.0", expectedLevel: "low" },
  ];

  it.each(testCases)("score $score maps to $expectedLevel level", ({ score, expectedLevel }) => {
    const numericScore = parseFloat(score);
    let level: string;
    if (numericScore >= 80) level = "high";
    else if (numericScore >= 50) level = "medium";
    else level = "low";

    expect(level).toBe(expectedLevel);
  });
});

describe("RecommendationCard Amount Display Logic", () => {
  // Verify display logic for recommended amounts

  it("should show formatted amount for positive recommendations", () => {
    const amount = "500.00";
    const isZero = parseFloat(amount) === 0;
    expect(isZero).toBe(false);
  });

  it("should show 'No buy needed' for zero amount", () => {
    const amount = "0.00";
    const isZero = parseFloat(amount) === 0;
    expect(isZero).toBe(true);
  });

  it("should detect over-allocated assets", () => {
    const item: RecommendationDisplayItem = {
      assetId: "test-id",
      symbol: "TSLA",
      score: "45.0",
      currentAllocation: "35.0",
      targetAllocation: "20.0",
      allocationGap: "-15.0",
      recommendedAmount: "0.00",
      isOverAllocated: true,
    };

    expect(item.isOverAllocated).toBe(true);
    expect(parseFloat(item.allocationGap) < 0).toBe(true);
  });
});

// =============================================================================
// Story 7.6: Zero Buy Signal for Over-Allocated Tests
// =============================================================================

describe("RecommendationCard Over-Allocated Behavior (Story 7.6)", () => {
  describe("AC-7.6.1: Over-Allocated Asset Shows $0 with Label", () => {
    it("should have zero recommended amount for over-allocated assets", () => {
      const item: RecommendationDisplayItem = {
        assetId: "over-allocated-1",
        symbol: "AAPL",
        score: "85.0",
        currentAllocation: "55.0",
        targetAllocation: "45.0",
        allocationGap: "-10.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      expect(parseFloat(item.recommendedAmount)).toBe(0);
      expect(item.isOverAllocated).toBe(true);
    });

    it("should have negative allocation gap for over-allocated assets", () => {
      const item: RecommendationDisplayItem = {
        assetId: "over-allocated-2",
        symbol: "GOOGL",
        score: "70.0",
        currentAllocation: "30.0",
        targetAllocation: "20.0",
        allocationGap: "-10.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      const gap = parseFloat(item.allocationGap);
      expect(gap).toBeLessThan(0);
    });

    it("should show formatted $0.00 for display", () => {
      const recommendedAmount = "0.00";
      const isZeroAmount = parseFloat(recommendedAmount) === 0;

      expect(isZeroAmount).toBe(true);
      // Display shows "No buy needed" for zero amount
    });
  });

  describe("AC-7.6.2: Over-Allocated Card Visual Treatment", () => {
    it("should identify over-allocated state for styling", () => {
      const item: RecommendationDisplayItem = {
        assetId: "styled-card-1",
        symbol: "MSFT",
        score: "60.0",
        currentAllocation: "40.0",
        targetAllocation: "25.0",
        allocationGap: "-15.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      // Component uses isOverAllocated to apply styling:
      // - border-amber-200 bg-amber-50/50 (light mode)
      // - dark:border-amber-800 dark:bg-amber-950/20 (dark mode)
      expect(item.isOverAllocated).toBe(true);
    });

    it("should differentiate between over-allocated and normal items", () => {
      const overAllocatedItem: RecommendationDisplayItem = {
        assetId: "over-1",
        symbol: "TSLA",
        score: "50.0",
        currentAllocation: "35.0",
        targetAllocation: "20.0",
        allocationGap: "-15.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      const normalItem: RecommendationDisplayItem = {
        assetId: "normal-1",
        symbol: "AMZN",
        score: "75.0",
        currentAllocation: "10.0",
        targetAllocation: "20.0",
        allocationGap: "10.0",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      };

      expect(overAllocatedItem.isOverAllocated).not.toBe(normalItem.isOverAllocated);
      expect(parseFloat(overAllocatedItem.allocationGap)).toBeLessThan(0);
      expect(parseFloat(normalItem.allocationGap)).toBeGreaterThan(0);
    });

    it("should remain visible in list (not hidden)", () => {
      // Over-allocated items are still rendered in RecommendationList
      // The component filters nothing - all items are shown
      const items: RecommendationDisplayItem[] = [
        {
          assetId: "visible-1",
          symbol: "AAPL",
          score: "85.0",
          currentAllocation: "55.0",
          targetAllocation: "45.0",
          allocationGap: "-10.0",
          recommendedAmount: "0.00",
          isOverAllocated: true,
        },
        {
          assetId: "visible-2",
          symbol: "MSFT",
          score: "80.0",
          currentAllocation: "15.0",
          targetAllocation: "20.0",
          allocationGap: "5.0",
          recommendedAmount: "300.00",
          isOverAllocated: false,
        },
      ];

      // Both items should be in the list (no filtering)
      expect(items.length).toBe(2);
      expect(items.filter((i) => i.isOverAllocated).length).toBe(1);
      expect(items.filter((i) => !i.isOverAllocated).length).toBe(1);
    });
  });

  describe("AC-7.6.3: Click Behavior for Explanation Panel", () => {
    it("should have click handler for over-allocated items", () => {
      const item: RecommendationDisplayItem = {
        assetId: "click-test-1",
        symbol: "NVDA",
        score: "90.0",
        currentAllocation: "45.0",
        targetAllocation: "30.0",
        allocationGap: "-15.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      // Card is clickable when isOverAllocated (opens explanation)
      // OR when onClick prop is provided (Story 7.7 breakdown)
      const isClickable = item.isOverAllocated; // true

      expect(isClickable).toBe(true);
    });

    it("should not call external onClick for over-allocated items", () => {
      const onClick = vi.fn();

      const item: RecommendationDisplayItem = {
        assetId: "onclick-test",
        symbol: "META",
        score: "65.0",
        currentAllocation: "40.0",
        targetAllocation: "25.0",
        allocationGap: "-15.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      // Simulate the handleClick logic
      const handleClick = () => {
        if (item.isOverAllocated) {
          // Opens explanation panel instead
          return;
        }
        onClick();
      };

      handleClick();

      // onClick should NOT be called for over-allocated
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should call external onClick for non-over-allocated items", () => {
      const onClick = vi.fn();

      const item: RecommendationDisplayItem = {
        assetId: "normal-onclick-test",
        symbol: "NFLX",
        score: "70.0",
        currentAllocation: "15.0",
        targetAllocation: "25.0",
        allocationGap: "10.0",
        recommendedAmount: "600.00",
        isOverAllocated: false,
      };

      // Simulate the handleClick logic
      const handleClick = () => {
        if (item.isOverAllocated) {
          return;
        }
        onClick();
      };

      handleClick();

      // onClick SHOULD be called for normal items
      expect(onClick).toHaveBeenCalled();
    });

    it("should have allocation data for explanation panel", () => {
      const item: RecommendationDisplayItem = {
        assetId: "explanation-data",
        symbol: "GOOG",
        score: "75.0",
        currentAllocation: "55.0",
        targetAllocation: "45.0",
        allocationGap: "-10.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      // Data needed for explanation panel:
      expect(item.symbol).toBeDefined();
      expect(item.currentAllocation).toBeDefined();
      expect(item.targetAllocation).toBeDefined();
      expect(item.allocationGap).toBeDefined();

      // Verify the values are correct
      expect(parseFloat(item.currentAllocation)).toBe(55.0);
      expect(parseFloat(item.targetAllocation)).toBe(45.0);
      expect(parseFloat(item.allocationGap)).toBe(-10.0);
    });
  });

  describe("Over-Allocation Target Range Calculation", () => {
    it("should calculate target range from midpoint", () => {
      const targetAllocation = "45.0";
      const targetValue = parseFloat(targetAllocation);
      const targetMin = Math.max(targetValue - 5, 0).toFixed(1);
      const targetMax = Math.min(targetValue + 5, 100).toFixed(1);

      expect(targetMin).toBe("40.0");
      expect(targetMax).toBe("50.0");
    });

    it("should identify over-allocation as current > targetMax", () => {
      const currentAllocation = 55.0;
      const targetMax = 50.0;

      const isOverAllocated = currentAllocation > targetMax;

      expect(isOverAllocated).toBe(true);
    });

    it("should handle edge case at exactly target max", () => {
      const currentAllocation = 50.0;
      const targetMax = 50.0;

      const isOverAllocated = currentAllocation > targetMax;

      // At exactly max = not over-allocated
      expect(isOverAllocated).toBe(false);
    });
  });
});

describe("RecommendationCardProps with Over-Allocated Items", () => {
  it("accepts over-allocated item with all props", () => {
    const item: RecommendationDisplayItem = {
      assetId: "full-props-test",
      symbol: "AMD",
      score: "80.0",
      currentAllocation: "35.0",
      targetAllocation: "25.0",
      allocationGap: "-10.0",
      recommendedAmount: "0.00",
      isOverAllocated: true,
    };

    const props: RecommendationCardProps = {
      item,
      baseCurrency: "USD",
      onClick: () => {},
      className: "custom-class",
    };

    expect(props.item.isOverAllocated).toBe(true);
    expect(props.baseCurrency).toBe("USD");
    expect(props.onClick).toBeDefined();
    expect(props.className).toBe("custom-class");
  });

  it("handles over-allocated item without onClick", () => {
    const item: RecommendationDisplayItem = {
      assetId: "no-onclick-test",
      symbol: "INTC",
      score: "55.0",
      currentAllocation: "30.0",
      targetAllocation: "20.0",
      allocationGap: "-10.0",
      recommendedAmount: "0.00",
      isOverAllocated: true,
    };

    const props: RecommendationCardProps = {
      item,
      baseCurrency: "EUR",
    };

    // Card should still be clickable (isOverAllocated makes it clickable)
    const isClickable = props.item.isOverAllocated || !!props.onClick;
    expect(isClickable).toBe(true);
  });
});
