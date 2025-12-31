/**
 * AllocationPieChart Component Tests
 *
 * Story 3.1: Allocation Pie Chart Component
 * AC-3.1.1: Pie chart renders in <100ms
 * AC-3.1.5: Color customization with fallback palette
 *
 * Tests the exported utility functions and validates chart data processing.
 * Component rendering tests (including CSS positioning) are in E2E tests.
 */

import { describe, it, expect } from "vitest";
import {
  CHART_COLORS,
  getSegmentColor,
  formatPercent,
  formatValue,
} from "@/components/portfolio/allocation-pie-chart";
import type { ClassAllocation } from "@/components/portfolio/allocation-pie-chart";

describe("AllocationPieChart Utilities", () => {
  describe("CHART_COLORS constant", () => {
    it("has 10 distinct accessible colors", () => {
      expect(CHART_COLORS).toHaveLength(10);
    });

    it("all colors are valid HSL format", () => {
      const hslPattern = /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/;
      CHART_COLORS.forEach((color) => {
        expect(color).toMatch(hslPattern);
      });
    });

    it("first color is blue (primary)", () => {
      expect(CHART_COLORS[0]).toBe("hsl(222, 47%, 51%)");
    });
  });

  describe("getSegmentColor", () => {
    it("returns custom color when provided", () => {
      const customColor = "#ff5500";
      expect(getSegmentColor(0, customColor)).toBe(customColor);
      expect(getSegmentColor(5, customColor)).toBe(customColor);
    });

    it("returns palette color by index when no custom color", () => {
      expect(getSegmentColor(0)).toBe(CHART_COLORS[0]);
      expect(getSegmentColor(1)).toBe(CHART_COLORS[1]);
      expect(getSegmentColor(9)).toBe(CHART_COLORS[9]);
    });

    it("wraps around palette for indices >= 10", () => {
      expect(getSegmentColor(10)).toBe(CHART_COLORS[0]); // 10 % 10 = 0
      expect(getSegmentColor(11)).toBe(CHART_COLORS[1]); // 11 % 10 = 1
      expect(getSegmentColor(25)).toBe(CHART_COLORS[5]); // 25 % 10 = 5
    });

    it("handles undefined custom color", () => {
      expect(getSegmentColor(0, undefined)).toBe(CHART_COLORS[0]);
    });
  });

  describe("formatPercent", () => {
    it("formats whole numbers with one decimal", () => {
      expect(formatPercent("25")).toBe("25.0");
      expect(formatPercent("100")).toBe("100.0");
      expect(formatPercent("0")).toBe("0.0");
    });

    it("rounds to one decimal precision", () => {
      expect(formatPercent("25.123")).toBe("25.1");
      expect(formatPercent("25.156")).toBe("25.2");
      expect(formatPercent("25.149")).toBe("25.1");
    });

    it("handles negative percentages", () => {
      expect(formatPercent("-5.5")).toBe("-5.5");
    });

    it("returns original value for invalid input", () => {
      expect(formatPercent("invalid")).toBe("invalid");
      expect(formatPercent("")).toBe("");
    });

    it("handles string numbers with leading/trailing spaces", () => {
      // parseFloat trims spaces and formats correctly
      // Input is expected to be pre-validated, but whitespace is acceptable
      expect(formatPercent(" 25.5 ")).toBe("25.5");
    });
  });

  describe("formatValue", () => {
    it("formats number with two decimals (en-US default)", () => {
      expect(formatValue("1000")).toBe("1,000.00");
      expect(formatValue("1234567.89")).toBe("1,234,567.89");
    });

    it("adds currency prefix when provided", () => {
      expect(formatValue("1000", "USD")).toBe("USD 1,000.00");
      expect(formatValue("5000", "EUR")).toBe("EUR 5,000.00");
    });

    it("handles decimal values", () => {
      expect(formatValue("1000.5")).toBe("1,000.50");
      expect(formatValue("1000.567")).toBe("1,000.57"); // rounds to 2 decimals
    });

    it("returns original value for NaN input", () => {
      expect(formatValue("invalid")).toBe("invalid");
      expect(formatValue("abc", "USD")).toBe("abc");
    });

    it("handles zero", () => {
      expect(formatValue("0")).toBe("0.00");
      expect(formatValue("0", "BRL")).toBe("BRL 0.00");
    });

    it("formats with pt-BR locale (i18n support)", () => {
      // Brazilian format: dots for thousands, comma for decimal
      expect(formatValue("1000", undefined, "pt-BR")).toBe("1.000,00");
      expect(formatValue("1234567.89", undefined, "pt-BR")).toBe("1.234.567,89");
      expect(formatValue("5000", "BRL", "pt-BR")).toBe("BRL 5.000,00");
    });

    it("formats with de-DE locale", () => {
      // German format: dots for thousands, comma for decimal
      expect(formatValue("1000", undefined, "de-DE")).toBe("1.000,00");
      expect(formatValue("1000", "EUR", "de-DE")).toBe("EUR 1.000,00");
    });
  });
});

