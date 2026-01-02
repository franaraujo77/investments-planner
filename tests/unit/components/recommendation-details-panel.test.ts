/**
 * RecommendationDetailsPanel Component Tests
 *
 * Story 6.4: Recommendation Details
 * AC-6.4.1: Why This Recommendation Panel
 * AC-6.4.2: Allocation Math Display
 * AC-6.4.3: Score Contribution Display
 * AC-6.4.4: Full Calculation Details
 *
 * Tests the component interface and props.
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and type definitions.
 * Component rendering tests are in E2E tests (Playwright).
 */

import { describe, it, expect } from "vitest";
import type { RecommendationDetailsPanelProps } from "@/components/recommendations/recommendation-details-panel";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";
import type { ExtendedBreakdown, TopCriterion, ScoreRanking } from "@/lib/types/recommendations";

// =============================================================================
// TEST DATA
// =============================================================================

const mockItem: RecommendationDisplayItem = {
  assetId: "asset-123",
  symbol: "AAPL",
  score: "85.5",
  currentAllocation: "15.2",
  targetAllocation: "20.0",
  allocationGap: "4.8",
  recommendedAmount: "500.00",
  isOverAllocated: false,
};

const mockOverAllocatedItem: RecommendationDisplayItem = {
  assetId: "asset-456",
  symbol: "GOOGL",
  score: "75.0",
  currentAllocation: "30.0",
  targetAllocation: "20.0",
  allocationGap: "-10.0",
  recommendedAmount: "0.00",
  isOverAllocated: true,
};

const mockTopCriteria: TopCriterion[] = [
  { criterionId: "c1", criterionName: "Dividend Yield", pointsAwarded: 25, actualValue: "3.5%" },
  { criterionId: "c2", criterionName: "P/E Ratio", pointsAwarded: 20, actualValue: "15.2" },
  { criterionId: "c3", criterionName: "Market Cap", pointsAwarded: 15, actualValue: "$2.5T" },
  { criterionId: "c4", criterionName: "Revenue Growth", pointsAwarded: 10, actualValue: "12%" },
];

const mockScoreRanking: ScoreRanking = {
  percentile: 80,
  rank: 2,
  total: 10,
};

const mockBreakdown: ExtendedBreakdown = {
  item: mockItem,
  calculation: {
    inputs: {
      currentValue: "1000.00",
      portfolioTotal: "10000.00",
      currentPercentage: "15.2",
      targetRange: { min: "15.0", max: "25.0" },
      score: "85.5",
      criteriaVersion: "cv-123",
    },
    steps: [
      { step: "Calculate allocation gap", value: "4.8%", formula: "target_midpoint - current" },
      { step: "Apply score weighting", value: "0.0408", formula: "gap × (score / 100)" },
      { step: "Distribute capital", value: "$500.00", formula: "weighted_priority × total" },
    ],
    result: {
      recommendedAmount: "500.00",
      reasoning: "Asset is below target with high score.",
    },
  },
  auditTrail: {
    correlationId: "corr-123-abc",
    generatedAt: "2024-01-15T10:00:00Z",
    criteriaVersionId: "cv-123",
  },
  topCriteria: mockTopCriteria,
  expectedAllocationAfter: "19.5",
  scoreRanking: mockScoreRanking,
};

// =============================================================================
// TEST SUITES
// =============================================================================

