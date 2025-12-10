/**
 * Mock Fundamentals Data Generator
 *
 * TODO(epic-6): Replace with real fundamentals data from external providers.
 * This mock data is used for development and testing until Epic 6 (Data Pipeline)
 * implements the actual data fetching from market data providers.
 *
 * See: docs/epics/epic-6-data-pipeline.md for the planned implementation.
 */

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
