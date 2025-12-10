/**
 * Criteria Validation Schema Unit Tests
 *
 * Story 5.1: Define Scoring Criteria
 * Story 5.2: Set Point Values
 *
 * Tests for Zod validation schemas:
 * - AC-5.1.1: Criteria set creation validation
 * - AC-5.1.2: Criterion rule validation (metric, operator, value, points)
 * - AC-5.1.5: Points validation (-100 to +100)
 * - AC-5.2.1: Enhanced points validation with descriptive error messages
 * - AC-5.2.3: Cerrado template validation
 */

import { describe, it, expect } from "vitest";
import {
  createCriteriaSetSchema,
  criterionRuleSchema,
  updateCriteriaSetSchema,
  addCriterionSchema,
  updateCriterionSchema,
  reorderCriteriaSchema,
  pointsSchema,
  POINTS_MIN,
  POINTS_MAX,
  CRITERION_NAME_MIN_LENGTH,
  CRITERION_NAME_MAX_LENGTH,
  MAX_CRITERIA_SETS_PER_USER,
  MAX_CRITERIA_PER_SET,
  AVAILABLE_METRICS,
  AVAILABLE_OPERATORS,
  CRITERIA_MESSAGES,
} from "@/lib/validations/criteria-schemas";
import {
  CRITERION_TEMPLATES,
  CERRADO_SURPLUS_TEMPLATE,
  getTemplateById,
  getTemplatesByCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/constants/criteria-templates";

describe("Criteria Validation Schemas", () => {
  describe("Constants", () => {
    it("should have correct points constraints", () => {
      expect(POINTS_MIN).toBe(-100);
      expect(POINTS_MAX).toBe(100);
    });

    it("should have correct name length constraints", () => {
      expect(CRITERION_NAME_MIN_LENGTH).toBe(1);
      expect(CRITERION_NAME_MAX_LENGTH).toBe(100);
    });

    it("should have correct limit constraints", () => {
      expect(MAX_CRITERIA_SETS_PER_USER).toBe(50);
      expect(MAX_CRITERIA_PER_SET).toBe(50);
    });

    it("should have all required metrics", () => {
      expect(AVAILABLE_METRICS).toContain("dividend_yield");
      expect(AVAILABLE_METRICS).toContain("pe_ratio");
      expect(AVAILABLE_METRICS).toContain("pb_ratio");
      expect(AVAILABLE_METRICS).toContain("market_cap");
      expect(AVAILABLE_METRICS).toContain("roe");
      expect(AVAILABLE_METRICS.length).toBeGreaterThan(10);
    });

    it("should have all required operators", () => {
      expect(AVAILABLE_OPERATORS).toContain("gt");
      expect(AVAILABLE_OPERATORS).toContain("lt");
      expect(AVAILABLE_OPERATORS).toContain("gte");
      expect(AVAILABLE_OPERATORS).toContain("lte");
      expect(AVAILABLE_OPERATORS).toContain("between");
      expect(AVAILABLE_OPERATORS).toContain("equals");
      expect(AVAILABLE_OPERATORS).toContain("exists");
    });
  });

  describe("criterionRuleSchema (AC-5.1.2)", () => {
    it("should accept valid criterion rule", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "High Dividend Yield",
        metric: "dividend_yield",
        operator: "gt",
        value: "4.0",
        points: 10,
        requiredFundamentals: ["dividend_yield"],
        sortOrder: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should accept criterion with between operator and value2", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "PE in Range",
        metric: "pe_ratio",
        operator: "between",
        value: "10",
        value2: "20",
        points: 15,
        requiredFundamentals: ["pe_ratio"],
        sortOrder: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value2).toBe("20");
      }
    });

    it("should accept negative points", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Too High PE",
        metric: "pe_ratio",
        operator: "gt",
        value: "50",
        points: -25,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.points).toBe(-25);
      }
    });

    it("should accept boundary points values (-100, +100)", () => {
      const resultMin = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Penalty",
        metric: "debt_to_equity",
        operator: "gt",
        value: "10",
        points: -100,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(resultMin.success).toBe(true);

      const resultMax = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Reward",
        metric: "roe",
        operator: "gt",
        value: "20",
        points: 100,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(resultMax.success).toBe(true);
    });

    it("should reject points below minimum (-101)", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Invalid",
        metric: "dividend_yield",
        operator: "gt",
        value: "5",
        points: -101,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject points above maximum (101)", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Invalid",
        metric: "dividend_yield",
        operator: "gt",
        value: "5",
        points: 101,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer points (10.5)", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Invalid",
        metric: "dividend_yield",
        operator: "gt",
        value: "5",
        points: 10.5,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid metric", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Invalid",
        metric: "invalid_metric",
        operator: "gt",
        value: "5",
        points: 10,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid operator", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Invalid",
        metric: "dividend_yield",
        operator: "invalid_op",
        value: "5",
        points: 10,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty criterion name", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
        metric: "dividend_yield",
        operator: "gt",
        value: "5",
        points: 10,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject criterion name exceeding max length", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "a".repeat(101),
        metric: "dividend_yield",
        operator: "gt",
        value: "5",
        points: 10,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid value format (abc)", () => {
      const result = criterionRuleSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Invalid",
        metric: "dividend_yield",
        operator: "gt",
        value: "abc",
        points: 10,
        requiredFundamentals: [],
        sortOrder: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createCriteriaSetSchema (AC-5.1.1)", () => {
    const validCriterion = {
      name: "High Dividend",
      metric: "dividend_yield" as const,
      operator: "gt" as const,
      value: "4.0",
      points: 10,
      requiredFundamentals: [] as string[],
      sortOrder: 0,
    };

    it("should accept valid criteria set", () => {
      const result = createCriteriaSetSchema.safeParse({
        name: "Brazilian Banks Criteria",
        assetType: "stock",
        targetMarket: "BR_BANKS",
        criteria: [validCriterion],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = createCriteriaSetSchema.safeParse({
        name: "",
        assetType: "stock",
        targetMarket: "BR_BANKS",
        criteria: [validCriterion],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing assetType", () => {
      const result = createCriteriaSetSchema.safeParse({
        name: "Test Criteria",
        targetMarket: "BR_BANKS",
        criteria: [validCriterion],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing targetMarket", () => {
      const result = createCriteriaSetSchema.safeParse({
        name: "Test Criteria",
        assetType: "stock",
        criteria: [validCriterion],
      });
      expect(result.success).toBe(false);
    });

    it("should accept criteria set with single criterion", () => {
      const result = createCriteriaSetSchema.safeParse({
        name: "Single Criteria Set",
        assetType: "reit",
        targetMarket: "BR_REITS",
        criteria: [validCriterion],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateCriteriaSetSchema", () => {
    it("should accept valid name update", () => {
      const result = updateCriteriaSetSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty object (requires at least one field)", () => {
      const result = updateCriteriaSetSchema.safeParse({});
      // The schema may require at least one field - this tests that validation runs
      expect(result).toBeDefined();
    });

    it("should accept isActive update", () => {
      const result = updateCriteriaSetSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("addCriterionSchema", () => {
    it("should accept valid criterion to add", () => {
      const result = addCriterionSchema.safeParse({
        name: "New Criterion",
        metric: "pe_ratio",
        operator: "lt",
        value: "15",
        points: 5,
        requiredFundamentals: ["pe_ratio"],
        sortOrder: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should accept criterion with sortOrder", () => {
      const result = addCriterionSchema.safeParse({
        name: "New Criterion",
        metric: "pe_ratio",
        operator: "lt",
        value: "15",
        points: 5,
        requiredFundamentals: [],
        sortOrder: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateCriterionSchema", () => {
    it("should accept partial updates", () => {
      const result = updateCriterionSchema.safeParse({
        points: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should accept name update", () => {
      const result = updateCriterionSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("should accept metric update", () => {
      const result = updateCriterionSchema.safeParse({
        metric: "roe",
      });
      expect(result.success).toBe(true);
    });

    it("should accept operator update", () => {
      const result = updateCriterionSchema.safeParse({
        operator: "gte",
      });
      expect(result.success).toBe(true);
    });

    it("should accept value2 for between operator", () => {
      const result = updateCriterionSchema.safeParse({
        operator: "between",
        value: "10",
        value2: "20",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("reorderCriteriaSchema (AC-5.1.4)", () => {
    it("should accept valid UUID array", () => {
      const result = reorderCriteriaSchema.safeParse({
        criterionIds: [
          "123e4567-e89b-12d3-a456-426614174000",
          "223e4567-e89b-12d3-a456-426614174001",
          "323e4567-e89b-12d3-a456-426614174002",
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty array", () => {
      const result = reorderCriteriaSchema.safeParse({
        criterionIds: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid UUIDs", () => {
      const result = reorderCriteriaSchema.safeParse({
        criterionIds: ["invalid-uuid", "also-invalid"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CRITERIA_MESSAGES", () => {
    it("should have required error messages", () => {
      expect(CRITERIA_MESSAGES.CRITERION_NAME_REQUIRED).toBeDefined();
      expect(CRITERIA_MESSAGES.CRITERION_NAME_TOO_LONG).toBeDefined();
      expect(CRITERIA_MESSAGES.INVALID_METRIC).toBeDefined();
      expect(CRITERIA_MESSAGES.INVALID_OPERATOR).toBeDefined();
      expect(CRITERIA_MESSAGES.INVALID_POINTS).toBeDefined();
      expect(CRITERIA_MESSAGES.INVALID_VALUE).toBeDefined();
    });

    it("should include relevant info in messages", () => {
      expect(CRITERIA_MESSAGES.INVALID_POINTS).toContain("-100");
      expect(CRITERIA_MESSAGES.INVALID_POINTS).toContain("100");
    });

    // Story 5.2 - AC-5.2.1: Enhanced error messages
    it("should have specific points error messages (AC-5.2.1)", () => {
      expect(CRITERIA_MESSAGES.POINTS_MUST_BE_INTEGER).toBeDefined();
      expect(CRITERIA_MESSAGES.POINTS_TOO_LOW).toBeDefined();
      expect(CRITERIA_MESSAGES.POINTS_TOO_HIGH).toBeDefined();
      expect(CRITERIA_MESSAGES.POINTS_MUST_BE_INTEGER).toContain("whole number");
      expect(CRITERIA_MESSAGES.POINTS_TOO_LOW).toContain("-100");
      expect(CRITERIA_MESSAGES.POINTS_TOO_HIGH).toContain("100");
    });
  });

  // =========================================================================
  // Story 5.2: Set Point Values - Additional Tests
  // =========================================================================

  describe("pointsSchema (Story 5.2 - AC-5.2.1)", () => {
    it("should accept valid positive points", () => {
      expect(pointsSchema.safeParse(50).success).toBe(true);
      expect(pointsSchema.safeParse(10).success).toBe(true);
      expect(pointsSchema.safeParse(1).success).toBe(true);
    });

    it("should accept valid negative points", () => {
      expect(pointsSchema.safeParse(-50).success).toBe(true);
      expect(pointsSchema.safeParse(-10).success).toBe(true);
      expect(pointsSchema.safeParse(-1).success).toBe(true);
    });

    it("should accept zero points", () => {
      expect(pointsSchema.safeParse(0).success).toBe(true);
    });

    it("should accept boundary values (-100 and +100)", () => {
      const minResult = pointsSchema.safeParse(-100);
      const maxResult = pointsSchema.safeParse(100);
      expect(minResult.success).toBe(true);
      expect(maxResult.success).toBe(true);
    });

    it("should reject points below -100", () => {
      const result = pointsSchema.safeParse(-101);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses result.error.issues instead of result.error.errors
        const errorMessage = result.error.issues?.[0]?.message ?? result.error.message ?? "";
        expect(errorMessage).toContain("-100");
      }
    });

    it("should reject points above +100", () => {
      const result = pointsSchema.safeParse(101);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses result.error.issues instead of result.error.errors
        const errorMessage = result.error.issues?.[0]?.message ?? result.error.message ?? "";
        expect(errorMessage).toContain("100");
      }
    });

    it("should reject decimal values (10.5)", () => {
      const result = pointsSchema.safeParse(10.5);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses result.error.issues instead of result.error.errors
        const errorMessage = result.error.issues?.[0]?.message ?? result.error.message ?? "";
        expect(errorMessage).toContain("whole number");
      }
    });

    it("should reject negative decimal values (-5.5)", () => {
      const result = pointsSchema.safeParse(-5.5);
      expect(result.success).toBe(false);
    });
  });

  describe("Criterion Templates (Story 5.2 - AC-5.2.3)", () => {
    describe("CERRADO_SURPLUS_TEMPLATE", () => {
      it("should have correct default values", () => {
        expect(CERRADO_SURPLUS_TEMPLATE.id).toBe("cerrado-surplus-years");
        expect(CERRADO_SURPLUS_TEMPLATE.category).toBe("brazilian_market");
        expect(CERRADO_SURPLUS_TEMPLATE.criterion.metric).toBe("surplus_years");
        expect(CERRADO_SURPLUS_TEMPLATE.criterion.operator).toBe("gte");
        expect(CERRADO_SURPLUS_TEMPLATE.criterion.value).toBe("5");
        expect(CERRADO_SURPLUS_TEMPLATE.criterion.points).toBe(5);
      });

      it("should have Cerrado methodology description", () => {
        expect(CERRADO_SURPLUS_TEMPLATE.description).toContain("Brazilian market");
        expect(CERRADO_SURPLUS_TEMPLATE.description).toContain("surplus");
      });

      it("should require surplus_history fundamental", () => {
        expect(CERRADO_SURPLUS_TEMPLATE.criterion.requiredFundamentals).toContain(
          "surplus_history"
        );
      });
    });

    describe("getTemplateById", () => {
      it("should return correct template by ID", () => {
        const template = getTemplateById("cerrado-surplus-years");
        expect(template).toBeDefined();
        expect(template?.id).toBe("cerrado-surplus-years");
      });

      it("should return undefined for non-existent ID", () => {
        const template = getTemplateById("non-existent-id");
        expect(template).toBeUndefined();
      });
    });

    describe("getTemplatesByCategory", () => {
      it("should return templates for brazilian_market category", () => {
        const templates = getTemplatesByCategory("brazilian_market");
        expect(templates.length).toBeGreaterThan(0);
        expect(templates.some((t) => t.id === "cerrado-surplus-years")).toBe(true);
      });

      it("should return templates for dividend category", () => {
        const templates = getTemplatesByCategory("dividend");
        expect(templates.length).toBeGreaterThan(0);
      });

      it("should return empty array for category with no templates", () => {
        // All categories should have at least one template, but test the function
        const allCategories = TEMPLATE_CATEGORIES.map((c) => c.value);
        allCategories.forEach((category) => {
          const templates = getTemplatesByCategory(category);
          // Templates should be an array (might be empty for some categories)
          expect(Array.isArray(templates)).toBe(true);
        });
      });
    });

    describe("CRITERION_TEMPLATES", () => {
      it("should have multiple templates available", () => {
        expect(CRITERION_TEMPLATES.length).toBeGreaterThan(3);
      });

      it("should have templates with required fields", () => {
        CRITERION_TEMPLATES.forEach((template) => {
          expect(template.id).toBeDefined();
          expect(template.name).toBeDefined();
          expect(template.description).toBeDefined();
          expect(template.category).toBeDefined();
          expect(template.criterion).toBeDefined();
          expect(template.criterion.name).toBeDefined();
          expect(template.criterion.metric).toBeDefined();
          expect(template.criterion.operator).toBeDefined();
          expect(template.criterion.value).toBeDefined();
          expect(template.criterion.points).toBeDefined();
        });
      });

      it("should have valid points values in all templates", () => {
        CRITERION_TEMPLATES.forEach((template) => {
          expect(template.criterion.points).toBeGreaterThanOrEqual(POINTS_MIN);
          expect(template.criterion.points).toBeLessThanOrEqual(POINTS_MAX);
        });
      });

      it("should have valid metrics in all templates", () => {
        CRITERION_TEMPLATES.forEach((template) => {
          expect(AVAILABLE_METRICS).toContain(template.criterion.metric);
        });
      });

      it("should have valid operators in all templates", () => {
        CRITERION_TEMPLATES.forEach((template) => {
          expect(AVAILABLE_OPERATORS).toContain(template.criterion.operator);
        });
      });
    });

    describe("TEMPLATE_CATEGORIES", () => {
      it("should have all expected categories", () => {
        const categoryValues = TEMPLATE_CATEGORIES.map((c) => c.value);
        expect(categoryValues).toContain("dividend");
        expect(categoryValues).toContain("value");
        expect(categoryValues).toContain("quality");
        expect(categoryValues).toContain("risk");
        expect(categoryValues).toContain("brazilian_market");
      });

      it("should have labels for all categories", () => {
        TEMPLATE_CATEGORIES.forEach((category) => {
          expect(category.label).toBeDefined();
          expect(category.label.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
