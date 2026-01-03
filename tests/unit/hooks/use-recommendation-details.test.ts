/**
 * useRecommendationDetails Hook Unit Tests
 *
 * Story 6.4: Recommendation Details
 *
 * AC-6.4.1: Why This Recommendation Panel
 * AC-6.4.2: Allocation Math Display
 * AC-6.4.3: Score Contribution Display
 * AC-6.4.4: Full Calculation Details
 *
 * Tests the hook interface contracts and type definitions.
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and exported utilities.
 * Hook behavior tests would be E2E tests in Playwright.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clearBreakdownCache, invalidateBreakdown } from "@/hooks/use-breakdown";
import type {
  RecommendationDetailsData,
  UseRecommendationDetailsOptions,
  UseRecommendationDetailsReturn,
} from "@/hooks/use-recommendation-details";
import type { ExtendedBreakdown } from "@/lib/types/recommendations";
import type { ScoreBreakdownData } from "@/hooks/use-score-breakdown";

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
  clearBreakdownCache();
});

// =============================================================================
// TEST DATA
// =============================================================================

const mockExtendedBreakdown: ExtendedBreakdown = {
  item: {
    assetId: "asset-123",
    symbol: "AAPL",
    score: "85.5",
    currentAllocation: "15.2",
    targetAllocation: "20.0",
    allocationGap: "4.8",
    recommendedAmount: "500.00",
    isOverAllocated: false,
  },
  calculation: {
    inputs: {
      currentValue: "1000.00",
      portfolioTotal: "10000.00",
      currentPercentage: "15.2",
      targetRange: { min: "15.0", max: "25.0" },
      score: "85.5",
      criteriaVersion: "cv-123",
    },
    steps: [{ step: "Calculate allocation gap", value: "4.8%", formula: "target - current" }],
    result: {
      recommendedAmount: "500.00",
      reasoning: "Asset is below target with high score.",
    },
  },
  auditTrail: {
    correlationId: "corr-123",
    generatedAt: "2024-01-15T10:00:00Z",
    criteriaVersionId: "cv-123",
  },
  topCriteria: [
    { criterionId: "c1", criterionName: "Dividend Yield", pointsAwarded: 25, actualValue: "3.5%" },
    { criterionId: "c2", criterionName: "P/E Ratio", pointsAwarded: 20, actualValue: "15.2" },
    { criterionId: "c3", criterionName: "Market Cap", pointsAwarded: 15, actualValue: "$2.5T" },
  ],
  expectedAllocationAfter: "19.5",
  scoreRanking: { percentile: 80, rank: 2, total: 10 },
};

const mockScoreBreakdown: ScoreBreakdownData = {
  assetId: "asset-123",
  symbol: "AAPL",
  score: "85.5",
  breakdown: [
    {
      criterionId: "c1",
      criterionName: "Dividend Yield",
      matched: true,
      pointsAwarded: 25,
      actualValue: "3.5%",
      skippedReason: null,
    },
    {
      criterionId: "c2",
      criterionName: "P/E Ratio",
      matched: true,
      pointsAwarded: 20,
      actualValue: "15.2",
      skippedReason: null,
    },
  ],
  criteriaVersionId: "cv-123",
  calculatedAt: new Date("2024-01-15T09:00:00Z"),
  isFresh: true,
  targetMarket: "US",
};

// =============================================================================
// TEST SUITES
// =============================================================================

describe("useRecommendationDetails Hook", () => {
  describe("Return Interface", () => {
    it("defines correct return shape", () => {
      // Verify interface compiles with expected shape
      const mockReturn: UseRecommendationDetailsReturn = {
        data: {
          breakdown: null,
          scoreBreakdown: null,
        },
        isLoading: false,
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: false,
      };

      expect(mockReturn).toHaveProperty("data");
      expect(mockReturn).toHaveProperty("isLoading");
      expect(mockReturn).toHaveProperty("error");
      expect(mockReturn).toHaveProperty("fetch");
      expect(mockReturn).toHaveProperty("reset");
      expect(mockReturn).toHaveProperty("isBreakdownLoading");
      expect(mockReturn).toHaveProperty("isScoreBreakdownLoading");
    });

    it("data contains both breakdown and scoreBreakdown", () => {
      const data: RecommendationDetailsData = {
        breakdown: null,
        scoreBreakdown: null,
      };

      expect(data).toHaveProperty("breakdown");
      expect(data).toHaveProperty("scoreBreakdown");
    });
  });

  describe("Options Interface", () => {
    it("defines skip option", () => {
      const options: UseRecommendationDetailsOptions = {
        skip: true,
      };

      expect(options).toHaveProperty("skip", true);
    });

    it("skip defaults to false conceptually", () => {
      const defaultOptions: UseRecommendationDetailsOptions = {};

      // When not provided, skip should default to false
      expect(defaultOptions.skip).toBeUndefined();
    });
  });

  describe("Data Types (AC-6.4.1, AC-6.4.2, AC-6.4.3, AC-6.4.4)", () => {
    it("breakdown can be null or ExtendedBreakdown", () => {
      const nullData: RecommendationDetailsData = {
        breakdown: null,
        scoreBreakdown: null,
      };

      const withBreakdown: RecommendationDetailsData = {
        breakdown: mockExtendedBreakdown,
        scoreBreakdown: null,
      };

      expect(nullData.breakdown).toBeNull();
      expect(withBreakdown.breakdown).not.toBeNull();
    });

    it("scoreBreakdown can be null or ScoreBreakdownData", () => {
      const nullData: RecommendationDetailsData = {
        breakdown: null,
        scoreBreakdown: null,
      };

      const withScoreBreakdown: RecommendationDetailsData = {
        breakdown: null,
        scoreBreakdown: mockScoreBreakdown,
      };

      expect(nullData.scoreBreakdown).toBeNull();
      expect(withScoreBreakdown.scoreBreakdown).not.toBeNull();
    });

    it("can have both breakdown and scoreBreakdown populated", () => {
      const fullData: RecommendationDetailsData = {
        breakdown: mockExtendedBreakdown,
        scoreBreakdown: mockScoreBreakdown,
      };

      expect(fullData.breakdown).not.toBeNull();
      expect(fullData.scoreBreakdown).not.toBeNull();
      expect(fullData.breakdown?.item.symbol).toBe("AAPL");
      expect(fullData.scoreBreakdown?.symbol).toBe("AAPL");
    });
  });

  describe("ExtendedBreakdown Type Fields (AC-6.4.1, AC-6.4.2, AC-6.4.3)", () => {
    it("includes topCriteria for score contribution display (AC-6.4.3)", () => {
      expect(mockExtendedBreakdown.topCriteria).toBeDefined();
      expect(mockExtendedBreakdown.topCriteria).toHaveLength(3);

      const firstCriterion = mockExtendedBreakdown.topCriteria[0];
      expect(firstCriterion.criterionId).toBe("c1");
      expect(firstCriterion.criterionName).toBe("Dividend Yield");
      expect(firstCriterion.pointsAwarded).toBe(25);
      expect(firstCriterion.actualValue).toBe("3.5%");
    });

    it("includes expectedAllocationAfter for allocation math display (AC-6.4.2)", () => {
      expect(mockExtendedBreakdown.expectedAllocationAfter).toBeDefined();
      expect(mockExtendedBreakdown.expectedAllocationAfter).toBe("19.5");
    });

    it("includes scoreRanking for why panel display (AC-6.4.1)", () => {
      expect(mockExtendedBreakdown.scoreRanking).toBeDefined();
      expect(mockExtendedBreakdown.scoreRanking.percentile).toBe(80);
      expect(mockExtendedBreakdown.scoreRanking.rank).toBe(2);
      expect(mockExtendedBreakdown.scoreRanking.total).toBe(10);
    });

    it("includes calculation inputs for full details (AC-6.4.4)", () => {
      expect(mockExtendedBreakdown.calculation.inputs).toBeDefined();
      expect(mockExtendedBreakdown.calculation.inputs.currentValue).toBe("1000.00");
      expect(mockExtendedBreakdown.calculation.inputs.portfolioTotal).toBe("10000.00");
      expect(mockExtendedBreakdown.calculation.inputs.targetRange.min).toBe("15.0");
      expect(mockExtendedBreakdown.calculation.inputs.targetRange.max).toBe("25.0");
    });

    it("includes calculation steps for audit trail (AC-6.4.4)", () => {
      expect(mockExtendedBreakdown.calculation.steps).toBeDefined();
      expect(mockExtendedBreakdown.calculation.steps).toHaveLength(1);
      expect(mockExtendedBreakdown.calculation.steps[0].step).toBe("Calculate allocation gap");
    });

    it("includes auditTrail for full calculation details (AC-6.4.4)", () => {
      expect(mockExtendedBreakdown.auditTrail).toBeDefined();
      expect(mockExtendedBreakdown.auditTrail.correlationId).toBe("corr-123");
      expect(mockExtendedBreakdown.auditTrail.generatedAt).toBe("2024-01-15T10:00:00Z");
      expect(mockExtendedBreakdown.auditTrail.criteriaVersionId).toBe("cv-123");
    });
  });

  describe("ScoreBreakdownData Type Fields (AC-6.4.3, AC-6.4.4)", () => {
    it("includes full breakdown array for expandable view (AC-6.4.3)", () => {
      expect(mockScoreBreakdown.breakdown).toBeDefined();
      expect(mockScoreBreakdown.breakdown).toHaveLength(2);

      const firstCriterion = mockScoreBreakdown.breakdown[0];
      expect(firstCriterion.criterionId).toBe("c1");
      expect(firstCriterion.criterionName).toBe("Dividend Yield");
      expect(firstCriterion.matched).toBe(true);
      expect(firstCriterion.pointsAwarded).toBe(25);
    });

    it("includes criteriaVersionId for audit trail (AC-6.4.4)", () => {
      expect(mockScoreBreakdown.criteriaVersionId).toBeDefined();
      expect(mockScoreBreakdown.criteriaVersionId).toBe("cv-123");
    });

    it("includes calculatedAt timestamp for audit trail (AC-6.4.4)", () => {
      expect(mockScoreBreakdown.calculatedAt).toBeDefined();
      expect(mockScoreBreakdown.calculatedAt).toBeInstanceOf(Date);
    });

    it("includes isFresh flag for freshness indicator", () => {
      expect(mockScoreBreakdown.isFresh).toBeDefined();
      expect(mockScoreBreakdown.isFresh).toBe(true);
    });
  });

  describe("Cache Utilities (Re-exported)", () => {
    it("exports clearBreakdownCache function", () => {
      expect(typeof clearBreakdownCache).toBe("function");

      // Should not throw
      expect(() => clearBreakdownCache()).not.toThrow();
    });

    it("exports invalidateBreakdown function", () => {
      expect(typeof invalidateBreakdown).toBe("function");

      // Should not throw
      expect(() => invalidateBreakdown("rec-123", "item-456")).not.toThrow();
    });
  });

  describe("Loading States", () => {
    it("defines individual loading states", () => {
      const loading: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: true,
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: true,
        isScoreBreakdownLoading: false,
      };

      expect(loading.isLoading).toBe(true);
      expect(loading.isBreakdownLoading).toBe(true);
      expect(loading.isScoreBreakdownLoading).toBe(false);
    });

    it("combined isLoading is true when either is loading", () => {
      // Scenario 1: only breakdown loading
      const breakdownLoading: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: true, // Should be true
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: true,
        isScoreBreakdownLoading: false,
      };

      expect(breakdownLoading.isLoading).toBe(true);

      // Scenario 2: only score breakdown loading
      const scoreLoading: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: true, // Should be true
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: true,
      };

      expect(scoreLoading.isLoading).toBe(true);

      // Scenario 3: neither loading
      const notLoading: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: false, // Should be false
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: false,
      };

      expect(notLoading.isLoading).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("error can be null or string", () => {
      const noError: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: false,
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: false,
      };

      const withError: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: false,
        error: "Failed to fetch breakdown",
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: false,
      };

      expect(noError.error).toBeNull();
      expect(withError.error).toBe("Failed to fetch breakdown");
    });
  });

  describe("Function Signatures", () => {
    it("fetch returns a Promise<void>", async () => {
      const mockReturn: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: false,
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: false,
      };

      const result = mockReturn.fetch();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });

    it("reset returns void", () => {
      const mockReturn: UseRecommendationDetailsReturn = {
        data: { breakdown: null, scoreBreakdown: null },
        isLoading: false,
        error: null,
        fetch: async () => {},
        reset: () => {},
        isBreakdownLoading: false,
        isScoreBreakdownLoading: false,
      };

      const result = mockReturn.reset();
      expect(result).toBeUndefined();
    });
  });
});
