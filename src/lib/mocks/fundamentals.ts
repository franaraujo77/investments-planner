/**
 * Mock Fundamentals Data Generator
 *
 * TODO(epic-6): Replace with real fundamentals data from external providers.
 * This mock data is used for development and testing until Epic 6 (Data Pipeline)
 * implements the actual data fetching from market data providers.
 *
 * See: docs/epics/epic-6-data-pipeline.md for the planned implementation.
 *
 * Story 4.6: Added generateMockSurplusHistory for surplus scoring testing.
 *
 * IMPORTANT - Number Formatting:
 * All numeric values returned by these functions are RAW NUMBERS, not pre-formatted
 * strings. Components consuming this data MUST use the useNumberFormat() hook to
 * format values for display. This ensures consistent locale-aware formatting across
 * the application per project standards (see CLAUDE.md "i18n & Number Formatting").
 *
 * Example:
 *   const fundamentals = generateMockFundamentals("AAPL");
 *   // fundamentals.dividend_yield = 5.25 (raw number)
 *   // In component: formatPercent(fundamentals.dividend_yield) => "5.25%"
 */

import type { SurplusHistoryData } from "@/lib/validations/score-schemas";

/**
 * Generate mock fundamentals for testing and development
 *
 * Uses the asset symbol as a seed for consistent but varied mock data.
 * Each symbol will always generate the same fundamentals values.
 *
 * @param symbol - Asset symbol (e.g., "AAPL", "PETR4")
 * @returns Record of fundamental metrics with numeric values or null
 */
export function generateMockFundamentals(symbol: string): Record<string, number | null> {
  // Use symbol as seed for consistent but varied mock data
  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    dividend_yield: (seed % 10) + 1, // 1-10%
    pe_ratio: (seed % 30) + 5, // 5-35
    pb_ratio: (seed % 5) + 0.5, // 0.5-5.5
    market_cap: ((seed % 100) + 1) * 1_000_000_000, // 1B-100B
    roe: (seed % 25) + 5, // 5-30%
    roa: (seed % 15) + 2, // 2-17%
    debt_to_equity: (seed % 200) / 100, // 0-2
    current_ratio: (seed % 300) / 100 + 0.5, // 0.5-3.5
    gross_margin: (seed % 40) + 20, // 20-60%
    net_margin: (seed % 20) + 5, // 5-25%
    payout_ratio: (seed % 60) + 20, // 20-80%
    ev_ebitda: (seed % 15) + 5, // 5-20
    // Some metrics intentionally null to test missing fundamentals handling
    surplus_years: seed % 2 === 0 ? null : (seed % 10) + 1,
    revenue: seed % 3 === 0 ? null : ((seed % 50) + 1) * 1_000_000_000,
    earnings: seed % 4 === 0 ? null : ((seed % 20) + 1) * 1_000_000_000,
  };
}

/**
 * Generate mock surplus history data for testing and development
 *
 * Story 4.6: Historical Surplus Scoring
 *
 * Uses the asset symbol as a seed for consistent but varied mock data.
 * Returns undefined for ~20% of assets to test "no data" scenarios.
 *
 * @param symbol - Asset symbol (e.g., "AAPL", "PETR4")
 * @returns SurplusHistoryData or undefined if no surplus data available
 */
export function generateMockSurplusHistory(symbol: string): SurplusHistoryData | undefined {
  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // ~20% of assets have no surplus data
  if (seed % 5 === 0) {
    return undefined;
  }

  const currentYear = new Date().getFullYear();

  // Generate varied years of data (1-7 years)
  const yearsAvailable = (seed % 7) + 1;

  // Generate surplus by year - use seed to determine pattern
  const surplusByYear: Record<string, boolean | null> = {};
  let consecutiveCount = 0;
  let maxConsecutive = 0;
  let currentStreak = 0;

  for (let i = 0; i < yearsAvailable; i++) {
    const year = currentYear - i - 1;
    // Use different bits of the seed to vary the pattern
    const hasSurplus = (seed + i * 7) % 10 > 2; // ~70% have surplus

    if (hasSurplus) {
      surplusByYear[String(year)] = true;
      currentStreak++;
      if (currentStreak > maxConsecutive) {
        maxConsecutive = currentStreak;
      }
    } else {
      surplusByYear[String(year)] = false;
      currentStreak = 0;
    }
  }

  // For seeds divisible by 3, give them a perfect 5+ year streak
  if (seed % 3 === 0 && yearsAvailable >= 5) {
    consecutiveCount = Math.min(yearsAvailable, 5 + (seed % 3));
    // Override to create consecutive streak
    for (let i = 0; i < consecutiveCount; i++) {
      const year = currentYear - i - 1;
      surplusByYear[String(year)] = true;
    }
  } else {
    consecutiveCount = maxConsecutive;
  }

  return {
    yearsAvailable,
    consecutiveSurplusYears: consecutiveCount,
    surplusByYear,
    dataSource: "mock-generator",
    lastUpdated: new Date().toISOString(),
  };
}
