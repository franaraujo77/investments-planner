/**
 * Criteria Operator Validation Tests
 *
 * Story 5.3: Define Criteria Operators
 *
 * AC-5.3.1: All Operators Available
 * AC-5.3.2: Between Operator Shows Two Value Inputs
 * AC-5.3.3: Form Prevents Invalid Criteria
 * AC-5.3.4: Operator Selection Adapts Form Fields
 */

import { describe, it, expect } from "vitest";
import {
  criterionRuleSchema,
  AVAILABLE_OPERATORS,
  CRITERIA_MESSAGES,
} from "@/lib/validations/criteria-schemas";
import {
  getOperatorConfig,
  operatorRequiresValue,
  operatorRequiresSecondValue,
  formatOperatorDisplay,
  OPERATOR_DISPLAY_LABELS,
  OPERATOR_DESCRIPTIONS,
  OPERATOR_SYMBOLS,
  ALL_OPERATORS,
  type CriterionOperator,
} from "@/lib/constants/operators";

// Helper to create a valid criterion base
const validCriterionBase = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Test Criterion",
  metric: "dividend_yield" as const,
  points: 10,
  requiredFundamentals: [] as string[],
  sortOrder: 0,
};

describe("Story 5.3: Define Criteria Operators", () => {
  // =========================================================================
  // AC-5.3.1: All Operators Available
  // =========================================================================
  describe("AC-5.3.1: All Operators Available", () => {
    it("should have all 7 required operators in AVAILABLE_OPERATORS", () => {
      expect(AVAILABLE_OPERATORS).toHaveLength(7);
      expect(AVAILABLE_OPERATORS).toContain("gt");
      expect(AVAILABLE_OPERATORS).toContain("lt");
      expect(AVAILABLE_OPERATORS).toContain("gte");
      expect(AVAILABLE_OPERATORS).toContain("lte");
      expect(AVAILABLE_OPERATORS).toContain("between");
      expect(AVAILABLE_OPERATORS).toContain("equals");
      expect(AVAILABLE_OPERATORS).toContain("exists");
    });

    it("should have display labels for all operators", () => {
      const operators: CriterionOperator[] = [
        "gt",
        "lt",
        "gte",
        "lte",
        "between",
        "equals",
        "exists",
      ];
      operators.forEach((op) => {
        expect(OPERATOR_DISPLAY_LABELS[op]).toBeDefined();
        expect(OPERATOR_DISPLAY_LABELS[op].length).toBeGreaterThan(0);
      });
    });

    it("should have descriptions for all operators", () => {
      const operators: CriterionOperator[] = [
        "gt",
        "lt",
        "gte",
        "lte",
        "between",
        "equals",
        "exists",
      ];
      operators.forEach((op) => {
        expect(OPERATOR_DESCRIPTIONS[op]).toBeDefined();
        expect(OPERATOR_DESCRIPTIONS[op].length).toBeGreaterThan(0);
      });
    });

    it("should have symbols for all operators", () => {
      expect(OPERATOR_SYMBOLS.gt).toBe(">");
      expect(OPERATOR_SYMBOLS.lt).toBe("<");
      expect(OPERATOR_SYMBOLS.gte).toBe(">=");
      expect(OPERATOR_SYMBOLS.lte).toBe("<=");
      expect(OPERATOR_SYMBOLS.between).toBe("between");
      expect(OPERATOR_SYMBOLS.equals).toBe("=");
      expect(OPERATOR_SYMBOLS.exists).toBe("exists");
    });

    it("should export ALL_OPERATORS array", () => {
      expect(ALL_OPERATORS).toHaveLength(7);
      expect(ALL_OPERATORS).toEqual(AVAILABLE_OPERATORS);
    });
  });

  // =========================================================================
  // AC-5.3.2: Between Operator Shows Two Value Inputs
  // =========================================================================
  describe("AC-5.3.2: Between Operator Requires Two Values", () => {
    it("should require value2 for between operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "between",
        value: "10",
        // missing value2
      });
      expect(result.success).toBe(false);
    });

    it("should accept between operator with both values", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "between",
        value: "10",
        value2: "20",
      });
      expect(result.success).toBe(true);
    });

    it("operatorRequiresSecondValue should return true only for between", () => {
      expect(operatorRequiresSecondValue("between")).toBe(true);
      expect(operatorRequiresSecondValue("gt")).toBe(false);
      expect(operatorRequiresSecondValue("lt")).toBe(false);
      expect(operatorRequiresSecondValue("gte")).toBe(false);
      expect(operatorRequiresSecondValue("lte")).toBe(false);
      expect(operatorRequiresSecondValue("equals")).toBe(false);
      expect(operatorRequiresSecondValue("exists")).toBe(false);
    });

    it("getOperatorConfig should return requiresValue2: true only for between", () => {
      const betweenConfig = getOperatorConfig("between");
      expect(betweenConfig.requiresValue2).toBe(true);

      const otherOperators: CriterionOperator[] = ["gt", "lt", "gte", "lte", "equals", "exists"];
      otherOperators.forEach((op) => {
        const config = getOperatorConfig(op);
        expect(config.requiresValue2).toBe(false);
      });
    });
  });

  // =========================================================================
  // AC-5.3.3: Form Prevents Invalid Criteria
  // =========================================================================
  describe("AC-5.3.3: Form Prevents Invalid Criteria", () => {
    it("should reject between operator when min >= max", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "between",
        value: "20",
        value2: "10", // max < min
      });
      expect(result.success).toBe(false);
    });

    it("should reject between operator when min equals max", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "between",
        value: "10",
        value2: "10", // min === max
      });
      expect(result.success).toBe(false);
    });

    it("should accept between operator when min < max", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "between",
        value: "5",
        value2: "15",
      });
      expect(result.success).toBe(true);
    });

    it("should have MIN_MUST_BE_LESS_THAN_MAX error message", () => {
      expect(CRITERIA_MESSAGES.MIN_MUST_BE_LESS_THAN_MAX).toBe(
        "Min value must be less than max value"
      );
    });

    it("should reject non-exists operators without value", () => {
      const operatorsRequiringValue: CriterionOperator[] = ["gt", "lt", "gte", "lte", "equals"];
      operatorsRequiringValue.forEach((op) => {
        const result = criterionRuleSchema.safeParse({
          ...validCriterionBase,
          operator: op,
          value: "", // empty value
        });
        expect(result.success).toBe(false);
      });
    });

    it("should have VALUE_REQUIRED_FOR_OPERATOR error message", () => {
      expect(CRITERIA_MESSAGES.VALUE_REQUIRED_FOR_OPERATOR).toBe(
        "Value is required for this operator"
      );
    });

    it("should have VALUE2_REQUIRED_FOR_BETWEEN error message", () => {
      expect(CRITERIA_MESSAGES.VALUE2_REQUIRED_FOR_BETWEEN).toBe(
        "Max value is required for between operator"
      );
    });
  });

  // =========================================================================
  // AC-5.3.4: Operator Selection Adapts Form Fields
  // =========================================================================
  describe("AC-5.3.4: Operator Selection Adapts Form Fields", () => {
    describe("exists operator", () => {
      it("should accept exists operator without value", () => {
        const result = criterionRuleSchema.safeParse({
          ...validCriterionBase,
          operator: "exists",
          value: "", // empty value is allowed for exists
        });
        expect(result.success).toBe(true);
      });

      it("should accept exists operator with value (value is ignored)", () => {
        const result = criterionRuleSchema.safeParse({
          ...validCriterionBase,
          operator: "exists",
          value: "5", // value provided but ignored
        });
        expect(result.success).toBe(true);
      });

      it("operatorRequiresValue should return false only for exists", () => {
        expect(operatorRequiresValue("exists")).toBe(false);
        expect(operatorRequiresValue("gt")).toBe(true);
        expect(operatorRequiresValue("lt")).toBe(true);
        expect(operatorRequiresValue("gte")).toBe(true);
        expect(operatorRequiresValue("lte")).toBe(true);
        expect(operatorRequiresValue("between")).toBe(true);
        expect(operatorRequiresValue("equals")).toBe(true);
      });

      it("getOperatorConfig should return requiresValue: false only for exists", () => {
        const existsConfig = getOperatorConfig("exists");
        expect(existsConfig.requiresValue).toBe(false);

        const otherOperators: CriterionOperator[] = ["gt", "lt", "gte", "lte", "between", "equals"];
        otherOperators.forEach((op) => {
          const config = getOperatorConfig(op);
          expect(config.requiresValue).toBe(true);
        });
      });
    });

    describe("value2 is ignored for non-between operators", () => {
      it("should reject value2 for gt operator", () => {
        const result = criterionRuleSchema.safeParse({
          ...validCriterionBase,
          operator: "gt",
          value: "5",
          value2: "10", // not allowed for gt
        });
        expect(result.success).toBe(false);
      });

      it("should reject value2 for equals operator", () => {
        const result = criterionRuleSchema.safeParse({
          ...validCriterionBase,
          operator: "equals",
          value: "5",
          value2: "10", // not allowed for equals
        });
        expect(result.success).toBe(false);
      });

      it("should accept null value2 for non-between operators", () => {
        const result = criterionRuleSchema.safeParse({
          ...validCriterionBase,
          operator: "gt",
          value: "5",
          value2: null,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  // =========================================================================
  // getOperatorConfig helper function
  // =========================================================================
  describe("getOperatorConfig helper function", () => {
    it("should return complete config for gt operator", () => {
      const config = getOperatorConfig("gt");
      expect(config.label).toBe("Greater than (>)");
      expect(config.symbol).toBe(">");
      expect(config.description).toContain("strictly greater");
      expect(config.requiresValue).toBe(true);
      expect(config.requiresValue2).toBe(false);
    });

    it("should return complete config for between operator", () => {
      const config = getOperatorConfig("between");
      expect(config.label).toBe("Between");
      expect(config.symbol).toBe("between");
      expect(config.description).toContain("range");
      expect(config.requiresValue).toBe(true);
      expect(config.requiresValue2).toBe(true);
    });

    it("should return complete config for exists operator", () => {
      const config = getOperatorConfig("exists");
      expect(config.label).toBe("Has value (exists)");
      expect(config.symbol).toBe("exists");
      expect(config.description).toContain("available");
      expect(config.requiresValue).toBe(false);
      expect(config.requiresValue2).toBe(false);
    });
  });

  // =========================================================================
  // formatOperatorDisplay helper function
  // =========================================================================
  describe("formatOperatorDisplay helper function", () => {
    it("should format gt operator correctly", () => {
      expect(formatOperatorDisplay("gt", "5")).toBe("> 5");
    });

    it("should format lt operator correctly", () => {
      expect(formatOperatorDisplay("lt", "10")).toBe("< 10");
    });

    it("should format gte operator correctly", () => {
      expect(formatOperatorDisplay("gte", "15")).toBe(">= 15");
    });

    it("should format lte operator correctly", () => {
      expect(formatOperatorDisplay("lte", "20")).toBe("<= 20");
    });

    it("should format equals operator correctly", () => {
      expect(formatOperatorDisplay("equals", "100")).toBe("= 100");
    });

    it("should format between operator correctly", () => {
      expect(formatOperatorDisplay("between", "10", "20")).toBe("between 10 and 20");
    });

    it("should format exists operator correctly", () => {
      expect(formatOperatorDisplay("exists")).toBe("exists");
    });

    it("should handle missing values with placeholders", () => {
      expect(formatOperatorDisplay("gt")).toBe("> ?");
      expect(formatOperatorDisplay("between", "10")).toBe("between 10 and ?");
      expect(formatOperatorDisplay("between")).toBe("between ? and ?");
    });
  });

  // =========================================================================
  // All operators acceptance tests
  // =========================================================================
  describe("All operators acceptance tests", () => {
    it("should accept valid criterion with gt operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "gt",
        value: "5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid criterion with lt operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "lt",
        value: "5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid criterion with gte operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "gte",
        value: "5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid criterion with lte operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "lte",
        value: "5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid criterion with equals operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "equals",
        value: "5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid criterion with between operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "between",
        value: "5",
        value2: "10",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid criterion with exists operator", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "exists",
        value: "",
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Decimal value acceptance tests
  // =========================================================================
  describe("Decimal value acceptance tests", () => {
    it("should accept positive decimal values", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "gt",
        value: "4.5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept negative decimal values", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "lt",
        value: "-2.5",
      });
      expect(result.success).toBe(true);
    });

    it("should accept integer values", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "gte",
        value: "100",
      });
      expect(result.success).toBe(true);
    });

    it("should accept zero as value", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "equals",
        value: "0",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric values", () => {
      const result = criterionRuleSchema.safeParse({
        ...validCriterionBase,
        operator: "gt",
        value: "abc",
      });
      expect(result.success).toBe(false);
    });
  });
});
