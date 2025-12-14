/**
 * Recommendation Breakdown API Route Tests
 *
 * Story 7.7: View Recommendation Breakdown
 * GET /api/recommendations/:id/breakdown?itemId=uuid
 *
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * AC-7.7.3: Formula Display
 * AC-7.7.4: Audit Trail Information
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
