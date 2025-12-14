/**
 * Recommendation Engine Unit Tests
 *
 * Story 7.4: Generate Investment Recommendations
 *
 * AC-7.4.1: Priority Ranking by Allocation Gap × Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.4: Minimum Allocation Values Enforced
 */

import { describe, it, expect } from "vitest";
import { Decimal } from "@/lib/calculations/decimal-config";
import {
  calculatePriority,
  calculatePriorityFromStrings,
  sortAssetsByPriority,
  distributeCapital,
  generateRecommendationItems,
  validateTotalEquals,
  validateOverAllocatedGetZero,
  verifyDeterminism,
} from "@/lib/calculations/recommendations";
import type { AssetWithContext, AssetWithPriority } from "@/lib/types/recommendations";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createAsset(overrides: Partial<AssetWithContext> = {}): AssetWithContext {
  return {
    id: "asset-1",
    symbol: "AAPL",
    name: "Apple Inc.",
    classId: "class-1",
    className: "Stocks",
    subclassId: "subclass-1",
    subclassName: "US Tech",
    currentAllocation: "20.0000",
    targetAllocation: "25.0000",
    allocationGap: "5.0000",
    score: "85.0000",
    currentValue: "10000.0000",
    minAllocationValue: null,
    isOverAllocated: false,
    ...overrides,
  };
}

// =============================================================================
// PRIORITY CALCULATION TESTS
// =============================================================================

describe("calculatePriority", () => {
  it("should calculate priority as gap × (score / 100)", () => {
    // gap=2%, score=87 -> priority = 2 × 0.87 = 1.74
    const gap = new Decimal("2");
    const score = new Decimal("87");
    const result = calculatePriority(gap, score);
    expect(result.toNumber()).toBeCloseTo(1.74, 4);
  });

  it("should handle gap=5%, score=60 -> priority=3.00", () => {
    const gap = new Decimal("5");
    const score = new Decimal("60");
    const result = calculatePriority(gap, score);
    expect(result.toNumber()).toBeCloseTo(3.0, 4);
  });

  it("should handle negative gaps (over-allocated)", () => {
    // gap=-3%, score=80 -> priority = -3 × 0.80 = -2.40
    const gap = new Decimal("-3");
    const score = new Decimal("80");
    const result = calculatePriority(gap, score);
    expect(result.toNumber()).toBeCloseTo(-2.4, 4);
  });

  it("should handle zero gap", () => {
    const gap = new Decimal("0");
    const score = new Decimal("100");
    const result = calculatePriority(gap, score);
    expect(result.toNumber()).toBe(0);
  });

  it("should handle zero score", () => {
    const gap = new Decimal("10");
    const score = new Decimal("0");
    const result = calculatePriority(gap, score);
    expect(result.toNumber()).toBe(0);
  });
});

describe("calculatePriorityFromStrings", () => {
  it("should work with string inputs", () => {
    const result = calculatePriorityFromStrings("5.0000", "60.0000");
    expect(result).toBe("3.0000");
  });
});

// =============================================================================
// SORTING TESTS
// =============================================================================

describe("sortAssetsByPriority", () => {
  it("should sort assets by priority descending (highest first)", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", symbol: "LOW", allocationGap: "2.0000", score: "50.0000" }), // priority = 1.00
      createAsset({ id: "asset-2", symbol: "HIGH", allocationGap: "5.0000", score: "80.0000" }), // priority = 4.00
      createAsset({ id: "asset-3", symbol: "MED", allocationGap: "3.0000", score: "70.0000" }), // priority = 2.10
    ];

    const sorted = sortAssetsByPriority(assets);

    expect(sorted[0].symbol).toBe("HIGH");
    expect(sorted[1].symbol).toBe("MED");
    expect(sorted[2].symbol).toBe("LOW");
  });

  it("should use symbol as secondary sort for equal priorities (determinism)", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", symbol: "ZZZ", allocationGap: "5.0000", score: "80.0000" }),
      createAsset({ id: "asset-2", symbol: "AAA", allocationGap: "5.0000", score: "80.0000" }),
    ];

    const sorted = sortAssetsByPriority(assets);

    // Same priority, so alphabetical by symbol
    expect(sorted[0].symbol).toBe("AAA");
    expect(sorted[1].symbol).toBe("ZZZ");
  });

  it("should handle negative priorities (over-allocated assets)", () => {
    const assets: AssetWithContext[] = [
      createAsset({
        id: "asset-1",
        symbol: "OVER",
        allocationGap: "-3.0000",
        score: "90.0000",
        isOverAllocated: true,
      }), // priority = -2.70
      createAsset({ id: "asset-2", symbol: "UNDER", allocationGap: "5.0000", score: "80.0000" }), // priority = 4.00
    ];

    const sorted = sortAssetsByPriority(assets);

    expect(sorted[0].symbol).toBe("UNDER");
    expect(sorted[1].symbol).toBe("OVER");
  });
});

// =============================================================================
// CAPITAL DISTRIBUTION TESTS
// =============================================================================

