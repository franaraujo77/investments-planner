/**
 * Recommendation Schemas Tests
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.2: Validation for Invalid Amounts
 *
 * Tests:
 * - contributionSchema validates numeric > 0
 * - contributionSchema rejects 0, negative, non-numeric
 * - contributionSchema limits to 2 decimal places
 * - dividendsSchema allows 0 and positive values
 * - validateContribution helper returns correct errors
 */

import { describe, it, expect } from "vitest";
import {
  contributionSchema,
  dividendsSchema,
  validateContribution,
  validateDividends,
  generateRecommendationSchema,
  CONTRIBUTION_ERRORS,
  DIVIDENDS_ERRORS,
} from "@/lib/validations/recommendation-schemas";

describe("contributionSchema", () => {
  describe("valid values", () => {
    it("accepts positive integer string", () => {
      const result = contributionSchema.safeParse("2000");
      expect(result.success).toBe(true);
    });

    it("accepts positive decimal string with 2 places", () => {
      const result = contributionSchema.safeParse("2000.50");
      expect(result.success).toBe(true);
    });

    it("accepts positive decimal string with 1 place", () => {
      const result = contributionSchema.safeParse("2000.5");
      expect(result.success).toBe(true);
    });

    it("accepts small positive values", () => {
      const result = contributionSchema.safeParse("0.01");
      expect(result.success).toBe(true);
    });

    it("accepts large values", () => {
      const result = contributionSchema.safeParse("999999999999");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values - AC-7.1.2", () => {
    it("rejects zero", () => {
      const result = contributionSchema.safeParse("0");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(CONTRIBUTION_ERRORS.MUST_BE_POSITIVE);
      }
    });

    it("rejects negative values", () => {
      const result = contributionSchema.safeParse("-100");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(CONTRIBUTION_ERRORS.MUST_BE_POSITIVE);
      }
    });

    it("rejects empty string", () => {
      const result = contributionSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(CONTRIBUTION_ERRORS.REQUIRED);
      }
    });

    it("rejects non-numeric string", () => {
      const result = contributionSchema.safeParse("abc");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(CONTRIBUTION_ERRORS.INVALID_NUMBER);
      }
    });

    it("rejects more than 2 decimal places", () => {
      const result = contributionSchema.safeParse("100.123");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(CONTRIBUTION_ERRORS.TOO_MANY_DECIMALS);
      }
    });

    it("rejects values exceeding maximum", () => {
      const result = contributionSchema.safeParse("10000000000000"); // 10 trillion
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(CONTRIBUTION_ERRORS.TOO_LARGE);
      }
    });
  });
});

describe("dividendsSchema", () => {
  describe("valid values", () => {
    it("accepts zero", () => {
      const result = dividendsSchema.safeParse("0");
      expect(result.success).toBe(true);
    });

    it("accepts zero with decimals", () => {
      const result = dividendsSchema.safeParse("0.00");
      expect(result.success).toBe(true);
    });

    it("accepts positive values", () => {
      const result = dividendsSchema.safeParse("100.50");
      expect(result.success).toBe(true);
    });

    it("accepts empty string", () => {
      const result = dividendsSchema.safeParse("");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("rejects negative values", () => {
      const result = dividendsSchema.safeParse("-50");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(DIVIDENDS_ERRORS.MUST_BE_NON_NEGATIVE);
      }
    });

    it("rejects non-numeric string", () => {
      const result = dividendsSchema.safeParse("abc");
      expect(result.success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      const result = dividendsSchema.safeParse("50.123");
      expect(result.success).toBe(false);
    });
  });
});

describe("validateContribution helper", () => {
  it("returns undefined for valid contribution", () => {
    expect(validateContribution("2000")).toBeUndefined();
    expect(validateContribution("2000.50")).toBeUndefined();
    expect(validateContribution("0.01")).toBeUndefined();
  });

  it("returns error message for zero - AC-7.1.2", () => {
    expect(validateContribution("0")).toBe(CONTRIBUTION_ERRORS.MUST_BE_POSITIVE);
  });

  it("returns error message for negative values", () => {
    expect(validateContribution("-100")).toBe(CONTRIBUTION_ERRORS.MUST_BE_POSITIVE);
  });

  it("returns error message for empty string", () => {
    expect(validateContribution("")).toBe(CONTRIBUTION_ERRORS.REQUIRED);
  });

  it("returns error message for non-numeric", () => {
    expect(validateContribution("abc")).toBe(CONTRIBUTION_ERRORS.INVALID_NUMBER);
  });
});

describe("validateDividends helper", () => {
  it("returns undefined for valid dividends", () => {
    expect(validateDividends("0")).toBeUndefined();
    expect(validateDividends("100")).toBeUndefined();
    expect(validateDividends("")).toBeUndefined();
  });

  it("returns error message for negative values", () => {
    expect(validateDividends("-50")).toBe(DIVIDENDS_ERRORS.MUST_BE_NON_NEGATIVE);
  });
});

describe("generateRecommendationSchema", () => {
  it("validates complete request", () => {
    const result = generateRecommendationSchema.safeParse({
      contribution: "2000.00",
      dividends: "100.50",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty dividends", () => {
    const result = generateRecommendationSchema.safeParse({
      contribution: "2000.00",
      dividends: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid contribution", () => {
    const result = generateRecommendationSchema.safeParse({
      contribution: "0",
      dividends: "100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative dividends", () => {
    const result = generateRecommendationSchema.safeParse({
      contribution: "2000",
      dividends: "-50",
    });
    expect(result.success).toBe(false);
  });
});
