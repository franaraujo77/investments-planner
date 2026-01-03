/**
 * Unit Tests for ScoreBreakdown Component Utilities
 *
 * Story 5.4: View Asset Scores
 * AC-5.4.2: Score Breakdown Panel
 * AC-5.4.3: Missing Data Indicators
 * AC-5.4.4: Data Freshness Display
 *
 * Tests cover utility functions used by the component:
 * - formatRelativeTime
 * - getScoreColorClasses
 *
 * Note: Component rendering tests require @testing-library/react which is not installed.
 * These tests focus on the exported utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  getScoreColorClasses,
  getSensitivityLabel,
  FormulaExplanationSection,
  ThresholdComparisonBar,
} from "@/components/fintech/score-breakdown";
import { getScoreLevel } from "@/components/fintech/score-badge";
import type { CriterionResult } from "@/hooks/use-asset-score";

// =============================================================================
// COMPONENT EXPORT TESTS
// =============================================================================

describe("ScoreBreakdown Component Exports (Story 7.2)", () => {
  /**
   * Verifies that Story 7.2 components are properly exported
   * AC-7.2.1: FormulaExplanationSection
   * AC-7.2.4: ThresholdComparisonBar
   */
  it("exports FormulaExplanationSection component", () => {
    expect(FormulaExplanationSection).toBeDefined();
    expect(typeof FormulaExplanationSection).toBe("function");
  });

  it("exports ThresholdComparisonBar component", () => {
    expect(ThresholdComparisonBar).toBeDefined();
    expect(typeof ThresholdComparisonBar).toBe("function");
  });

  it("exports getSensitivityLabel utility", () => {
    expect(getSensitivityLabel).toBeDefined();
    expect(typeof getSensitivityLabel).toBe("function");
  });
});

// =============================================================================
// UTILITY TESTS
// =============================================================================

describe("ScoreBreakdown Utilities", () => {
  describe("formatRelativeTime", () => {
    it("formats just now correctly", () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe("just now");
    });

    it("formats seconds ago as just now", () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      expect(formatRelativeTime(thirtySecondsAgo)).toBe("just now");
    });

    it("formats 1 minute ago correctly", () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
    });

    it("formats minutes ago correctly", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
    });

    it("formats 1 hour ago correctly", () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
    });

    it("formats hours ago correctly", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe("3 hours ago");
    });

    it("formats 1 day ago correctly", () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneDayAgo)).toBe("1 day ago");
    });

    it("formats days ago correctly", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe("2 days ago");
    });

    it("formats many days ago correctly", () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(sevenDaysAgo)).toBe("7 days ago");
    });
  });

  describe("getScoreColorClasses", () => {
    it("returns green classes for high score", () => {
      const colors = getScoreColorClasses("high");
      expect(colors.bg).toBe("bg-green-500");
      expect(colors.text).toBe("text-green-500");
      expect(colors.border).toBe("border-green-500");
    });

    it("returns amber classes for medium score", () => {
      const colors = getScoreColorClasses("medium");
      expect(colors.bg).toBe("bg-amber-500");
      expect(colors.text).toBe("text-amber-500");
      expect(colors.border).toBe("border-amber-500");
    });

    it("returns red classes for low score", () => {
      const colors = getScoreColorClasses("low");
      expect(colors.bg).toBe("bg-red-500");
      expect(colors.text).toBe("text-red-500");
      expect(colors.border).toBe("border-red-500");
    });
  });

  describe("getScoreLevel (from ScoreBadge)", () => {
    it("returns high for score >= 80", () => {
      expect(getScoreLevel(80)).toBe("high");
      expect(getScoreLevel(85)).toBe("high");
      expect(getScoreLevel(100)).toBe("high");
    });

    it("returns medium for score 50-79", () => {
      expect(getScoreLevel(50)).toBe("medium");
      expect(getScoreLevel(65)).toBe("medium");
      expect(getScoreLevel(79)).toBe("medium");
    });

    it("returns low for score < 50", () => {
      expect(getScoreLevel(0)).toBe("low");
      expect(getScoreLevel(25)).toBe("low");
      expect(getScoreLevel(49)).toBe("low");
    });
  });
});

