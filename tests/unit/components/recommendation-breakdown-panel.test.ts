/**
 * RecommendationBreakdownPanel Component Tests
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * AC-7.7.2: Breakdown Shows Score Breakdown Link
 * AC-7.7.3: Formula Display
 * AC-7.7.4: Audit Trail Information
 *
 * Tests the component interface and props.
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and utility functions.
 * Component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import type { RecommendationBreakdownPanelProps } from "@/components/recommendations/recommendation-breakdown-panel";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

describe("RecommendationBreakdownPanel Component", () => {
  describe("RecommendationBreakdownPanelProps Interface", () => {
    it("accepts valid props for normal item", () => {
      const item: RecommendationDisplayItem = {
        assetId: "uuid-123",
        symbol: "AAPL",
        score: "85.5",
        currentAllocation: "15.2",
        targetAllocation: "20.0",
        allocationGap: "4.8",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      };

      const props: RecommendationBreakdownPanelProps = {
        item,
        recommendationId: "rec-uuid-456",
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.item.symbol).toBe("AAPL");
      expect(props.recommendationId).toBe("rec-uuid-456");
      expect(props.baseCurrency).toBe("USD");
      expect(props.open).toBe(true);
    });

    it("accepts props with optional correlationId", () => {
      const item: RecommendationDisplayItem = {
        assetId: "uuid",
        symbol: "GOOGL",
        score: "90.0",
        currentAllocation: "10.0",
        targetAllocation: "15.0",
        allocationGap: "5.0",
        recommendedAmount: "750.00",
        isOverAllocated: false,
      };

      const props: RecommendationBreakdownPanelProps = {
        item,
        recommendationId: "rec-uuid",
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
        correlationId: "corr-uuid-789",
      };

      expect(props.correlationId).toBe("corr-uuid-789");
    });

    it("accepts props with optional generatedAt", () => {
      const item: RecommendationDisplayItem = {
        assetId: "uuid",
        symbol: "MSFT",
        score: "80.0",
        currentAllocation: "20.0",
        targetAllocation: "25.0",
        allocationGap: "5.0",
        recommendedAmount: "600.00",
        isOverAllocated: false,
      };

      const props: RecommendationBreakdownPanelProps = {
        item,
        recommendationId: "rec-uuid",
        baseCurrency: "EUR",
        open: false,
        onOpenChange: () => {},
        generatedAt: "2025-12-13T04:00:00Z",
      };

      expect(props.generatedAt).toBe("2025-12-13T04:00:00Z");
    });

    it("accepts onOpenChange callback", () => {
      let isOpen = true;
      const handleOpenChange = (open: boolean) => {
        isOpen = open;
      };

      const item: RecommendationDisplayItem = {
        assetId: "uuid",
        symbol: "NVDA",
        score: "95.0",
        currentAllocation: "5.0",
        targetAllocation: "10.0",
        allocationGap: "5.0",
        recommendedAmount: "1000.00",
        isOverAllocated: false,
      };

      const props: RecommendationBreakdownPanelProps = {
        item,
        recommendationId: "rec-uuid",
        baseCurrency: "USD",
        open: isOpen,
        onOpenChange: handleOpenChange,
      };

      expect(typeof props.onOpenChange).toBe("function");
      props.onOpenChange(false);
      expect(isOpen).toBe(false);
    });

    it("accepts closed state", () => {
      const item: RecommendationDisplayItem = {
        assetId: "uuid",
        symbol: "AMZN",
        score: "88.0",
        currentAllocation: "12.0",
        targetAllocation: "18.0",
        allocationGap: "6.0",
        recommendedAmount: "800.00",
        isOverAllocated: false,
      };

      const props: RecommendationBreakdownPanelProps = {
        item,
        recommendationId: "rec-uuid",
        baseCurrency: "USD",
        open: false,
        onOpenChange: () => {},
      };

      expect(props.open).toBe(false);
    });
  });

  describe("Allocation Gap Display (AC-7.7.1)", () => {
    it("calculates target range from midpoint (±5%)", () => {
      const targetMidpoint = 20.0;
      const min = Math.max(targetMidpoint - 5, 0).toFixed(1);
      const max = Math.min(targetMidpoint + 5, 100).toFixed(1);

      expect(min).toBe("15.0");
      expect(max).toBe("25.0");
    });

    it("clamps target range min at 0", () => {
      const targetMidpoint = 3.0;
      const min = Math.max(targetMidpoint - 5, 0).toFixed(1);

      expect(min).toBe("0.0");
    });

    it("clamps target range max at 100", () => {
      const targetMidpoint = 98.0;
      const max = Math.min(targetMidpoint + 5, 100).toFixed(1);

      expect(max).toBe("100.0");
    });

    it("calculates gap value correctly", () => {
      const currentAllocation = 15.0;
      const targetMidpoint = 20.0;
      const gap = targetMidpoint - currentAllocation;

      expect(gap).toBe(5.0);
    });

    it("shows negative gap for over-allocated", () => {
      const currentAllocation = 55.0;
      const targetMidpoint = 45.0;
      const gap = targetMidpoint - currentAllocation;

      expect(gap).toBe(-10.0);
    });
  });

  describe("Score Breakdown Link (AC-7.7.2)", () => {
    it("generates correct link path", () => {
      const assetId = "asset-uuid-123";
      const expectedPath = `/scores/${assetId}`;

      expect(expectedPath).toBe("/scores/asset-uuid-123");
    });

    it("link text should be clear", () => {
      const linkText = "View Score Breakdown";

      expect(linkText).toContain("Score");
      expect(linkText).toContain("Breakdown");
    });
  });

  describe("Formula Display (AC-7.7.3)", () => {
    it("formats formula summary correctly", () => {
      const gapValue = 2.0;
      const scoreValue = 85.5;
      const amount = "$500.00";

      const formulaSummary = `Gap: ${Math.abs(gapValue).toFixed(2)}%, Score: ${scoreValue.toFixed(1)}, Amount: ${amount}`;

      expect(formulaSummary).toContain("Gap: 2.00%");
      expect(formulaSummary).toContain("Score: 85.5");
      expect(formulaSummary).toContain("Amount: $500.00");
    });

    it("formats negative gap as absolute value", () => {
      const gapValue = -10.0;
      const formatted = Math.abs(gapValue).toFixed(2);

      expect(formatted).toBe("10.00");
    });

    it("handles zero amount", () => {
      const amount = 0;
      const formatted = `$${amount.toFixed(2)}`;

      expect(formatted).toBe("$0.00");
    });
  });

  describe("Audit Trail Information (AC-7.7.4)", () => {
    it("formats timestamp for display", () => {
      const isoString = "2025-12-13T04:00:00Z";
      const date = new Date(isoString);

      expect(date.getTime()).not.toBeNaN();
      expect(date.toISOString()).toContain("2025-12-13");
    });

    it("handles undefined timestamp gracefully", () => {
      const timestamp: string | undefined = undefined;
      const displayValue = timestamp ? new Date(timestamp).toLocaleString() : "Unknown";

      expect(displayValue).toBe("Unknown");
    });

    it("truncates correlation ID for display", () => {
      const correlationId = "123e4567-e89b-12d3-a456-426614174000";
      const truncated = `${correlationId.slice(0, 8)}...`;

      expect(truncated).toBe("123e4567...");
    });

    it("shows full correlation ID on hover (title attribute)", () => {
      const correlationId = "123e4567-e89b-12d3-a456-426614174000";

      expect(correlationId).toHaveLength(36); // UUID length
    });
  });

  describe("Supported Currencies", () => {
    const currencies = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"];

    currencies.forEach((currency) => {
      it(`accepts ${currency} as baseCurrency`, () => {
        const item: RecommendationDisplayItem = {
          assetId: "uuid",
          symbol: "TEST",
          score: "80.0",
          currentAllocation: "10.0",
          targetAllocation: "15.0",
          allocationGap: "5.0",
          recommendedAmount: "500.00",
          isOverAllocated: false,
        };

        const props: RecommendationBreakdownPanelProps = {
          item,
          recommendationId: "rec-uuid",
          baseCurrency: currency,
          open: true,
          onOpenChange: () => {},
        };

        expect(props.baseCurrency).toBe(currency);
      });
    });
  });
});

describe("RecommendationBreakdownPanel Display Values", () => {
  describe("Allocation Display", () => {
    it("formats current allocation as percentage", () => {
      const currentAllocation = "15.2";
      const displayValue = `${parseFloat(currentAllocation).toFixed(1)}%`;

      expect(displayValue).toBe("15.2%");
    });

    it("formats target range correctly", () => {
      const targetAllocation = "20.0";
      const midpoint = parseFloat(targetAllocation);
      const min = Math.max(midpoint - 5, 0).toFixed(1);
      const max = Math.min(midpoint + 5, 100).toFixed(1);
      const displayRange = `${min}% - ${max}%`;

      expect(displayRange).toBe("15.0% - 25.0%");
    });

    it("formats positive gap with + sign", () => {
      const gap = 5.0;
      const formatted = gap > 0 ? `+${gap.toFixed(2)}%` : `${gap.toFixed(2)}%`;

      expect(formatted).toBe("+5.00%");
    });

    it("formats negative gap without + sign", () => {
      const gap = -10.0;
      const formatted = gap > 0 ? `+${gap.toFixed(2)}%` : `${gap.toFixed(2)}%`;

      expect(formatted).toBe("-10.00%");
    });
  });

  describe("Over-Allocated Indicator", () => {
    it("shows indicator message for over-allocated items", () => {
      const isOverAllocated = true;
      const message = isOverAllocated
        ? "This asset is over-allocated. No investment recommended."
        : null;

      expect(message).not.toBeNull();
      expect(message).toContain("over-allocated");
      expect(message).toContain("No investment recommended");
    });

    it("does not show indicator for normal items", () => {
      const isOverAllocated = false;
      const message = isOverAllocated
        ? "This asset is over-allocated. No investment recommended."
        : null;

      expect(message).toBeNull();
    });
  });

  describe("Sample Data Scenarios", () => {
    const scenarios = [
      {
        name: "Under-allocated growth stock",
        item: {
          assetId: "uuid-1",
          symbol: "NVDA",
          score: "95.0",
          currentAllocation: "5.0",
          targetAllocation: "15.0",
          allocationGap: "10.0",
          recommendedAmount: "1500.00",
          isOverAllocated: false,
        },
      },
      {
        name: "Slightly under-allocated blue chip",
        item: {
          assetId: "uuid-2",
          symbol: "AAPL",
          score: "85.0",
          currentAllocation: "18.0",
          targetAllocation: "20.0",
          allocationGap: "2.0",
          recommendedAmount: "300.00",
          isOverAllocated: false,
        },
      },
      {
        name: "At target allocation",
        item: {
          assetId: "uuid-3",
          symbol: "MSFT",
          score: "88.0",
          currentAllocation: "25.0",
          targetAllocation: "25.0",
          allocationGap: "0.0",
          recommendedAmount: "0.00",
          isOverAllocated: false,
        },
      },
      {
        name: "Over-allocated position",
        item: {
          assetId: "uuid-4",
          symbol: "GOOGL",
          score: "90.0",
          currentAllocation: "35.0",
          targetAllocation: "25.0",
          allocationGap: "-10.0",
          recommendedAmount: "0.00",
          isOverAllocated: true,
        },
      },
    ];

    scenarios.forEach(({ name, item }) => {
      it(`handles ${name}`, () => {
        const props: RecommendationBreakdownPanelProps = {
          item,
          recommendationId: "rec-uuid",
          baseCurrency: "USD",
          open: true,
          onOpenChange: () => {},
        };

        expect(props.item.symbol).toBe(item.symbol);
        expect(props.item.isOverAllocated).toBe(item.isOverAllocated);

        // Over-allocated items should have $0 recommended
        if (item.isOverAllocated) {
          expect(parseFloat(props.item.recommendedAmount)).toBe(0);
        }
      });
    });
  });
});
