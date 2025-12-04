/**
 * Portfolio Validation Unit Tests
 *
 * Story 3.1: Create Portfolio
 *
 * Tests for portfolio validation schemas:
 * - AC-3.1.2: Name validation (1-50 characters)
 */

import { describe, it, expect } from "vitest";
import {
  createPortfolioSchema,
  MAX_PORTFOLIOS_PER_USER,
  PORTFOLIO_NAME_MIN_LENGTH,
  PORTFOLIO_NAME_MAX_LENGTH,
  PORTFOLIO_MESSAGES,
} from "@/lib/validations/portfolio";

describe("Portfolio Validation", () => {
  describe("createPortfolioSchema", () => {
    it("should validate a valid portfolio name", () => {
      const result = createPortfolioSchema.safeParse({ name: "My Portfolio" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
      }
    });

    it("should reject empty name (AC-3.1.2)", () => {
      const result = createPortfolioSchema.safeParse({ name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain(PORTFOLIO_MESSAGES.NAME_REQUIRED);
      }
    });

    it("should reject name over 50 characters (AC-3.1.2)", () => {
      const longName = "a".repeat(51);
      const result = createPortfolioSchema.safeParse({ name: longName });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain(PORTFOLIO_MESSAGES.NAME_TOO_LONG);
      }
    });

    it("should accept name with exactly 50 characters", () => {
      const name50 = "a".repeat(50);
      const result = createPortfolioSchema.safeParse({ name: name50 });

      expect(result.success).toBe(true);
    });

    it("should accept name with exactly 1 character", () => {
      const result = createPortfolioSchema.safeParse({ name: "A" });

      expect(result.success).toBe(true);
    });

    it("should trim whitespace from name", () => {
      const result = createPortfolioSchema.safeParse({
        name: "  My Portfolio  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
      }
    });

    it("should reject whitespace-only name", () => {
      const result = createPortfolioSchema.safeParse({ name: "   " });

      expect(result.success).toBe(false);
    });

    it("should reject missing name field", () => {
      const result = createPortfolioSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should accept name with special characters", () => {
      const result = createPortfolioSchema.safeParse({
        name: "My Portfolio (2025) - Retirement!",
      });

      expect(result.success).toBe(true);
    });

    it("should accept name with unicode characters", () => {
      const result = createPortfolioSchema.safeParse({
        name: "Investimentos Brasil",
      });

      expect(result.success).toBe(true);
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
  });
});
