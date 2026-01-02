/**
 * BeforeAfterPreview Component Tests
 *
 * Story 6.3: Recommendation Display
 * AC-6.3.3: Before/Expected After Allocation Preview
 *
 * Tests:
 * - Expected allocation calculation after investment
 * - Allocation change calculation
 * - Edge cases (zero portfolio value, zero investment)
 * - Improvement detection toward target
 */

import { describe, it, expect } from "vitest";
import {
  calculateExpectedAllocation,
  calculateAllocationChanges,
  type AllocationChange,
} from "@/components/recommendations/before-after-preview";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TEST DATA
// =============================================================================

const mockItems: RecommendationDisplayItem[] = [
  {
    assetId: "asset-1",
    symbol: "AAPL",
    score: "85.0",
    currentAllocation: "15.0",
    targetAllocation: "20.0",
    allocationGap: "5.0",
    recommendedAmount: "500.00",
    isOverAllocated: false,
  },
  {
    assetId: "asset-2",
    symbol: "MSFT",
    score: "90.0",
    currentAllocation: "5.0",
    targetAllocation: "15.0",
    allocationGap: "10.0",
    recommendedAmount: "300.00",
    isOverAllocated: false,
  },
];

// =============================================================================
// TESTS: calculateExpectedAllocation
// =============================================================================

describe("calculateExpectedAllocation", () => {
  describe("basic calculation", () => {
    it("calculates expected allocation after investment", () => {
      // Current: 15% of $10,000 = $1,500
      // Investment: $500
      // New portfolio: $10,000 + $1,000 (total investable) = $11,000
      // New asset value: $1,500 + $500 = $2,000
      // Expected: $2,000 / $11,000 = 18.18%
      const result = calculateExpectedAllocation(
        "15.0", // currentAllocation
        "500.00", // recommendedAmount
        "1000.00", // totalInvestable
        "10000.00" // currentPortfolioValue
      );

      expect(result).toBe("18.18");
    });

    it("handles no investment (zero recommended amount)", () => {
      const result = calculateExpectedAllocation(
        "15.0", // currentAllocation
        "0.00", // recommendedAmount
        "1000.00", // totalInvestable
        "10000.00" // currentPortfolioValue
      );

      // Current: 15% of $10,000 = $1,500
      // New portfolio: $11,000
      // New asset value: $1,500 (no investment)
      // Expected: $1,500 / $11,000 = 13.64%
      expect(result).toBe("13.64");
    });

    it("handles increasing allocation", () => {
      // Current: 5% of $10,000 = $500
      // Investment: $800
      // New portfolio: $10,000 + $1,000 = $11,000
      // New asset value: $500 + $800 = $1,300
      // Expected: $1,300 / $11,000 = 11.82%
      const result = calculateExpectedAllocation(
        "5.0", // currentAllocation
        "800.00", // recommendedAmount
        "1000.00", // totalInvestable
        "10000.00" // currentPortfolioValue
      );

      expect(result).toBe("11.82");
    });
  });

  describe("edge cases", () => {
    it("handles zero portfolio value (new portfolio)", () => {
      // No existing portfolio - allocation is just recommended / total
      const result = calculateExpectedAllocation(
        "0.0", // currentAllocation
        "500.00", // recommendedAmount
        "1000.00", // totalInvestable
        "0.00" // currentPortfolioValue
      );

      // Expected: $500 / $1,000 = 50%
      expect(result).toBe("50.00");
    });

    it("handles zero total investable with zero portfolio", () => {
      const result = calculateExpectedAllocation(
        "0.0", // currentAllocation
        "0.00", // recommendedAmount
        "0.00", // totalInvestable
        "0.00" // currentPortfolioValue
      );

      expect(result).toBe("0.00");
    });

    it("handles zero new portfolio value edge case", () => {
      // This is an edge case where total investable is negative (shouldn't happen in practice)
      // But we handle it to avoid division by zero
      const result = calculateExpectedAllocation(
        "15.0", // currentAllocation
        "0.00", // recommendedAmount
        "0.00", // totalInvestable (no new investment)
        "0.00" // currentPortfolioValue (no existing portfolio)
      );

      expect(result).toBe("0.00");
    });

    it("maintains precision with small values", () => {
      const result = calculateExpectedAllocation(
        "1.5", // currentAllocation
        "10.00", // recommendedAmount
        "100.00", // totalInvestable
        "1000.00" // currentPortfolioValue
      );

      // Current: 1.5% of $1,000 = $15
      // New portfolio: $1,100
      // New asset value: $15 + $10 = $25
      // Expected: $25 / $1,100 = 2.27%
      expect(result).toBe("2.27");
    });
  });

  describe("percentage precision", () => {
    it("returns 2 decimal places", () => {
      const result = calculateExpectedAllocation("10.0", "333.33", "1000.00", "10000.00");

      // Should have exactly 2 decimal places
      expect(result).toMatch(/^\d+\.\d{2}$/);
    });

    it("handles negative zero correctly", () => {
      const result = calculateExpectedAllocation("0.0", "0.00", "1000.00", "10000.00");

      expect(result).toBe("0.00");
    });
  });
});

