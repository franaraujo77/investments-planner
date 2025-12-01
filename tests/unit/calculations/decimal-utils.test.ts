/**
 * decimal.js Configuration and Utilities Tests
 *
 * Tests for Story 1.2 AC: 3
 * - decimal.js is configured with precision: 20, rounding: ROUND_HALF_UP
 *
 * NOTE: These tests require Vitest (Story 1.7) to be installed.
 * Run with: pnpm test
 */

import { describe, it, expect } from "vitest";
import { Decimal } from "@/lib/calculations/decimal-config";
import {
  parseDecimal,
  add,
  multiply,
  divide,
  subtract,
  formatCurrency,
  round,
  equals,
  isPositive,
  isNegative,
} from "@/lib/calculations/decimal-utils";

describe("decimal.js Configuration", () => {
  describe("Precision", () => {
    it("should handle 0.1 + 0.2 = 0.3 exactly (not 0.30000000000000004)", () => {
      const a = new Decimal("0.1");
      const b = new Decimal("0.2");
      const result = a.plus(b);

      expect(result.toString()).toBe("0.3");
      expect(result.equals(new Decimal("0.3"))).toBe(true);
    });

    it("should handle 19-digit precision without loss", () => {
      const largeNumber = "1234567890123456789.1234";
      const decimal = new Decimal(largeNumber);

      expect(decimal.toString()).toBe(largeNumber);
    });

    it("should maintain precision through multiple operations", () => {
      const a = new Decimal("0.1");
      const result = a.plus("0.2").times("3").dividedBy("0.9");

      expect(result.toString()).toBe("1");
    });
  });

  describe("Rounding (ROUND_HALF_UP)", () => {
    it("should round 2.5 up to 3", () => {
      const value = new Decimal("2.5");
      const rounded = value.toDecimalPlaces(0);

      expect(rounded.toString()).toBe("3");
    });

    it("should round 3.5 up to 4", () => {
      const value = new Decimal("3.5");
      const rounded = value.toDecimalPlaces(0);

      expect(rounded.toString()).toBe("4");
    });

    it("should round 2.445 to 2.45 with 2 decimal places", () => {
      const value = new Decimal("2.445");
      const rounded = value.toDecimalPlaces(2);

      expect(rounded.toString()).toBe("2.45");
    });

    it("should round negative numbers correctly (-2.5 rounds to -2)", () => {
      const value = new Decimal("-2.5");
      const rounded = value.toDecimalPlaces(0);

      // ROUND_HALF_UP rounds toward positive infinity
      expect(rounded.toString()).toBe("-2");
    });
  });
});

describe("parseDecimal", () => {
  it("should parse string values", () => {
    const result = parseDecimal("123.456");
    expect(result.toString()).toBe("123.456");
  });

  it("should parse number values", () => {
    const result = parseDecimal(123.456);
    expect(result.toString()).toBe("123.456");
  });

  it("should throw on empty string", () => {
    expect(() => parseDecimal("")).toThrow("Cannot parse empty string");
  });

  it("should throw on whitespace-only string", () => {
    expect(() => parseDecimal("   ")).toThrow("Cannot parse empty string");
  });
});

describe("Arithmetic Operations", () => {
  describe("add", () => {
    it("should add multiple values", () => {
      const a = new Decimal("10.5");
      const b = new Decimal("20.3");
      const c = new Decimal("5.2");

      const result = add(a, b, c);
      expect(result.toString()).toBe("36");
    });

    it("should return 0 for empty arguments", () => {
      const result = add();
      expect(result.toString()).toBe("0");
    });
  });

  describe("subtract", () => {
    it("should subtract correctly", () => {
      const a = new Decimal("100");
      const b = new Decimal("30.5");

      const result = subtract(a, b);
      expect(result.toString()).toBe("69.5");
    });
  });

  describe("multiply", () => {
    it("should multiply correctly", () => {
      const a = new Decimal("12.5");
      const b = new Decimal("4");

      const result = multiply(a, b);
      expect(result.toString()).toBe("50");
    });
  });

  describe("divide", () => {
    it("should divide correctly", () => {
      const a = new Decimal("100");
      const b = new Decimal("4");

      const result = divide(a, b);
      expect(result.toString()).toBe("25");
    });

    it("should throw on division by zero", () => {
      const a = new Decimal("100");
      const b = new Decimal("0");

      expect(() => divide(a, b)).toThrow("Cannot divide by zero");
    });
  });
});

describe("formatCurrency", () => {
  it("should format USD correctly", () => {
    const value = new Decimal("1234.56");
    const formatted = formatCurrency(value, "USD", "en-US");

    expect(formatted).toContain("1,234.56");
    expect(formatted).toContain("$");
  });

  it("should format BRL correctly", () => {
    const value = new Decimal("1234.56");
    const formatted = formatCurrency(value, "BRL", "pt-BR");

    expect(formatted).toContain("1.234,56");
  });

  it("should handle small decimal values", () => {
    const value = new Decimal("0.0001");
    const formatted = formatCurrency(value, "USD", "en-US");

    expect(formatted).toContain("0.0001");
  });
});

describe("Comparison Operations", () => {
  describe("equals", () => {
    it("should return true for equal values", () => {
      const a = new Decimal("100.00");
      const b = new Decimal("100");

      expect(equals(a, b)).toBe(true);
    });

    it("should return false for different values", () => {
      const a = new Decimal("100");
      const b = new Decimal("100.01");

      expect(equals(a, b)).toBe(false);
    });
  });

  describe("isPositive", () => {
    it("should return true for positive values", () => {
      expect(isPositive(new Decimal("1"))).toBe(true);
      expect(isPositive(new Decimal("0.0001"))).toBe(true);
    });

    it("should return false for zero", () => {
      expect(isPositive(new Decimal("0"))).toBe(false);
    });

    it("should return false for negative values", () => {
      expect(isPositive(new Decimal("-1"))).toBe(false);
    });
  });

  describe("isNegative", () => {
    it("should return true for negative values", () => {
      expect(isNegative(new Decimal("-1"))).toBe(true);
      expect(isNegative(new Decimal("-0.0001"))).toBe(true);
    });

    it("should return false for zero", () => {
      expect(isNegative(new Decimal("0"))).toBe(false);
    });

    it("should return false for positive values", () => {
      expect(isNegative(new Decimal("1"))).toBe(false);
    });
  });
});

describe("round", () => {
  it("should round to 4 decimal places by default", () => {
    const value = new Decimal("123.456789");
    const rounded = round(value);

    expect(rounded.toString()).toBe("123.4568");
  });

  it("should round to specified decimal places", () => {
    const value = new Decimal("123.456789");
    const rounded = round(value, 2);

    expect(rounded.toString()).toBe("123.46");
  });
});
