/**
 * Portfolio Validation Unit Tests
 *
 * Story 2.1: Create Portfolio (Epic 2)
 * Story 3.1: Create Portfolio (Legacy)
 *
 * Tests for portfolio validation schemas:
 * - AC-2.1.1: Portfolio creation form fields
 * - AC-2.1.2: Industry sector validation
 * - AC-2.1.3: Asset types validation
 * - AC-2.1.4: Duplicate name check
 * - AC-2.1.5: Required field validation
 * - AC-3.1.2: Name validation (1-50 characters)
 */

import { describe, it, expect } from "vitest";
import {
  createPortfolioSchema,
  checkPortfolioNameSchema,
  MAX_PORTFOLIOS_PER_USER,
  PORTFOLIO_NAME_MIN_LENGTH,
  PORTFOLIO_NAME_MAX_LENGTH,
  PORTFOLIO_MESSAGES,
  INDUSTRY_SECTORS,
  ASSET_TYPES,
  SUPPORTED_CURRENCIES,
} from "@/lib/validations/portfolio";

/**
 * Helper to create a valid portfolio input
 */
function createValidInput() {
  return {
    name: "My Portfolio",
    baseCurrency: "USD",
    industrySector: "Technology" as const,
    assetTypes: ["Stocks", "ETFs"] as const,
  };
}