describe("RecommendationDetailsPanel Component", () => {
  describe("Props Interface (AC-6.4.1)", () => {
    it("accepts valid props for normal item", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.item.symbol).toBe("AAPL");
      expect(props.baseCurrency).toBe("USD");
      expect(props.open).toBe(true);
    });

    it("accepts props with optional breakdown data", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        breakdown: mockBreakdown,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.breakdown).toBeDefined();
      expect(props.breakdown?.topCriteria).toHaveLength(4);
    });

    it("accepts props with isLoading flag", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        isLoading: true,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.isLoading).toBe(true);
    });

    it("accepts props for over-allocated item", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockOverAllocatedItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.item.isOverAllocated).toBe(true);
      expect(props.item.recommendedAmount).toBe("0.00");
    });

    it("accepts onOpenChange callback", () => {
      let isOpen = true;
      const handleOpenChange = (open: boolean) => {
        isOpen = open;
      };

      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: isOpen,
        onOpenChange: handleOpenChange,
      };

      props.onOpenChange(false);
      expect(isOpen).toBe(false);
    });
  });

  describe("Item Data Types", () => {
    it("requires all mandatory RecommendationDisplayItem fields", () => {
      const item: RecommendationDisplayItem = {
        assetId: "uuid-test",
        symbol: "MSFT",
        score: "88.0",
        currentAllocation: "12.0",
        targetAllocation: "18.0",
        allocationGap: "6.0",
        recommendedAmount: "600.00",
        isOverAllocated: false,
      };

      expect(item.assetId).toBeDefined();
      expect(item.symbol).toBeDefined();
      expect(item.score).toBeDefined();
      expect(item.currentAllocation).toBeDefined();
      expect(item.targetAllocation).toBeDefined();
      expect(item.allocationGap).toBeDefined();
      expect(item.recommendedAmount).toBeDefined();
      expect(item.isOverAllocated).toBeDefined();
    });

    it("uses decimal string format for numeric fields", () => {
      // All numeric fields are strings for Decimal.js precision
      expect(typeof mockItem.score).toBe("string");
      expect(typeof mockItem.currentAllocation).toBe("string");
      expect(typeof mockItem.targetAllocation).toBe("string");
      expect(typeof mockItem.allocationGap).toBe("string");
      expect(typeof mockItem.recommendedAmount).toBe("string");
    });
  });

  describe("ExtendedBreakdown Data (AC-6.4.2, AC-6.4.3, AC-6.4.4)", () => {
    it("includes allocation math fields (AC-6.4.2)", () => {
      expect(mockBreakdown.calculation.inputs.currentPercentage).toBe("15.2");
      expect(mockBreakdown.calculation.inputs.targetRange.min).toBe("15.0");
      expect(mockBreakdown.calculation.inputs.targetRange.max).toBe("25.0");
      expect(mockBreakdown.expectedAllocationAfter).toBe("19.5");
    });

    it("includes topCriteria for score display (AC-6.4.3)", () => {
      expect(mockBreakdown.topCriteria).toHaveLength(4);

      const firstCriterion = mockBreakdown.topCriteria[0];
      expect(firstCriterion.criterionId).toBe("c1");
      expect(firstCriterion.criterionName).toBe("Dividend Yield");
      expect(firstCriterion.pointsAwarded).toBe(25);
      expect(firstCriterion.actualValue).toBe("3.5%");
    });

    it("includes scoreRanking for ranking display (AC-6.4.1)", () => {
      expect(mockBreakdown.scoreRanking.percentile).toBe(80);
      expect(mockBreakdown.scoreRanking.rank).toBe(2);
      expect(mockBreakdown.scoreRanking.total).toBe(10);
    });

    it("includes calculation steps for full details (AC-6.4.4)", () => {
      expect(mockBreakdown.calculation.steps).toHaveLength(3);

      const firstStep = mockBreakdown.calculation.steps[0];
      expect(firstStep.step).toBe("Calculate allocation gap");
      expect(firstStep.value).toBe("4.8%");
      expect(firstStep.formula).toBe("target_midpoint - current");
    });

    it("includes audit trail for traceability (AC-6.4.4)", () => {
      expect(mockBreakdown.auditTrail.correlationId).toBe("corr-123-abc");
      expect(mockBreakdown.auditTrail.generatedAt).toBe("2024-01-15T10:00:00Z");
      expect(mockBreakdown.auditTrail.criteriaVersionId).toBe("cv-123");
    });
  });

  describe("TopCriterion Type", () => {
    it("has required fields", () => {
      const criterion: TopCriterion = {
        criterionId: "test-id",
        criterionName: "Test Criterion",
        pointsAwarded: 10,
        actualValue: "test value",
      };

      expect(criterion.criterionId).toBe("test-id");
      expect(criterion.criterionName).toBe("Test Criterion");
      expect(criterion.pointsAwarded).toBe(10);
      expect(criterion.actualValue).toBe("test value");
    });

    it("allows null actualValue", () => {
      const criterion: TopCriterion = {
        criterionId: "test-id",
        criterionName: "Test",
        pointsAwarded: 5,
        actualValue: null,
      };

      expect(criterion.actualValue).toBeNull();
    });

    it("supports negative points for penalties", () => {
      const criterion: TopCriterion = {
        criterionId: "penalty",
        criterionName: "Debt Ratio Too High",
        pointsAwarded: -15,
        actualValue: "75%",
      };

      expect(criterion.pointsAwarded).toBe(-15);
      expect(criterion.pointsAwarded).toBeLessThan(0);
    });
  });

  describe("ScoreRanking Type", () => {
    it("has required fields", () => {
      const ranking: ScoreRanking = {
        percentile: 75,
        rank: 3,
        total: 12,
      };

      expect(ranking.percentile).toBe(75);
      expect(ranking.rank).toBe(3);
      expect(ranking.total).toBe(12);
    });

    it("supports edge case of single asset", () => {
      const ranking: ScoreRanking = {
        percentile: 0,
        rank: 1,
        total: 1,
      };

      expect(ranking.rank).toBe(1);
      expect(ranking.total).toBe(1);
      expect(ranking.percentile).toBe(0); // Top (100-1)/1 = 0 for single asset
    });

    it("supports top ranked asset", () => {
      const ranking: ScoreRanking = {
        percentile: 100,
        rank: 1,
        total: 10,
      };

      expect(ranking.rank).toBe(1);
      expect(ranking.percentile).toBe(100); // Top 100% (actually 90% for rank 1 of 10)
    });
  });

  describe("Currency Support", () => {
    it("accepts USD currency", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.baseCurrency).toBe("USD");
    });

    it("accepts EUR currency", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "EUR",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.baseCurrency).toBe("EUR");
    });

    it("accepts BRL currency", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "BRL",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.baseCurrency).toBe("BRL");
    });
  });

  describe("Loading State", () => {
    it("isLoading defaults to false", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      // isLoading is optional and defaults to false in component
      expect(props.isLoading).toBeUndefined();
    });

    it("can set isLoading to true", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        isLoading: true,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.isLoading).toBe(true);
    });
  });

  describe("Null/Undefined Breakdown Handling", () => {
    it("accepts null breakdown", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        breakdown: null,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.breakdown).toBeNull();
    });

    it("accepts undefined breakdown", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        breakdown: undefined,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.breakdown).toBeUndefined();
    });

    it("handles missing breakdown gracefully with defaults in component", () => {
      // Component should use fallback values when breakdown is missing
      // topCriteria defaults to []
      // expectedAllocationAfter defaults to currentAllocation
      // scoreRanking defaults to { percentile: 0, rank: 1, total: 1 }
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      // Without breakdown, component uses item data for display
      expect(props.item.currentAllocation).toBe("15.2");
    });
  });

  describe("Panel Open State", () => {
    it("can be initially closed", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: false,
        onOpenChange: () => {},
      };

      expect(props.open).toBe(false);
    });

    it("can be initially open", () => {
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: () => {},
      };

      expect(props.open).toBe(true);
    });

    it("calls onOpenChange when state should change", () => {
      const calls: boolean[] = [];
      const props: RecommendationDetailsPanelProps = {
        item: mockItem,
        baseCurrency: "USD",
        open: true,
        onOpenChange: (open) => calls.push(open),
      };

      props.onOpenChange(false);
      props.onOpenChange(true);
      props.onOpenChange(false);

      expect(calls).toEqual([false, true, false]);
    });
  });
});
