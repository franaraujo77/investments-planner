/**
 * Portfolio Update Tests (Story 7.9)
 *
 * AC-7.9.1: Portfolio Asset Quantities Updated
 * Tests for quantity calculation accuracy with decimal.js
 *
 * Tests:
 * - Quantity calculation: quantity = actualAmount / pricePerUnit
 * - Quantity update: new_quantity = existing_quantity + purchased_quantity
 * - decimal.js precision in calculations
 * - Multiple assets updated in single transaction
 * - Partial investment (not all recommended assets)
 */

import { describe, it, expect } from "vitest";
import { parseDecimal, divide, add } from "@/lib/calculations/decimal-utils";
import { Decimal } from "@/lib/calculations/decimal-config";

describe("Portfolio Update Calculations (AC-7.9.1)", () => {
  describe("Quantity Calculation - purchasedQty = actualAmount / pricePerUnit", () => {
    it("should calculate quantity purchased with exact precision", () => {
      // Given: actual_amount = 800, price_per_unit = 35.50
      const actualAmount = parseDecimal("800.00");
      const pricePerUnit = parseDecimal("35.50");

      // When: calculating purchased quantity
      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      // Then: quantity should be 22.535211267605... with full precision
      expect(purchasedQuantity.toFixed(8)).toBe("22.53521127");
    });

    it("should handle whole number divisions", () => {
      // Given: $1500 at $150/unit
      const actualAmount = parseDecimal("1500.00");
      const pricePerUnit = parseDecimal("150.00");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      expect(purchasedQuantity.toFixed(8)).toBe("10.00000000");
    });

    it("should handle small fractional amounts", () => {
      // Given: $50.25 at $10.05/unit
      const actualAmount = parseDecimal("50.25");
      const pricePerUnit = parseDecimal("10.05");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      expect(purchasedQuantity.toFixed(8)).toBe("5.00000000");
    });

    it("should handle very small price per unit", () => {
      // Given: $100 at $0.01/unit (penny stock)
      const actualAmount = parseDecimal("100.00");
      const pricePerUnit = parseDecimal("0.01");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      expect(purchasedQuantity.toFixed(8)).toBe("10000.00000000");
    });

    it("should handle high-value stocks correctly", () => {
      // Given: $10000 at $500.00/unit
      const actualAmount = parseDecimal("10000.00");
      const pricePerUnit = parseDecimal("500.00");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      expect(purchasedQuantity.toFixed(8)).toBe("20.00000000");
    });
  });

  describe("Quantity Update - new_quantity = existing + purchased", () => {
    it("should add purchased quantity to existing quantity", () => {
      // Given: existing = 100.5, purchased = 22.535...
      const existingQuantity = parseDecimal("100.50000000");
      const purchasedQuantity = parseDecimal("22.53521127");

      // When: calculating new quantity
      const newQuantity = add(existingQuantity, purchasedQuantity);

      // Then: new_quantity should be 123.03521127
      expect(newQuantity.toFixed(8)).toBe("123.03521127");
    });

    it("should handle zero existing quantity (first purchase)", () => {
      const existingQuantity = parseDecimal("0.00000000");
      const purchasedQuantity = parseDecimal("15.75000000");

      const newQuantity = add(existingQuantity, purchasedQuantity);

      expect(newQuantity.toFixed(8)).toBe("15.75000000");
    });

    it("should handle multiple decimal places precisely", () => {
      const existingQuantity = parseDecimal("123.45678901");
      const purchasedQuantity = parseDecimal("9.87654321");

      const newQuantity = add(existingQuantity, purchasedQuantity);

      expect(newQuantity.toFixed(8)).toBe("133.33333222");
    });
  });

  describe("Decimal.js Precision Validation", () => {
    it("should maintain precision through multiple operations", () => {
      // Simulate full calculation chain:
      // 1. Calculate purchased quantity
      // 2. Add to existing
      // 3. Verify no precision loss

      const actualAmount = parseDecimal("1234.56");
      const pricePerUnit = parseDecimal("78.90");
      const existingQuantity = parseDecimal("50.12345678");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);
      const newQuantity = add(existingQuantity, purchasedQuantity);

      // Verify calculation chain is deterministic
      const expectedPurchased = new Decimal("1234.56").dividedBy("78.90");
      const expectedNew = new Decimal("50.12345678").plus(expectedPurchased);

      expect(newQuantity.toString()).toBe(expectedNew.toString());
    });

    it("should handle repeating decimals correctly", () => {
      // 1/3 = 0.333... - a classic precision test
      const actualAmount = parseDecimal("100.00");
      const pricePerUnit = parseDecimal("3.00");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      // Should maintain high precision without floating point errors
      expect(purchasedQuantity.toFixed(8)).toBe("33.33333333");
    });

    it("should not have floating point errors", () => {
      // Classic floating point trap: 0.1 + 0.2 !== 0.3 in JS
      const a = parseDecimal("0.1");
      const b = parseDecimal("0.2");

      const sum = add(a, b);

      expect(sum.toString()).toBe("0.3");
    });
  });

  describe("Multiple Assets in Single Transaction", () => {
    it("should calculate quantities for multiple assets", () => {
      const assets = [
        { actualAmount: "1000.00", pricePerUnit: "150.00", existing: "10.00000000" },
        { actualAmount: "500.00", pricePerUnit: "25.50", existing: "20.00000000" },
        { actualAmount: "750.00", pricePerUnit: "100.00", existing: "5.00000000" },
      ];

      const results = assets.map(({ actualAmount, pricePerUnit, existing }) => {
        const purchased = divide(parseDecimal(actualAmount), parseDecimal(pricePerUnit));
        const newQty = add(parseDecimal(existing), purchased);
        return {
          purchased: purchased.toFixed(8),
          newQuantity: newQty.toFixed(8),
        };
      });

      expect(results[0]?.purchased).toBe("6.66666667");
      expect(results[0]?.newQuantity).toBe("16.66666667");

      expect(results[1]?.purchased).toBe("19.60784314");
      expect(results[1]?.newQuantity).toBe("39.60784314");

      expect(results[2]?.purchased).toBe("7.50000000");
      expect(results[2]?.newQuantity).toBe("12.50000000");
    });
  });

  describe("Partial Investment (Not All Recommended)", () => {
    it("should skip zero amount investments", () => {
      const investments = [
        { assetId: "1", actualAmount: "1000.00" },
        { assetId: "2", actualAmount: "0" }, // Should be skipped
        { assetId: "3", actualAmount: "0.00" }, // Should be skipped
        { assetId: "4", actualAmount: "500.00" },
      ];

      const nonZeroInvestments = investments.filter((inv) =>
        parseDecimal(inv.actualAmount).greaterThan(0)
      );

      expect(nonZeroInvestments.length).toBe(2);
      expect(nonZeroInvestments[0]?.assetId).toBe("1");
      expect(nonZeroInvestments[1]?.assetId).toBe("4");
    });

    it("should correctly calculate total invested for partial investments", () => {
      const investments = [
        { actualAmount: "1000.00" },
        { actualAmount: "0" },
        { actualAmount: "500.00" },
      ];

      const total = investments.reduce(
        (sum, inv) => add(sum, parseDecimal(inv.actualAmount)),
        new Decimal(0)
      );

      expect(total.toFixed(4)).toBe("1500.0000");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small investments", () => {
      const actualAmount = parseDecimal("0.01");
      const pricePerUnit = parseDecimal("0.001");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      expect(purchasedQuantity.toFixed(8)).toBe("10.00000000");
    });

    it("should handle large investments", () => {
      const actualAmount = parseDecimal("1000000.00");
      const pricePerUnit = parseDecimal("100.00");

      const purchasedQuantity = divide(actualAmount, pricePerUnit);

      expect(purchasedQuantity.toFixed(8)).toBe("10000.00000000");
    });
  });
});
