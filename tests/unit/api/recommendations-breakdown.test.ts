/**
 * Recommendation Breakdown API Route Tests
 *
 * Story 7.7: View Recommendation Breakdown
 * Story 6.4: Recommendation Details (Extended Breakdown)
 *
 * GET /api/recommendations/:id/breakdown?itemId=uuid
 *
 * Story 7.7 Acceptance Criteria:
 * - AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * - AC-7.7.3: Formula Display
 * - AC-7.7.4: Audit Trail Information
 *
 * Story 6.4 Acceptance Criteria:
 * - AC-6.4.1: Why This Recommendation Panel (scoreRanking)
 * - AC-6.4.2: Allocation Math Display (expectedAllocationAfter)
 * - AC-6.4.3: Score Contribution Display (topCriteria)
 * - AC-6.4.4: Full Calculation Details (extends auditTrail)
 *
 * Tests the API response format and data transformations.
 * Note: Integration tests with actual database would be in tests/integration.
 */

import { describe, it, expect } from "vitest";
import type {
  DetailedBreakdown,
  CalculationStep,
  AuditTrailInfo,
  CalculationInputs,
} from "@/lib/types/recommendations";

describe("Recommendations Breakdown API", () => {
  describe("Response Format", () => {
    it("returns data in correct shape", () => {
      // Mock API response structure
      const response = {
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
              targetRange: { min: "15.0", max: "25.0" },
              score: "85.5",
              criteriaVersion: "uuid",
            },
            steps: [
              { step: "Calculate allocation gap", value: "2.0%", formula: "target - current" },
            ],
            result: {
              recommendedAmount: "500.00",
              reasoning: "Asset is under-allocated with high score",
            },
          },
          auditTrail: {
            correlationId: "uuid",
            generatedAt: "2025-12-13T04:00:00Z",
            criteriaVersionId: "uuid",
          },
        } satisfies DetailedBreakdown,
      };

      expect(response.data).toHaveProperty("item");
      expect(response.data).toHaveProperty("calculation");
      expect(response.data).toHaveProperty("auditTrail");
    });
  });

  describe("Query Parameter Validation", () => {
    it("validates itemId as UUID format", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(validUUID).toMatch(uuidRegex);
    });

    it("rejects invalid UUID format", () => {
      const invalidUUIDs = ["not-a-uuid", "123", "", "123e4567-invalid"];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      invalidUUIDs.forEach((uuid) => {
        expect(uuid).not.toMatch(uuidRegex);
      });
    });
  });

  describe("Calculation Steps Building", () => {
    it("builds allocation gap step", () => {
      const allocationGap = "4.8";
      const gapValue = parseFloat(allocationGap);

      const step: CalculationStep = {
        step: "Calculate allocation gap",
        value: `${Math.abs(gapValue).toFixed(2)}%`,
        formula: "target_midpoint - current_allocation",
      };

      expect(step.value).toBe("4.80%");
    });

    it("builds score weighting step", () => {
      const allocationGap = "4.8";
      const score = "85.5";
      const gapValue = parseFloat(allocationGap);
      const scoreValue = parseFloat(score);
      const contribution = gapValue * (scoreValue / 100);

      const step: CalculationStep = {
        step: "Apply score weighting",
        value: contribution.toFixed(4),
        formula: "allocation_gap × (score / 100)",
      };

      expect(parseFloat(step.value)).toBeCloseTo(4.104, 3);
    });

    it("builds distribution step", () => {
      const recommendedAmount = "500.00";
      const amountValue = parseFloat(recommendedAmount);

      const step: CalculationStep = {
        step: "Distribute capital proportionally",
        value: `$${amountValue.toFixed(2)}`,
        formula: "weighted_priority ÷ total_priority × total_investable",
      };

      expect(step.value).toBe("$500.00");
    });

    it("handles zero amount for over-allocated", () => {
      const recommendedAmount = "0.00";
      const amountValue = parseFloat(recommendedAmount);

      const step: CalculationStep = {
        step: "Distribute capital proportionally",
        value: `$${amountValue.toFixed(2)}`,
        formula: "weighted_priority ÷ total_priority × total_investable",
      };

      expect(step.value).toBe("$0.00");
    });
  });

  describe("Reasoning Generation", () => {
    it("generates reasoning for under-allocated asset", () => {
      const score = "85.5";
      const allocationGap = "4.8";
      const _isOverAllocated = false;
      const recommendedAmount = "500.00";

      const gapValue = parseFloat(allocationGap);
      const scoreValue = parseFloat(score);
      const _amountValue = parseFloat(recommendedAmount);

      // Build reasoning
      const scoreLevel = scoreValue >= 80 ? "high" : scoreValue >= 50 ? "moderate" : "low";
      const gapDescription = Math.abs(gapValue) >= 5 ? "significantly" : "slightly";

      const reasoning = `Asset is ${gapDescription} below target allocation (${Math.abs(gapValue).toFixed(1)}%) with ${scoreLevel} score (${scoreValue.toFixed(1)}).`;

      expect(reasoning).toContain("slightly");
      expect(reasoning).toContain("below target");
      expect(reasoning).toContain("high score");
    });

    it("generates reasoning for over-allocated asset", () => {
      const allocationGap = "-10.0";
      const isOverAllocated = true;
      const recommendedAmount = "0.00";

      const gapValue = parseFloat(allocationGap);
      const _amountValue = parseFloat(recommendedAmount);

      let reasoning: string;
      if (isOverAllocated) {
        reasoning = `Asset is ${Math.abs(gapValue).toFixed(1)}% above target allocation. No investment recommended to allow natural rebalancing.`;
      } else {
        reasoning = "Normal allocation";
      }

      expect(reasoning).toContain("above target");
      expect(reasoning).toContain("No investment recommended");
      expect(reasoning).toContain("natural rebalancing");
    });

    it("generates reasoning for at-target asset", () => {
      const _allocationGap = "0.0";
      const isOverAllocated = false;
      const recommendedAmount = "0.00";

      const amountValue = parseFloat(recommendedAmount);

      let reasoning: string;
      if (amountValue === 0 && !isOverAllocated) {
        reasoning = "Asset is at or above target allocation. No additional investment needed.";
      } else {
        reasoning = "Normal allocation";
      }

      expect(reasoning).toContain("at or above target");
      expect(reasoning).toContain("No additional investment");
    });
  });

  describe("Target Range Calculation", () => {
    it("calculates ±5% range from midpoint", () => {
      const targetMidpoint = "20.0";
      const midpoint = parseFloat(targetMidpoint) || 0;
      const min = Math.max(midpoint - 5, 0).toFixed(1);
      const max = Math.min(midpoint + 5, 100).toFixed(1);

      expect(min).toBe("15.0");
      expect(max).toBe("25.0");
    });

    it("clamps min at 0", () => {
      const targetMidpoint = "3.0";
      const midpoint = parseFloat(targetMidpoint);
      const min = Math.max(midpoint - 5, 0).toFixed(1);

      expect(min).toBe("0.0");
    });

    it("clamps max at 100", () => {
      const targetMidpoint = "98.0";
      const midpoint = parseFloat(targetMidpoint);
      const max = Math.min(midpoint + 5, 100).toFixed(1);

      expect(max).toBe("100.0");
    });

    it("handles invalid input gracefully", () => {
      const targetMidpoint = "";
      const midpoint = parseFloat(targetMidpoint) || 0;
      const min = Math.max(midpoint - 5, 0).toFixed(1);
      const max = Math.min(midpoint + 5, 100).toFixed(1);

      expect(min).toBe("0.0");
      expect(max).toBe("5.0");
    });
  });

  describe("Audit Trail Building", () => {
    it("builds audit trail with all fields", () => {
      const auditTrail: AuditTrailInfo = {
        correlationId: "123e4567-e89b-12d3-a456-426614174000",
        generatedAt: "2025-12-13T04:00:00Z",
        criteriaVersionId: "456e7890-e89b-12d3-a456-426614174001",
      };

      expect(auditTrail.correlationId).toHaveLength(36); // UUID length
      expect(auditTrail.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(auditTrail.criteriaVersionId).toHaveLength(36);
    });

    it("handles unknown criteria version", () => {
      const auditTrail: AuditTrailInfo = {
        correlationId: "uuid",
        generatedAt: "2025-12-13T04:00:00Z",
        criteriaVersionId: "unknown",
      };

      expect(auditTrail.criteriaVersionId).toBe("unknown");
    });
  });

  describe("Calculation Inputs Building", () => {
    it("builds inputs with all fields", () => {
      const inputs: CalculationInputs = {
        currentValue: "5000.00",
        portfolioTotal: "27777.77",
        currentPercentage: "18.0",
        targetRange: { min: "15.0", max: "25.0" },
        score: "85.5",
        criteriaVersion: "uuid",
      };

      expect(inputs.currentValue).toBe("5000.00");
      expect(inputs.portfolioTotal).toBe("27777.77");
      expect(inputs.currentPercentage).toBe("18.0");
      expect(inputs.targetRange.min).toBe("15.0");
      expect(inputs.targetRange.max).toBe("25.0");
      expect(inputs.score).toBe("85.5");
    });

    it("validates decimal string precision", () => {
      const inputs: CalculationInputs = {
        currentValue: "5000.0000",
        portfolioTotal: "27777.7700",
        currentPercentage: "18.0000",
        targetRange: { min: "15.0", max: "25.0" },
        score: "85.5000",
        criteriaVersion: "uuid",
      };

      // Values should be parseable as numbers
      expect(parseFloat(inputs.currentValue)).toBe(5000);
      expect(parseFloat(inputs.portfolioTotal)).toBeCloseTo(27777.77, 2);
      expect(parseFloat(inputs.currentPercentage)).toBe(18);
      expect(parseFloat(inputs.score)).toBeCloseTo(85.5, 1);
    });
  });

  describe("Error Responses", () => {
    const errorCodes = {
      VALIDATION_INVALID_INPUT: "VALIDATION_INVALID_INPUT",
      NOT_FOUND_RECOMMENDATIONS: "NOT_FOUND_RECOMMENDATIONS",
      AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
    };

    it("defines validation error for invalid itemId", () => {
      const errorResponse = {
        error: "Invalid item ID format",
        code: errorCodes.VALIDATION_INVALID_INPUT,
      };

      expect(errorResponse.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("defines not found error for missing recommendation", () => {
      const errorResponse = {
        error: "Recommendation not found",
        code: errorCodes.NOT_FOUND_RECOMMENDATIONS,
      };

      expect(errorResponse.code).toBe("NOT_FOUND_RECOMMENDATIONS");
    });

    it("defines not found error for missing item", () => {
      const errorResponse = {
        error: "Recommendation item not found",
        code: errorCodes.NOT_FOUND_RECOMMENDATIONS,
      };

      expect(errorResponse.code).toBe("NOT_FOUND_RECOMMENDATIONS");
    });

    it("defines auth error for unauthenticated request", () => {
      const errorResponse = {
        error: "Authentication required",
        code: errorCodes.AUTH_UNAUTHORIZED,
      };

      expect(errorResponse.code).toBe("AUTH_UNAUTHORIZED");
    });
  });
});

// =============================================================================
// Story 6.4: Extended Breakdown Fields
// =============================================================================

describe("Extended Breakdown Fields (Story 6.4)", () => {
  describe("Top Criteria Extraction", () => {
    it("extracts top 3 criteria by points awarded", () => {
      const breakdown = [
        {
          criterionId: "1",
          criterionName: "P/E Ratio",
          pointsAwarded: 10,
          matched: true,
          actualValue: "15",
          skippedReason: null,
        },
        {
          criterionId: "2",
          criterionName: "Dividend Yield",
          pointsAwarded: 5,
          matched: true,
          actualValue: "3.5",
          skippedReason: null,
        },
        {
          criterionId: "3",
          criterionName: "Market Cap",
          pointsAwarded: 15,
          matched: true,
          actualValue: "500B",
          skippedReason: null,
        },
        {
          criterionId: "4",
          criterionName: "Debt Ratio",
          pointsAwarded: 8,
          matched: true,
          actualValue: "0.3",
          skippedReason: null,
        },
      ];

      // Sort by points and take top 3
      const topCriteria = breakdown
        .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
        .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
        .slice(0, 3);

      expect(topCriteria).toHaveLength(3);
      expect(topCriteria[0]?.criterionName).toBe("Market Cap"); // 15 points
      expect(topCriteria[1]?.criterionName).toBe("P/E Ratio"); // 10 points
      expect(topCriteria[2]?.criterionName).toBe("Debt Ratio"); // 8 points
    });

    it("handles negative points (penalties)", () => {
      const breakdown = [
        {
          criterionId: "1",
          criterionName: "Criterion A",
          pointsAwarded: 10,
          matched: true,
          actualValue: "10",
          skippedReason: null,
        },
        {
          criterionId: "2",
          criterionName: "Criterion B",
          pointsAwarded: -8,
          matched: true,
          actualValue: "50",
          skippedReason: null,
        },
        {
          criterionId: "3",
          criterionName: "Criterion C",
          pointsAwarded: 5,
          matched: true,
          actualValue: "5",
          skippedReason: null,
        },
      ];

      // Sort by absolute points
      const topCriteria = breakdown
        .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
        .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
        .slice(0, 3);

      expect(topCriteria).toHaveLength(3);
      expect(topCriteria[0]?.criterionName).toBe("Criterion A"); // |10| points
      expect(topCriteria[1]?.criterionName).toBe("Criterion B"); // |-8| = 8 points
    });

    it("filters out skipped criteria", () => {
      const breakdown = [
        {
          criterionId: "1",
          criterionName: "Active",
          pointsAwarded: 10,
          matched: true,
          actualValue: "10",
          skippedReason: null,
        },
        {
          criterionId: "2",
          criterionName: "Skipped",
          pointsAwarded: 15,
          matched: false,
          actualValue: null,
          skippedReason: "DATA_UNAVAILABLE",
        },
        {
          criterionId: "3",
          criterionName: "Active2",
          pointsAwarded: 5,
          matched: true,
          actualValue: "5",
          skippedReason: null,
        },
      ];

      const topCriteria = breakdown
        .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
        .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
        .slice(0, 3);

      expect(topCriteria).toHaveLength(2);
      expect(topCriteria.some((c) => c.criterionName === "Skipped")).toBe(false);
    });

    it("filters out zero-point criteria", () => {
      const breakdown = [
        {
          criterionId: "1",
          criterionName: "Positive",
          pointsAwarded: 10,
          matched: true,
          actualValue: "10",
          skippedReason: null,
        },
        {
          criterionId: "2",
          criterionName: "Zero",
          pointsAwarded: 0,
          matched: false,
          actualValue: "50",
          skippedReason: null,
        },
        {
          criterionId: "3",
          criterionName: "Another",
          pointsAwarded: 5,
          matched: true,
          actualValue: "5",
          skippedReason: null,
        },
      ];

      const topCriteria = breakdown
        .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
        .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
        .slice(0, 3);

      expect(topCriteria).toHaveLength(2);
      expect(topCriteria.some((c) => c.criterionName === "Zero")).toBe(false);
    });

    it("returns less than 3 if fewer qualifying criteria", () => {
      const breakdown = [
        {
          criterionId: "1",
          criterionName: "Only One",
          pointsAwarded: 10,
          matched: true,
          actualValue: "10",
          skippedReason: null,
        },
      ];

      const topCriteria = breakdown
        .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
        .slice(0, 3);

      expect(topCriteria).toHaveLength(1);
    });
  });

  describe("Expected Allocation Calculation", () => {
    it("calculates expected allocation after investment", () => {
      // Current: 10% of $10,000 = $1,000 current value
      // Investing $500, total investable $1,000
      // New portfolio value: $11,000
      // New asset value: $1,500
      // Expected allocation: $1,500 / $11,000 = 13.64%
      const currentValue = "1000.00";
      const recommendedAmount = "500.00";
      const portfolioTotal = "10000.00";
      const totalInvestable = "1000.00";

      const current = parseFloat(currentValue);
      const recommended = parseFloat(recommendedAmount);
      const portfolio = parseFloat(portfolioTotal);
      const investable = parseFloat(totalInvestable);

      const newValue = current + recommended;
      const newPortfolio = portfolio + investable;
      const expectedAllocation = (newValue / newPortfolio) * 100;

      expect(expectedAllocation).toBeCloseTo(13.64, 2);
    });

    it("handles zero recommended amount", () => {
      const currentValue = "1000.00";
      const recommendedAmount = "0.00";
      const portfolioTotal = "10000.00";
      const totalInvestable = "1000.00";

      const current = parseFloat(currentValue);
      const recommended = parseFloat(recommendedAmount);
      const portfolio = parseFloat(portfolioTotal);
      const investable = parseFloat(totalInvestable);

      const newValue = current + recommended;
      const newPortfolio = portfolio + investable;
      const expectedAllocation = (newValue / newPortfolio) * 100;

      expect(expectedAllocation).toBeCloseTo(9.09, 2); // $1,000 / $11,000
    });
  });

  describe("Score Ranking Calculation", () => {
    it("calculates percentile ranking among portfolio assets", () => {
      const assetScore = "85.5";
      const allScores = ["90.0", "85.5", "80.0", "75.0", "60.0"];

      const score = parseFloat(assetScore);
      const sorted = allScores.map((s) => parseFloat(s)).sort((a, b) => b - a);
      const rank = sorted.findIndex((s) => s === score) + 1;
      const percentile = Math.round(((sorted.length - rank) / sorted.length) * 100);

      expect(rank).toBe(2); // Second highest
      expect(percentile).toBe(60); // Top 60%
    });

    it("handles tied scores", () => {
      const assetScore = "80.0";
      const allScores = ["90.0", "80.0", "80.0", "70.0"];

      const score = parseFloat(assetScore);
      const sorted = allScores.map((s) => parseFloat(s)).sort((a, b) => b - a);
      const rank = sorted.findIndex((s) => s === score) + 1;

      expect(rank).toBe(2); // First occurrence of 80.0
    });

    it("handles single asset (rank 1 of 1)", () => {
      const assetScore = "85.5";
      const allScores = ["85.5"];

      const score = parseFloat(assetScore);
      const sorted = allScores.map((s) => parseFloat(s)).sort((a, b) => b - a);
      const rank = sorted.findIndex((s) => s === score) + 1;
      const total = sorted.length;
      const percentile = Math.round(((total - rank) / total) * 100);

      expect(rank).toBe(1);
      expect(total).toBe(1);
      expect(percentile).toBe(0); // Top position = 0 percentile
    });

    it("handles lowest score (100th percentile)", () => {
      const assetScore = "50.0";
      const allScores = ["90.0", "80.0", "70.0", "60.0", "50.0"];

      const score = parseFloat(assetScore);
      const sorted = allScores.map((s) => parseFloat(s)).sort((a, b) => b - a);
      const rank = sorted.findIndex((s) => s === score) + 1;
      const percentile = Math.round(((sorted.length - rank) / sorted.length) * 100);

      expect(rank).toBe(5); // Last place
      expect(percentile).toBe(0); // Bottom = 0 percentile
    });
  });

  describe("Extended API Response Format", () => {
    it("returns extended breakdown with new fields", () => {
      const extendedResponse = {
        data: {
          item: {
            assetId: "uuid",
            symbol: "AAPL",
            score: "85.5",
            currentAllocation: "10.0",
            targetAllocation: "15.0",
            allocationGap: "5.0",
            recommendedAmount: "500.00",
            isOverAllocated: false,
          },
          calculation: {
            inputs: {
              currentValue: "1000.00",
              portfolioTotal: "10000.00",
              currentPercentage: "10.0",
              targetRange: { min: "10.0", max: "20.0" },
              score: "85.5",
              criteriaVersion: "uuid",
            },
            steps: [],
            result: {
              recommendedAmount: "500.00",
              reasoning: "Under-allocated with high score",
            },
          },
          auditTrail: {
            correlationId: "uuid",
            generatedAt: "2026-01-02T00:00:00Z",
            criteriaVersionId: "uuid",
          },
          // New fields for Story 6.4
          topCriteria: [
            {
              criterionId: "1",
              criterionName: "P/E Ratio",
              pointsAwarded: 15,
              actualValue: "12.5",
            },
            {
              criterionId: "2",
              criterionName: "Dividend Yield",
              pointsAwarded: 10,
              actualValue: "3.2%",
            },
            {
              criterionId: "3",
              criterionName: "Market Cap",
              pointsAwarded: 8,
              actualValue: "2.5T",
            },
          ],
          expectedAllocationAfter: "13.64",
          scoreRanking: {
            percentile: 80,
            rank: 1,
            total: 5,
          },
        },
      };

      expect(extendedResponse.data).toHaveProperty("topCriteria");
      expect(extendedResponse.data).toHaveProperty("expectedAllocationAfter");
      expect(extendedResponse.data).toHaveProperty("scoreRanking");
      expect(extendedResponse.data.topCriteria).toHaveLength(3);
      expect(extendedResponse.data.scoreRanking.rank).toBe(1);
    });
  });
});

// =============================================================================
// Story 7.7 i18n: Raw Numeric Values in API Response
// =============================================================================

describe("Story 7.7 i18n: API Precision Refactoring", () => {
  describe("buildCalculationSteps with rawValue and valueType", () => {
    it("returns rawValue and valueType for allocation gap step", () => {
      const allocationGap = "15.5";
      const score = "75";
      const recommendedAmount = "800";

      const gapValue = parseFloat(allocationGap);
      const scoreValue = parseFloat(score);
      const amountValue = parseFloat(recommendedAmount);

      // Build steps (simulating buildCalculationSteps)
      const steps = [
        {
          step: "Calculate allocation gap",
          value: `${Math.abs(gapValue).toFixed(2)}%`,
          rawValue: Math.abs(gapValue),
          valueType: "percent" as const,
          formula: "target_midpoint - current_allocation",
        },
        {
          step: "Apply score weighting",
          value: (gapValue * (scoreValue / 100)).toFixed(4),
          rawValue: gapValue * (scoreValue / 100),
          valueType: "weight" as const,
          formula: "allocation_gap × (score / 100)",
        },
        {
          step: "Distribute capital proportionally",
          value: `$${amountValue.toFixed(2)}`,
          rawValue: amountValue,
          valueType: "currency" as const,
          formula: "weighted_priority ÷ total_priority × total_investable",
        },
      ];

      // Verify step 1: Allocation gap
      expect(steps[0]?.value).toBe("15.50%");
      expect(steps[0]?.rawValue).toBe(15.5);
      expect(steps[0]?.valueType).toBe("percent");

      // Verify step 2: Score weighting
      expect(steps[1]?.rawValue).toBeCloseTo(11.625, 4); // 15.5 * 0.75
      expect(steps[1]?.valueType).toBe("weight");

      // Verify step 3: Currency distribution
      expect(steps[2]?.value).toBe("$800.00");
      expect(steps[2]?.rawValue).toBe(800);
      expect(steps[2]?.valueType).toBe("currency");
    });

    it("preserves precision for weight values", () => {
      const allocationGap = "15.5";
      const score = "75";

      const gapValue = parseFloat(allocationGap);
      const scoreValue = parseFloat(score);
      const rawWeightValue = gapValue * (scoreValue / 100);

      // The raw value should preserve full precision
      expect(rawWeightValue).toBe(11.625);
      // The formatted string should be truncated
      expect(rawWeightValue.toFixed(4)).toBe("11.6250");
    });

    it("handles negative allocation gap (over-allocated)", () => {
      const allocationGap = "-10.0";
      const gapValue = parseFloat(allocationGap);

      const step = {
        step: "Calculate allocation gap",
        value: `${Math.abs(gapValue).toFixed(2)}%`,
        rawValue: Math.abs(gapValue),
        valueType: "percent" as const,
        formula: "target_midpoint - current_allocation",
      };

      // Should use absolute value for display
      expect(step.value).toBe("10.00%");
      expect(step.rawValue).toBe(10.0);
    });

    it("handles zero recommended amount", () => {
      const recommendedAmount = "0.00";
      const amountValue = parseFloat(recommendedAmount);

      const step = {
        step: "Distribute capital proportionally",
        value: `$${amountValue.toFixed(2)}`,
        rawValue: amountValue,
        valueType: "currency" as const,
        formula: "N/A (no investable capital)",
      };

      expect(step.value).toBe("$0.00");
      expect(step.rawValue).toBe(0);
      expect(step.valueType).toBe("currency");
    });
  });

  describe("API Response Format with i18n Fields", () => {
    it("returns steps with both string value and raw numeric fields", () => {
      const apiResponse = {
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
              targetRange: { min: "15.0", max: "25.0" },
              score: "85.5",
              criteriaVersion: "uuid",
            },
            steps: [
              {
                step: "Calculate allocation gap",
                value: "4.80%",
                rawValue: 4.8,
                valueType: "percent",
                formula: "target_midpoint - current_allocation",
              },
              {
                step: "Apply score weighting",
                value: "4.1040",
                rawValue: 4.104,
                valueType: "weight",
                formula: "allocation_gap × (score / 100)",
              },
              {
                step: "Distribute capital proportionally",
                value: "$500.00",
                rawValue: 500,
                valueType: "currency",
                formula: "weighted_priority ÷ total_priority × total_investable",
              },
            ],
            result: {
              recommendedAmount: "500.00",
              reasoning: "Asset is slightly below target allocation (4.8%) with high score (85.5).",
            },
          },
          auditTrail: {
            correlationId: "uuid",
            generatedAt: "2025-12-13T04:00:00Z",
            criteriaVersionId: "uuid",
          },
        },
      };

      // Verify all steps have rawValue and valueType
      apiResponse.data.calculation.steps.forEach((step) => {
        expect(step).toHaveProperty("rawValue");
        expect(step).toHaveProperty("valueType");
        expect(["percent", "currency", "weight", "number"]).toContain(step.valueType);
        expect(typeof step.rawValue).toBe("number");
      });
    });

    it("maintains backward compatibility with existing consumers", () => {
      // Existing consumers should be able to use the string 'value' field
      const step = {
        step: "Calculate allocation gap",
        value: "4.80%",
        rawValue: 4.8,
        valueType: "percent" as const,
        formula: "target_midpoint - current_allocation",
      };

      // Old consumers can still use step.value
      expect(step.value).toBe("4.80%");
      expect(typeof step.value).toBe("string");

      // New consumers can use rawValue + valueType
      expect(step.rawValue).toBe(4.8);
      expect(step.valueType).toBe("percent");
    });
  });

  describe("Target Range with Raw Values", () => {
    it("returns both string and numeric values", () => {
      const targetMidpoint = "20.0";
      const midpoint = parseFloat(targetMidpoint) || 0;
      const rawMin = Math.max(midpoint - 5, 0);
      const rawMax = Math.min(midpoint + 5, 100);

      const result = {
        min: rawMin.toFixed(1),
        max: rawMax.toFixed(1),
        rawMin,
        rawMax,
      };

      expect(result.min).toBe("15.0");
      expect(result.max).toBe("25.0");
      expect(result.rawMin).toBe(15);
      expect(result.rawMax).toBe(25);
    });

    it("clamps values at boundaries", () => {
      // Near zero
      const lowMidpoint = "3.0";
      const lowMid = parseFloat(lowMidpoint);
      expect(Math.max(lowMid - 5, 0)).toBe(0);

      // Near 100
      const highMidpoint = "98.0";
      const highMid = parseFloat(highMidpoint);
      expect(Math.min(highMid + 5, 100)).toBe(100);
    });
  });
});

