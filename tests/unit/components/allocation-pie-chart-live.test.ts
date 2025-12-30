/**
 * AllocationPieChartLive Component Tests
 *
 * Story 3.1: Allocation Pie Chart Component
 * AC-3.1.2: Real-Time Updates
 *
 * Tests the form integration utilities and data transformers.
 * Component rendering with FormProvider is tested in E2E.
 */

import { describe, it, expect } from "vitest";
import {
  defaultAllocationTransformer,
  type FormHolding,
} from "@/components/forms/allocation-pie-chart-live";

describe("AllocationPieChartLive Utilities", () => {
  describe("defaultAllocationTransformer", () => {
    it("transforms valid holdings to chart allocations", () => {
      const holdings: FormHolding[] = [
        { id: "stocks", name: "Stocks", percentage: 60, value: 6000 },
        { id: "bonds", name: "Bonds", percentage: 30, value: 3000 },
        { id: "cash", name: "Cash", percentage: 10, value: 1000 },
      ];

      const result = defaultAllocationTransformer(holdings);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        classId: "stocks",
        className: "Stocks",
        value: "6000",
        percentage: "60",
        assetCount: 1,
        targetMin: null,
        targetMax: null,
        status: "no-target",
      });
    });

    it("handles string percentages", () => {
      const holdings: FormHolding[] = [{ name: "Stocks", percentage: "45.5" }];

      const result = defaultAllocationTransformer(holdings);

      expect(result[0]?.percentage).toBe("45.5");
    });

    it("generates classId when id is missing", () => {
      const holdings: FormHolding[] = [
        { name: "Stocks", percentage: 50 },
        { name: "Bonds", percentage: 50 },
      ];

      const result = defaultAllocationTransformer(holdings);

      expect(result[0]?.classId).toBe("class-0");
      expect(result[1]?.classId).toBe("class-1");
    });

    it("preserves custom colors when provided", () => {
      const holdings: FormHolding[] = [
        { name: "Stocks", percentage: 60, color: "#ff5500" },
        { name: "Bonds", percentage: 40 },
      ];

      const result = defaultAllocationTransformer(holdings);

      expect(result[0]?.color).toBe("#ff5500");
      expect(result[1]?.color).toBeUndefined();
    });

    it("filters out null/undefined holdings", () => {
      const holdings = [
        { name: "Stocks", percentage: 60 },
        null,
        undefined,
        { name: "Bonds", percentage: 40 },
      ] as FormHolding[];

      const result = defaultAllocationTransformer(holdings);

      expect(result).toHaveLength(2);
    });

    it("filters out holdings without names", () => {
      const holdings = [
        { name: "Stocks", percentage: 60 },
        { name: "", percentage: 20 },
        { name: "Bonds", percentage: 20 },
      ] as FormHolding[];

      const result = defaultAllocationTransformer(holdings);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.className)).toEqual(["Stocks", "Bonds"]);
    });

    it("handles empty array", () => {
      const result = defaultAllocationTransformer([]);
      expect(result).toHaveLength(0);
    });

    it("handles NaN percentages gracefully", () => {
      const holdings: FormHolding[] = [{ name: "Invalid", percentage: "not-a-number" }];

      const result = defaultAllocationTransformer(holdings);

      expect(result[0]?.percentage).toBe("0");
    });

    it("handles missing value gracefully", () => {
      const holdings: FormHolding[] = [{ name: "Stocks", percentage: 50 }];

      const result = defaultAllocationTransformer(holdings);

      expect(result[0]?.value).toBe("0");
    });
  });

  describe("transformer performance", () => {
    it("transforms 100 holdings in <10ms", () => {
      const holdings: FormHolding[] = Array.from({ length: 100 }, (_, i) => ({
        id: `class-${i}`,
        name: `Asset Class ${i}`,
        percentage: 1,
        value: 1000 * i,
      }));

      const start = performance.now();
      const result = defaultAllocationTransformer(holdings);
      const duration = performance.now() - start;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(10);
    });
  });
});

