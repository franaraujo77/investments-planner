/**
 * Export Calculation Utility Tests
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.4: Export Breakdown as JSON
 *
 * Tests for:
 * - exportCalculationAsJSON() formatting
 * - JSON includes all required fields
 * - generateExportFilename() format
 */

import { describe, it, expect } from "vitest";
import { exportCalculationAsJSON, generateExportFilename } from "@/lib/utils/export-calculation";
import type { CalculationBreakdown, ExportableBreakdown } from "@/lib/types/calculation-breakdown";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockBreakdown: CalculationBreakdown = {
  assetId: "asset-123",
  symbol: "AAPL",
  calculatedAt: new Date("2025-12-11T10:00:00Z"),
  correlationId: "corr-456",
  inputs: {
    price: {
      value: "150.25",
      currency: "USD",
      source: "Yahoo Finance",
      fetchedAt: new Date("2025-12-11T09:00:00Z"),
    },
    exchangeRate: {
      from: "USD",
      to: "BRL",
      rate: "5.50",
      source: "ExchangeRate-API",
      fetchedAt: new Date("2025-12-11T08:00:00Z"),
    },
    fundamentals: {
      source: "Gemini API",
      fetchedAt: new Date("2025-12-11T07:00:00Z"),
      metrics: {
        peRatio: "25.5",
        pbRatio: "8.2",
        dividendYield: "0.55",
        marketCap: "2500000000000",
        revenue: null,
        earnings: null,
      },
    },
  },
  criteriaVersion: {
    id: "cv-789",
    version: "2",
    createdAt: new Date("2025-12-01T00:00:00Z"),
    name: "Growth Criteria v2",
  },
  evaluations: [
    {
      criterionId: "crit-1",
      name: "P/E Ratio",
      description: "Price to earnings ratio threshold",
      category: "valuation",
      operator: "lt",
      threshold: "30",
      actualValue: "25.5",
      passed: true,
      pointsAwarded: 10,
      maxPoints: 10,
      skippedReason: null,
    },
    {
      criterionId: "crit-2",
      name: "Dividend Yield",
      description: "Minimum dividend yield",
      category: "income",
      operator: "gte",
      threshold: "1.0",
      actualValue: "0.55",
      passed: false,
      pointsAwarded: 0,
      maxPoints: 5,
      skippedReason: null,
    },
    {
      criterionId: "crit-3",
      name: "Revenue Growth",
      operator: "gt",
      threshold: "10",
      actualValue: null,
      passed: false,
      pointsAwarded: 0,
      maxPoints: 8,
      skippedReason: "missing_fundamental",
    },
  ],
  finalScore: "10.0000",
  maxPossibleScore: "23.0000",
  scorePercentage: "43.48",
};

// =============================================================================
// TESTS: exportCalculationAsJSON
// =============================================================================

