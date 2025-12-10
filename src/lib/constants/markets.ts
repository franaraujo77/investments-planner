/**
 * Markets Constants
 *
 * Story 5.5: Copy Criteria Set
 * AC-5.5.2: Target Market Selection
 *
 * Predefined markets and display name mapping for criteria sets.
 */

/**
 * Predefined markets available for criteria sets
 * These are the default markets users can choose from
 */
export const PREDEFINED_MARKETS = [
  "BR_BANKS",
  "BR_REITS",
  "BR_UTILITIES",
  "BR_INSURANCE",
  "BR_RETAIL",
  "US_TECH",
  "US_FINANCIAL",
  "US_HEALTHCARE",
  "US_ENERGY",
  "US_CONSUMER",
  "CRYPTO",
  "ETF_GLOBAL",
  "ETF_FIXED_INCOME",
] as const;

export type PredefinedMarket = (typeof PREDEFINED_MARKETS)[number];

/**
 * Human-readable display names for markets
 */
export const MARKET_DISPLAY_NAMES: Record<string, string> = {
  BR_BANKS: "Brazilian Banks",
  BR_REITS: "Brazilian REITs (FIIs)",
  BR_UTILITIES: "Brazilian Utilities",
  BR_INSURANCE: "Brazilian Insurance",
  BR_RETAIL: "Brazilian Retail",
  US_TECH: "US Technology",
  US_FINANCIAL: "US Financial",
  US_HEALTHCARE: "US Healthcare",
  US_ENERGY: "US Energy",
  US_CONSUMER: "US Consumer",
  CRYPTO: "Cryptocurrency",
  ETF_GLOBAL: "Global ETFs",
  ETF_FIXED_INCOME: "Fixed Income ETFs",
};

/**
 * Get display name for a market
 * Returns the market key if no display name is defined
 *
 * @param market - Market key
 * @returns Human-readable market name
 */
export function getMarketDisplayName(market: string): string {
  return MARKET_DISPLAY_NAMES[market] ?? market;
}

/**
 * Get combined list of available markets
 * Merges predefined markets with user's existing markets (from their criteria sets)
 *
 * @param userMarkets - Array of markets from user's existing criteria sets
 * @returns Deduplicated and sorted array of all available markets
 */
export function getAvailableMarkets(userMarkets: string[] = []): string[] {
  const allMarkets = new Set<string>([...PREDEFINED_MARKETS, ...userMarkets]);

  return Array.from(allMarkets).sort((a, b) => {
    // Sort by display name for user-friendly ordering
    const nameA = getMarketDisplayName(a);
    const nameB = getMarketDisplayName(b);
    return nameA.localeCompare(nameB);
  });
}

/**
 * Check if a market is a predefined market
 *
 * @param market - Market to check
 * @returns true if the market is in the predefined list
 */
export function isPredefinedMarket(market: string): market is PredefinedMarket {
  return PREDEFINED_MARKETS.includes(market as PredefinedMarket);
}
