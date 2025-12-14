/**
 * Recommendation Breakdown Types Tests
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.1, AC-7.7.3, AC-7.7.4: Type definitions for breakdown display
 *
 * Tests the TypeScript interfaces for:
 * - DetailedBreakdown
 * - CalculationStep
 * - AuditTrailInfo
 * - CalculationInputs
 * - BreakdownResponse
 */

import { describe, it, expect } from "vitest";
import type {
  DetailedBreakdown,
  CalculationStep,
  AuditTrailInfo,
  CalculationInputs,
  CalculationResult,
  BreakdownResponse,
  BreakdownDisplayItem,
} from "@/lib/types/recommendations";

describe("Recommendation Breakdown Types", () => {
  describe("CalculationStep Interface", () => {
    it("accepts valid calculation step", () => {
      const step: CalculationStep = {
        step: "Calculate allocation gap",
        value: "2.0%",
        formula: "target_midpoint - current_allocation",
      };

      expect(step.step).toBe("Calculate allocation gap");
      expect(step.value).toBe("2.0%");
      expect(step.formula).toBe("target_midpoint - current_allocation");
    });

    it("accepts step with numeric value", () => {
      const step: CalculationStep = {
        step: "Apply score weighting",
        value: "1.75",
        formula: "gap × (score / 100)",
      };

      expect(step.value).toBe("1.75");
    });

    it("accepts step with currency value", () => {
      const step: CalculationStep = {
        step: "Distribute capital",
        value: "$800.00",
        formula: "weighted_priority ÷ total_priority × total_investable",
      };

      expect(step.value).toBe("$800.00");
    });
  });

  describe("AuditTrailInfo Interface", () => {
    it("accepts valid audit trail info", () => {
      const auditTrail: AuditTrailInfo = {
        correlationId: "123e4567-e89b-12d3-a456-426614174000",
        generatedAt: "2025-12-13T04:00:00Z",
        criteriaVersionId: "456e7890-e89b-12d3-a456-426614174001",
      };

      expect(auditTrail.correlationId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(auditTrail.generatedAt).toBe("2025-12-13T04:00:00Z");
      expect(auditTrail.criteriaVersionId).toBe("456e7890-e89b-12d3-a456-426614174001");
    });

    it("validates ISO 8601 date format", () => {
      const auditTrail: AuditTrailInfo = {
        correlationId: "uuid",
        generatedAt: "2025-12-13T04:00:00.000Z",
        criteriaVersionId: "uuid",
      };

      // Should be a valid date string
      const date = new Date(auditTrail.generatedAt);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe("CalculationInputs Interface", () => {
    it("accepts valid calculation inputs", () => {
      const inputs: CalculationInputs = {
        currentValue: "5000.00",
        portfolioTotal: "27777.77",
        currentPercentage: "18.0",
        targetRange: { min: "18.0", max: "22.0" },
        score: "87.5",
        criteriaVersion: "uuid",
      };

      expect(inputs.currentValue).toBe("5000.00");
      expect(inputs.portfolioTotal).toBe("27777.77");
      expect(inputs.currentPercentage).toBe("18.0");
      expect(inputs.targetRange.min).toBe("18.0");
      expect(inputs.targetRange.max).toBe("22.0");
      expect(inputs.score).toBe("87.5");
    });

    it("accepts target range with different values", () => {
      const inputs: CalculationInputs = {
        currentValue: "1000.00",
        portfolioTotal: "10000.00",
        currentPercentage: "10.0",
        targetRange: { min: "15.0", max: "25.0" },
        score: "75.0",
        criteriaVersion: "version-id",
      };

      expect(inputs.targetRange.min).toBe("15.0");
      expect(inputs.targetRange.max).toBe("25.0");
      expect(parseFloat(inputs.targetRange.max) - parseFloat(inputs.targetRange.min)).toBe(10);
    });
  });

  describe("CalculationResult Interface", () => {
    it("accepts valid calculation result", () => {
      const result: CalculationResult = {
        recommendedAmount: "800.00",
        reasoning: "Asset is 2% below target allocation with high score (87.5)",
      };

      expect(result.recommendedAmount).toBe("800.00");
      expect(result.reasoning).toContain("below target allocation");
    });

    it("accepts zero amount result", () => {
      const result: CalculationResult = {
        recommendedAmount: "0.00",
        reasoning: "Asset is at or above target allocation",
      };

      expect(result.recommendedAmount).toBe("0.00");
    });
  });

  describe("BreakdownDisplayItem Interface", () => {
    it("accepts valid display item", () => {
      const item: BreakdownDisplayItem = {
        assetId: "uuid",
        symbol: "AAPL",
        score: "85.5",
        currentAllocation: "15.2",
        targetAllocation: "20.0",
        allocationGap: "4.8",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      };

      expect(item.symbol).toBe("AAPL");
      expect(item.isOverAllocated).toBe(false);
    });

    it("accepts over-allocated item", () => {
      const item: BreakdownDisplayItem = {
        assetId: "uuid",
        symbol: "GOOGL",
        score: "90.0",
        currentAllocation: "55.0",
        targetAllocation: "45.0",
        allocationGap: "-10.0",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      };

      expect(item.isOverAllocated).toBe(true);
      expect(item.recommendedAmount).toBe("0.00");
      expect(parseFloat(item.allocationGap)).toBeLessThan(0);
    });

    it("accepts at-target item", () => {
      const item: BreakdownDisplayItem = {
        assetId: "uuid",
        symbol: "MSFT",
        score: "80.0",
        currentAllocation: "15.0",
        targetAllocation: "15.0",
        allocationGap: "0.0",
        recommendedAmount: "0.00",
        isOverAllocated: false,
      };

      expect(parseFloat(item.allocationGap)).toBe(0);
      expect(parseFloat(item.recommendedAmount)).toBe(0);
    });
  });

  describe("DetailedBreakdown Interface", () => {
    it("accepts valid detailed breakdown", () => {
      const breakdown: DetailedBreakdown = {
        item: {
          assetId: "uuid",
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
            currentValue: "5000.00",
            portfolioTotal: "27777.77",
            currentPercentage: "18.0",
            targetRange: { min: "18.0", max: "22.0" },
            score: "87.5",
            criteriaVersion: "uuid",
          },
          steps: [
            { step: "Calculate allocation gap", value: "2.0%", formula: "target - current" },
            { step: "Apply score weighting", value: "1.75", formula: "gap × (score/100)" },
            { step: "Distribute capital", value: "$800.00", formula: "weighted × total" },
          ],
          result: {
            recommendedAmount: "800.00",
            reasoning: "Asset is 2% below target with high score",
          },
        },
        auditTrail: {
          correlationId: "uuid",
          generatedAt: "2025-12-13T04:00:00Z",
          criteriaVersionId: "uuid",
        },
      };

      expect(breakdown.item.symbol).toBe("AAPL");
      expect(breakdown.calculation.steps).toHaveLength(3);
      expect(breakdown.auditTrail.correlationId).toBe("uuid");
    });
  });

  describe("BreakdownResponse Interface", () => {
    it("accepts valid API response", () => {
      const response: BreakdownResponse = {
        data: {
          item: {
            assetId: "uuid",
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
              currentValue: "5000.00",
              portfolioTotal: "27777.77",
              currentPercentage: "18.0",
              targetRange: { min: "18.0", max: "22.0" },
              score: "87.5",
              criteriaVersion: "uuid",
            },
            steps: [],
            result: {
              recommendedAmount: "500.00",
              reasoning: "Recommended based on allocation gap and score",
            },
          },
          auditTrail: {
            correlationId: "uuid",
            generatedAt: "2025-12-13T04:00:00Z",
            criteriaVersionId: "uuid",
          },
        },
      };

      expect(response.data.item.symbol).toBe("AAPL");
    });
  });
});

describe("Breakdown Type Value Validation", () => {
  describe("Decimal String Precision", () => {
    it("validates percentage values have proper precision", () => {
      const allocation = "18.0000";
      const parsed = parseFloat(allocation);

      expect(parsed).toBe(18);
      expect(parsed.toFixed(4)).toBe("18.0000");
    });

    it("validates currency values have proper precision", () => {
      const amount = "500.0000";
      const parsed = parseFloat(amount);

      expect(parsed).toBe(500);
      expect(parsed.toFixed(2)).toBe("500.00");
    });
  });

  describe("Gap Calculations", () => {
    it("positive gap means under-allocated", () => {
      const currentAllocation = 15.0;
      const targetMidpoint = 20.0;
      const gap = targetMidpoint - currentAllocation;

      expect(gap).toBe(5.0);
      expect(gap > 0).toBe(true); // Under-allocated
    });

    it("negative gap means over-allocated", () => {
      const currentAllocation = 55.0;
      const targetMidpoint = 45.0;
      const gap = targetMidpoint - currentAllocation;

      expect(gap).toBe(-10.0);
      expect(gap < 0).toBe(true); // Over-allocated
    });

    it("zero gap means at target", () => {
      const currentAllocation = 20.0;
      const targetMidpoint = 20.0;
      const gap = targetMidpoint - currentAllocation;

      expect(gap).toBe(0);
    });
  });

  describe("Score Contribution Calculation", () => {
    it("calculates score contribution correctly", () => {
      const gap = 5.0; // 5% under-allocated
      const score = 80.0; // Score of 80
      const contribution = gap * (score / 100);

      expect(contribution).toBe(4.0);
    });

    it("higher score gives higher contribution", () => {
      const gap = 5.0;
      const lowScoreContribution = gap * (50 / 100);
      const highScoreContribution = gap * (100 / 100);

      expect(highScoreContribution).toBeGreaterThan(lowScoreContribution);
    });

    it("negative gap gives negative contribution", () => {
      const gap = -10.0; // Over-allocated
      const score = 90.0;
      const contribution = gap * (score / 100);

      expect(contribution).toBe(-9.0);
      expect(contribution < 0).toBe(true);
    });
  });
});
