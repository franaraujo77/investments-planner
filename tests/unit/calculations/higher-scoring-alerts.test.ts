/**
 * Higher-Scoring Asset Alert Detection Unit Tests
 *
 * Story 6.2 AC-6.2.3: Higher-Scoring Asset Alert
 * Tests the findHigherScoringAssets function that detects
 * higher-scoring assets outside the portfolio when at capacity.
 */

import { describe, it, expect } from "vitest";
import {
  findHigherScoringAssets,
  hasHigherScoringOpportunities,
  type AssetWithScore,
} from "@/lib/calculations/higher-scoring-alerts";
import type { AssetWithContext } from "@/lib/types/recommendations";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createPortfolioAsset(overrides: Partial<AssetWithContext> = {}): AssetWithContext {
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
    score: "75.0000",
    currentValue: "10000.0000",
    minAllocationValue: null,
    isOverAllocated: false,
    ...overrides,
  };
}

function createAvailableAsset(overrides: Partial<AssetWithScore> = {}): AssetWithScore {
  return {
    id: "avail-1",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    score: "90.0000",
    classId: "class-1",
    className: "Stocks",
    ...overrides,
  };
}

// =============================================================================
// BASIC FUNCTIONALITY TESTS
// =============================================================================

describe("findHigherScoringAssets", () => {
  it("should return empty array when no assets are over-allocated", () => {
    const portfolioAssets: AssetWithContext[] = [createPortfolioAsset({ isOverAllocated: false })];
    const availableAssets: AssetWithScore[] = [createAvailableAsset({ score: "95.0000" })];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(0);
  });

  it("should find higher-scoring assets when class is at capacity", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        id: "asset-1",
        symbol: "AAPL",
        score: "75.0000",
        isOverAllocated: true,
        classId: "class-1",
        className: "Stocks",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        symbol: "NVDA",
        score: "85.0000", // 10 points higher
        classId: "class-1",
        className: "Stocks",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].assetClassId).toBe("class-1");
    expect(alerts[0].assetClassName).toBe("Stocks");
    expect(alerts[0].currentLowestScore).toBe("75.0000");
    expect(alerts[0].currentLowestSymbol).toBe("AAPL");
    expect(alerts[0].higherScoringAssets).toHaveLength(1);
    expect(alerts[0].higherScoringAssets[0].symbol).toBe("NVDA");
    expect(alerts[0].higherScoringAssets[0].score).toBe("85.0000");
    expect(alerts[0].higherScoringAssets[0].scoreDifference).toBe("10.0000");
  });

  it("should not include assets with score difference below threshold", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        score: "75.0000",
        isOverAllocated: true,
        classId: "class-1",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        score: "78.0000", // Only 3 points higher (below default 5pt threshold)
        classId: "class-1",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(0);
  });

  it("should respect custom minimum score difference configuration", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        score: "75.0000",
        isOverAllocated: true,
        classId: "class-1",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        score: "78.0000", // 3 points higher
        classId: "class-1",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets, {
      minScoreDifference: 2, // Lower threshold
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].higherScoringAssets).toHaveLength(1);
  });

  it("should only compare assets in the same class", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        score: "75.0000",
        isOverAllocated: true,
        classId: "class-1",
        className: "Stocks",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        score: "95.0000",
        classId: "class-2", // Different class
        className: "Bonds",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(0);
  });

  it("should exclude assets already in portfolio", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        symbol: "AAPL",
        score: "75.0000",
        isOverAllocated: true,
        classId: "class-1",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        symbol: "AAPL", // Same symbol as portfolio asset
        score: "95.0000",
        classId: "class-1",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(0);
  });

  it("should find lowest-scoring portfolio asset for comparison", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        id: "asset-1",
        symbol: "AAPL",
        score: "85.0000",
        isOverAllocated: true,
        classId: "class-1",
        className: "Stocks",
      }),
      createPortfolioAsset({
        id: "asset-2",
        symbol: "MSFT",
        score: "70.0000", // Lower score - should be used for comparison
        isOverAllocated: true,
        classId: "class-1",
        className: "Stocks",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        symbol: "NVDA",
        score: "80.0000", // 10 points higher than MSFT
        classId: "class-1",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].currentLowestSymbol).toBe("MSFT");
    expect(alerts[0].currentLowestScore).toBe("70.0000");
    expect(alerts[0].higherScoringAssets[0].scoreDifference).toBe("10.0000");
  });

  it("should limit number of higher-scoring assets per class", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        score: "50.0000",
        isOverAllocated: true,
        classId: "class-1",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({ symbol: "A", score: "90.0000", classId: "class-1" }),
      createAvailableAsset({ symbol: "B", score: "85.0000", classId: "class-1" }),
      createAvailableAsset({ symbol: "C", score: "80.0000", classId: "class-1" }),
      createAvailableAsset({ symbol: "D", score: "75.0000", classId: "class-1" }),
      createAvailableAsset({ symbol: "E", score: "70.0000", classId: "class-1" }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets, {
      maxAssetsPerClass: 3,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].higherScoringAssets).toHaveLength(3);
    // Should be sorted by highest score first
    expect(alerts[0].higherScoringAssets[0].symbol).toBe("A");
    expect(alerts[0].higherScoringAssets[1].symbol).toBe("B");
    expect(alerts[0].higherScoringAssets[2].symbol).toBe("C");
  });

  it("should handle multiple asset classes with over-allocation", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        id: "asset-1",
        symbol: "AAPL",
        score: "70.0000",
        isOverAllocated: true,
        classId: "class-1",
        className: "Stocks",
      }),
      createPortfolioAsset({
        id: "asset-2",
        symbol: "BND",
        score: "60.0000",
        isOverAllocated: true,
        classId: "class-2",
        className: "Bonds",
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({
        symbol: "NVDA",
        score: "85.0000",
        classId: "class-1",
        className: "Stocks",
      }),
      createAvailableAsset({
        symbol: "TLT",
        score: "75.0000",
        classId: "class-2",
        className: "Bonds",
      }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(2);
    expect(alerts.find((a) => a.assetClassName === "Stocks")).toBeDefined();
    expect(alerts.find((a) => a.assetClassName === "Bonds")).toBeDefined();
  });

  it("should skip unclassified assets", () => {
    const portfolioAssets: AssetWithContext[] = [
      createPortfolioAsset({
        score: "70.0000",
        isOverAllocated: true,
        classId: null, // Unclassified
        className: null,
      }),
    ];
    const availableAssets: AssetWithScore[] = [
      createAvailableAsset({ score: "95.0000", classId: null }),
    ];

    const alerts = findHigherScoringAssets(portfolioAssets, availableAssets);

    expect(alerts).toHaveLength(0);
  });

  it("should handle empty portfolio assets", () => {
    const alerts = findHigherScoringAssets([], [createAvailableAsset()]);
    expect(alerts).toHaveLength(0);
  });

  it("should handle empty available assets", () => {
    const portfolioAssets: AssetWithContext[] = [createPortfolioAsset({ isOverAllocated: true })];

    const alerts = findHigherScoringAssets(portfolioAssets, []);

    expect(alerts).toHaveLength(0);
  });
});

// =============================================================================
// hasHigherScoringOpportunities TESTS
// =============================================================================

describe("hasHigherScoringOpportunities", () => {
  it("should return true when there are over-allocated assets", () => {
    const portfolioAssets: AssetWithContext[] = [createPortfolioAsset({ isOverAllocated: true })];

    expect(hasHigherScoringOpportunities(portfolioAssets)).toBe(true);
  });

  it("should return false when no assets are over-allocated", () => {
    const portfolioAssets: AssetWithContext[] = [createPortfolioAsset({ isOverAllocated: false })];

    expect(hasHigherScoringOpportunities(portfolioAssets)).toBe(false);
  });

  it("should return false for empty array", () => {
    expect(hasHigherScoringOpportunities([])).toBe(false);
  });
});
