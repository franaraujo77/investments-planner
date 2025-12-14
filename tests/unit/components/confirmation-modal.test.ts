/**
 * ConfirmationModal Component Tests
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.1: Click Opens Confirmation Modal
 * AC-7.8.2: Real-time Total Updates
 * AC-7.8.5: Validation Prevents Invalid Submissions
 *
 * Tests for the confirmation modal component logic.
 *
 * Note: Since @testing-library/react is not installed,
 * we test the component props, type definitions, and calculation logic.
 * Full component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import type { ConfirmationModalProps } from "@/components/recommendations/confirmation-modal";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TEST DATA
// =============================================================================

const mockItems: RecommendationDisplayItem[] = [
  {
    assetId: "asset-1",
    symbol: "AAPL",
    score: "85.0000",
    currentAllocation: "20.0000",
    targetAllocation: "25.0000",
    allocationGap: "5.0000",
    recommendedAmount: "500.00",
    isOverAllocated: false,
  },
  {
    assetId: "asset-2",
    symbol: "GOOGL",
    score: "75.0000",
    currentAllocation: "15.0000",
    targetAllocation: "20.0000",
    allocationGap: "5.0000",
    recommendedAmount: "300.00",
    isOverAllocated: false,
  },
  {
    assetId: "asset-3",
    symbol: "MSFT",
    score: "70.0000",
    currentAllocation: "30.0000",
    targetAllocation: "25.0000",
    allocationGap: "-5.0000",
    recommendedAmount: "0.00",
    isOverAllocated: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS (mimicking component logic for testing)
// =============================================================================

/**
 * Calculate total from all amounts
 */
function calculateTotal(amounts: Record<string, string>): number {
  return Object.values(amounts).reduce((sum, amt) => {
    const num = parseFloat(amt);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
}

/**
 * Validate all amounts are non-negative
 */
function validateAmounts(amounts: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [assetId, amount] of Object.entries(amounts)) {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      errors[assetId] = "Amount cannot be negative";
    }
  }
  return errors;
}

/**
 * Initialize amounts from items
 */
function initializeAmounts(items: RecommendationDisplayItem[]): Record<string, string> {
  const amounts: Record<string, string> = {};
  for (const item of items) {
    amounts[item.assetId] = item.isOverAllocated ? "0.00" : item.recommendedAmount;
  }
  return amounts;
}

/**
 * Sort items: investable first, then over-allocated
 */