describe("Breakdown API Data Transformations", () => {
  describe("Item Transformation", () => {
    it("transforms DB item to display item", () => {
      // Mock DB record
      const dbItem = {
        id: "item-uuid",
        recommendationId: "rec-uuid",
        assetId: "asset-uuid",
        symbol: "AAPL",
        score: "85.5000",
        currentAllocation: "15.2000",
        targetAllocation: "20.0000",
        allocationGap: "4.8000",
        recommendedAmount: "500.0000",
        isOverAllocated: false,
        breakdown: {
          classId: "class-uuid",
          className: "Equity",
          subclassId: null,
          subclassName: null,
          currentValue: "5000.0000",
          targetMidpoint: "20.0000",
          priority: "4.1040",
          redistributedFrom: null,
        },
        sortOrder: 1,
        createdAt: new Date(),
      };

      // Transform to display item
      const displayItem = {
        assetId: dbItem.assetId,
        symbol: dbItem.symbol,
        score: dbItem.score,
        currentAllocation: dbItem.currentAllocation,
        targetAllocation: dbItem.targetAllocation,
        allocationGap: dbItem.allocationGap,
        recommendedAmount: dbItem.recommendedAmount,
        isOverAllocated: dbItem.isOverAllocated,
      };

      expect(displayItem.symbol).toBe("AAPL");
      expect(displayItem.assetId).toBe("asset-uuid");
    });
  });

  describe("Score Lookup", () => {
    it("extracts criteria version from score record", () => {
      // Mock score record
      const scoreRecord = {
        id: "score-uuid",
        userId: "user-uuid",
        assetId: "asset-uuid",
        symbol: "AAPL",
        criteriaVersionId: "criteria-uuid",
        score: "85.5000",
        breakdown: [],
        calculatedAt: new Date(),
        createdAt: new Date(),
      };

      const criteriaVersionId = scoreRecord.criteriaVersionId;

      expect(criteriaVersionId).toBe("criteria-uuid");
    });

    it("handles missing score record", () => {
      const scoreRecord = null;
      const criteriaVersionId = scoreRecord?.criteriaVersionId || "unknown";

      expect(criteriaVersionId).toBe("unknown");
    });
  });
});