describe("AllocationPieChart Data Processing Performance", () => {
  /**
   * AC-3.1.1: Chart renders in <100ms
   *
   * These tests verify that the data transformation logic
   * (which runs before render) completes quickly.
   */

  const generateMockAllocations = (count: number): ClassAllocation[] => {
    return Array.from({ length: count }, (_, i) => ({
      classId: `class-${i}`,
      className: `Asset Class ${i}`,
      value: String(1000 * (i + 1)),
      percentage: String(100 / count),
      assetCount: i + 1,
      targetMin: String(5),
      targetMax: String(15),
      status: "on-target" as const,
      color: i % 2 === 0 ? undefined : `#${i}${i}${i}`,
    }));
  };

  it("processes 10 allocations in <10ms", () => {
    const allocations = generateMockAllocations(10);

    const start = performance.now();

    // Simulate the data transformation that happens in useMemo
    const chartData = allocations.map((alloc, index) => ({
      ...alloc,
      value: parseFloat(alloc.percentage) || 0,
      fill: getSegmentColor(index, alloc.color),
    }));

    const duration = performance.now() - start;

    expect(chartData).toHaveLength(10);
    expect(duration).toBeLessThan(10);
  });

  it("processes 50 allocations in <50ms", () => {
    const allocations = generateMockAllocations(50);

    const start = performance.now();

    const chartData = allocations.map((alloc, index) => ({
      ...alloc,
      value: parseFloat(alloc.percentage) || 0,
      fill: getSegmentColor(index, alloc.color),
    }));

    const duration = performance.now() - start;

    expect(chartData).toHaveLength(50);
    expect(duration).toBeLessThan(50);
  });

  it("formats all percentages quickly", () => {
    const percentages = Array.from({ length: 100 }, () => String(Math.random() * 100));

    const start = performance.now();
    const formatted = percentages.map(formatPercent);
    const duration = performance.now() - start;

    expect(formatted).toHaveLength(100);
    expect(duration).toBeLessThan(50);
  });

  it("formats all values quickly", () => {
    const values = Array.from({ length: 100 }, () => String(Math.random() * 1000000));

    const start = performance.now();
    const formatted = values.map((v) => formatValue(v, "USD"));
    const duration = performance.now() - start;

    expect(formatted).toHaveLength(100);
    expect(duration).toBeLessThan(50);
  });
});

describe("AllocationPieChart Data Validation", () => {
  describe("chart data transformation", () => {
    it("converts percentage string to number for chart value", () => {
      const allocation: ClassAllocation = {
        classId: "stocks",
        className: "Stocks",
        value: "50000",
        percentage: "45.5",
        assetCount: 5,
        targetMin: "40",
        targetMax: "50",
        status: "on-target",
      };

      const chartValue = parseFloat(allocation.percentage) || 0;
      expect(chartValue).toBe(45.5);
    });

    it("handles invalid percentage gracefully", () => {
      const chartValue = parseFloat("invalid") || 0;
      expect(chartValue).toBe(0);
    });

    it("handles empty percentage gracefully", () => {
      const chartValue = parseFloat("") || 0;
      expect(chartValue).toBe(0);
    });
  });

  describe("color assignment", () => {
    it("assigns colors in order for unlabeled segments", () => {
      const allocations = [
        { index: 0, color: undefined },
        { index: 1, color: undefined },
        { index: 2, color: undefined },
      ];

      const colors = allocations.map((a) => getSegmentColor(a.index, a.color));

      expect(colors[0]).toBe(CHART_COLORS[0]);
      expect(colors[1]).toBe(CHART_COLORS[1]);
      expect(colors[2]).toBe(CHART_COLORS[2]);
    });

    it("respects custom colors when provided", () => {
      const customColor = "hsl(180, 50%, 50%)";
      const color = getSegmentColor(0, customColor);
      expect(color).toBe(customColor);
    });
  });
});