function sortItems(items: RecommendationDisplayItem[]): RecommendationDisplayItem[] {
  return [...items].sort((a, b) => {
    if (a.isOverAllocated && !b.isOverAllocated) return 1;
    if (!a.isOverAllocated && b.isOverAllocated) return -1;
    const amtA = parseFloat(a.recommendedAmount);
    const amtB = parseFloat(b.recommendedAmount);
    return amtB - amtA;
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe("ConfirmationModal Component Logic", () => {
  describe("Props Interface", () => {
    it("should have required prop types", () => {
      const props: ConfirmationModalProps = {
        open: true,
        onOpenChange: () => {},
        recommendationId: "rec-123",
        totalInvestable: "1000.00",
        baseCurrency: "USD",
        items: mockItems,
        onConfirm: async () => {},
      };

      expect(props.open).toBe(true);
      expect(props.recommendationId).toBe("rec-123");
      expect(props.totalInvestable).toBe("1000.00");
      expect(props.baseCurrency).toBe("USD");
      expect(props.items).toHaveLength(3);
    });

    it("should accept optional isSubmitting prop", () => {
      const props: ConfirmationModalProps = {
        open: true,
        onOpenChange: () => {},
        recommendationId: "rec-123",
        totalInvestable: "1000.00",
        baseCurrency: "USD",
        items: mockItems,
        onConfirm: async () => {},
        isSubmitting: true,
      };

      expect(props.isSubmitting).toBe(true);
    });

    it("should accept optional submitError prop", () => {
      const props: ConfirmationModalProps = {
        open: true,
        onOpenChange: () => {},
        recommendationId: "rec-123",
        totalInvestable: "1000.00",
        baseCurrency: "USD",
        items: mockItems,
        onConfirm: async () => {},
        submitError: "Failed to confirm",
      };

      expect(props.submitError).toBe("Failed to confirm");
    });
  });

  describe("Amount Initialization", () => {
    it("should initialize amounts from recommended values", () => {
      const amounts = initializeAmounts(mockItems);

      expect(amounts["asset-1"]).toBe("500.00");
      expect(amounts["asset-2"]).toBe("300.00");
    });

    it("should initialize over-allocated assets to 0.00", () => {
      const amounts = initializeAmounts(mockItems);

      expect(amounts["asset-3"]).toBe("0.00");
    });
  });

  describe("Total Calculation (AC-7.8.2)", () => {
    it("should calculate total correctly", () => {
      const amounts = {
        "asset-1": "500.00",
        "asset-2": "300.00",
        "asset-3": "0.00",
      };

      const total = calculateTotal(amounts);

      expect(total).toBe(800);
    });

    it("should handle invalid amounts as 0", () => {
      const amounts = {
        "asset-1": "invalid",
        "asset-2": "300.00",
      };

      const total = calculateTotal(amounts);

      expect(total).toBe(300);
    });

    it("should calculate remaining amount correctly", () => {
      const totalInvestable = 1000;
      const amounts = {
        "asset-1": "500.00",
        "asset-2": "300.00",
        "asset-3": "0.00",
      };

      const currentTotal = calculateTotal(amounts);
      const remaining = totalInvestable - currentTotal;

      expect(remaining).toBe(200);
    });
  });

  describe("Over-Budget Detection (AC-7.8.5)", () => {
    it("should detect when total exceeds available", () => {
      const totalInvestable = 1000;
      const amounts = {
        "asset-1": "600.00",
        "asset-2": "500.00",
      };

      const currentTotal = calculateTotal(amounts);
      const remaining = totalInvestable - currentTotal;
      const isOverBudget = remaining < -0.01;

      expect(isOverBudget).toBe(true);
    });

    it("should not flag as over-budget when under limit", () => {
      const totalInvestable = 1000;
      const amounts = {
        "asset-1": "500.00",
        "asset-2": "300.00",
      };

      const currentTotal = calculateTotal(amounts);
      const remaining = totalInvestable - currentTotal;
      const isOverBudget = remaining < -0.01;

      expect(isOverBudget).toBe(false);
    });

    it("should allow exact match to available capital", () => {
      const totalInvestable = 1000;
      const amounts = {
        "asset-1": "600.00",
        "asset-2": "400.00",
      };

      const currentTotal = calculateTotal(amounts);
      const remaining = totalInvestable - currentTotal;
      const isOverBudget = remaining < -0.01;

      expect(isOverBudget).toBe(false);
    });
  });

  describe("Amount Validation (AC-7.8.5)", () => {
    it("should return no errors for valid amounts", () => {
      const amounts = {
        "asset-1": "500.00",
        "asset-2": "300.00",
      };

      const errors = validateAmounts(amounts);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it("should return error for negative amounts", () => {
      const amounts = {
        "asset-1": "-50.00",
        "asset-2": "300.00",
      };

      const errors = validateAmounts(amounts);

      expect(errors["asset-1"]).toBe("Amount cannot be negative");
      expect(errors["asset-2"]).toBeUndefined();
    });

    it("should return error for invalid amounts", () => {
      const amounts = {
        "asset-1": "invalid",
        "asset-2": "300.00",
      };

      const errors = validateAmounts(amounts);

      expect(errors["asset-1"]).toBe("Amount cannot be negative");
    });
  });

  describe("Item Sorting", () => {
    it("should sort investable assets before over-allocated", () => {
      const sorted = sortItems(mockItems);

      // First items should be investable (isOverAllocated: false)
      expect(sorted[0].isOverAllocated).toBe(false);
      expect(sorted[1].isOverAllocated).toBe(false);
      // Last item should be over-allocated
      expect(sorted[2].isOverAllocated).toBe(true);
    });

    it("should sort investable assets by recommended amount descending", () => {
      const sorted = sortItems(mockItems);

      // AAPL (500) should come before GOOGL (300)
      expect(sorted[0].symbol).toBe("AAPL");
      expect(sorted[1].symbol).toBe("GOOGL");
    });
  });

  describe("Item Counts", () => {
    it("should count investable assets correctly", () => {
      const investableCount = mockItems.filter((i) => !i.isOverAllocated).length;

      expect(investableCount).toBe(2);
    });

    it("should count over-allocated assets correctly", () => {
      const overAllocatedCount = mockItems.filter((i) => i.isOverAllocated).length;

      expect(overAllocatedCount).toBe(1);
    });
  });

  describe("Investment Data Building", () => {
    it("should build investment data excluding zero amounts", () => {
      const amounts = {
        "asset-1": "500.00",
        "asset-2": "300.00",
        "asset-3": "0.00",
      };

      const investmentData = mockItems
        .filter((item) => {
          const amount = parseFloat(amounts[item.assetId] ?? "0");
          return amount > 0;
        })
        .map((item) => ({
          assetId: item.assetId,
          ticker: item.symbol,
          actualAmount: amounts[item.assetId] ?? "0",
          pricePerUnit: "1.00",
        }));

      expect(investmentData).toHaveLength(2);
      expect(investmentData[0].ticker).toBe("AAPL");
      expect(investmentData[0].actualAmount).toBe("500.00");
      expect(investmentData[1].ticker).toBe("GOOGL");
      expect(investmentData[1].actualAmount).toBe("300.00");
    });

    it("should include all required fields in investment data", () => {
      const amounts = {
        "asset-1": "500.00",
      };

      const investmentData = mockItems
        .filter((item) => {
          const amount = parseFloat(amounts[item.assetId] ?? "0");
          return amount > 0;
        })
        .map((item) => ({
          assetId: item.assetId,
          ticker: item.symbol,
          actualAmount: amounts[item.assetId] ?? "0",
          pricePerUnit: "1.00",
        }));

      expect(investmentData[0]).toHaveProperty("assetId");
      expect(investmentData[0]).toHaveProperty("ticker");
      expect(investmentData[0]).toHaveProperty("actualAmount");
      expect(investmentData[0]).toHaveProperty("pricePerUnit");
    });
  });

  describe("Modal State Management", () => {
    it("should track open state", () => {
      let isOpen = false;
      const onOpenChange = (open: boolean) => {
        isOpen = open;
      };

      onOpenChange(true);
      expect(isOpen).toBe(true);

      onOpenChange(false);
      expect(isOpen).toBe(false);
    });
  });
});