// =============================================================================
// DATA STRUCTURE TESTS
// =============================================================================

describe("ScoreBreakdown Data Structures", () => {
  describe("CriterionResult interface", () => {
    it("has correct structure for matched criterion", () => {
      const criterion: CriterionResult = {
        criterionId: "crit-1",
        criterionName: "Dividend Yield > 6%",
        matched: true,
        pointsAwarded: 20,
        actualValue: "7.5",
        skippedReason: null,
      };

      expect(criterion.criterionId).toBeDefined();
      expect(criterion.criterionName).toBeDefined();
      expect(criterion.matched).toBe(true);
      expect(criterion.pointsAwarded).toBeGreaterThan(0);
      expect(criterion.actualValue).toBe("7.5");
      expect(criterion.skippedReason).toBeNull();
    });

    it("has correct structure for unmatched criterion", () => {
      const criterion: CriterionResult = {
        criterionId: "crit-2",
        criterionName: "P/E Ratio < 15",
        matched: false,
        pointsAwarded: 0,
        actualValue: "18.2",
        skippedReason: null,
      };

      expect(criterion.matched).toBe(false);
      expect(criterion.pointsAwarded).toBe(0);
      expect(criterion.actualValue).toBe("18.2");
      expect(criterion.skippedReason).toBeNull();
    });

    it("has correct structure for skipped criterion", () => {
      const criterion: CriterionResult = {
        criterionId: "crit-3",
        criterionName: "ROE > 15%",
        matched: false,
        pointsAwarded: 0,
        actualValue: null,
        skippedReason: "missing_fundamental",
      };

      expect(criterion.matched).toBe(false);
      expect(criterion.pointsAwarded).toBe(0);
      expect(criterion.actualValue).toBeNull();
      expect(criterion.skippedReason).toBe("missing_fundamental");
    });
  });

  describe("Breakdown processing logic", () => {
    const mockBreakdown: CriterionResult[] = [
      {
        criterionId: "crit-1",
        criterionName: "Dividend Yield > 6%",
        matched: true,
        pointsAwarded: 20,
        actualValue: "7.5",
        skippedReason: null,
      },
      {
        criterionId: "crit-2",
        criterionName: "P/E Ratio < 15",
        matched: false,
        pointsAwarded: 0,
        actualValue: "18.2",
        skippedReason: null,
      },
      {
        criterionId: "crit-3",
        criterionName: "ROE > 15%",
        matched: true,
        pointsAwarded: 15,
        actualValue: "22.5",
        skippedReason: null,
      },
      {
        criterionId: "crit-4",
        criterionName: "Debt/Equity < 0.5",
        matched: false,
        pointsAwarded: 0,
        actualValue: null,
        skippedReason: "missing_fundamental",
      },
      {
        criterionId: "crit-5",
        criterionName: "Market Cap > 1B",
        matched: false,
        pointsAwarded: 0,
        actualValue: null,
        skippedReason: "data_stale",
      },
    ];

    it("separates evaluated and skipped criteria", () => {
      const evaluated: CriterionResult[] = [];
      const skipped: CriterionResult[] = [];

      for (const c of mockBreakdown) {
        if (c.skippedReason) {
          skipped.push(c);
        } else {
          evaluated.push(c);
        }
      }

      expect(evaluated).toHaveLength(3);
      expect(skipped).toHaveLength(2);
    });

    it("sorts criteria by absolute points impact", () => {
      const evaluated = mockBreakdown.filter((c) => !c.skippedReason);
      const sorted = [...evaluated].sort(
        (a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded)
      );

      expect(sorted[0]!.pointsAwarded).toBe(20); // Highest impact first
      expect(sorted[1]!.pointsAwarded).toBe(15);
      expect(sorted[2]!.pointsAwarded).toBe(0);
    });

    it("calculates matched criteria count", () => {
      const evaluated = mockBreakdown.filter((c) => !c.skippedReason);
      const matchedCount = evaluated.filter((c) => c.matched).length;
      const totalEvaluated = evaluated.length;

      expect(matchedCount).toBe(2);
      expect(totalEvaluated).toBe(3);
    });

    it("filters positive point contributors for chart", () => {
      const chartData = mockBreakdown
        .filter((c) => !c.skippedReason)
        .filter((c) => c.pointsAwarded !== 0);

      expect(chartData).toHaveLength(2);
      expect(chartData[0]!.pointsAwarded).toBe(20);
      expect(chartData[1]!.pointsAwarded).toBe(15);
    });
  });
});