describe("distributeCapital", () => {
  it("should distribute all capital to eligible assets", () => {
    const assets: AssetWithPriority[] = [
      { ...createAsset({ id: "asset-1", symbol: "HIGH" }), priority: "4.0000" },
      { ...createAsset({ id: "asset-2", symbol: "LOW" }), priority: "1.0000" },
    ];
    const totalInvestable = new Decimal("1000");
    const minAllocations = new Map<string, Decimal>();

    const result = distributeCapital(assets, totalInvestable, minAllocations);

    // Total should equal investable
    const totalAllocated = result.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
    expect(totalAllocated.toNumber()).toBeCloseTo(1000, 2);
  });

  it("should give $0 to over-allocated assets (AC-7.4.2)", () => {
    const assets: AssetWithPriority[] = [
      { ...createAsset({ id: "asset-1", isOverAllocated: true }), priority: "-2.0000" },
      { ...createAsset({ id: "asset-2", isOverAllocated: false }), priority: "3.0000" },
    ];
    const totalInvestable = new Decimal("1000");
    const minAllocations = new Map<string, Decimal>();

    const result = distributeCapital(assets, totalInvestable, minAllocations);

    // Over-allocated asset should get $0
    expect(result[0].amount.toNumber()).toBe(0);
    // Under-allocated asset should get all $1000
    expect(result[1].amount.toNumber()).toBeCloseTo(1000, 2);
  });

  it("should handle all assets being over-allocated", () => {
    const assets: AssetWithPriority[] = [
      { ...createAsset({ id: "asset-1", isOverAllocated: true }), priority: "-1.0000" },
      { ...createAsset({ id: "asset-2", isOverAllocated: true }), priority: "-2.0000" },
    ];
    const totalInvestable = new Decimal("1000");
    const minAllocations = new Map<string, Decimal>();

    const result = distributeCapital(assets, totalInvestable, minAllocations);

    // All should get $0
    expect(result[0].amount.toNumber()).toBe(0);
    expect(result[1].amount.toNumber()).toBe(0);
  });

  it("should handle empty asset list", () => {
    const result = distributeCapital([], new Decimal("1000"), new Map());
    expect(result).toHaveLength(0);
  });

  it("should handle zero capital", () => {
    const assets: AssetWithPriority[] = [{ ...createAsset({ id: "asset-1" }), priority: "4.0000" }];
    const result = distributeCapital(assets, new Decimal("0"), new Map());
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// MINIMUM ALLOCATION TESTS (AC-7.4.4)
// =============================================================================

describe("distributeCapital - minimum allocation enforcement", () => {
  it("should redistribute when amount is below minimum", () => {
    const assets: AssetWithPriority[] = [
      { ...createAsset({ id: "asset-1", symbol: "HIGH" }), priority: "4.0000" },
      { ...createAsset({ id: "asset-2", symbol: "LOW" }), priority: "1.0000" },
    ];
    const totalInvestable = new Decimal("500");
    const minAllocations = new Map<string, Decimal>([
      ["asset-2", new Decimal("200")], // LOW asset has $200 minimum
    ]);

    const result = distributeCapital(assets, totalInvestable, minAllocations);

    // LOW asset would get ~$100 but minimum is $200
    // So it should be redistributed to HIGH asset
    const highAsset = result.find((r) => r.assetId === "asset-1");
    const lowAsset = result.find((r) => r.assetId === "asset-2");

    // Total should still equal $500
    const total = result.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
    expect(total.toNumber()).toBeCloseTo(500, 2);

    // LOW should get $0 since its allocation would be below minimum
    expect(lowAsset?.amount.toNumber()).toBe(0);
    // HIGH should get all $500
    expect(highAsset?.amount.toNumber()).toBeCloseTo(500, 2);
  });
});

// =============================================================================
// RECOMMENDATION GENERATION TESTS
// =============================================================================

describe("generateRecommendationItems", () => {
  it("should generate recommendations for all assets", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", symbol: "AAPL" }),
      createAsset({ id: "asset-2", symbol: "GOOGL" }),
    ];

    const result = generateRecommendationItems(assets, "1000.0000");

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBeDefined();
    expect(result[0].recommendedAmount).toBeDefined();
    expect(result[0].sortOrder).toBeDefined();
  });

  it("should maintain sortOrder in priority order", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", symbol: "LOW", allocationGap: "1.0000", score: "50.0000" }),
      createAsset({ id: "asset-2", symbol: "HIGH", allocationGap: "10.0000", score: "90.0000" }),
    ];

    const result = generateRecommendationItems(assets, "1000.0000");

    // HIGH priority should have lower sortOrder (first)
    const highItem = result.find((r) => r.symbol === "HIGH");
    const lowItem = result.find((r) => r.symbol === "LOW");

    expect(highItem?.sortOrder).toBeLessThan(lowItem?.sortOrder ?? 999);
  });

  it("should handle zero capital", () => {
    const assets: AssetWithContext[] = [createAsset()];

    const result = generateRecommendationItems(assets, "0.0000");

    expect(result).toHaveLength(1);
    expect(result[0].recommendedAmount).toBe("0.0000");
  });

  it("should handle single asset", () => {
    const assets: AssetWithContext[] = [createAsset({ id: "asset-1", isOverAllocated: false })];

    const result = generateRecommendationItems(assets, "1000.0000");

    expect(result).toHaveLength(1);
    expect(parseFloat(result[0].recommendedAmount)).toBeCloseTo(1000, 2);
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("validateTotalEquals (AC-7.4.3)", () => {
  it("should return true when sum equals total", () => {
    const items = [
      { ...createRecommendationItem(), recommendedAmount: "600.0000" },
      { ...createRecommendationItem(), recommendedAmount: "400.0000" },
    ];

    expect(validateTotalEquals(items, "1000.0000")).toBe(true);
  });

  it("should return true within precision tolerance", () => {
    const items = [
      { ...createRecommendationItem(), recommendedAmount: "333.3333" },
      { ...createRecommendationItem(), recommendedAmount: "333.3333" },
      { ...createRecommendationItem(), recommendedAmount: "333.3334" },
    ];

    expect(validateTotalEquals(items, "1000.0000")).toBe(true);
  });

  it("should return false when sum differs significantly", () => {
    const items = [{ ...createRecommendationItem(), recommendedAmount: "500.0000" }];

    expect(validateTotalEquals(items, "1000.0000")).toBe(false);
  });
});

describe("validateOverAllocatedGetZero (AC-7.4.2)", () => {
  it("should return true when over-allocated assets have zero", () => {
    const items = [
      { ...createRecommendationItem(), isOverAllocated: true, recommendedAmount: "0.0000" },
      { ...createRecommendationItem(), isOverAllocated: false, recommendedAmount: "1000.0000" },
    ];

    expect(validateOverAllocatedGetZero(items)).toBe(true);
  });

  it("should return false when over-allocated asset has non-zero amount", () => {
    const items = [
      { ...createRecommendationItem(), isOverAllocated: true, recommendedAmount: "100.0000" },
    ];

    expect(validateOverAllocatedGetZero(items)).toBe(false);
  });
});

// =============================================================================
// DETERMINISM TESTS (AC-7.4.1)
// =============================================================================

describe("verifyDeterminism", () => {
  it("should produce identical results for same inputs", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", symbol: "AAPL", allocationGap: "5.0000", score: "80.0000" }),
      createAsset({ id: "asset-2", symbol: "GOOGL", allocationGap: "3.0000", score: "70.0000" }),
      createAsset({ id: "asset-3", symbol: "MSFT", allocationGap: "7.0000", score: "60.0000" }),
    ];

    expect(verifyDeterminism(assets, "10000.0000")).toBe(true);
  });

  it("should be deterministic with equal priorities", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", symbol: "BBB", allocationGap: "5.0000", score: "80.0000" }),
      createAsset({ id: "asset-2", symbol: "AAA", allocationGap: "5.0000", score: "80.0000" }),
    ];

    // Run multiple times to verify consistency
    for (let i = 0; i < 5; i++) {
      expect(verifyDeterminism(assets, "1000.0000")).toBe(true);
    }
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("edge cases", () => {
  it("should handle very small amounts", () => {
    const assets: AssetWithContext[] = [createAsset()];
    const result = generateRecommendationItems(assets, "0.0001");

    expect(result).toHaveLength(1);
  });

  it("should handle very large amounts", () => {
    const assets: AssetWithContext[] = [createAsset()];
    const result = generateRecommendationItems(assets, "999999999999.9999");

    expect(result).toHaveLength(1);
    expect(validateTotalEquals(result, "999999999999.9999")).toBe(true);
  });

  it("should handle negative capital (edge case - should return empty)", () => {
    const assets: AssetWithContext[] = [createAsset()];
    const result = generateRecommendationItems(assets, "-1000.0000");

    // Should either return empty or all zeros
    if (result.length > 0) {
      expect(result.every((r) => r.recommendedAmount === "0.0000")).toBe(true);
    }
  });

  it("should maintain decimal precision", () => {
    const assets: AssetWithContext[] = [
      createAsset({ id: "asset-1", allocationGap: "33.3333", score: "66.6666" }),
    ];

    const result = generateRecommendationItems(assets, "1000.0000");

    // Should have 4 decimal places
    expect(result[0].recommendedAmount).toMatch(/^\d+\.\d{4}$/);
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createRecommendationItem() {
  return {
    assetId: "asset-1",
    symbol: "AAPL",
    score: "85.0000",
    currentAllocation: "20.0000",
    targetAllocation: "25.0000",
    allocationGap: "5.0000",
    recommendedAmount: "0.0000",
    isOverAllocated: false,
    breakdown: {
      classId: "class-1",
      className: "Stocks",
      subclassId: "subclass-1",
      subclassName: "US Tech",
      currentValue: "10000.0000",
      targetMidpoint: "25.0000",
      priority: "4.0000",
      redistributedFrom: null,
    },
    sortOrder: 0,
  };
}