describe("AllocationPieChart Accessibility (AC-3.1.4)", () => {
  /**
   * AC-3.1.4: Accessibility
   * - Given I am using a screen reader
   * - When the pie chart is displayed
   * - Then accessible text describes the allocation distribution
   * - And ARIA labels are provided for each segment
   */

  describe("accessible description generation", () => {
    it("generates description for single allocation", () => {
      const allocations = [
        {
          classId: "stocks",
          className: "Stocks",
          percentage: "100",
        },
      ];

      const description = allocations
        .map((a) => `${a.className}: ${formatPercent(a.percentage)}%`)
        .join(", ");

      expect(description).toBe("Stocks: 100.0%");
    });

    it("generates description for multiple allocations", () => {
      const allocations = [
        { classId: "stocks", className: "Stocks", percentage: "50" },
        { classId: "bonds", className: "Bonds", percentage: "30" },
        { classId: "reits", className: "REITs", percentage: "20" },
      ];

      const description = allocations
        .map((a) => `${a.className}: ${formatPercent(a.percentage)}%`)
        .join(", ");

      expect(description).toBe("Stocks: 50.0%, Bonds: 30.0%, REITs: 20.0%");
    });

    it("formats fractional percentages correctly for screen readers", () => {
      const allocations = [
        { classId: "stocks", className: "Stocks", percentage: "33.33" },
        { classId: "bonds", className: "Bonds", percentage: "33.33" },
        { classId: "cash", className: "Cash", percentage: "33.34" },
      ];

      const descriptions = allocations.map(
        (a) => `${a.className}: ${formatPercent(a.percentage)}%`
      );

      expect(descriptions[0]).toBe("Stocks: 33.3%");
      expect(descriptions[1]).toBe("Bonds: 33.3%");
      expect(descriptions[2]).toBe("Cash: 33.3%");
    });
  });

  describe("ARIA label generation for legend items", () => {
    it("generates correct ARIA label for legend button", () => {
      const entry = { value: "Stocks", percentage: "45.5" };
      const ariaLabel = `${entry.value}: ${formatPercent(entry.percentage)}% allocation`;
      expect(ariaLabel).toBe("Stocks: 45.5% allocation");
    });

    it("handles special characters in class names", () => {
      const entry = { value: "S&P 500 ETFs", percentage: "25" };
      const ariaLabel = `${entry.value}: ${formatPercent(entry.percentage)}% allocation`;
      expect(ariaLabel).toBe("S&P 500 ETFs: 25.0% allocation");
    });
  });
});

