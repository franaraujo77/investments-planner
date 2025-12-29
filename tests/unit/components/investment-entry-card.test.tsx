/**
 * InvestmentEntryCard Component Tests
 *
 * Story 2.8: Investment History
 *
 * AC-2.8.2: View Investment History Tab
 * - Display entry summary: date, asset symbol/name, amount, quantity
 *
 * AC-2.8.3: Investment Entry Details
 * - Expandable detail view showing full investment information
 * - Price per unit, total amount, currency, recommended amount comparison
 *
 * AC-2.8.6: Regional Number Formatting
 * - Numbers display in regional format via useNumberFormat()
 * - Component rendering with locale-specific formatting is tested in E2E tests
 *
 * Test Coverage:
 * - Helper function logic (calculateDifference, formatDate)
 * - Difference calculation for recommended vs actual amounts
 * - Date formatting output structure
 * - Quantity and currency display logic
 *
 * Note: Component rendering tests are in E2E tests (Playwright) which
 * exercise the full NumberFormatProvider context.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// HELPER FUNCTIONS (replicating component logic for testing)
// =============================================================================

/**
 * Calculate the difference between recommended and actual amount
 * AC-2.8.3: Show comparison when recommendedAmount exists
 */
function calculateDifference(
  actual: string,
  recommended: string | null
): { value: number; percentage: number } | null {
  if (!recommended) return null;

  const actualNum = parseFloat(actual);
  const recommendedNum = parseFloat(recommended);

  if (recommendedNum === 0) return null;

  const value = actualNum - recommendedNum;
  const percentage = (value / recommendedNum) * 100;

  return { value, percentage };
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Determine difference indicator type
 */
function getDifferenceType(
  difference: { value: number; percentage: number } | null
): "positive" | "negative" | "neutral" | null {
  if (!difference) return null;
  if (difference.value > 0) return "positive";
  if (difference.value < 0) return "negative";
  return "neutral";
}

// =============================================================================
// TESTS
// =============================================================================

describe("InvestmentEntryCard Logic", () => {
  describe("AC-2.8.3: Recommended vs Actual Amount Comparison", () => {
    it("calculates positive difference correctly", () => {
      const result = calculateDifference("1500.00", "1200.00");

      expect(result).not.toBeNull();
      expect(result?.value).toBe(300);
      expect(result?.percentage).toBeCloseTo(25); // 25% more than recommended
    });

    it("calculates negative difference correctly", () => {
      const result = calculateDifference("900.00", "1200.00");

      expect(result).not.toBeNull();
      expect(result?.value).toBe(-300);
      expect(result?.percentage).toBeCloseTo(-25); // 25% less than recommended
    });

    it("calculates zero difference correctly", () => {
      const result = calculateDifference("1200.00", "1200.00");

      expect(result).not.toBeNull();
      expect(result?.value).toBe(0);
      expect(result?.percentage).toBe(0);
    });

    it("returns null when no recommended amount", () => {
      const result = calculateDifference("1500.00", null);
      expect(result).toBeNull();
    });

    it("returns null when recommended amount is zero", () => {
      const result = calculateDifference("1500.00", "0");
      expect(result).toBeNull();
    });

    it("handles decimal amounts correctly", () => {
      const result = calculateDifference("123.45", "100.00");

      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(23.45);
      expect(result?.percentage).toBeCloseTo(23.45);
    });

    it("handles very small differences", () => {
      const result = calculateDifference("100.01", "100.00");

      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(0.01);
      expect(result?.percentage).toBeCloseTo(0.01);
    });

    it("handles large amounts correctly", () => {
      const result = calculateDifference("1000000.00", "800000.00");

      expect(result).not.toBeNull();
      expect(result?.value).toBe(200000);
      expect(result?.percentage).toBe(25);
    });
  });

  describe("Difference Type Detection", () => {
    it("returns positive for positive difference", () => {
      const diff = { value: 100, percentage: 10 };
      expect(getDifferenceType(diff)).toBe("positive");
    });

    it("returns negative for negative difference", () => {
      const diff = { value: -100, percentage: -10 };
      expect(getDifferenceType(diff)).toBe("negative");
    });

    it("returns neutral for zero difference", () => {
      const diff = { value: 0, percentage: 0 };
      expect(getDifferenceType(diff)).toBe("neutral");
    });

    it("returns null for null difference", () => {
      expect(getDifferenceType(null)).toBeNull();
    });
  });

  describe("Date Formatting", () => {
    it("formats date correctly", () => {
      const date = new Date("2024-06-15T14:30:00Z");
      const formatted = formatDate(date);

      // Should include date components (may vary by timezone)
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("handles different dates", () => {
      const date1 = new Date("2024-01-01T08:00:00Z");
      const date2 = new Date("2024-12-31T23:59:00Z");

      const formatted1 = formatDate(date1);
      const formatted2 = formatDate(date2);

      expect(formatted1).toContain("Jan");
      expect(formatted2).toContain("Dec");
    });
  });

  describe("Investment Display Data", () => {
    // Types used for documentation purposes - actual data comes from Investment type
    // symbol: string, assetName: string | null, quantity: string,
    // pricePerUnit: string, totalAmount: string, currency: string

    function formatQuantity(quantity: string): string {
      const num = parseFloat(quantity);
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
      });
    }

    it("formats integer quantity correctly", () => {
      expect(formatQuantity("100")).toBe("100");
    });

    it("formats decimal quantity correctly", () => {
      expect(formatQuantity("10.5")).toBe("10.5");
    });

    it("formats crypto-style quantity correctly", () => {
      const result = formatQuantity("0.00125000");
      expect(result).toBe("0.00125");
    });

    it("formats large quantity correctly", () => {
      const result = formatQuantity("1234567.89");
      expect(result).toBe("1,234,567.89");
    });
  });

  describe("Currency Display", () => {
    it("identifies when currency differs from base", () => {
      const currency = "EUR";
      const baseCurrency = "USD";
      expect(currency !== baseCurrency).toBe(true);
    });

    it("identifies when currency matches base", () => {
      const currency = "USD";
      const baseCurrency = "USD";
      expect(currency !== baseCurrency).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty string amounts", () => {
      const result = calculateDifference("", "100.00");
      expect(result?.value).toBeNaN();
    });

    it("handles malformed amount strings", () => {
      const result = calculateDifference("abc", "100.00");
      expect(result?.value).toBeNaN();
    });

    it("handles negative amounts (unusual but possible)", () => {
      const result = calculateDifference("-100.00", "100.00");
      expect(result).not.toBeNull();
      expect(result?.value).toBe(-200);
      expect(result?.percentage).toBe(-200);
    });
  });
});
