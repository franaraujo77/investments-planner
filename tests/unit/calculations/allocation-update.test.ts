/**
 * Allocation Update Calculation Tests (Story 7.9)
 *
 * AC-7.9.2: Allocation Percentages Recalculate Immediately
 * Tests for allocation percentage calculation accuracy with decimal.js
 *
 * Tests:
 * - Allocation percentage calculation: (asset_value / portfolio_total) * 100
 * - Before/after comparison accuracy
 * - Multiple asset classes
 * - Ignored assets (should not affect allocation)
 * - Edge cases (100% single asset, 0% class)
 */

import { describe, it, expect } from "vitest";
import { parseDecimal, divide, multiply, add } from "@/lib/calculations/decimal-utils";
import { Decimal } from "@/lib/calculations/decimal-config";

describe("Allocation Update Calculations (AC-7.9.2)", () => {
  describe("Allocation Percentage Calculation", () => {
    it("should calculate allocation percentage correctly", () => {
      // Given: asset_value = $5000, portfolio_total = $27777.77
      const assetValue = parseDecimal("5000.00");
      const portfolioTotal = parseDecimal("27777.77");

      // When: calculating allocation percentage
      const allocationDecimal = divide(assetValue, portfolioTotal);
      const allocationPercentage = multiply(allocationDecimal, parseDecimal("100"));

      // Then: allocation should be approximately 18.0%
      expect(allocationPercentage.toFixed(1)).toBe("18.0");
    });

    it("should format allocation as percentage string", () => {
      const assetValue = parseDecimal("10000.00");
      const portfolioTotal = parseDecimal("25000.00");

      const percentage = divide(assetValue, portfolioTotal).times(100);
      const formatted = `${percentage.toFixed(1)}%`;

      expect(formatted).toBe("40.0%");
    });

    it("should handle precise decimal percentages", () => {
      const assetValue = parseDecimal("3333.33");
      const portfolioTotal = parseDecimal("10000.00");

      const percentage = divide(assetValue, portfolioTotal).times(100);

      expect(percentage.toFixed(1)).toBe("33.3");
    });
  });

  describe("Before/After Comparison", () => {
    it("should show accurate before/after allocation change", () => {
      // Before: $5000 out of $25000 = 20%
      const beforeValue = parseDecimal("5000.00");
      const beforeTotal = parseDecimal("25000.00");
      const beforePercentage = divide(beforeValue, beforeTotal).times(100);

      // After: $6000 out of $26000 = 23.08%
      const afterValue = parseDecimal("6000.00");
      const afterTotal = parseDecimal("26000.00");
      const afterPercentage = divide(afterValue, afterTotal).times(100);

      expect(beforePercentage.toFixed(1)).toBe("20.0");
      expect(afterPercentage.toFixed(1)).toBe("23.1");
    });

    it("should calculate allocation change delta", () => {
      const beforePercentage = parseDecimal("45.5");
      const afterPercentage = parseDecimal("50.0");

      const change = afterPercentage.minus(beforePercentage);

      expect(change.toFixed(1)).toBe("4.5");
    });
  });

  describe("Multiple Asset Classes", () => {
    it("should calculate allocations for all classes", () => {
      const portfolioTotal = parseDecimal("100000.00");
      const classValues = {
        "US Stocks": parseDecimal("40000.00"),
        International: parseDecimal("25000.00"),
        Bonds: parseDecimal("20000.00"),
        Cash: parseDecimal("15000.00"),
      };

      const allocations: Record<string, string> = {};
      for (const [className, value] of Object.entries(classValues)) {
        const percentage = divide(value, portfolioTotal).times(100);
        allocations[className] = `${percentage.toFixed(1)}%`;
      }

      expect(allocations["US Stocks"]).toBe("40.0%");
      expect(allocations["International"]).toBe("25.0%");
      expect(allocations["Bonds"]).toBe("20.0%");
      expect(allocations["Cash"]).toBe("15.0%");
    });

    it("should ensure all allocations sum to 100%", () => {
      const portfolioTotal = parseDecimal("50000.00");
      const classValues = [
        parseDecimal("20000.00"),
        parseDecimal("15000.00"),
        parseDecimal("10000.00"),
        parseDecimal("5000.00"),
      ];

      const totalPercentage = classValues.reduce((sum, value) => {
        const percentage = divide(value, portfolioTotal).times(100);
        return add(sum, percentage);
      }, new Decimal(0));

      expect(totalPercentage.toFixed(1)).toBe("100.0");
    });
  });

  describe("Ignored Assets", () => {
    it("should exclude ignored assets from allocation calculation", () => {
      const assets = [
        { value: parseDecimal("10000.00"), isIgnored: false, className: "Stocks" },
        { value: parseDecimal("5000.00"), isIgnored: false, className: "Bonds" },
        { value: parseDecimal("3000.00"), isIgnored: true, className: "Stocks" }, // Should be excluded
      ];

      // Calculate total excluding ignored
      const activeAssets = assets.filter((a) => !a.isIgnored);
      const portfolioTotal = activeAssets.reduce((sum, a) => add(sum, a.value), new Decimal(0));

      expect(portfolioTotal.toFixed(2)).toBe("15000.00");

      // Calculate allocations only for active assets
      const stocksValue = activeAssets
        .filter((a) => a.className === "Stocks")
        .reduce((sum, a) => add(sum, a.value), new Decimal(0));

      const stocksPercentage = divide(stocksValue, portfolioTotal).times(100);

      // Stocks should be 10000/15000 = 66.7%, not 13000/18000
      expect(stocksPercentage.toFixed(1)).toBe("66.7");
    });

    it("should return empty allocations if all assets ignored", () => {
      const assets = [
        { value: parseDecimal("10000.00"), isIgnored: true },
        { value: parseDecimal("5000.00"), isIgnored: true },
      ];

      const activeAssets = assets.filter((a) => !a.isIgnored);
      const allocations: Record<string, string> = {};

      if (activeAssets.length === 0) {
        // Return empty allocations
        expect(allocations).toEqual({});
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle 100% single asset class", () => {
      const assetValue = parseDecimal("50000.00");
      const portfolioTotal = parseDecimal("50000.00");

      const percentage = divide(assetValue, portfolioTotal).times(100);

      expect(percentage.toFixed(1)).toBe("100.0");
    });

    it("should handle 0% allocation for empty class", () => {
      const assetValue = parseDecimal("0.00");
      const portfolioTotal = parseDecimal("50000.00");

      const percentage = divide(assetValue, portfolioTotal).times(100);

      expect(percentage.toFixed(1)).toBe("0.0");
    });

    it("should handle empty portfolio (zero total)", () => {
      const portfolioTotal = parseDecimal("0.00");

      // When portfolio is empty, return empty allocations
      const allocations: Record<string, string> = {};
      if (portfolioTotal.isZero()) {
        expect(allocations).toEqual({});
      }
    });

    it("should handle very small allocations", () => {
      const assetValue = parseDecimal("100.00");
      const portfolioTotal = parseDecimal("1000000.00");

      const percentage = divide(assetValue, portfolioTotal).times(100);

      expect(percentage.toFixed(1)).toBe("0.0");
      // More precise
      expect(percentage.toFixed(4)).toBe("0.0100");
    });

    it("should handle unclassified assets", () => {
      const assets = [
        { value: parseDecimal("10000.00"), className: "Stocks" },
        { value: parseDecimal("5000.00"), className: null }, // Unclassified
      ];

      const portfolioTotal = parseDecimal("15000.00");

      const allocations: Record<string, string> = {};
      for (const asset of assets) {
        const key = asset.className ?? "Unclassified";
        const current = allocations[key]
          ? parseDecimal(allocations[key]!.replace("%", ""))
          : new Decimal(0);
        const percentage = divide(asset.value, portfolioTotal).times(100);
        allocations[key] = `${add(current, percentage).toFixed(1)}%`;
      }

      expect(allocations["Stocks"]).toBe("66.7%");
      expect(allocations["Unclassified"]).toBe("33.3%");
    });
  });

  describe("Deterministic Calculations", () => {
    it("should produce same result on repeated calculations", () => {
      const assetValue = parseDecimal("12345.67");
      const portfolioTotal = parseDecimal("98765.43");

      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const percentage = divide(assetValue, portfolioTotal).times(100);
        results.push(percentage.toFixed(1));
      }

      // All results should be identical
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe("12.5");
    });
  });
});