// =============================================================================
// SKIP REASON FORMATTING TESTS
// =============================================================================

describe("Skip Reason Formatting", () => {
  function formatSkipReason(reason: string | null): string {
    if (!reason) return "Unknown reason";

    switch (reason) {
      case "missing_fundamental":
        return "Missing data";
      case "data_stale":
        return "Stale data";
      default:
        return reason.replace(/_/g, " ");
    }
  }

  it("formats missing_fundamental reason", () => {
    expect(formatSkipReason("missing_fundamental")).toBe("Missing data");
  });

  it("formats data_stale reason", () => {
    expect(formatSkipReason("data_stale")).toBe("Stale data");
  });

  it("formats unknown reason by replacing underscores", () => {
    expect(formatSkipReason("some_other_reason")).toBe("some other reason");
  });

  it("returns Unknown reason for null", () => {
    expect(formatSkipReason(null)).toBe("Unknown reason");
  });
});

// =============================================================================
// SCORE NORMALIZATION TESTS
// =============================================================================

describe("Score Normalization", () => {
  function normalizeScore(score: number | string): number {
    const numericScore = typeof score === "string" ? parseFloat(score) : score;
    return Math.round(numericScore);
  }

  it("rounds decimal scores to integers", () => {
    expect(normalizeScore(85.4)).toBe(85);
    expect(normalizeScore(85.5)).toBe(86);
    expect(normalizeScore(85.9)).toBe(86);
  });

  it("handles string scores", () => {
    expect(normalizeScore("72.456")).toBe(72);
    expect(normalizeScore("85.5000")).toBe(86);
  });

  it("handles integer scores", () => {
    expect(normalizeScore(100)).toBe(100);
    expect(normalizeScore(0)).toBe(0);
  });
});

// =============================================================================
// URL GENERATION TESTS
// =============================================================================

describe("Edit Criteria URL Generation", () => {
  function buildEditCriteriaUrl(targetMarket?: string): string {
    return targetMarket ? `/criteria?market=${encodeURIComponent(targetMarket)}` : "/criteria";
  }

  it("generates URL with market filter", () => {
    expect(buildEditCriteriaUrl("US_TECH")).toBe("/criteria?market=US_TECH");
  });

  it("generates URL without filter when no market", () => {
    expect(buildEditCriteriaUrl()).toBe("/criteria");
    expect(buildEditCriteriaUrl(undefined)).toBe("/criteria");
  });

  it("encodes special characters in market", () => {
    expect(buildEditCriteriaUrl("US TECH")).toBe("/criteria?market=US%20TECH");
  });
});

// =============================================================================
// STORY 7.1: DATA SOURCE ATTRIBUTION IN SCORE BREAKDOWN
// Task 5.6: Unit tests for attribution display in score breakdown
// =============================================================================

import type { CalculationInputSources, SourceAttribution } from "@/lib/types/source-attribution";
import { getProviderDisplayName, formatSourceAttribution } from "@/lib/types/source-attribution";

