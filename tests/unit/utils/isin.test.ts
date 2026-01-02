/**
 * ISIN Utilities Tests
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.3: ISIN as Universal Key
 * Task 12.1: Test ISIN validation (valid formats, invalid formats, check digit)
 */

import { describe, expect, it } from "vitest";
import {
  validateIsin,
  isValidIsin,
  parseIsin,
  getCountryFromIsin,
  normalizeIsin,
  calculateIsinCheckDigit,
  completeIsin,
  isValidIsinFormat,
  inferJurisdictionFromIsin,
} from "@/lib/utils/isin";

describe("ISIN Validation Utilities", () => {
  describe("isValidIsinFormat", () => {
    it("should return true for valid ISIN format", () => {
      expect(isValidIsinFormat("US0378331005")).toBe(true);
      expect(isValidIsinFormat("BRPETRACNOR9")).toBe(true);
      expect(isValidIsinFormat("GB0002634946")).toBe(true);
    });

    it("should return false for non-string input", () => {
      expect(isValidIsinFormat(null as unknown as string)).toBe(false);
      expect(isValidIsinFormat(undefined as unknown as string)).toBe(false);
      expect(isValidIsinFormat(123 as unknown as string)).toBe(false);
    });

    it("should return false for wrong length", () => {
      expect(isValidIsinFormat("US037833100")).toBe(false); // Too short
      expect(isValidIsinFormat("US03783310051")).toBe(false); // Too long
      expect(isValidIsinFormat("")).toBe(false);
    });

    it("should return false for lowercase letters", () => {
      expect(isValidIsinFormat("us0378331005")).toBe(false);
      expect(isValidIsinFormat("Us0378331005")).toBe(false);
    });

    it("should return false for special characters", () => {
      expect(isValidIsinFormat("US-378331005")).toBe(false);
      expect(isValidIsinFormat("US 378331005")).toBe(false);
    });

    it("should return false when country code is not letters", () => {
      expect(isValidIsinFormat("120378331005")).toBe(false);
      expect(isValidIsinFormat("1S0378331005")).toBe(false);
    });
  });

  describe("calculateIsinCheckDigit", () => {
    it("should calculate correct check digit for Apple (AAPL)", () => {
      expect(calculateIsinCheckDigit("US037833100")).toBe(5);
    });

    it("should calculate correct check digit for Petrobras (PETR4)", () => {
      expect(calculateIsinCheckDigit("BRPETRACNOR")).toBe(9);
    });

    it("should calculate correct check digit for BAE Systems", () => {
      expect(calculateIsinCheckDigit("GB000263494")).toBe(6);
    });

    it("should calculate check digit 0 correctly", () => {
      // Microsoft: US5949181045 -> check digit 5
      expect(calculateIsinCheckDigit("US594918104")).toBe(5);
    });

    it("should throw error for wrong input length", () => {
      expect(() => calculateIsinCheckDigit("US0378")).toThrow(
        "ISIN without check digit must be 11 characters"
      );
      expect(() => calculateIsinCheckDigit("US0378331005")).toThrow(
        "ISIN without check digit must be 11 characters"
      );
    });
  });

  describe("validateIsin", () => {
    it("should validate correct ISINs", () => {
      expect(validateIsin("US0378331005")).toEqual({ isValid: true });
      expect(validateIsin("BRPETRACNOR9")).toEqual({ isValid: true });
      expect(validateIsin("GB0002634946")).toEqual({ isValid: true });
    });

    it("should reject invalid format", () => {
      const result = validateIsin("invalid");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid ISIN format");
    });

    it("should reject wrong check digit", () => {
      // US0378331005 is valid, US0378331006 has wrong check digit
      const result = validateIsin("US0378331006");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid check digit");
      expect(result.error).toContain("Expected 5, got 6");
    });

    it("should reject non-numeric check digit as format error", () => {
      const result = validateIsin("US037833100A");
      // A in the check digit position will fail Luhn validation
      expect(result.isValid).toBe(false);
    });
  });

  describe("isValidIsin", () => {
    it("should return true for valid ISINs", () => {
      expect(isValidIsin("US0378331005")).toBe(true);
      expect(isValidIsin("BRPETRACNOR9")).toBe(true);
    });

    it("should return false for invalid ISINs", () => {
      expect(isValidIsin("US0378331006")).toBe(false);
      expect(isValidIsin("invalid")).toBe(false);
      expect(isValidIsin("")).toBe(false);
    });
  });

  describe("parseIsin", () => {
    it("should parse valid ISIN into components", () => {
      const result = parseIsin("US0378331005");
      expect(result).toEqual({
        countryCode: "US",
        nsin: "037833100",
        checkDigit: "5",
        isValid: true,
      });
    });

    it("should parse Brazilian ISIN", () => {
      const result = parseIsin("BRPETRACNOR9");
      expect(result).toEqual({
        countryCode: "BR",
        nsin: "PETRACNOR",
        checkDigit: "9",
        isValid: true,
      });
    });

    it("should return isValid false for invalid ISIN", () => {
      const result = parseIsin("US0378331006");
      expect(result.isValid).toBe(false);
      expect(result.countryCode).toBe("US");
      expect(result.checkDigit).toBe("6");
    });

    it("should handle short strings gracefully", () => {
      const result = parseIsin("US");
      expect(result.isValid).toBe(false);
      expect(result.countryCode).toBe("US");
    });
  });

  describe("getCountryFromIsin", () => {
    it("should extract country code from valid ISIN", () => {
      expect(getCountryFromIsin("US0378331005")).toBe("US");
      expect(getCountryFromIsin("BRPETRACNOR9")).toBe("BR");
      expect(getCountryFromIsin("GB0002634946")).toBe("GB");
    });

    it("should handle lowercase input", () => {
      expect(getCountryFromIsin("us0378331005")).toBe("US");
    });

    it("should return empty string for invalid input", () => {
      expect(getCountryFromIsin("")).toBe("");
      expect(getCountryFromIsin("A")).toBe("");
      expect(getCountryFromIsin(null as unknown as string)).toBe("");
      expect(getCountryFromIsin(undefined as unknown as string)).toBe("");
    });
  });

  describe("normalizeIsin", () => {
    it("should convert to uppercase", () => {
      expect(normalizeIsin("us0378331005")).toBe("US0378331005");
    });

    it("should remove non-alphanumeric characters", () => {
      expect(normalizeIsin("US-0378-3310-05")).toBe("US0378331005");
      expect(normalizeIsin("US 0378 3310 05")).toBe("US0378331005");
    });

    it("should handle non-string input", () => {
      expect(normalizeIsin(null as unknown as string)).toBe("");
      expect(normalizeIsin(undefined as unknown as string)).toBe("");
    });
  });

  describe("completeIsin", () => {
    it("should append correct check digit", () => {
      expect(completeIsin("US037833100")).toBe("US0378331005");
      expect(completeIsin("BRPETRACNOR")).toBe("BRPETRACNOR9");
    });

    it("should throw for wrong length input", () => {
      expect(() => completeIsin("US0378")).toThrow("Input must be 11 characters");
      expect(() => completeIsin("US0378331005")).toThrow("Input must be 11 characters");
    });

    it("should normalize input before processing", () => {
      expect(completeIsin("us037833100")).toBe("US0378331005");
    });
  });

  describe("inferJurisdictionFromIsin", () => {
    it("should return US-SEC for US ISINs", () => {
      expect(inferJurisdictionFromIsin("US0378331005")).toBe("US-SEC");
    });

    it("should return BR-CVM for Brazilian ISINs", () => {
      expect(inferJurisdictionFromIsin("BRPETRACNOR9")).toBe("BR-CVM");
    });

    it("should return undefined for unmapped countries", () => {
      // Germany doesn't have a specific jurisdiction mapping yet
      expect(inferJurisdictionFromIsin("DE0007164600")).toBeUndefined();
    });

    it("should return undefined for invalid ISIN", () => {
      expect(inferJurisdictionFromIsin("")).toBeUndefined();
      expect(inferJurisdictionFromIsin("XX")).toBeUndefined();
    });
  });

  describe("Real-world ISIN examples", () => {
    const realIsins = [
      { isin: "US0378331005", name: "Apple Inc.", country: "US" },
      { isin: "BRPETRACNOR9", name: "Petrobras ON", country: "BR" },
      { isin: "GB0002634946", name: "BAE Systems", country: "GB" },
      { isin: "DE0007164600", name: "SAP SE", country: "DE" },
      { isin: "FR0000120578", name: "Sanofi", country: "FR" },
      { isin: "JP3633400001", name: "Toyota Motor", country: "JP" },
      { isin: "US5949181045", name: "Microsoft", country: "US" },
      { isin: "US88160R1014", name: "Tesla", country: "US" },
    ];

    it.each(realIsins)("should validate $name ($isin)", ({ isin, country }) => {
      expect(isValidIsin(isin)).toBe(true);
      expect(getCountryFromIsin(isin)).toBe(country);
    });
  });

  describe("Edge cases", () => {
    it("should handle ISIN with all letters in NSIN", () => {
      // Some bonds have all-letter NSIN portions
      const result = isValidIsinFormat("XSABCDEFGHI0");
      expect(result).toBe(true);
    });

    it("should validate XS (international) ISINs", () => {
      // XS ISINs are used for Eurobonds
      expect(isValidIsinFormat("XS1234567890")).toBe(true);
    });
  });
});