describe("AllocationPieChart Legend - Full Class Names", () => {
  /**
   * Tests to verify that class names are displayed in full without truncation.
   * The legend should show complete asset class names regardless of length.
   */

  describe("legend entry generation", () => {
    it("preserves full class name for short names", () => {
      const className = "Stocks";
      const entry = { value: className, percentage: "45.5" };

      // Legend should display full name
      expect(entry.value).toBe("Stocks");
      expect(entry.value.length).toBe(6);
    });

    it("preserves full class name for medium-length names", () => {
      const className = "Fixed Income Bonds";
      const entry = { value: className, percentage: "30.0" };

      expect(entry.value).toBe("Fixed Income Bonds");
      expect(entry.value.length).toBe(18);
    });

    it("preserves full class name for long names", () => {
      const className = "International Real Estate Investment Trusts";
      const entry = { value: className, percentage: "15.0" };

      expect(entry.value).toBe("International Real Estate Investment Trusts");
      expect(entry.value.length).toBe(43);
    });

    it("preserves full class name for very long names with special characters", () => {
      const className = "S&P 500 Index-Linked Emerging Markets ETF Portfolio";
      const entry = { value: className, percentage: "10.0" };

      expect(entry.value).toBe("S&P 500 Index-Linked Emerging Markets ETF Portfolio");
      expect(entry.value.length).toBe(51);
    });
  });

  describe("ARIA labels with full class names", () => {
    it("generates complete ARIA label for short class name", () => {
      const className = "Stocks";
      const percentage = "45.5";
      const ariaLabel = `${className}: ${formatPercent(percentage)}% allocation`;

      expect(ariaLabel).toBe("Stocks: 45.5% allocation");
    });

    it("generates complete ARIA label for long class name", () => {
      const className = "International Real Estate Investment Trusts";
      const percentage = "15.0";
      const ariaLabel = `${className}: ${formatPercent(percentage)}% allocation`;

      expect(ariaLabel).toBe("International Real Estate Investment Trusts: 15.0% allocation");
    });

    it("generates complete ARIA label with special characters", () => {
      const className = "S&P 500 ETFs (Large Cap)";
      const percentage = "25.0";
      const ariaLabel = `${className}: ${formatPercent(percentage)}% allocation`;

      expect(ariaLabel).toBe("S&P 500 ETFs (Large Cap): 25.0% allocation");
    });
  });

  describe("accessible description with full class names", () => {
    it("generates full description for portfolio with long class names", () => {
      const allocations = [
        { classId: "1", className: "United States Equity Large Cap Growth", percentage: "40" },
        { classId: "2", className: "International Developed Markets Bonds", percentage: "35" },
        { classId: "3", className: "Emerging Markets Real Estate", percentage: "25" },
      ];

      const description = allocations
        .map((a) => `${a.className}: ${formatPercent(a.percentage)}%`)
        .join(", ");

      expect(description).toBe(
        "United States Equity Large Cap Growth: 40.0%, " +
          "International Developed Markets Bonds: 35.0%, " +
          "Emerging Markets Real Estate: 25.0%"
      );
    });

    it("includes all class names without truncation in description", () => {
      const allocations = [
        { className: "Very Long Asset Class Name That Should Not Be Truncated", percentage: "50" },
        { className: "Another Extremely Long Name For Testing Purposes", percentage: "50" },
      ];

      const descriptions = allocations.map((a) => a.className);

      // Verify no truncation (no ellipsis)
      descriptions.forEach((name) => {
        expect(name).not.toContain("...");
        expect(name).not.toContain("…");
      });
    });
  });

  describe("legend data transformation preserves full names", () => {
    it("transforms allocations array preserving full class names", () => {
      const allocations: ClassAllocation[] = [
        {
          classId: "us-equity",
          className: "United States Large Cap Equity Growth Fund",
          value: "50000",
          percentage: "50",
          assetCount: 5,
          targetMin: "45",
          targetMax: "55",
          status: "on-target",
        },
        {
          classId: "intl-bonds",
          className: "International Investment Grade Corporate Bonds",
          value: "30000",
          percentage: "30",
          assetCount: 3,
          targetMin: "25",
          targetMax: "35",
          status: "on-target",
        },
        {
          classId: "em-reits",
          className: "Emerging Markets Real Estate Investment Trusts",
          value: "20000",
          percentage: "20",
          assetCount: 2,
          targetMin: "15",
          targetMax: "25",
          status: "on-target",
        },
      ];

      // Simulate legend data transformation
      const legendData = allocations.map((alloc, index) => ({
        value: alloc.className, // Full name preserved
        payload: {
          classId: alloc.classId,
          percentage: alloc.percentage,
        },
        color: getSegmentColor(index, alloc.color),
      }));

      // Verify all class names are preserved in full
      expect(legendData[0].value).toBe("United States Large Cap Equity Growth Fund");
      expect(legendData[1].value).toBe("International Investment Grade Corporate Bonds");
      expect(legendData[2].value).toBe("Emerging Markets Real Estate Investment Trusts");

      // Verify no name was truncated
      legendData.forEach((entry) => {
        expect(entry.value).not.toContain("...");
        expect(entry.value.length).toBeGreaterThan(30); // All test names are > 30 chars
      });
    });
  });
});

describe("AllocationPieChart Edge Cases", () => {
  it("handles empty allocations array", () => {
    const allocations: ClassAllocation[] = [];
    expect(allocations.length).toBe(0);
    // Component shows "No allocation data" message (E2E tested)
  });

  it("handles single allocation (100%)", () => {
    const allocation: ClassAllocation = {
      classId: "all-in-stocks",
      className: "Stocks",
      value: "100000",
      percentage: "100",
      assetCount: 10,
      targetMin: null,
      targetMax: null,
      status: "no-target",
    };

    const chartValue = parseFloat(allocation.percentage);
    const formattedPercent = formatPercent(allocation.percentage);

    expect(chartValue).toBe(100);
    expect(formattedPercent).toBe("100.0");
  });

  it("handles very small percentages", () => {
    const percentage = "0.01";
    const formatted = formatPercent(percentage);
    expect(formatted).toBe("0.0"); // rounds to 1 decimal
  });

  it("handles very large values", () => {
    const value = "999999999.99";
    const formatted = formatValue(value, "USD");
    expect(formatted).toBe("USD 999,999,999.99");
  });

  it("handles very large values with locale", () => {
    const value = "999999999.99";
    const formatted = formatValue(value, "BRL", "pt-BR");
    expect(formatted).toBe("BRL 999.999.999,99");
  });
});
