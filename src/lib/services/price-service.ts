/**
 * Price Service - MVP Stub
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.1: Portfolio table displays current prices
 * AC-3.6.3: Base currency conversion requires current prices
 *
 * MVP Implementation:
 * - Uses purchase price as "current price" for development
 * - Interface designed for Epic 6 real price fetching
 * - Includes timestamp for data freshness tracking
 *
 * Epic 6 will replace this stub with real provider integration.
 */

/**
 * Price data returned by the service
 */
export interface PriceData {
  symbol: string;
  price: string;
  currency: string;
  updatedAt: Date;
}

/**
 * Mock price data for development/testing
 * In production (Epic 6), this would come from external providers
 */
const MOCK_PRICES: Map<string, PriceData> = new Map([
  // Sample stock prices for testing
  ["AAPL", { symbol: "AAPL", price: "178.50", currency: "USD", updatedAt: new Date() }],
  ["GOOGL", { symbol: "GOOGL", price: "141.80", currency: "USD", updatedAt: new Date() }],
  ["MSFT", { symbol: "MSFT", price: "378.25", currency: "USD", updatedAt: new Date() }],
  ["AMZN", { symbol: "AMZN", price: "178.75", currency: "USD", updatedAt: new Date() }],
  ["TSLA", { symbol: "TSLA", price: "248.50", currency: "USD", updatedAt: new Date() }],
  // Brazilian stocks
  ["PETR4", { symbol: "PETR4", price: "37.50", currency: "BRL", updatedAt: new Date() }],
  ["VALE3", { symbol: "VALE3", price: "62.80", currency: "BRL", updatedAt: new Date() }],
  ["ITUB4", { symbol: "ITUB4", price: "32.15", currency: "BRL", updatedAt: new Date() }],
  // European stocks
  ["SAP", { symbol: "SAP", price: "185.40", currency: "EUR", updatedAt: new Date() }],
  ["ASML", { symbol: "ASML", price: "720.50", currency: "EUR", updatedAt: new Date() }],
]);

/**
 * Get current prices for a list of symbols
 *
 * MVP Implementation:
 * - Returns mock prices for known symbols
 * - Falls back to null for unknown symbols (caller uses purchase price)
 *
 * @param symbols - Array of asset symbols to get prices for
 * @returns Map of symbol to price data (null if not found)
 */
export async function getCurrentPrices(symbols: string[]): Promise<Map<string, PriceData | null>> {
  const result = new Map<string, PriceData | null>();

  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    const mockPrice = MOCK_PRICES.get(upperSymbol);

    if (mockPrice) {
      // Return mock price with current timestamp
      result.set(symbol, {
        ...mockPrice,
        updatedAt: new Date(),
      });
    } else {
      // Symbol not in mock data - caller should use purchase price as fallback
      result.set(symbol, null);
    }
  }

  return result;
}

/**
 * Get current price for a single symbol
 *
 * @param symbol - Asset symbol to get price for
 * @returns Price data or null if not found
 */
export async function getCurrentPrice(symbol: string): Promise<PriceData | null> {
  const prices = await getCurrentPrices([symbol]);
  return prices.get(symbol) ?? null;
}

/**
 * Get the last update time for price data
 *
 * MVP: Returns current time since mock data is always "fresh"
 * Epic 6: Will return actual last fetch time from provider
 *
 * @returns Date of last price update
 */
export function getLastPriceUpdate(): Date {
  return new Date();
}

/**
 * Check if price data is stale
 *
 * @param updatedAt - Timestamp to check
 * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
 * @returns true if data is stale
 */
export function isPriceStale(updatedAt: Date, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const age = Date.now() - updatedAt.getTime();
  return age > maxAgeMs;
}

/**
 * Price freshness levels for UI display
 */
export type PriceFreshnessLevel = "fresh" | "stale" | "very_stale";

/**
 * Get freshness level for a price update timestamp
 *
 * - fresh: < 24 hours (green)
 * - stale: 1-3 days (amber)
 * - very_stale: > 3 days (red)
 *
 * @param updatedAt - Timestamp to check
 * @returns Freshness level
 */
export function getPriceFreshnessLevel(updatedAt: Date): PriceFreshnessLevel {
  const ageMs = Date.now() - updatedAt.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDays = 3 * oneDay;

  if (ageMs < oneDay) return "fresh";
  if (ageMs < threeDays) return "stale";
  return "very_stale";
}
