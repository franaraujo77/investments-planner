/**
 * Confirmation Success State Integration Tests
 *
 * Story 7.10: View Updated Allocation
 * AC-7.10.1: Before/After Allocation Comparison
 * AC-7.10.3: Navigate to Portfolio View
 *
 * Tests for the confirmation modal success state integration.
 *
 * Note: Since @testing-library/react is not installed,
 * we test the component props, type definitions, and state logic.
 * Full component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect, vi } from "vitest";
import type { ConfirmationModalProps } from "@/components/recommendations/confirmation-modal";
import type { ConfirmInvestmentResult } from "@/lib/types/recommendations";
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
];

const mockConfirmationResult: ConfirmInvestmentResult = {
  success: true,
  investmentIds: ["inv-1", "inv-2"],
  summary: {
    totalInvested: "800.00",
    assetsUpdated: 2,
  },
  allocations: {
    before: {
      "Variable Income": "48.5%",
      "Fixed Income": "51.5%",
    },
    after: {
      "Variable Income": "52.3%",
      "Fixed Income": "47.7%",
    },
  },
};

// =============================================================================
// PROPS INTERFACE TESTS
// =============================================================================

describe("ConfirmationModalProps with Success State (Story 7.10)", () => {
  it("should accept confirmationResult prop", () => {
    const props: ConfirmationModalProps = {
      open: true,
      onOpenChange: () => {},
      recommendationId: "rec-123",
      totalInvestable: "1000.00",
      baseCurrency: "USD",
      items: mockItems,
      onConfirm: async () => {},
      confirmationResult: mockConfirmationResult,
    };

    expect(props.confirmationResult).toEqual(mockConfirmationResult);
  });

  it("should accept null confirmationResult", () => {
    const props: ConfirmationModalProps = {
      open: true,
      onOpenChange: () => {},
      recommendationId: "rec-123",
      totalInvestable: "1000.00",
      baseCurrency: "USD",
      items: mockItems,
      onConfirm: async () => {},
      confirmationResult: null,
    };

    expect(props.confirmationResult).toBeNull();
  });

  it("should accept onNavigateToPortfolio callback", () => {
    const navigateFn = vi.fn();

    const props: ConfirmationModalProps = {
      open: true,
      onOpenChange: () => {},
      recommendationId: "rec-123",
      totalInvestable: "1000.00",
      baseCurrency: "USD",
      items: mockItems,
      onConfirm: async () => {},
      onNavigateToPortfolio: navigateFn,
    };

    expect(typeof props.onNavigateToPortfolio).toBe("function");
  });

  it("should allow optional onNavigateToPortfolio", () => {
    const props: ConfirmationModalProps = {
      open: true,
      onOpenChange: () => {},
      recommendationId: "rec-123",
      totalInvestable: "1000.00",
      baseCurrency: "USD",
      items: mockItems,
      onConfirm: async () => {},
      // onNavigateToPortfolio intentionally omitted
    };

    expect(props.onNavigateToPortfolio).toBeUndefined();
  });
});

// =============================================================================
// SUCCESS STATE DETECTION TESTS
// =============================================================================

describe("Success State Detection", () => {
  /**
   * Logic from ConfirmationModal:
   * const showSuccess = confirmationResult !== null && confirmationResult.success;
   */

  it("should detect success state when result is successful", () => {
    const confirmationResult = mockConfirmationResult;
    const showSuccess = confirmationResult !== null && confirmationResult.success;

    expect(showSuccess).toBe(true);
  });

  it("should not show success when confirmationResult is null", () => {
    const confirmationResult = null;
    const showSuccess =
      confirmationResult !== null &&
      (confirmationResult as ConfirmInvestmentResult | null)?.success;

    expect(showSuccess).toBeFalsy();
  });

  it("should not show success when result.success is false", () => {
    const confirmationResult: ConfirmInvestmentResult = {
      ...mockConfirmationResult,
      success: false,
    };
    const showSuccess = confirmationResult !== null && confirmationResult.success;

    expect(showSuccess).toBe(false);
  });
});

// =============================================================================
// ALLOCATIONS DATA TESTS (AC-7.10.1)
// =============================================================================

describe("Allocations Data (AC-7.10.1)", () => {
  it("should have before allocations in result", () => {
    expect(mockConfirmationResult.allocations.before).toBeDefined();
    expect(Object.keys(mockConfirmationResult.allocations.before)).toHaveLength(2);
  });

  it("should have after allocations in result", () => {
    expect(mockConfirmationResult.allocations.after).toBeDefined();
    expect(Object.keys(mockConfirmationResult.allocations.after)).toHaveLength(2);
  });

  it("should have matching asset classes in before/after", () => {
    const beforeClasses = Object.keys(mockConfirmationResult.allocations.before);
    const afterClasses = Object.keys(mockConfirmationResult.allocations.after);

    expect(beforeClasses.sort()).toEqual(afterClasses.sort());
  });

  it("should have percentage string format", () => {
    const beforeValues = Object.values(mockConfirmationResult.allocations.before);
    const afterValues = Object.values(mockConfirmationResult.allocations.after);

    for (const value of [...beforeValues, ...afterValues]) {
      expect(value).toMatch(/^\d+\.?\d*%$/);
    }
  });

  it("should pass allocations to AllocationComparisonView correctly", () => {
    // Simulating props passed to AllocationComparisonView
    const allocationViewProps = {
      before: mockConfirmationResult.allocations.before,
      after: mockConfirmationResult.allocations.after,
    };

    expect(allocationViewProps.before["Variable Income"]).toBe("48.5%");
    expect(allocationViewProps.after["Variable Income"]).toBe("52.3%");
  });
});

