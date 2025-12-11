/**
 * Exchange Rate Service - MVP Stub
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.3: Base currency conversion using exchange rates
 *
 * MVP Implementation:
 * - Uses static exchange rates for development
 * - Supports all PRD currencies: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
 * - Interface designed for Epic 6 real rate fetching
 *
 * Epic 6 will replace this stub with real provider integration.
 */

import { logger } from "@/lib/telemetry/logger";

/**
 * Exchange rate data returned by the service
 */
export interface ExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  updatedAt: Date;
}

/**
 * All supported currencies per PRD
 */
export const SUPPORTED_CURRENCIES = [
  "USD", // US Dollar ($)
  "EUR", // Euro (€)
  "GBP", // British Pound (£)
  "BRL", // Brazilian Real (R$)
  "CAD", // Canadian Dollar (C$)
  "AUD", // Australian Dollar (A$)
  "JPY", // Japanese Yen (¥)
  "CHF", // Swiss Franc (CHF)
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Currency symbols for display
 */
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BRL: "R$",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CHF: "CHF",
};

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as SupportedCurrency] ?? currency;
}

/**
 * Static exchange rates (relative to USD) for MVP
 * Approximate rates as of late 2024
 *
 * Epic 6 will fetch real-time rates from providers
 */
const RATES_TO_USD: Record<SupportedCurrency, string> = {
  USD: "1.0000",
  EUR: "1.0850", // 1 EUR = 1.085 USD
  GBP: "1.2650", // 1 GBP = 1.265 USD
  BRL: "0.2000", // 1 BRL = 0.20 USD (5 BRL = 1 USD)
  CAD: "0.7400", // 1 CAD = 0.74 USD
  AUD: "0.6500", // 1 AUD = 0.65 USD
  JPY: "0.0067", // 1 JPY = 0.0067 USD (150 JPY = 1 USD)
  CHF: "1.1200", // 1 CHF = 1.12 USD
};

/**
 * Calculate exchange rate between two currencies
 *
 * Uses USD as the base for cross-rate calculations:
 * FROM -> USD -> TO
 *
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate as string (for decimal.js compatibility)
 */
function calculateRate(fromCurrency: string, toCurrency: string): string {
  // Same currency = rate of 1
  if (fromCurrency === toCurrency) {
    return "1.0000";
  }

  const fromRate = RATES_TO_USD[fromCurrency as SupportedCurrency];
  const toRate = RATES_TO_USD[toCurrency as SupportedCurrency];

  // If either currency is not supported, return 1 (no conversion)
  if (!fromRate || !toRate) {
    logger.warn("Unsupported currency pair - returning rate of 1", {
      fromCurrency,
      toCurrency,
    });
    return "1.0000";
  }

  // Cross rate: (FROM -> USD) / (TO -> USD)
  // Example: EUR -> BRL
  // EUR -> USD = 1.085
  // BRL -> USD = 0.20
  // EUR -> BRL = 1.085 / 0.20 = 5.425
  const fromToUsd = parseFloat(fromRate);
  const toToUsd = parseFloat(toRate);
  const crossRate = fromToUsd / toToUsd;

  return crossRate.toFixed(6);
}

/**
 * Get exchange rate between two currencies
 *
 * MVP: Returns static rates calculated from USD base rates
 * Epic 6: Will fetch real-time rates from providers
 *
 * @param fromCurrency - Source currency code (e.g., "EUR")
 * @param toCurrency - Target currency code (e.g., "USD")
 * @returns Exchange rate data with rate and timestamp
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateData> {
  const rate = calculateRate(fromCurrency, toCurrency);

  return {
    fromCurrency,
    toCurrency,
    rate,
    updatedAt: new Date(),
  };
}

/**
 * Get multiple exchange rates at once
 *
 * @param pairs - Array of [fromCurrency, toCurrency] pairs
 * @returns Map of "FROM/TO" key to exchange rate data
 */
export async function getExchangeRates(
  pairs: Array<[string, string]>
): Promise<Map<string, ExchangeRateData>> {
  const result = new Map<string, ExchangeRateData>();

  for (const [from, to] of pairs) {
    const key = `${from}/${to}`;
    const rateData = await getExchangeRate(from, to);
    result.set(key, rateData);
  }

  return result;
}

/**
 * Get all rates to a base currency
 *
 * Useful for converting multiple currencies to user's base currency
 *
 * @param baseCurrency - Target currency to convert to
 * @returns Map of currency code to exchange rate data
 */
export async function getAllRatesToBase(
  baseCurrency: string
): Promise<Map<string, ExchangeRateData>> {
  const result = new Map<string, ExchangeRateData>();

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency !== baseCurrency) {
      const rateData = await getExchangeRate(currency, baseCurrency);
      result.set(currency, rateData);
    }
  }

  // Add identity rate for base currency
  result.set(baseCurrency, {
    fromCurrency: baseCurrency,
    toCurrency: baseCurrency,
    rate: "1.0000",
    updatedAt: new Date(),
  });

  return result;
}

/**
 * Get the last update time for exchange rate data
 *
 * MVP: Returns current time since mock data is always "fresh"
 * Epic 6: Will return actual last fetch time from provider
 *
 * @returns Date of last rate update
 */
export function getLastRateUpdate(): Date {
  return new Date();
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * Exchange rate freshness levels for UI display
 */
export type RateFreshnessLevel = "fresh" | "stale" | "very_stale";

/**
 * Get freshness level for a rate update timestamp
 *
 * - fresh: < 24 hours (green)
 * - stale: 1-3 days (amber)
 * - very_stale: > 3 days (red)
 *
 * @param updatedAt - Timestamp to check
 * @returns Freshness level
 */
export function getRateFreshnessLevel(updatedAt: Date): RateFreshnessLevel {
  const ageMs = Date.now() - updatedAt.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDays = 3 * oneDay;

  if (ageMs < oneDay) return "fresh";
  if (ageMs < threeDays) return "stale";
  return "very_stale";
}
