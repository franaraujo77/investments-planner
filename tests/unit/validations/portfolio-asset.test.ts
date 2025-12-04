/**
 * Portfolio Asset Validation Tests
 *
 * Story 3.2: Add Asset to Portfolio
 *
 * Tests for asset validation schema:
 * - AC-3.2.2: Required fields and constraints
 * - AC-3.2.3: Positive value validation
 * - AC-3.2.5: Symbol uppercase transform
 */

import { describe, it, expect } from "vitest";
import {
  addAssetSchema,
  ASSET_SYMBOL_MAX_LENGTH,
  ASSET_NAME_MAX_LENGTH,
  ASSET_MESSAGES,
  SUPPORTED_CURRENCIES,
} from "@/lib/validations/portfolio";

describe("Asset Validation", () => {
  describe("Constants", () => {
    it("should have correct ASSET_SYMBOL_MAX_LENGTH", () => {
      expect(ASSET_SYMBOL_MAX_LENGTH).toBe(20);
    });

    it("should have correct ASSET_NAME_MAX_LENGTH", () => {
      expect(ASSET_NAME_MAX_LENGTH).toBe(100);
    });

    it("should have 8 supported currencies", () => {
      expect(SUPPORTED_CURRENCIES).toHaveLength(8);
    });

    it("should include common currencies", () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(codes).toContain("USD");
      expect(codes).toContain("EUR");
      expect(codes).toContain("BRL");
    });
  });

  describe("addAssetSchema", () => {
    describe("symbol field", () => {
      it("should accept valid symbol", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should transform symbol to uppercase", () => {
        const result = addAssetSchema.safeParse({
          symbol: "aapl",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.symbol).toBe("AAPL");
        }
      });

      it("should trim whitespace from symbol", () => {
        const result = addAssetSchema.safeParse({
          symbol: "  AAPL  ",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.symbol).toBe("AAPL");
        }
      });

      it("should reject empty symbol", () => {
        const result = addAssetSchema.safeParse({
          symbol: "",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject symbol over 20 characters", () => {
        const result = addAssetSchema.safeParse({
          symbol: "A".repeat(21),
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("name field (optional)", () => {
      it("should accept input without name", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should accept valid name", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Apple Inc.");
        }
      });

      it("should trim whitespace from name", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          name: "  Apple Inc.  ",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Apple Inc.");
        }
      });

      it("should reject name over 100 characters", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          name: "A".repeat(101),
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("quantity field", () => {
      it("should accept positive integer quantity", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should accept positive decimal quantity (AC-3.2.5)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "BTC",
          quantity: "0.00000001", // 8 decimal places for crypto
          purchasePrice: "40000",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should reject zero quantity (AC-3.2.3)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "0",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative quantity (AC-3.2.3)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "-10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty quantity", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric quantity", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "abc",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("purchasePrice field", () => {
      it("should accept positive integer price", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should accept positive decimal price (AC-3.2.5)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150.1234", // 4 decimal places
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should reject zero price (AC-3.2.3)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "0",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative price (AC-3.2.3)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "-150",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty price", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "",
          currency: "USD",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("currency field", () => {
      it("should accept 3-character currency code", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should reject currency with less than 3 characters", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "US",
        });
        expect(result.success).toBe(false);
      });

      it("should reject currency with more than 3 characters", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USDD",
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty currency", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("complete valid inputs", () => {
      it("should accept minimal valid input", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          quantity: "1",
          purchasePrice: "1",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should accept full valid input", () => {
        const result = addAssetSchema.safeParse({
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: "10.5",
          purchasePrice: "150.25",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });

      it("should accept crypto-style input (8 decimal quantity)", () => {
        const result = addAssetSchema.safeParse({
          symbol: "BTC",
          name: "Bitcoin",
          quantity: "0.00100000",
          purchasePrice: "45000.00",
          currency: "USD",
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("ASSET_MESSAGES", () => {
    it("should have all required messages", () => {
      expect(ASSET_MESSAGES.SYMBOL_REQUIRED).toBeDefined();
      expect(ASSET_MESSAGES.SYMBOL_TOO_LONG).toBeDefined();
      expect(ASSET_MESSAGES.NAME_TOO_LONG).toBeDefined();
      expect(ASSET_MESSAGES.QUANTITY_REQUIRED).toBeDefined();
      expect(ASSET_MESSAGES.QUANTITY_POSITIVE).toBeDefined();
      expect(ASSET_MESSAGES.PRICE_REQUIRED).toBeDefined();
      expect(ASSET_MESSAGES.PRICE_POSITIVE).toBeDefined();
      expect(ASSET_MESSAGES.CURRENCY_REQUIRED).toBeDefined();
      expect(ASSET_MESSAGES.CURRENCY_LENGTH).toBeDefined();
      expect(ASSET_MESSAGES.ASSET_EXISTS).toBeDefined();
    });
  });
});

/**
 * Update Asset Validation Tests
 *
 * Story 3.3: Update Asset Holdings
 *
 * Tests for update asset validation schema:
 * - AC-3.3.2: Quantity validation (positive number)
 * - AC-3.3.3: Price validation (positive number)
 * - Partial update support (at least one field required)
 */

import { updateAssetSchema, UPDATE_ASSET_MESSAGES } from "@/lib/validations/portfolio";

describe("Update Asset Validation (Story 3.3)", () => {
  describe("UPDATE_ASSET_MESSAGES", () => {
    it("should have all required messages", () => {
      expect(UPDATE_ASSET_MESSAGES.QUANTITY_POSITIVE).toBe("Quantity must be positive");
      expect(UPDATE_ASSET_MESSAGES.PRICE_POSITIVE).toBe("Price must be positive");
      expect(UPDATE_ASSET_MESSAGES.AT_LEAST_ONE_FIELD).toBe("At least one field must be provided");
    });
  });

  describe("updateAssetSchema", () => {
    describe("quantity only updates", () => {
      it("should accept valid positive quantity", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "10",
        });
        expect(result.success).toBe(true);
      });

      it("should accept decimal quantity up to 8 places (AC-3.3.2)", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "0.00000001",
        });
        expect(result.success).toBe(true);
      });

      it("should reject zero quantity (AC-3.3.2)", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "0",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative quantity (AC-3.3.2)", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "-10",
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric quantity", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "abc",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("purchasePrice only updates", () => {
      it("should accept valid positive price", () => {
        const result = updateAssetSchema.safeParse({
          purchasePrice: "150.50",
        });
        expect(result.success).toBe(true);
      });

      it("should accept decimal price up to 4 places (AC-3.3.3)", () => {
        const result = updateAssetSchema.safeParse({
          purchasePrice: "150.1234",
        });
        expect(result.success).toBe(true);
      });

      it("should reject zero price (AC-3.3.3)", () => {
        const result = updateAssetSchema.safeParse({
          purchasePrice: "0",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative price (AC-3.3.3)", () => {
        const result = updateAssetSchema.safeParse({
          purchasePrice: "-150",
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric price", () => {
        const result = updateAssetSchema.safeParse({
          purchasePrice: "abc",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("both fields updates", () => {
      it("should accept both quantity and price", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "20",
          purchasePrice: "200",
        });
        expect(result.success).toBe(true);
      });

      it("should accept both fields with decimals", () => {
        const result = updateAssetSchema.safeParse({
          quantity: "10.5",
          purchasePrice: "150.25",
        });
        expect(result.success).toBe(true);
      });
    });

    describe("empty update rejection", () => {
      it("should reject empty object", () => {
        const result = updateAssetSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it("should reject object with undefined values only", () => {
        const result = updateAssetSchema.safeParse({
          quantity: undefined,
          purchasePrice: undefined,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
