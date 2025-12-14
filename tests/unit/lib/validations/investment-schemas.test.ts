/**
 * Investment Schema Validation Tests
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.5: Validation Prevents Invalid Submissions
 *
 * Tests for investment confirmation validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  investmentItemSchema,
  confirmInvestmentSchema,
  validateConfirmInvestment,
  validateTotalDoesNotExceedAvailable,
  validateNoNegativeAmounts,
} from "@/lib/validations/investment-schemas";

// =============================================================================
// INVESTMENT ITEM SCHEMA TESTS
// =============================================================================

describe("investmentItemSchema", () => {
  it("should validate a valid investment item", () => {
    const validItem = {
      assetId: "123e4567-e89b-12d3-a456-426614174000",
      ticker: "AAPL",
      actualAmount: "1000.50",
      pricePerUnit: "150.25",
    };

    const result = investmentItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID for assetId", () => {
    const invalidItem = {
      assetId: "invalid-uuid",
      ticker: "AAPL",
      actualAmount: "1000.50",
      pricePerUnit: "150.25",
    };

    const result = investmentItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["assetId"]);
    }
  });

  it("should reject empty ticker", () => {
    const invalidItem = {
      assetId: "123e4567-e89b-12d3-a456-426614174000",
      ticker: "",
      actualAmount: "1000.50",
      pricePerUnit: "150.25",
    };

    const result = investmentItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ticker"]);
    }
  });

  it("should reject negative actualAmount", () => {
    const invalidItem = {
      assetId: "123e4567-e89b-12d3-a456-426614174000",
      ticker: "AAPL",
      actualAmount: "-100",
      pricePerUnit: "150.25",
    };

    const result = investmentItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["actualAmount"]);
      expect(result.error.issues[0].message).toBe("Amount must be a non-negative number");
    }
  });

  it("should accept zero actualAmount", () => {
    const validItem = {
      assetId: "123e4567-e89b-12d3-a456-426614174000",
      ticker: "AAPL",
      actualAmount: "0",
      pricePerUnit: "150.25",
    };

    const result = investmentItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("should reject non-positive pricePerUnit", () => {
    const invalidItem = {
      assetId: "123e4567-e89b-12d3-a456-426614174000",
      ticker: "AAPL",
      actualAmount: "1000.50",
      pricePerUnit: "0",
    };

    const result = investmentItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["pricePerUnit"]);
      expect(result.error.issues[0].message).toBe("Price must be a positive number");
    }
  });

  it("should reject non-numeric actualAmount", () => {
    const invalidItem = {
      assetId: "123e4567-e89b-12d3-a456-426614174000",
      ticker: "AAPL",
      actualAmount: "not-a-number",
      pricePerUnit: "150.25",
    };

    const result = investmentItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// CONFIRM INVESTMENT SCHEMA TESTS
// =============================================================================

describe("confirmInvestmentSchema", () => {
  it("should validate a valid confirmation request", () => {
    const validRequest = {
      recommendationId: "123e4567-e89b-12d3-a456-426614174000",
      investments: [
        {
          assetId: "123e4567-e89b-12d3-a456-426614174001",
          ticker: "AAPL",
          actualAmount: "1000.50",
          pricePerUnit: "150.25",
        },
        {
          assetId: "123e4567-e89b-12d3-a456-426614174002",
          ticker: "GOOGL",
          actualAmount: "500.00",
          pricePerUnit: "125.00",
        },
      ],
    };

    const result = confirmInvestmentSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("should reject invalid recommendationId", () => {
    const invalidRequest = {
      recommendationId: "invalid-uuid",
      investments: [
        {
          assetId: "123e4567-e89b-12d3-a456-426614174001",
          ticker: "AAPL",
          actualAmount: "1000.50",
          pricePerUnit: "150.25",
        },
      ],
    };

    const result = confirmInvestmentSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["recommendationId"]);
    }
  });

  it("should reject empty investments array", () => {
    const invalidRequest = {
      recommendationId: "123e4567-e89b-12d3-a456-426614174000",
      investments: [],
    };

    const result = confirmInvestmentSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["investments"]);
      expect(result.error.issues[0].message).toBe("At least one investment is required");
    }
  });

  it("should reject if any investment item is invalid", () => {
    const invalidRequest = {
      recommendationId: "123e4567-e89b-12d3-a456-426614174000",
      investments: [
        {
          assetId: "123e4567-e89b-12d3-a456-426614174001",
          ticker: "AAPL",
          actualAmount: "-100", // Invalid: negative
          pricePerUnit: "150.25",
        },
      ],
    };

    const result = confirmInvestmentSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// VALIDATE CONFIRM INVESTMENT HELPER TESTS
// =============================================================================

describe("validateConfirmInvestment", () => {
  it("should return success=true for valid input", () => {
    const validInput = {
      recommendationId: "123e4567-e89b-12d3-a456-426614174000",
      investments: [
        {
          assetId: "123e4567-e89b-12d3-a456-426614174001",
          ticker: "AAPL",
          actualAmount: "1000.50",
          pricePerUnit: "150.25",
        },
      ],
    };

    const result = validateConfirmInvestment(validInput);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("should return success=false for invalid input", () => {
    const invalidInput = {
      recommendationId: "invalid",
      investments: [],
    };

    const result = validateConfirmInvestment(invalidInput);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// VALIDATE TOTAL DOES NOT EXCEED AVAILABLE TESTS
// =============================================================================

describe("validateTotalDoesNotExceedAvailable", () => {
  it("should return null when total is less than available", () => {
    const investments = [{ actualAmount: "500.00" }, { actualAmount: "300.00" }];

    const result = validateTotalDoesNotExceedAvailable(investments, "1000.00");
    expect(result).toBeNull();
  });

  it("should return null when total equals available", () => {
    const investments = [{ actualAmount: "500.00" }, { actualAmount: "500.00" }];

    const result = validateTotalDoesNotExceedAvailable(investments, "1000.00");
    expect(result).toBeNull();
  });

  it("should return error when total exceeds available", () => {
    const investments = [{ actualAmount: "600.00" }, { actualAmount: "500.00" }];

    const result = validateTotalDoesNotExceedAvailable(investments, "1000.00");
    expect(result).toBe("Total exceeds available capital");
  });

  it("should return error for invalid available capital", () => {
    const investments = [{ actualAmount: "500.00" }];

    const result = validateTotalDoesNotExceedAvailable(investments, "invalid");
    expect(result).toBe("Invalid available capital");
  });

  it("should handle empty investments array", () => {
    const result = validateTotalDoesNotExceedAvailable([], "1000.00");
    expect(result).toBeNull();
  });

  it("should tolerate small floating point differences", () => {
    const investments = [
      { actualAmount: "333.33" },
      { actualAmount: "333.33" },
      { actualAmount: "333.34" },
    ];

    // 333.33 + 333.33 + 333.34 = 1000.00 (within tolerance)
    const result = validateTotalDoesNotExceedAvailable(investments, "1000.00");
    expect(result).toBeNull();
  });
});

// =============================================================================
// VALIDATE NO NEGATIVE AMOUNTS TESTS
// =============================================================================

describe("validateNoNegativeAmounts", () => {
  it("should return null when all amounts are positive", () => {
    const investments = [{ actualAmount: "500.00" }, { actualAmount: "300.00" }];

    const result = validateNoNegativeAmounts(investments);
    expect(result).toBeNull();
  });

  it("should return null when amounts include zero", () => {
    const investments = [
      { actualAmount: "500.00" },
      { actualAmount: "0" },
      { actualAmount: "0.00" },
    ];

    const result = validateNoNegativeAmounts(investments);
    expect(result).toBeNull();
  });

  it("should return error when any amount is negative", () => {
    const investments = [{ actualAmount: "500.00" }, { actualAmount: "-100.00" }];

    const result = validateNoNegativeAmounts(investments);
    expect(result).toBe("Amount cannot be negative");
  });

  it("should return error for invalid numeric strings", () => {
    const investments = [{ actualAmount: "not-a-number" }];

    const result = validateNoNegativeAmounts(investments);
    expect(result).toBe("Amount cannot be negative");
  });

  it("should handle empty investments array", () => {
    const result = validateNoNegativeAmounts([]);
    expect(result).toBeNull();
  });
});