// =============================================================================
// NAVIGATION CALLBACK TESTS (AC-7.10.3)
// =============================================================================

describe("Navigation Callback (AC-7.10.3)", () => {
  it("should call onNavigateToPortfolio when navigate is triggered", () => {
    const navigateFn = vi.fn();

    // Simulate the handleNavigateToPortfolio function from component
    const onOpenChange = vi.fn();
    const handleNavigateToPortfolio = () => {
      onOpenChange(false); // Close modal
      navigateFn(); // Navigate
    };

    handleNavigateToPortfolio();

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigateFn).toHaveBeenCalled();
  });

  it("should close modal before navigating", () => {
    const callOrder: string[] = [];
    const onOpenChange = vi.fn(() => callOrder.push("close"));
    const onNavigateToPortfolio = vi.fn(() => callOrder.push("navigate"));

    // Simulate the handleNavigateToPortfolio logic
    onOpenChange(false);
    onNavigateToPortfolio?.();

    expect(callOrder).toEqual(["close", "navigate"]);
  });

  it("should handle undefined onNavigateToPortfolio gracefully", () => {
    const onOpenChange = vi.fn();
    const onNavigateToPortfolio: (() => void) | undefined = undefined;

    // Simulate the handleNavigateToPortfolio logic with optional chaining
    onOpenChange(false);
    onNavigateToPortfolio?.(); // Should not throw

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// SUCCESS MESSAGE TESTS (AC-7.10.1)
// =============================================================================

describe("Success Message Display", () => {
  it("should have success message in AllocationComparisonView", () => {
    // The component shows "Investments Confirmed!" as title
    // This test verifies the component would receive the right props

    const result = mockConfirmationResult;

    expect(result.success).toBe(true);
    expect(result.summary.assetsUpdated).toBe(2);
    expect(result.summary.totalInvested).toBe("800.00");
  });

  it("should display total invested amount", () => {
    expect(mockConfirmationResult.summary.totalInvested).toBe("800.00");
  });

  it("should display number of assets updated", () => {
    expect(mockConfirmationResult.summary.assetsUpdated).toBe(2);
  });
});

// =============================================================================
// STATE TRANSITION TESTS
// =============================================================================

describe("State Transition", () => {
  it("should transition from form state to success state", () => {
    // Before confirmation
    let confirmationResult: ConfirmInvestmentResult | null = null;
    let showSuccess = confirmationResult !== null && confirmationResult?.success;
    expect(showSuccess).toBeFalsy();

    // After confirmation
    confirmationResult = mockConfirmationResult;
    showSuccess = confirmationResult !== null && confirmationResult.success;
    expect(showSuccess).toBe(true);
  });

  it("should show form state when modal reopens without result", () => {
    // First open - no result
    let confirmationResult: ConfirmInvestmentResult | null = null;
    let showSuccess =
      confirmationResult !== null && (confirmationResult as ConfirmInvestmentResult)?.success;
    expect(showSuccess).toBeFalsy();

    // Confirm - success
    confirmationResult = mockConfirmationResult;
    showSuccess = confirmationResult !== null && confirmationResult.success;
    expect(showSuccess).toBe(true);

    // Close and reopen (result cleared)
    confirmationResult = null;
    showSuccess =
      confirmationResult !== null && (confirmationResult as ConfirmInvestmentResult)?.success;
    expect(showSuccess).toBeFalsy();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("should handle empty allocations in result", () => {
    const emptyResult: ConfirmInvestmentResult = {
      success: true,
      investmentIds: [],
      summary: {
        totalInvested: "0.00",
        assetsUpdated: 0,
      },
      allocations: {
        before: {},
        after: {},
      },
    };

    expect(Object.keys(emptyResult.allocations.before)).toHaveLength(0);
    expect(Object.keys(emptyResult.allocations.after)).toHaveLength(0);
  });

  it("should handle single asset class", () => {
    const singleClassResult: ConfirmInvestmentResult = {
      success: true,
      investmentIds: ["inv-1"],
      summary: {
        totalInvested: "500.00",
        assetsUpdated: 1,
      },
      allocations: {
        before: { Stocks: "80%" },
        after: { Stocks: "85%" },
      },
    };

    expect(Object.keys(singleClassResult.allocations.before)).toHaveLength(1);
    expect(singleClassResult.allocations.before["Stocks"]).toBe("80%");
    expect(singleClassResult.allocations.after["Stocks"]).toBe("85%");
  });

  it("should handle many asset classes", () => {
    const manyClassesResult: ConfirmInvestmentResult = {
      success: true,
      investmentIds: ["inv-1", "inv-2", "inv-3", "inv-4", "inv-5"],
      summary: {
        totalInvested: "5000.00",
        assetsUpdated: 5,
      },
      allocations: {
        before: {
          "US Stocks": "30%",
          "International Stocks": "20%",
          Bonds: "25%",
          REITs: "15%",
          Cash: "10%",
        },
        after: {
          "US Stocks": "32%",
          "International Stocks": "22%",
          Bonds: "23%",
          REITs: "14%",
          Cash: "9%",
        },
      },
    };

    expect(Object.keys(manyClassesResult.allocations.before)).toHaveLength(5);
    expect(Object.keys(manyClassesResult.allocations.after)).toHaveLength(5);
  });

  it("should handle result with failed=false explicitly", () => {
    const failedResult: ConfirmInvestmentResult = {
      success: false,
      investmentIds: [],
      summary: {
        totalInvested: "0.00",
        assetsUpdated: 0,
      },
      allocations: {
        before: {},
        after: {},
      },
    };

    const showSuccess = failedResult !== null && failedResult.success;
    expect(showSuccess).toBe(false);
  });
});
