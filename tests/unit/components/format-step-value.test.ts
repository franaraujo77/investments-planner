/**
 * formatStepValue Helper Tests
 *
 * Story 7.7 (i18n): API Precision i18n Refactoring
 * AC-7.7.2: Client-Side Locale-Aware Formatting
 *
 * Tests the formatStepValue helper function for locale-aware
 * formatting of calculation step values.
 */

import { describe, it, expect } from "vitest";
import {
  formatStepValue,
  supportsLocaleFormatting,
} from "@/components/recommendations/format-step-value";
import { createNumberFormatter } from "@/lib/i18n/useNumberFormat";
import type { CalculationStep } from "@/lib/types/recommendations";

describe("formatStepValue", () => {
  describe("with en-US locale", () => {
    const formatters = createNumberFormatter("en-US");

    it("formats percent values with period as decimal separator", () => {
      const step: CalculationStep = {
        step: "Calculate allocation gap",
        value: "15.50%", // Fallback
        rawValue: 15.5,
        valueType: "percent",
        formula: "target - current",
      };

      const result = formatStepValue(step, formatters);

      // Intl.NumberFormat percent style includes the % symbol
      expect(result).toBe("15.50%");
    });

    it("formats currency values with $ and period decimal", () => {
      const step: CalculationStep = {
        step: "Distribute capital",
        value: "$800.00",
        rawValue: 800,
        valueType: "currency",
        formula: "weighted × total",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("$800.00");
    });

    it("formats weight values with 4 decimal places", () => {
      const step: CalculationStep = {
        step: "Apply score weighting",
        value: "0.1163",
        rawValue: 0.11625,
        valueType: "weight",
        formula: "gap × (score / 100)",
      };

      const result = formatStepValue(step, formatters);

      // 4 decimal places, period separator
      expect(result).toBe("0.1163");
    });

    it("formats number values", () => {
      const step: CalculationStep = {
        step: "Calculate priority",
        value: "75",
        rawValue: 75,
        valueType: "number",
        formula: "base × multiplier",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("75.00");
    });
  });

  describe("with pt-BR locale", () => {
    const formatters = createNumberFormatter("pt-BR");

    it("formats percent values with comma as decimal separator", () => {
      const step: CalculationStep = {
        step: "Calculate allocation gap",
        value: "15.50%", // en-US fallback
        rawValue: 15.5,
        valueType: "percent",
        formula: "target - current",
      };

      const result = formatStepValue(step, formatters);

      // pt-BR uses comma as decimal separator
      expect(result).toBe("15,50%");
    });

    it("formats currency values with R$ and comma decimal", () => {
      const step: CalculationStep = {
        step: "Distribute capital",
        value: "$800.00",
        rawValue: 800,
        valueType: "currency",
        formula: "weighted × total",
      };

      const result = formatStepValue(step, formatters);

      // pt-BR default currency is BRL
      expect(result).toMatch(/R\$\s*800,00/);
    });

    it("formats weight values with comma decimal", () => {
      const step: CalculationStep = {
        step: "Apply score weighting",
        value: "0.1163",
        rawValue: 0.11625,
        valueType: "weight",
        formula: "gap × (score / 100)",
      };

      const result = formatStepValue(step, formatters);

      // pt-BR uses comma as decimal separator
      expect(result).toBe("0,1163");
    });

    it("formats number values with comma decimal", () => {
      const step: CalculationStep = {
        step: "Calculate priority",
        value: "75",
        rawValue: 1234.56,
        valueType: "number",
        formula: "base × multiplier",
      };

      const result = formatStepValue(step, formatters);

      // pt-BR: period as thousands, comma as decimal
      expect(result).toBe("1.234,56");
    });
  });

  describe("backward compatibility", () => {
    const formatters = createNumberFormatter("en-US");

    it("falls back to string value when rawValue is undefined", () => {
      const step: CalculationStep = {
        step: "Legacy step",
        value: "15.50%",
        // No rawValue or valueType
        formula: "legacy formula",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("15.50%");
    });

    it("falls back to string value when valueType is undefined", () => {
      const step: CalculationStep = {
        step: "Partial step",
        value: "$500.00",
        rawValue: 500,
        // No valueType
        formula: "formula",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("$500.00");
    });
  });

  describe("edge cases", () => {
    const formatters = createNumberFormatter("en-US");

    it("handles zero values", () => {
      const step: CalculationStep = {
        step: "Zero amount",
        value: "$0.00",
        rawValue: 0,
        valueType: "currency",
        formula: "formula",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("$0.00");
    });

    it("handles negative percentages", () => {
      const step: CalculationStep = {
        step: "Negative gap",
        value: "-10.00%",
        rawValue: -10,
        valueType: "percent",
        formula: "formula",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("-10.00%");
    });

    it("handles very small weight values", () => {
      const step: CalculationStep = {
        step: "Small weight",
        value: "0.0001",
        rawValue: 0.0001,
        valueType: "weight",
        formula: "formula",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("0.0001");
    });

    it("handles large currency values", () => {
      const step: CalculationStep = {
        step: "Large amount",
        value: "$1,000,000.00",
        rawValue: 1000000,
        valueType: "currency",
        formula: "formula",
      };

      const result = formatStepValue(step, formatters);

      expect(result).toBe("$1,000,000.00");
    });
  });
});

describe("supportsLocaleFormatting", () => {
  it("returns true when both rawValue and valueType are present", () => {
    const step: CalculationStep = {
      step: "Full step",
      value: "15.50%",
      rawValue: 15.5,
      valueType: "percent",
      formula: "formula",
    };

    expect(supportsLocaleFormatting(step)).toBe(true);
  });

  it("returns false when rawValue is missing", () => {
    const step: CalculationStep = {
      step: "No raw value",
      value: "15.50%",
      valueType: "percent",
      formula: "formula",
    };

    expect(supportsLocaleFormatting(step)).toBe(false);
  });

  it("returns false when valueType is missing", () => {
    const step: CalculationStep = {
      step: "No value type",
      value: "15.50%",
      rawValue: 15.5,
      formula: "formula",
    };

    expect(supportsLocaleFormatting(step)).toBe(false);
  });

  it("returns false for legacy steps", () => {
    const step: CalculationStep = {
      step: "Legacy step",
      value: "15.50%",
      formula: "formula",
    };

    expect(supportsLocaleFormatting(step)).toBe(false);
  });
});