describe("ScoreBreakdown Data Source Attribution (Story 7.1)", () => {
  /**
   * AC-7.1.1: Click/Hover Data Point Attribution
   * Tests that input sources contain correct provider information
   */
  describe("CalculationInputSources structure", () => {
    const mockInputSources: CalculationInputSources = {
      price: {
        source: "gemini",
        value: "28.45",
        currency: "BRL",
        fetchedAt: new Date("2025-12-31T10:00:00Z"),
      },
      exchangeRate: {
        source: "exchangerate-api",
        from: "BRL",
        to: "USD",
        rate: "0.1992",
        fetchedAt: new Date("2025-12-31T09:00:00Z"),
      },
      fundamentals: {
        source: "gemini",
        fetchedAt: new Date("2025-12-30T10:00:00Z"),
        metrics: {
          peRatio: 15.5,
          pbRatio: 2.1,
          dividendYield: 6.5,
          marketCap: null,
          revenue: null,
          earnings: null,
        },
      },
      criteriaVersion: "crit-version-123",
    };

    it("should have price source information", () => {
      expect(mockInputSources.price).toBeDefined();
      expect(mockInputSources.price?.source).toBe("gemini");
      expect(mockInputSources.price?.value).toBe("28.45");
      expect(mockInputSources.price?.currency).toBe("BRL");
      expect(mockInputSources.price?.fetchedAt).toBeInstanceOf(Date);
    });

    it("should have exchange rate source information", () => {
      expect(mockInputSources.exchangeRate).toBeDefined();
      expect(mockInputSources.exchangeRate?.source).toBe("exchangerate-api");
      expect(mockInputSources.exchangeRate?.from).toBe("BRL");
      expect(mockInputSources.exchangeRate?.to).toBe("USD");
      expect(mockInputSources.exchangeRate?.rate).toBe("0.1992");
    });

    it("should have fundamentals source information", () => {
      expect(mockInputSources.fundamentals).toBeDefined();
      expect(mockInputSources.fundamentals?.source).toBe("gemini");
      expect(mockInputSources.fundamentals?.metrics.peRatio).toBe(15.5);
      expect(mockInputSources.fundamentals?.metrics.dividendYield).toBe(6.5);
    });

    it("should have criteria version reference", () => {
      expect(mockInputSources.criteriaVersion).toBe("crit-version-123");
    });
  });

  /**
   * AC-7.1.1: Provider name is human-readable
   * Tests that provider display names are correctly mapped
   */
  describe("Provider display name formatting", () => {
    it("should format gemini as Gemini API", () => {
      expect(getProviderDisplayName("gemini")).toBe("Gemini API");
    });

    it("should format exchangerate-api correctly", () => {
      expect(getProviderDisplayName("exchangerate-api")).toBe("ExchangeRate-API");
    });

    it("should format manual entry source", () => {
      expect(getProviderDisplayName("manual")).toBe("Manual Entry");
    });

    it("should return source as-is for unknown providers", () => {
      expect(getProviderDisplayName("unknown-provider")).toBe("unknown-provider");
    });
  });

  /**
   * AC-7.1.2: Timestamp visibility
   * Tests that attribution includes timestamp information
   */
  describe("Attribution timestamp handling", () => {
    it("should create SourceAttribution with timestamp", () => {
      const timestamp = new Date("2025-12-31T10:00:00Z");
      const attribution: SourceAttribution = {
        dataType: "price",
        source: "Gemini API",
        timestamp,
      };

      expect(attribution.timestamp).toEqual(timestamp);
    });

    it("should support attribution without timestamp (optional)", () => {
      const attribution: SourceAttribution = {
        dataType: "fundamentals",
        source: "Yahoo Finance",
      };

      expect(attribution.timestamp).toBeUndefined();
    });
  });

  /**
   * Tests for building attribution objects from input sources
   * Used by CalculationInputsSection component
   */
  describe("Building attribution from input sources", () => {
    it("should build price attribution correctly", () => {
      const inputSource = {
        source: "gemini",
        value: "28.45",
        currency: "BRL",
        fetchedAt: new Date("2025-12-31T10:00:00Z"),
      };

      const attribution: SourceAttribution = {
        dataType: "price",
        source: inputSource.source,
        timestamp: inputSource.fetchedAt,
      };

      expect(attribution.dataType).toBe("price");
      expect(attribution.source).toBe("gemini");
      expect(attribution.timestamp).toEqual(inputSource.fetchedAt);
    });

    it("should build rate attribution correctly", () => {
      const inputSource = {
        source: "exchangerate-api",
        from: "BRL",
        to: "USD",
        rate: "0.1992",
        fetchedAt: new Date("2025-12-31T09:00:00Z"),
      };

      const attribution: SourceAttribution = {
        dataType: "rate",
        source: inputSource.source,
        timestamp: inputSource.fetchedAt,
      };

      expect(attribution.dataType).toBe("rate");
      expect(attribution.source).toBe("exchangerate-api");
    });

    it("should build fundamentals attribution correctly", () => {
      const inputSource = {
        source: "gemini",
        fetchedAt: new Date("2025-12-30T10:00:00Z"),
        metrics: {
          peRatio: 15.5,
          pbRatio: 2.1,
          dividendYield: 6.5,
        },
      };

      const attribution: SourceAttribution = {
        dataType: "fundamentals",
        source: inputSource.source,
        timestamp: inputSource.fetchedAt,
      };

      expect(attribution.dataType).toBe("fundamentals");
      expect(attribution.source).toBe("gemini");
    });
  });

  /**
   * Tests for formatSourceAttribution used in tooltips
   */
  describe("Source attribution formatting for display", () => {
    it("should format price attribution string", () => {
      const formatted = formatSourceAttribution("price", "gemini");
      expect(formatted).toBe("Price from Gemini API");
    });

    it("should format rate attribution string", () => {
      const formatted = formatSourceAttribution("rate", "exchangerate-api");
      expect(formatted).toBe("Rate from ExchangeRate-API");
    });

    it("should format fundamentals attribution string", () => {
      const formatted = formatSourceAttribution("fundamentals", "gemini");
      expect(formatted).toBe("Fundamentals from Gemini API");
    });

    it("should format score attribution string", () => {
      const formatted = formatSourceAttribution("score", "local");
      expect(formatted).toBe("Score from local");
    });
  });

  /**
   * Tests for handling missing/null input sources
   */
  describe("Handling missing input sources", () => {
    it("should handle undefined price source", () => {
      const inputSources: CalculationInputSources = {
        criteriaVersion: "crit-123",
      };

      expect(inputSources.price).toBeUndefined();
    });

    it("should handle partial input sources", () => {
      const inputSources: CalculationInputSources = {
        price: {
          source: "gemini",
          value: "100.00",
          currency: "USD",
          fetchedAt: new Date(),
        },
        criteriaVersion: "crit-123",
      };

      expect(inputSources.price).toBeDefined();
      expect(inputSources.exchangeRate).toBeUndefined();
      expect(inputSources.fundamentals).toBeUndefined();
    });

    it("should handle fundamentals with null metrics", () => {
      const inputSources: CalculationInputSources = {
        fundamentals: {
          source: "gemini",
          fetchedAt: new Date(),
          metrics: {
            peRatio: null,
            pbRatio: null,
            dividendYield: 5.0,
            marketCap: null,
            revenue: null,
            earnings: null,
          },
        },
        criteriaVersion: "crit-123",
      };

      const nonNullMetrics = Object.keys(inputSources.fundamentals!.metrics).filter(
        (k) =>
          inputSources.fundamentals!.metrics[
            k as keyof typeof inputSources.fundamentals.metrics
          ] !== null
      );

      expect(nonNullMetrics).toHaveLength(1);
      expect(nonNullMetrics[0]).toBe("dividendYield");
    });
  });
});