describe("exportCalculationAsJSON", () => {
  it("should produce valid JSON string", () => {
    const json = exportCalculationAsJSON(mockBreakdown);

    // Should parse without error
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should include export version", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.exportVersion).toBe("1.0");
  });

  it("should include exportedAt timestamp", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.exportedAt).toBeDefined();
    // Should be valid ISO date string
    expect(new Date(parsed.exportedAt).toISOString()).toBe(parsed.exportedAt);
  });

  it("should include asset information", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.asset).toEqual({
      id: "asset-123",
      symbol: "AAPL",
    });
  });

  it("should include calculation metadata", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.calculation.calculatedAt).toBe("2025-12-11T10:00:00.000Z");
    expect(parsed.calculation.correlationId).toBe("corr-456");
  });

  it("should include all input values with sources", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    // Price
    expect(parsed.inputs.price).toEqual({
      value: "150.25",
      currency: "USD",
      source: "Yahoo Finance",
      fetchedAt: "2025-12-11T09:00:00.000Z",
    });

    // Exchange rate
    expect(parsed.inputs.exchangeRate).toEqual({
      from: "USD",
      to: "BRL",
      rate: "5.50",
      source: "ExchangeRate-API",
      fetchedAt: "2025-12-11T08:00:00.000Z",
    });

    // Fundamentals
    expect(parsed.inputs.fundamentals?.source).toBe("Gemini API");
    expect(parsed.inputs.fundamentals?.metrics.peRatio).toBe("25.5");
  });

  it("should include criteria version information", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.criteriaVersion).toEqual({
      id: "cv-789",
      version: "2",
      createdAt: "2025-12-01T00:00:00.000Z",
      name: "Growth Criteria v2",
    });
  });

  it("should include score results", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.score).toEqual({
      final: "10.0000",
      maxPossible: "23.0000",
      percentage: "43.48",
    });
  });

  it("should include all criterion evaluations", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.evaluations).toHaveLength(3);

    // Check first evaluation
    expect(parsed.evaluations[0]).toEqual({
      criterionId: "crit-1",
      name: "P/E Ratio",
      description: "Price to earnings ratio threshold",
      category: "valuation",
      operator: "lt",
      threshold: "30",
      actualValue: "25.5",
      passed: true,
      pointsAwarded: 10,
      maxPoints: 10,
      skippedReason: null,
    });
  });

  it("should include summary statistics", () => {
    const json = exportCalculationAsJSON(mockBreakdown);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.summary).toEqual({
      totalCriteria: 3,
      criteriaEvaluated: 2,
      criteriaPassed: 1,
      criteriaFailed: 1,
      criteriaSkipped: 1,
    });
  });

  it("should handle null inputs gracefully", () => {
    const breakdownWithNulls: CalculationBreakdown = {
      ...mockBreakdown,
      inputs: {
        price: null,
        exchangeRate: null,
        fundamentals: null,
      },
    };

    const json = exportCalculationAsJSON(breakdownWithNulls);
    const parsed = JSON.parse(json) as ExportableBreakdown;

    expect(parsed.inputs.price).toBeNull();
    expect(parsed.inputs.exchangeRate).toBeNull();
    expect(parsed.inputs.fundamentals).toBeNull();
  });

  it("should format JSON with indentation when prettyPrint is true", () => {
    const json = exportCalculationAsJSON(mockBreakdown, { prettyPrint: true });

    // Pretty-printed JSON has newlines
    expect(json).toContain("\n");
    expect(json).toContain("  "); // Indentation
  });

  it("should format JSON without indentation when prettyPrint is false", () => {
    const json = exportCalculationAsJSON(mockBreakdown, { prettyPrint: false });

    // Non-pretty JSON has no newlines (except within strings)
    expect(json.split("\n").length).toBe(1);
  });

  it("should use custom indent size", () => {
    const json = exportCalculationAsJSON(mockBreakdown, { prettyPrint: true, indentSize: 4 });

    // Should have 4-space indentation
    expect(json).toContain("    ");
  });
});

// =============================================================================
// TESTS: generateExportFilename
// =============================================================================

describe("generateExportFilename", () => {
  it("should generate filename with symbol and date", () => {
    const date = new Date("2025-12-11T10:00:00Z");
    const filename = generateExportFilename("AAPL", date);

    expect(filename).toBe("calculation-AAPL-2025-12-11.json");
  });

  it("should use current date when not provided", () => {
    const filename = generateExportFilename("AAPL");

    // Should contain today's date
    const today = new Date().toISOString().split("T")[0];
    expect(filename).toBe(`calculation-AAPL-${today}.json`);
  });

  it("should sanitize invalid characters in symbol", () => {
    const filename = generateExportFilename("BTC/USD", new Date("2025-12-11"));

    // Slash should be replaced with underscore
    expect(filename).toBe("calculation-BTC_USD-2025-12-11.json");
  });

  it("should handle symbols with dots", () => {
    const filename = generateExportFilename("PETR4.SA", new Date("2025-12-11"));

    // Dots should be preserved
    expect(filename).toBe("calculation-PETR4.SA-2025-12-11.json");
  });

  it("should handle symbols with hyphens", () => {
    const filename = generateExportFilename("BRK-A", new Date("2025-12-11"));

    // Hyphens should be preserved
    expect(filename).toBe("calculation-BRK-A-2025-12-11.json");
  });
});