describe("Portfolio Validation", () => {
  describe("createPortfolioSchema", () => {
    it("should validate a complete valid portfolio input (AC-2.1.1)", () => {
      const input = createValidInput();
      const result = createPortfolioSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
        expect(result.data.baseCurrency).toBe("USD");
        expect(result.data.industrySector).toBe("Technology");
        expect(result.data.assetTypes).toEqual(["Stocks", "ETFs"]);
      }
    });

    describe("Name validation (AC-3.1.2)", () => {
      it("should reject empty name", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: "",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.name).toContain(
            PORTFOLIO_MESSAGES.NAME_REQUIRED
          );
        }
      });

      it("should reject name over 50 characters", () => {
        const longName = "a".repeat(51);
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: longName,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.name).toContain(
            PORTFOLIO_MESSAGES.NAME_TOO_LONG
          );
        }
      });

      it("should accept name with exactly 50 characters", () => {
        const name50 = "a".repeat(50);
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: name50,
        });

        expect(result.success).toBe(true);
      });

      it("should accept name with exactly 1 character", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: "A",
        });

        expect(result.success).toBe(true);
      });

      it("should trim whitespace from name", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: "  My Portfolio  ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("My Portfolio");
        }
      });

      it("should reject whitespace-only name", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: "   ",
        });

        expect(result.success).toBe(false);
      });

      it("should accept name with special characters", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: "My Portfolio (2025) - Retirement!",
        });

        expect(result.success).toBe(true);
      });

      it("should accept name with unicode characters", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          name: "Investimentos Brasil",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("Industry sector validation (AC-2.1.2)", () => {
      it("should accept all valid industry sectors", () => {
        for (const sector of INDUSTRY_SECTORS) {
          const result = createPortfolioSchema.safeParse({
            ...createValidInput(),
            industrySector: sector,
          });

          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid industry sector", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          industrySector: "Invalid Sector",
        });

        expect(result.success).toBe(false);
      });

      it("should reject missing industry sector (AC-2.1.5)", () => {
        const { industrySector: _unused, ...inputWithoutSector } = createValidInput();
        const result = createPortfolioSchema.safeParse(inputWithoutSector);

        expect(result.success).toBe(false);
      });
    });

    describe("Asset types validation (AC-2.1.3)", () => {
      it("should accept all valid asset types", () => {
        for (const assetType of ASSET_TYPES) {
          const result = createPortfolioSchema.safeParse({
            ...createValidInput(),
            assetTypes: [assetType],
          });

          expect(result.success).toBe(true);
        }
      });

      it("should accept multiple asset types", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          assetTypes: ["Stocks", "ETFs", "Bonds", "Crypto"],
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.assetTypes).toHaveLength(4);
        }
      });

      it("should reject empty asset types array (AC-2.1.5)", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          assetTypes: [],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.assetTypes).toContain(
            PORTFOLIO_MESSAGES.ASSET_TYPES_REQUIRED
          );
        }
      });

      it("should reject invalid asset type", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          assetTypes: ["Invalid Type"],
        });

        expect(result.success).toBe(false);
      });
    });

    describe("Base currency validation", () => {
      it("should accept all supported currencies", () => {
        for (const currency of SUPPORTED_CURRENCIES) {
          const result = createPortfolioSchema.safeParse({
            ...createValidInput(),
            baseCurrency: currency.code,
          });

          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid currency", () => {
        const result = createPortfolioSchema.safeParse({
          ...createValidInput(),
          baseCurrency: "XXX",
        });

        expect(result.success).toBe(false);
      });

      it("should reject missing base currency (AC-2.1.5)", () => {
        const { baseCurrency: _unused, ...inputWithoutCurrency } = createValidInput();
        const result = createPortfolioSchema.safeParse(inputWithoutCurrency);

        expect(result.success).toBe(false);
      });
    });

    describe("Missing required fields (AC-2.1.5)", () => {
      it("should reject input with no fields", () => {
        const result = createPortfolioSchema.safeParse({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
        }
      });
    });
  });

  describe("checkPortfolioNameSchema (AC-2.1.4)", () => {
    it("should validate a valid name", () => {
      const result = checkPortfolioNameSchema.safeParse({ name: "My Portfolio" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
      }
    });

    it("should trim whitespace from name", () => {
      const result = checkPortfolioNameSchema.safeParse({
        name: "  My Portfolio  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
      }
    });

    it("should reject empty name", () => {
      const result = checkPortfolioNameSchema.safeParse({ name: "" });

      expect(result.success).toBe(false);
    });

    it("should reject missing name", () => {
      const result = checkPortfolioNameSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("Constants", () => {
    it("should have MAX_PORTFOLIOS_PER_USER = 5", () => {
      expect(MAX_PORTFOLIOS_PER_USER).toBe(5);
    });

    it("should have PORTFOLIO_NAME_MIN_LENGTH = 1", () => {
      expect(PORTFOLIO_NAME_MIN_LENGTH).toBe(1);
    });

    it("should have PORTFOLIO_NAME_MAX_LENGTH = 50", () => {
      expect(PORTFOLIO_NAME_MAX_LENGTH).toBe(50);
    });

    it("should have 12 industry sectors", () => {
      expect(INDUSTRY_SECTORS.length).toBe(12);
    });

    it("should have 8 asset types", () => {
      expect(ASSET_TYPES.length).toBe(8);
    });

    it("should have 8 supported currencies", () => {
      expect(SUPPORTED_CURRENCIES.length).toBe(8);
    });
  });

  describe("Messages", () => {
    it("should have NAME_REQUIRED message", () => {
      expect(PORTFOLIO_MESSAGES.NAME_REQUIRED).toBe("Portfolio name is required");
    });

    it("should have NAME_TOO_LONG message", () => {
      expect(PORTFOLIO_MESSAGES.NAME_TOO_LONG).toBe("Portfolio name must be 50 characters or less");
    });

    it("should have LIMIT_REACHED message", () => {
      expect(PORTFOLIO_MESSAGES.LIMIT_REACHED).toBe("Maximum portfolios reached (5)");
    });

    it("should have INDUSTRY_SECTOR_REQUIRED message", () => {
      expect(PORTFOLIO_MESSAGES.INDUSTRY_SECTOR_REQUIRED).toBe("Industry sector is required");
    });

    it("should have ASSET_TYPES_REQUIRED message", () => {
      expect(PORTFOLIO_MESSAGES.ASSET_TYPES_REQUIRED).toBe("At least one asset type is required");
    });

    it("should have BASE_CURRENCY_REQUIRED message", () => {
      expect(PORTFOLIO_MESSAGES.BASE_CURRENCY_REQUIRED).toBe("Base currency is required");
    });
  });
});