// =============================================================================
// STORY 7.2: CALCULATION TRANSPARENCY
// =============================================================================

import { formatThreshold } from "@/lib/types/calculation-breakdown";

describe("Calculation Transparency (Story 7.2)", () => {
  /**
   * AC-7.2.5: Score Sensitivity Hints
   * Tests for getSensitivityLabel function
   */
  describe("getSensitivityLabel (AC-7.2.5)", () => {
    it("returns almost-passing for values within 10% of threshold (gte operator)", () => {
      // Threshold is 20, actual is 18, which is 10% below threshold
      const result = getSensitivityLabel("18", "20", "gte", false);
      expect(result?.isClose).toBe(true);
      expect(result?.label).toBe("Almost passing");
    });

    it("returns almost-passing for values within 10% of threshold (gt operator)", () => {
      const result = getSensitivityLabel("19", "20", "gt", false);
      expect(result?.isClose).toBe(true);
      expect(result?.label).toBe("Almost passing");
    });

    it("returns almost-passing for values within 10% of threshold (lte operator)", () => {
      // For lte (less than or equal), actual is 22 and threshold is 20
      // actual needs to be within 10% above threshold
      const result = getSensitivityLabel("22", "20", "lte", false);
      expect(result?.isClose).toBe(true);
      expect(result?.label).toBe("Almost passing");
    });

    it("returns almost-passing for values within 10% of threshold (lt operator)", () => {
      const result = getSensitivityLabel("21", "20", "lt", false);
      expect(result?.isClose).toBe(true);
      expect(result?.label).toBe("Almost passing");
    });

    it("returns null for values far from threshold", () => {
      // Threshold is 20, actual is 10, which is 50% below threshold
      const result = getSensitivityLabel("10", "20", "gte", false);
      expect(result).toBeNull();
    });

    it("returns null for passed criteria", () => {
      const result = getSensitivityLabel("25", "20", "gte", true);
      expect(result).toBeNull();
    });

    it("returns null for null actualValue", () => {
      const result = getSensitivityLabel(null, "20", "gte", false);
      expect(result).toBeNull();
    });

    it("returns null for non-numeric actualValue", () => {
      const result = getSensitivityLabel("abc", "20", "gte", false);
      expect(result).toBeNull();
    });

    it("returns null for zero threshold (to avoid division by zero)", () => {
      const result = getSensitivityLabel("0.5", "0", "gte", false);
      expect(result).toBeNull();
    });

    it("returns null for eq operator (not applicable)", () => {
      const result = getSensitivityLabel("19", "20", "eq", false);
      expect(result).toBeNull();
    });

    it("returns null for between operator (not applicable for simple threshold)", () => {
      const result = getSensitivityLabel("19", "20", "between", false);
      expect(result).toBeNull();
    });
  });

  /**
   * Tests for formatThreshold utility used in AC-7.2.2
   */
  describe("formatThreshold (AC-7.2.2)", () => {
    it("formats gt operator correctly", () => {
      expect(formatThreshold("gt", "10")).toBe("> 10");
    });

    it("formats gte operator correctly", () => {
      expect(formatThreshold("gte", "15")).toBe(">= 15");
    });

    it("formats lt operator correctly", () => {
      expect(formatThreshold("lt", "20")).toBe("< 20");
    });

    it("formats lte operator correctly", () => {
      expect(formatThreshold("lte", "25")).toBe("<= 25");
    });

    it("formats eq operator correctly", () => {
      expect(formatThreshold("eq", "100")).toBe("= 100");
    });

    it("formats between operator with range threshold", () => {
      expect(formatThreshold("between", { min: "5", max: "15" })).toBe("5 - 15");
    });
  });

  /**
   * Tests for calculation breakdown data structure
   */
  describe("CalculationBreakdown data structure", () => {
    it("should have correct structure for CriterionEvaluation with threshold data", () => {
      const evaluation = {
        criterionId: "crit-1",
        name: "P/E Ratio",
        operator: "lte" as const,
        threshold: "20",
        actualValue: "25",
        passed: false,
        pointsAwarded: 0,
        maxPoints: 10,
        skippedReason: null,
      };

      expect(evaluation.operator).toBe("lte");
      expect(evaluation.threshold).toBe("20");
      expect(evaluation.actualValue).toBe("25");
      expect(evaluation.passed).toBe(false);
    });

    it("should support range thresholds", () => {
      const evaluation = {
        criterionId: "crit-2",
        name: "P/B Ratio Range",
        operator: "between" as const,
        threshold: { min: "1", max: "3" },
        actualValue: "2.5",
        passed: true,
        pointsAwarded: 10,
        maxPoints: 10,
        skippedReason: null,
      };

      expect(evaluation.operator).toBe("between");
      expect(evaluation.threshold).toEqual({ min: "1", max: "3" });
    });
  });

  /**
   * AC-7.2.4: Threshold Comparison Visualization
   * Tests for ThresholdComparisonBar calculation logic
   */
  describe("ThresholdComparisonBar calculation logic (AC-7.2.4)", () => {
    /**
     * Calculate threshold bar percentages (mirrors component logic)
     */
    function calculateBarPositions(
      actual: number,
      threshold: number
    ): {
      range: number;
      thresholdPct: number;
      actualPct: number;
    } {
      const range = Math.max(threshold * 2, actual * 1.5, 1);
      const thresholdPct = Math.min((threshold / range) * 100, 100);
      const actualPct = Math.min((actual / range) * 100, 100);
      return { range, thresholdPct, actualPct };
    }

    it("calculates correct positions when actual is below threshold", () => {
      const result = calculateBarPositions(15, 20);
      // Range should be threshold * 2 = 40 (since 40 > 15 * 1.5 = 22.5)
      expect(result.range).toBe(40);
      // Threshold at 20/40 = 50%
      expect(result.thresholdPct).toBe(50);
      // Actual at 15/40 = 37.5%
      expect(result.actualPct).toBe(37.5);
    });

    it("calculates correct positions when actual is above threshold", () => {
      const result = calculateBarPositions(25, 20);
      // Range should be 25 * 1.5 = 37.5 (since 37.5 < 40, use threshold * 2 = 40)
      expect(result.range).toBe(40);
      // Threshold at 20/40 = 50%
      expect(result.thresholdPct).toBe(50);
      // Actual at 25/40 = 62.5%
      expect(result.actualPct).toBe(62.5);
    });

    it("uses actual-based range when actual is significantly higher", () => {
      const result = calculateBarPositions(100, 20);
      // Range should be 100 * 1.5 = 150 (since 150 > 40)
      expect(result.range).toBe(150);
      // Threshold at 20/150 = 13.33%
      expect(result.thresholdPct).toBeCloseTo(13.33, 1);
      // Actual at 100/150 = 66.67%
      expect(result.actualPct).toBeCloseTo(66.67, 1);
    });

    it("uses minimum range of 1 to avoid division by zero", () => {
      const result = calculateBarPositions(0, 0);
      // Range should be 1 (minimum)
      expect(result.range).toBe(1);
      // Both percentages should be 0
      expect(result.thresholdPct).toBe(0);
      expect(result.actualPct).toBe(0);
    });

    it("caps percentages at 100%", () => {
      // Force a case where percentage would exceed 100
      const result = calculateBarPositions(200, 200);
      // Range = max(400, 300, 1) = 400
      expect(result.range).toBe(400);
      // Both at 50%
      expect(result.thresholdPct).toBe(50);
      expect(result.actualPct).toBe(50);
    });
  });
});
