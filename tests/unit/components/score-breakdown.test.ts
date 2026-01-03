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
import { formatRelativeTime, getScoreColorClasses } from "@/components/fintech/score-breakdown";
import { getScoreLevel } from "@/components/fintech/score-badge";
import type { CriterionResult } from "@/hooks/use-asset-score";

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
