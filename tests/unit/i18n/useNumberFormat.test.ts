/**
 * Unit tests for number formatting utilities
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.2: Number Formatting for pt-BR Locale
 * AC-1.5.3: Number Formatting for en-US Locale
 *
 * Note: Since @testing-library/react is not installed,
 * we test the createNumberFormatter utility (non-React version).
 *
 * React Hook Coverage Gap (requires @testing-library/react to fix):
 * - useNumberFormat() hook - tested via E2E
 * - useLocale() hook - tested via E2E
 * - useLocaleOptional() hook - tested via E2E
 * - useLocale() error when outside NumberFormatProvider - tested via E2E
 *
 * To add React hook tests, install @testing-library/react and create
 * a separate test file: NumberFormatProvider.test.tsx
 */

import { describe, it, expect } from "vitest";
import { createNumberFormatter } from "@/lib/i18n/useNumberFormat";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

describe("createNumberFormatter (non-React)", () => {
  describe("formatNumber", () => {
    it("should format numbers for en-US locale (AC-1.5.3)", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatNumber(1234.56)).toBe("1,234.56");
      expect(formatter.formatNumber(1000000)).toBe("1,000,000.00");
      expect(formatter.formatNumber(0.5)).toBe("0.50");
    });

    it("should format numbers for pt-BR locale (AC-1.5.2)", () => {
      const formatter = createNumberFormatter("pt-BR");

      // pt-BR uses period for thousands and comma for decimals
      expect(formatter.formatNumber(1234.56)).toBe("1.234,56");
      expect(formatter.formatNumber(1000000)).toBe("1.000.000,00");
      expect(formatter.formatNumber(0.5)).toBe("0,50");
    });

    it("should format numbers for de-DE locale", () => {
      const formatter = createNumberFormatter("de-DE");

      // de-DE uses period for thousands and comma for decimals
      expect(formatter.formatNumber(1234.56)).toBe("1.234,56");
    });

    it("should format numbers for fr-FR locale", () => {
      const formatter = createNumberFormatter("fr-FR");

      // fr-FR uses narrow no-break space for thousands and comma for decimals
      // The actual separator might vary by environment
      const formatted = formatter.formatNumber(1234.56);
      expect(formatted).toMatch(/1[\s\u00A0\u202F.]?234,56/);
    });

    it("should format numbers for es-ES locale", () => {
      const formatter = createNumberFormatter("es-ES");

      // es-ES uses comma as decimal separator
      // Node.js Intl may not add thousand separator for small numbers
      const formatted = formatter.formatNumber(1234.56);
      expect(formatted).toMatch(/1\.?234,56/);
    });

    it("should handle non-finite values", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatNumber(NaN)).toBe("-");
      expect(formatter.formatNumber(Infinity)).toBe("-");
      expect(formatter.formatNumber(-Infinity)).toBe("-");
    });

    it("should respect custom fraction digits", () => {
      const formatter = createNumberFormatter("en-US");

      expect(
        formatter.formatNumber(1234.5678, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      ).toBe("1,235");

      expect(
        formatter.formatNumber(1234.5, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })
      ).toBe("1,234.5000");
    });

    it("should handle negative numbers", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatNumber(-1234.56)).toBe("-1,234.56");
    });

    it("should handle zero", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatNumber(0)).toBe("0.00");
    });
  });

  describe("formatCurrency", () => {
    it("should format currency for en-US locale (AC-1.5.3)", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatCurrency(1234.56)).toBe("$1,234.56");
      expect(formatter.formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
    });

    it("should format currency for pt-BR locale (AC-1.5.2)", () => {
      const formatter = createNumberFormatter("pt-BR");

      // pt-BR defaults to BRL
      const formatted = formatter.formatCurrency(1234.56);
      expect(formatted).toMatch(/R\$/);
      expect(formatted).toMatch(/1\.234,56/);
    });

    it("should respect explicit currency parameter", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatCurrency(100, "GBP")).toBe("£100.00");
      expect(formatter.formatCurrency(100, "JPY")).toBe("¥100.00");
    });

    it("should handle non-finite values", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatCurrency(NaN)).toBe("-");
      expect(formatter.formatCurrency(Infinity)).toBe("-");
    });

    it("should handle negative amounts", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatCurrency(-1234.56)).toBe("-$1,234.56");
    });

    it("should use locale-appropriate default currency", () => {
      // Each locale should default to its regional currency
      expect(createNumberFormatter("en-US").formatCurrency(100)).toBe("$100.00");
      expect(createNumberFormatter("pt-BR").formatCurrency(100)).toMatch(/R\$/);
      expect(createNumberFormatter("de-DE").formatCurrency(100)).toMatch(/€/);
      expect(createNumberFormatter("fr-FR").formatCurrency(100)).toMatch(/€/);
      expect(createNumberFormatter("es-ES").formatCurrency(100)).toMatch(/€/);
    });
  });

  describe("formatPercent", () => {
    it("should format percentages for en-US locale (AC-1.5.3)", () => {
      const formatter = createNumberFormatter("en-US");

      // Input is a decimal (0.25 = 25%)
      expect(formatter.formatPercent(0.25)).toBe("25.00%");
      expect(formatter.formatPercent(0.5)).toBe("50.00%");
      expect(formatter.formatPercent(1)).toBe("100.00%");
    });

    it("should format percentages for pt-BR locale (AC-1.5.2)", () => {
      const formatter = createNumberFormatter("pt-BR");

      // pt-BR uses comma as decimal separator
      expect(formatter.formatPercent(0.25)).toBe("25,00%");
      expect(formatter.formatPercent(0.5)).toBe("50,00%");
    });

    it("should handle non-finite values", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatPercent(NaN)).toBe("-");
      expect(formatter.formatPercent(Infinity)).toBe("-");
    });

    it("should handle negative percentages", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatPercent(-0.25)).toBe("-25.00%");
    });

    it("should handle percentages greater than 100%", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatPercent(1.5)).toBe("150.00%");
      expect(formatter.formatPercent(2)).toBe("200.00%");
    });

    it("should handle small percentages", () => {
      const formatter = createNumberFormatter("en-US");

      expect(formatter.formatPercent(0.001)).toBe("0.10%");
      expect(formatter.formatPercent(0.0001)).toBe("0.01%");
    });
  });

  describe("locale property", () => {
    it("should expose the locale used", () => {
      expect(createNumberFormatter("en-US").locale).toBe("en-US");
      expect(createNumberFormatter("pt-BR").locale).toBe("pt-BR");
      expect(createNumberFormatter("de-DE").locale).toBe("de-DE");
    });
  });

  describe("consistency across methods", () => {
    it("should use consistent decimal separators within a locale", () => {
      const ptBR = createNumberFormatter("pt-BR");

      // All should use comma as decimal separator
      expect(ptBR.formatNumber(1.5)).toBe("1,50");
      expect(ptBR.formatPercent(0.5)).toBe("50,00%");
      // Currency also uses comma
      expect(ptBR.formatCurrency(1.5)).toMatch(/1,50/);
    });

    it("should use consistent thousand separators within a locale", () => {
      const enUS = createNumberFormatter("en-US");

      // All should use comma as thousand separator
      expect(enUS.formatNumber(1000)).toBe("1,000.00");
      expect(enUS.formatCurrency(1000)).toBe("$1,000.00");
    });
  });

  describe("default locale behavior (AC-1.5.6)", () => {
    it("should use DEFAULT_LOCALE when no locale is provided", () => {
      const formatter = createNumberFormatter();
      expect(formatter.locale).toBe(DEFAULT_LOCALE);
      expect(formatter.locale).toBe("en-US");
    });

    it("should format using en-US when no locale is provided", () => {
      const formatter = createNumberFormatter();
      // en-US uses period as decimal separator
      expect(formatter.formatNumber(1234.56)).toBe("1,234.56");
      expect(formatter.formatCurrency(100)).toBe("$100.00");
    });
  });

  describe("formatDate (AC-2.8.6)", () => {
    it("should format dates for en-US locale", () => {
      const formatter = createNumberFormatter("en-US");
      const date = new Date("2024-06-15T10:00:00Z");

      const formatted = formatter.formatDate(date);
      // en-US medium format: "Jun 15, 2024"
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("should format dates for pt-BR locale", () => {
      const formatter = createNumberFormatter("pt-BR");
      const date = new Date("2024-06-15T10:00:00Z");

      const formatted = formatter.formatDate(date);
      // pt-BR medium format: "15 de jun. de 2024"
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("should respect dateStyle option", () => {
      const formatter = createNumberFormatter("en-US");
      const date = new Date("2024-06-15T10:00:00Z");

      const shortFormat = formatter.formatDate(date, { dateStyle: "short" });
      const longFormat = formatter.formatDate(date, { dateStyle: "long" });

      // Short format is more compact (e.g., "6/15/24")
      expect(shortFormat.length).toBeLessThan(longFormat.length);
    });

    it("should handle invalid dates", () => {
      const formatter = createNumberFormatter("en-US");
      const invalidDate = new Date("invalid");

      expect(formatter.formatDate(invalidDate)).toBe("-");
    });

    it("should handle non-Date values", () => {
      const formatter = createNumberFormatter("en-US");

      // @ts-expect-error Testing runtime behavior with invalid input
      expect(formatter.formatDate("not a date")).toBe("-");
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(formatter.formatDate(null)).toBe("-");
    });
  });

  describe("formatDateTime (AC-2.8.6)", () => {
    it("should format date with time for en-US locale", () => {
      const formatter = createNumberFormatter("en-US");
      const date = new Date("2024-06-15T14:30:00Z");

      const formatted = formatter.formatDateTime(date);
      // Should contain both date and time components
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
      // Time component (may vary by timezone)
      expect(formatted.length).toBeGreaterThan(formatter.formatDate(date).length);
    });

    it("should format date with time for pt-BR locale", () => {
      const formatter = createNumberFormatter("pt-BR");
      const date = new Date("2024-06-15T14:30:00Z");

      const formatted = formatter.formatDateTime(date);
      // Should contain both date and time components
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("should respect dateStyle and timeStyle options", () => {
      const formatter = createNumberFormatter("en-US");
      const date = new Date("2024-06-15T14:30:00Z");

      const shortFormat = formatter.formatDateTime(date, {
        dateStyle: "short",
        timeStyle: "short",
      });
      const longFormat = formatter.formatDateTime(date, {
        dateStyle: "long",
        timeStyle: "long",
      });

      expect(shortFormat.length).toBeLessThan(longFormat.length);
    });

    it("should handle invalid dates", () => {
      const formatter = createNumberFormatter("en-US");
      const invalidDate = new Date("invalid");

      expect(formatter.formatDateTime(invalidDate)).toBe("-");
    });
  });
});
