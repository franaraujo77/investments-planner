/**
 * Unit tests for i18n locale utilities
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.5: Supported locales (en-US, pt-BR, de-DE, fr-FR, es-ES)
 * AC-1.5.6: Default locale (en-US)
 */

import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isValidLocale,
  getLocaleLabel,
  type Locale,
} from "@/lib/i18n/locales";

describe("i18n Locale Utilities", () => {
  describe("SUPPORTED_LOCALES", () => {
    it("should contain exactly 5 locales (AC-1.5.5)", () => {
      expect(SUPPORTED_LOCALES).toHaveLength(5);
    });

    it("should include all required locales (AC-1.5.5)", () => {
      const localeValues = SUPPORTED_LOCALES.map((l) => l.value);
      expect(localeValues).toContain("en-US");
      expect(localeValues).toContain("pt-BR");
      expect(localeValues).toContain("de-DE");
      expect(localeValues).toContain("fr-FR");
      expect(localeValues).toContain("es-ES");
    });

    it("should have labels for all locales", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(locale.label).toBeDefined();
        expect(locale.label.length).toBeGreaterThan(0);
      });
    });

    it("should have correct label format", () => {
      const localeMap = new Map(SUPPORTED_LOCALES.map((l) => [l.value, l.label]));

      expect(localeMap.get("en-US")).toBe("English (US)");
      expect(localeMap.get("pt-BR")).toBe("Português (Brasil)");
      expect(localeMap.get("de-DE")).toBe("Deutsch (Deutschland)");
      expect(localeMap.get("fr-FR")).toBe("Français (France)");
      expect(localeMap.get("es-ES")).toBe("Español (España)");
    });
  });

  describe("DEFAULT_LOCALE", () => {
    it("should be en-US (AC-1.5.6)", () => {
      expect(DEFAULT_LOCALE).toBe("en-US");
    });

    it("should be a valid locale", () => {
      expect(isValidLocale(DEFAULT_LOCALE)).toBe(true);
    });
  });

  describe("isValidLocale", () => {
    it("should return true for all supported locales", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(isValidLocale(locale.value)).toBe(true);
      });
    });

    it("should return false for unsupported locales", () => {
      expect(isValidLocale("en-GB")).toBe(false);
      expect(isValidLocale("zh-CN")).toBe(false);
      expect(isValidLocale("ja-JP")).toBe(false);
      expect(isValidLocale("invalid")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidLocale("")).toBe(false);
    });

    it("should return false for partial matches", () => {
      expect(isValidLocale("en")).toBe(false);
      expect(isValidLocale("pt")).toBe(false);
      expect(isValidLocale("US")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidLocale("EN-US")).toBe(false);
      expect(isValidLocale("en-us")).toBe(false);
      expect(isValidLocale("En-Us")).toBe(false);
    });
  });

  describe("getLocaleLabel", () => {
    it("should return correct label for each supported locale", () => {
      expect(getLocaleLabel("en-US")).toBe("English (US)");
      expect(getLocaleLabel("pt-BR")).toBe("Português (Brasil)");
      expect(getLocaleLabel("de-DE")).toBe("Deutsch (Deutschland)");
      expect(getLocaleLabel("fr-FR")).toBe("Français (France)");
      expect(getLocaleLabel("es-ES")).toBe("Español (España)");
    });

    it("should return the value itself if locale not found", () => {
      // This tests the fallback behavior when locale not in list
      // Using type assertion since we're testing edge case
      expect(getLocaleLabel("unknown" as Locale)).toBe("unknown");
    });
  });

  describe("Locale type", () => {
    it("should accept valid locale values", () => {
      const validLocales: Locale[] = ["en-US", "pt-BR", "de-DE", "fr-FR", "es-ES"];
      expect(validLocales).toHaveLength(5);
    });
  });
});
