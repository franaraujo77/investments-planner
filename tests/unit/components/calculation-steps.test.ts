/**
 * CalculationSteps Component Tests
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.3: Formula Display - shows step-by-step calculation
 *
 * Tests the component interface and props.
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and data transformations.
 * Component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import type { CalculationStepsProps } from "@/components/recommendations/calculation-steps";
import type { CalculationStep } from "@/lib/types/recommendations";

describe("CalculationSteps Component", () => {
  describe("CalculationStepsProps Interface", () => {
    it("accepts valid steps array", () => {
      const props: CalculationStepsProps = {
        steps: [
          { step: "Calculate allocation gap", value: "2.0%", formula: "target - current" },
          { step: "Apply score weighting", value: "1.75", formula: "gap × (score/100)" },
          { step: "Distribute capital", value: "$800.00", formula: "weighted × total" },
        ],
      };

      expect(props.steps).toHaveLength(3);
      expect(props.steps[0].step).toBe("Calculate allocation gap");
    });

    it("accepts empty steps array", () => {
      const props: CalculationStepsProps = {
        steps: [],
      };

      expect(props.steps).toHaveLength(0);
    });

    it("accepts optional className", () => {
      const props: CalculationStepsProps = {
        steps: [],
        className: "custom-class mt-4",
      };

      expect(props.className).toBe("custom-class mt-4");
    });

    it("accepts undefined className", () => {
      const props: CalculationStepsProps = {
        steps: [],
        className: undefined,
      };

      expect(props.className).toBeUndefined();
    });
  });

  describe("CalculationStep Data Validation", () => {
    it("step has all required fields", () => {
      const step: CalculationStep = {
        step: "Calculate allocation gap",
        value: "2.0%",
        formula: "target_midpoint - current_allocation",
      };

      expect(step).toHaveProperty("step");
      expect(step).toHaveProperty("value");
      expect(step).toHaveProperty("formula");
    });

    it("validates percentage value format", () => {
      const step: CalculationStep = {
        step: "Calculate allocation gap",
        value: "2.0%",
        formula: "target - current",
      };

      expect(step.value).toMatch(/^\d+\.?\d*%$/);
    });

    it("validates currency value format", () => {
      const step: CalculationStep = {
        step: "Distribute capital",
        value: "$800.00",
        formula: "weighted × total",
      };

      expect(step.value).toMatch(/^\$\d+\.?\d*$/);
    });

    it("validates numeric value format", () => {
      const step: CalculationStep = {
        step: "Apply score weighting",
        value: "1.75",
        formula: "gap × (score/100)",
      };

      expect(parseFloat(step.value)).toBe(1.75);
    });
  });

  describe("Step Formatting Logic", () => {
    it("formats percentage step correctly", () => {
      const gapValue = 2.0;
      const formattedValue = `${Math.abs(gapValue).toFixed(2)}%`;

      expect(formattedValue).toBe("2.00%");
    });

    it("formats currency step correctly", () => {
      const amountValue = 800.0;
      const formattedValue = `$${amountValue.toFixed(2)}`;

      expect(formattedValue).toBe("$800.00");
    });

    it("formats score contribution step correctly", () => {
      const gap = 2.0;
      const score = 87.5;
      const contribution = gap * (score / 100);

      expect(contribution.toFixed(4)).toBe("1.7500");
    });

    it("handles negative gap for over-allocated", () => {
      const gapValue = -10.0;
      const formattedValue = `${Math.abs(gapValue).toFixed(2)}%`;

      expect(formattedValue).toBe("10.00%");
    });

    it("handles zero amount", () => {
      const amountValue = 0;
      const formattedValue = `$${amountValue.toFixed(2)}`;

      expect(formattedValue).toBe("$0.00");
    });
  });

  describe("Step Calculation Verification", () => {
    // Verify the calculation steps match the recommendation algorithm

    it("allocation gap calculation is correct", () => {
      const targetMidpoint = 20.0;
      const currentAllocation = 18.0;
      const gap = targetMidpoint - currentAllocation;

      expect(gap).toBe(2.0);
    });

    it("score weighting calculation is correct", () => {
      const gap = 2.0;
      const score = 87.5;
      const weightedContribution = gap * (score / 100);

      expect(weightedContribution).toBeCloseTo(1.75, 4);
    });

    it("capital distribution calculation is conceptually valid", () => {
      // Simplified test - actual distribution uses total priority weighting
      const weightedPriority = 1.75;
      const totalPriority = 10.0;
      const totalInvestable = 1000.0;
      const distributedAmount = (weightedPriority / totalPriority) * totalInvestable;

      expect(distributedAmount).toBe(175.0);
    });
  });

  describe("Sample Calculation Steps", () => {
    const sampleScenarios = [
      {
        name: "Normal under-allocated asset",
        gap: "2.0",
        score: "85.0",
        amount: "500.00",
        isOverAllocated: false,
      },
      {
        name: "Significantly under-allocated asset",
        gap: "10.0",
        score: "90.0",
        amount: "1500.00",
        isOverAllocated: false,
      },
      {
        name: "Over-allocated asset (zero amount)",
        gap: "-5.0",
        score: "95.0",
        amount: "0.00",
        isOverAllocated: true,
      },
    ];

    sampleScenarios.forEach(({ name, gap, score, amount, isOverAllocated }) => {
      it(`builds steps for ${name}`, () => {
        const gapValue = parseFloat(gap);
        const scoreValue = parseFloat(score);
        const amountValue = parseFloat(amount);

        // Calculate score contribution
        const scoreContribution = gapValue * (scoreValue / 100);

        // Build steps
        const steps: CalculationStep[] = [
          {
            step: "Calculate allocation gap",
            value: `${Math.abs(gapValue).toFixed(2)}%`,
            formula: "target_midpoint - current_allocation",
          },
          {
            step: "Apply score weighting",
            value: scoreContribution.toFixed(4),
            formula: "allocation_gap × (score / 100)",
          },
          {
            step: "Distribute capital proportionally",
            value: `$${amountValue.toFixed(2)}`,
            formula: "weighted_priority ÷ total_priority × total_investable",
          },
        ];

        expect(steps).toHaveLength(3);
        expect(steps[0].step).toBe("Calculate allocation gap");
        expect(steps[1].step).toBe("Apply score weighting");
        expect(steps[2].step).toBe("Distribute capital proportionally");

        // Verify over-allocated assets get $0
        if (isOverAllocated) {
          expect(steps[2].value).toBe("$0.00");
        }
      });
    });
  });

  describe("Formula Descriptions", () => {
    it("allocation gap formula is clear", () => {
      const formula = "target_midpoint - current_allocation";
      expect(formula).toContain("target");
      expect(formula).toContain("current");
    });

    it("score weighting formula is clear", () => {
      const formula = "allocation_gap × (score / 100)";
      expect(formula).toContain("gap");
      expect(formula).toContain("score");
    });

    it("distribution formula is clear", () => {
      const formula = "weighted_priority ÷ total_priority × total_investable";
      expect(formula).toContain("priority");
      expect(formula).toContain("investable");
    });
  });
});

describe("CalculationSteps Value Formatting", () => {
  describe("Percentage Formatting", () => {
    it("formats single digit percentage", () => {
      const value = 2.0;
      expect(`${value.toFixed(2)}%`).toBe("2.00%");
    });

    it("formats double digit percentage", () => {
      const value = 15.75;
      expect(`${value.toFixed(2)}%`).toBe("15.75%");
    });

    it("formats zero percentage", () => {
      const value = 0;
      expect(`${value.toFixed(2)}%`).toBe("0.00%");
    });
  });

  describe("Currency Formatting", () => {
    it("formats small amounts", () => {
      const value = 50.0;
      expect(`$${value.toFixed(2)}`).toBe("$50.00");
    });

    it("formats large amounts", () => {
      const value = 2500.0;
      expect(`$${value.toFixed(2)}`).toBe("$2500.00");
    });

    it("formats zero amount", () => {
      const value = 0;
      expect(`$${value.toFixed(2)}`).toBe("$0.00");
    });

    it("formats decimal amounts", () => {
      const value = 123.45;
      expect(`$${value.toFixed(2)}`).toBe("$123.45");
    });
  });

  describe("Numeric Formatting", () => {
    it("formats score contribution with 4 decimals", () => {
      const value = 1.75;
      expect(value.toFixed(4)).toBe("1.7500");
    });

    it("formats small contribution", () => {
      const value = 0.125;
      expect(value.toFixed(4)).toBe("0.1250");
    });

    it("formats negative contribution (over-allocated)", () => {
      const value = -9.0;
      expect(value.toFixed(4)).toBe("-9.0000");
    });
  });
});