describe("AllocationPieChartLive Data Flow", () => {
  /**
   * AC-3.1.2: Real-Time Updates
   *
   * These tests verify the data transformation logic that enables
   * real-time chart updates when form values change.
   */

  describe("form data to chart data transformation", () => {
    it("simulates live update scenario", () => {
      // Initial state
      const initialHoldings: FormHolding[] = [
        { name: "Stocks", percentage: 50 },
        { name: "Bonds", percentage: 50 },
      ];

      const initialChart = defaultAllocationTransformer(initialHoldings);
      expect(initialChart[0]?.percentage).toBe("50");
      expect(initialChart[1]?.percentage).toBe("50");

      // User edits allocation
      const updatedHoldings: FormHolding[] = [
        { name: "Stocks", percentage: 60 }, // Changed
        { name: "Bonds", percentage: 40 }, // Changed
      ];

      const updatedChart = defaultAllocationTransformer(updatedHoldings);
      expect(updatedChart[0]?.percentage).toBe("60");
      expect(updatedChart[1]?.percentage).toBe("40");
    });

    it("simulates adding new allocation", () => {
      // Initial state with 2 allocations
      const initialHoldings: FormHolding[] = [
        { name: "Stocks", percentage: 50 },
        { name: "Bonds", percentage: 50 },
      ];

      const initialChart = defaultAllocationTransformer(initialHoldings);
      expect(initialChart).toHaveLength(2);

      // User adds third allocation
      const updatedHoldings: FormHolding[] = [
        { name: "Stocks", percentage: 40 },
        { name: "Bonds", percentage: 40 },
        { name: "REITs", percentage: 20 }, // New
      ];

      const updatedChart = defaultAllocationTransformer(updatedHoldings);
      expect(updatedChart).toHaveLength(3);
      expect(updatedChart[2]?.className).toBe("REITs");
    });

    it("simulates removing allocation", () => {
      const initialHoldings: FormHolding[] = [
        { name: "Stocks", percentage: 40 },
        { name: "Bonds", percentage: 40 },
        { name: "REITs", percentage: 20 },
      ];

      const initialChart = defaultAllocationTransformer(initialHoldings);
      expect(initialChart).toHaveLength(3);

      // User removes REITs
      const updatedHoldings: FormHolding[] = [
        { name: "Stocks", percentage: 50 },
        { name: "Bonds", percentage: 50 },
      ];

      const updatedChart = defaultAllocationTransformer(updatedHoldings);
      expect(updatedChart).toHaveLength(2);
    });
  });

  describe("allocation total calculations", () => {
    it("calculates correct total from holdings", () => {
      const holdings: FormHolding[] = [
        { name: "Stocks", percentage: 45 },
        { name: "Bonds", percentage: 30 },
        { name: "Cash", percentage: 25 },
      ];

      const total = holdings.reduce((sum, h) => {
        const pct = typeof h.percentage === "number" ? h.percentage : parseFloat(h.percentage) || 0;
        return sum + pct;
      }, 0);

      expect(total).toBe(100);
    });

    it("detects under-allocation", () => {
      const holdings: FormHolding[] = [
        { name: "Stocks", percentage: 40 },
        { name: "Bonds", percentage: 30 },
      ];

      const total = holdings.reduce((sum, h) => {
        return sum + (Number(h.percentage) || 0);
      }, 0);
      const remaining = 100 - total;

      expect(remaining).toBe(30);
      expect(remaining > 0).toBe(true);
    });

    it("detects over-allocation", () => {
      const holdings: FormHolding[] = [
        { name: "Stocks", percentage: 60 },
        { name: "Bonds", percentage: 50 },
      ];

      const total = holdings.reduce((sum, h) => {
        return sum + (Number(h.percentage) || 0);
      }, 0);
      const remaining = 100 - total;

      expect(remaining).toBe(-10);
      expect(remaining < 0).toBe(true);
    });

    it("handles floating point precision", () => {
      const holdings: FormHolding[] = [
        { name: "Class A", percentage: 33.33 },
        { name: "Class B", percentage: 33.33 },
        { name: "Class C", percentage: 33.34 },
      ];

      const total = holdings.reduce((sum, h) => {
        return sum + (Number(h.percentage) || 0);
      }, 0);

      // Should be essentially 100 (within floating point tolerance)
      expect(Math.abs(100 - total)).toBeLessThan(0.01);
    });
  });
});
