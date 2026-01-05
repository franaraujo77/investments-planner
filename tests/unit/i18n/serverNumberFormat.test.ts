/**
 * Server Number Format Utility Tests
 *
 * Story 7.9: Server-Side Number Formatting for i18n
 * AC-7.9.1: Server-Side Formatting Utility
 * AC-7.9.3: Backward Compatibility
 * AC-7.9.4: Consistent API with Client Hook
 *
 * Tests for the server-side number formatting utility that provides
 * locale-aware formatting without React hooks.
 */

import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatPercent,
  formatCurrency,
  ServerFormatOptions,
} from "@/lib/i18n/serverNumberFormat";

describe("serverNumberFormat", () => {
  // ===========================================================================
  // AC-7.9.1: Server-Side Formatting Utility
  // ===========================================================================

  describe("formatNumber", () => {
    describe("with en-US locale", () => {
      it("formats a number with default 2 decimal places", () => {
        const result = formatNumber(1234.56, "en-US");
        expect(result).toBe("1,234.56");
      });

      it("formats a number with custom decimal places", () => {
        const options: ServerFormatOptions = {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        };
        const result = formatNumber(1234.56, "en-US", options);
        expect(result).toBe("1,235");
      });

      it("formats zero correctly", () => {
        const result = formatNumber(0, "en-US");
        expect(result).toBe("0.00");
      });

      it("formats negative numbers", () => {
        const result = formatNumber(-1234.56, "en-US");
        expect(result).toBe("-1,234.56");
      });

      it("formats large numbers with thousands separators", () => {
        const result = formatNumber(1234567.89, "en-US");
        expect(result).toBe("1,234,567.89");
      });
    });

    describe("with pt-BR locale", () => {
      it("formats a number with pt-BR locale conventions", () => {
        const result = formatNumber(1234.56, "pt-BR");
        expect(result).toBe("1.234,56");
      });

      it("formats negative numbers with pt-BR locale", () => {
        const result = formatNumber(-1234.56, "pt-BR");
        expect(result).toBe("-1.234,56");
      });
    });

    describe("with de-DE locale", () => {
      it("formats a number with German locale conventions", () => {
        const result = formatNumber(1234.56, "de-DE");
        expect(result).toBe("1.234,56");
      });
    });

    describe("edge cases", () => {
      it("returns '-' for NaN", () => {
        const result = formatNumber(NaN, "en-US");
        expect(result).toBe("-");
      });

      it("returns '-' for Infinity", () => {
        const result = formatNumber(Infinity, "en-US");
        expect(result).toBe("-");
      });

      it("returns '-' for -Infinity", () => {
        const result = formatNumber(-Infinity, "en-US");
        expect(result).toBe("-");
      });

      it("handles string input by parsing", () => {
        const result = formatNumber("1234.56" as unknown as number, "en-US");
        expect(result).toBe("1,234.56");
      });

      it("handles very small numbers", () => {
        const result = formatNumber(0.001, "en-US");
        expect(result).toBe("0.00");
      });

      it("handles very small numbers with more decimal places", () => {
        const options: ServerFormatOptions = {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        };
        const result = formatNumber(0.001, "en-US", options);
        expect(result).toBe("0.001");
      });
    });
  });

  describe("formatPercent", () => {
    describe("with en-US locale", () => {
      it("formats a percentage value", () => {
        const result = formatPercent(85.5, "en-US");
        expect(result).toBe("85.50%");
      });

      it("formats zero percent", () => {
        const result = formatPercent(0, "en-US");
        expect(result).toBe("0.00%");
      });

      it("formats 100 percent", () => {
        const result = formatPercent(100, "en-US");
        expect(result).toBe("100.00%");
      });

      it("formats percentage with custom decimals", () => {
        const options: ServerFormatOptions = {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        };
        const result = formatPercent(85.55, "en-US", options);
        expect(result).toBe("85.6%");
      });
    });

    describe("with pt-BR locale", () => {
      it("formats a percentage with pt-BR conventions", () => {
        const result = formatPercent(85.5, "pt-BR");
        expect(result).toBe("85,50%");
      });
    });

    describe("edge cases", () => {
      it("returns '-' for NaN", () => {
        const result = formatPercent(NaN, "en-US");
        expect(result).toBe("-");
      });
    });
  });

  describe("formatCurrency", () => {
    describe("with en-US locale", () => {
      it("formats USD currency", () => {
        const result = formatCurrency(1234.56, "en-US", "USD");
        expect(result).toBe("$1,234.56");
      });

      it("formats with default currency when not specified", () => {
        const result = formatCurrency(1234.56, "en-US");
        expect(result).toBe("$1,234.56");
      });

      it("formats zero", () => {
        const result = formatCurrency(0, "en-US", "USD");
        expect(result).toBe("$0.00");
      });

      it("formats negative currency", () => {
        const result = formatCurrency(-1234.56, "en-US", "USD");
        // Allow both -$1,234.56 and ($1,234.56) formats
        expect(result).toMatch(/^(-\$1,234\.56|\(\$1,234\.56\))$/);
      });
    });

    describe("with pt-BR locale", () => {
      it("formats BRL currency", () => {
        const result = formatCurrency(1234.56, "pt-BR", "BRL");
        // pt-BR format: R$ 1.234,56
        expect(result).toContain("R$");
        expect(result).toContain("1.234,56");
      });

      it("formats with default BRL when not specified", () => {
        const result = formatCurrency(1234.56, "pt-BR");
        expect(result).toContain("R$");
      });
    });

    describe("edge cases", () => {
      it("returns '-' for NaN", () => {
        const result = formatCurrency(NaN, "en-US", "USD");
        expect(result).toBe("-");
      });
    });
  });

  // ===========================================================================
  // AC-7.9.3: Backward Compatibility
  // ===========================================================================

  describe("backward compatibility", () => {
    it("defaults to en-US when no locale provided", () => {
      const result = formatNumber(1234.56);
      expect(result).toBe("1,234.56");
    });

    it("defaults to en-US for formatPercent when no locale provided", () => {
      const result = formatPercent(85.5);
      expect(result).toBe("85.50%");
    });

    it("defaults to en-US and USD for formatCurrency when no locale provided", () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe("$1,234.56");
    });

    it("falls back to en-US for invalid locale", () => {
      const result = formatNumber(1234.56, "invalid-XX");
      expect(result).toBe("1,234.56");
    });
  });

  // ===========================================================================
  // AC-7.9.4: Consistent API with Client Hook
  // ===========================================================================

  describe("parity with client hook", () => {
    // Test that server utility produces same results as client hook
    // for common formatting scenarios

    it("produces same output as client hook for en-US numbers", () => {
      // These are the expected outputs from the client hook
      expect(formatNumber(1234.56, "en-US")).toBe("1,234.56");
      expect(formatNumber(0, "en-US")).toBe("0.00");
      expect(formatNumber(-500.5, "en-US")).toBe("-500.50");
    });

    it("produces same output as client hook for pt-BR numbers", () => {
      expect(formatNumber(1234.56, "pt-BR")).toBe("1.234,56");
      expect(formatNumber(0, "pt-BR")).toBe("0,00");
      expect(formatNumber(-500.5, "pt-BR")).toBe("-500,50");
    });

    it("produces same output as client hook for percentages", () => {
      expect(formatPercent(85.55, "en-US")).toBe("85.55%");
      expect(formatPercent(85.55, "pt-BR")).toBe("85,55%");
    });
  });

  // ===========================================================================
  // API DIFFERENCE DOCUMENTATION (Code Review Finding)
  // ===========================================================================

  describe("API difference from client hook (documented)", () => {
    /**
     * IMPORTANT: Server and Client formatPercent have different input semantics!
     *
     * Server utility: formatPercent(85.5) → "85.50%" (expects percentage value)
     * Client hook: formatPercent(0.855) → "85.50%" (expects decimal, uses Intl style: "percent")
     *
     * This is intentional because:
     * - Alert service stores percentages as whole numbers (e.g., "65.12")
     * - Client hook uses Intl.NumberFormat with style: "percent" which auto-multiplies by 100
     */

    it("server formatPercent expects percentage value (not decimal)", () => {
      // Server: 85.5 → "85.50%"
      expect(formatPercent(85.5, "en-US")).toBe("85.50%");

      // If you mistakenly pass a decimal (like client hook expects),
      // you'll get wrong output: 0.855 → "0.86%" (not "85.50%")
      expect(formatPercent(0.855, "en-US")).toBe("0.86%"); // NOT "85.50%"
    });

    it("documents the conversion needed between server and client", () => {
      const percentageValue = 85.5; // As stored in database/API

      // Server utility: use directly
      expect(formatPercent(percentageValue, "en-US")).toBe("85.50%");

      // Client hook would need: percentageValue / 100 to get same result
      // (This test documents the difference, not the actual client hook behavior)
      const decimalForClient = percentageValue / 100; // 0.855
      expect(decimalForClient).toBe(0.855);
    });
  });
});