// =============================================================================
// TESTS: calculateAllocationChanges
// =============================================================================

describe("calculateAllocationChanges", () => {
  describe("basic calculation", () => {
    it("calculates allocation changes for all items", () => {
      const result = calculateAllocationChanges(mockItems, "1000.00", "10000.00");

      expect(result).toHaveLength(2);
      expect(result[0]?.assetId).toBe("asset-1");
      expect(result[1]?.assetId).toBe("asset-2");
    });

    it("includes symbol in result", () => {
      const result = calculateAllocationChanges(mockItems, "1000.00", "10000.00");

      expect(result[0]?.symbol).toBe("AAPL");
      expect(result[1]?.symbol).toBe("MSFT");
    });

    it("calculates current percent from item data", () => {
      const result = calculateAllocationChanges(mockItems, "1000.00", "10000.00");

      expect(result[0]?.currentPercent).toBe("15.00");
      expect(result[1]?.currentPercent).toBe("5.00");
    });

    it("calculates change as difference between expected and current", () => {
      const result = calculateAllocationChanges(mockItems, "1000.00", "10000.00");

      // AAPL: 18.18% - 15% = 3.18%
      const aaplChange = parseFloat(result[0]?.change || "0");
      expect(aaplChange).toBeCloseTo(3.18, 1);
    });
  });

  describe("improvement detection", () => {
    it("marks as improving when moving closer to target", () => {
      const result = calculateAllocationChanges(mockItems, "1000.00", "10000.00");

      // AAPL: target is 20%, current is 15%, expected is 18.18% - closer to target
      expect(result[0]?.isImproving).toBe(true);

      // MSFT: target is 15%, current is 5%, expected is higher - closer to target
      expect(result[1]?.isImproving).toBe(true);
    });

    it("marks as not improving when moving away from target", () => {
      // Create item where allocation will move away from target
      const items: RecommendationDisplayItem[] = [
        {
          assetId: "asset-over-target",
          symbol: "NVDA",
          score: "80.0",
          currentAllocation: "18.0", // Already close to target
          targetAllocation: "15.0", // Target is 15%
          allocationGap: "-3.0",
          recommendedAmount: "500.00", // Will push further from target
          isOverAllocated: false,
        },
      ];

      const result = calculateAllocationChanges(items, "1000.00", "10000.00");

      // Expected: ~21% which is further from target of 15%
      expect(result[0]?.isImproving).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty items array", () => {
      const result = calculateAllocationChanges([], "1000.00", "10000.00");

      expect(result).toHaveLength(0);
    });

    it("handles zero change (at target)", () => {
      const items: RecommendationDisplayItem[] = [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "85.0",
          currentAllocation: "20.0",
          targetAllocation: "20.0",
          allocationGap: "0.0",
          recommendedAmount: "0.00",
          isOverAllocated: false,
        },
      ];

      const result = calculateAllocationChanges(items, "1000.00", "10000.00");

      // Expected is ~18.18% (diluted by new investment)
      // Change should be negative (around -1.82)
      expect(parseFloat(result[0]?.change || "0")).toBeLessThan(0);
    });

    it("handles over-allocated items (included but marked)", () => {
      const items: RecommendationDisplayItem[] = [
        {
          assetId: "asset-over",
          symbol: "TSLA",
          score: "45.0",
          currentAllocation: "35.0",
          targetAllocation: "20.0",
          allocationGap: "-15.0",
          recommendedAmount: "0.00",
          isOverAllocated: true,
        },
      ];

      const result = calculateAllocationChanges(items, "1000.00", "10000.00");

      // Over-allocated items are still in the result
      expect(result).toHaveLength(1);
      expect(result[0]?.isImproving).toBe(true); // Moving closer to target due to dilution
    });
  });
});

// =============================================================================
// TESTS: AllocationChange Type
// =============================================================================

describe("AllocationChange type", () => {
  it("has correct shape", () => {
    const change: AllocationChange = {
      assetId: "test-id",
      symbol: "TEST",
      currentPercent: "15.00",
      expectedPercent: "18.18",
      change: "3.18",
      isImproving: true,
    };

    expect(change.assetId).toBe("test-id");
    expect(change.symbol).toBe("TEST");
    expect(change.currentPercent).toBe("15.00");
    expect(change.expectedPercent).toBe("18.18");
    expect(change.change).toBe("3.18");
    expect(change.isImproving).toBe(true);
  });

  it("accepts negative change values", () => {
    const change: AllocationChange = {
      assetId: "test-id",
      symbol: "TEST",
      currentPercent: "20.00",
      expectedPercent: "18.18",
      change: "-1.82",
      isImproving: false,
    };

    expect(parseFloat(change.change)).toBeLessThan(0);
  });
});
