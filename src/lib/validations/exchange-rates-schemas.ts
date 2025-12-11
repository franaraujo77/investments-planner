/**
 * Exchange Rates Validation Schemas
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.5: Supported Currencies Validation
 *
 * Zod schemas for exchange rate request and response validation.
 *
 * @module @/lib/validations/exchange-rates-schemas
 */

import { z } from "zod";

// =============================================================================
// SUPPORTED CURRENCIES
// =============================================================================

/**
 * Supported currencies per AC-6.4.5
 */
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Helper to check if a currency is supported
 */
function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for validating exchange rates API query parameters
 *
 * AC-6.4.5: Validates that currencies are supported
 */
export const ExchangeRatesRequestSchema = z.object({
  /** Base currency code (required) */
  base: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .toUpperCase()
    .refine(
      (val: string) => isSupportedCurrency(val),
      `Unsupported base currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    ),
  /** Target currency codes (optional, comma-separated) */
  targets: z
    .string()
    .optional()
    .transform((val: string | undefined) => {
      if (!val) return undefined;
      return val
        .split(",")
        .map((t: string) => t.trim().toUpperCase())
        .filter(Boolean);
    })
    .refine(
      (val: string[] | undefined) => {
        if (!val) return true;
        return val.every((t: string) => isSupportedCurrency(t));
      },
      `Unsupported target currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    ),
});

export type ExchangeRatesRequest = z.infer<typeof ExchangeRatesRequestSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Schema for individual exchange rate
 */
export const ExchangeRateSchema = z.object({
  /** Target currency code */
  currency: z.string().length(3),
  /** Exchange rate value as string */
  rate: z.string(),
});

/**
 * Schema for exchange rate result data
 */
export const ExchangeRateResultSchema = z.object({
  /** Base currency code */
  base: z.string().length(3),
  /** Map of target currency to rate */
  rates: z.record(z.string(), z.string()),
  /** Provider source name */
  source: z.string(),
  /** Timestamp when data was fetched */
  fetchedAt: z.coerce.date(),
  /** Date the rates are for */
  rateDate: z.coerce.date(),
  /** Whether data is stale (from cache fallback) */
  isStale: z.boolean().optional(),
});

export type ExchangeRateResult = z.infer<typeof ExchangeRateResultSchema>;

/**
 * Schema for freshness information
 */
export const FreshnessInfoSchema = z.object({
  /** Provider source name */
  source: z.string(),
  /** Timestamp when data was fetched */
  fetchedAt: z.coerce.date(),
  /** Whether data is considered stale */
  isStale: z.boolean(),
  /** When the data became stale (if applicable) */
  staleSince: z.coerce.date().optional(),
});

export type FreshnessInfo = z.infer<typeof FreshnessInfoSchema>;

/**
 * Schema for full exchange rates API response
 */
export const ExchangeRatesResponseSchema = z.object({
  /** Exchange rate data */
  data: ExchangeRateResultSchema,
  /** Whether data came from cache */
  fromCache: z.boolean(),
  /** Freshness information */
  freshness: FreshnessInfoSchema,
  /** Provider that served the data */
  provider: z.string(),
});

export type ExchangeRatesResponse = z.infer<typeof ExchangeRatesResponseSchema>;

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

/**
 * Schema for error response
 */
export const ExchangeRatesErrorSchema = z.object({
  /** Error message */
  error: z.string(),
  /** Error code */
  code: z.string(),
  /** Additional details */
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ExchangeRatesError = z.infer<typeof ExchangeRatesErrorSchema>;
