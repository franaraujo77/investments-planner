/**
 * Currency Conversion Validation Schemas
 *
 * Story 6.5: Currency Conversion Logic
 * AC-6.5.1: Input validation for currency conversions
 *
 * Zod schemas for currency conversion request and response validation.
 *
 * @module @/lib/validations/currency-schemas
 */

import { z } from "zod";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "./exchange-rates-schemas";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Helper to check if a currency is supported
 */
function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * Helper to validate decimal string format
 */
function isValidDecimalString(value: string): boolean {
  // Allow positive decimal numbers (with optional leading zero and decimal places)
  const decimalRegex = /^[0-9]+(\.[0-9]+)?$/;
  if (!decimalRegex.test(value)) {
    return false;
  }
  // Ensure it's not just zeros
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue >= 0;
}

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Schema for validating currency conversion API query parameters
 *
 * AC-6.5.1: Validates inputs for currency conversion
 */
export const CurrencyConversionRequestSchema = z.object({
  /** Value to convert as decimal string (positive number) */
  value: z
    .string()
    .min(1, "Value is required")
    .refine(isValidDecimalString, "Value must be a valid positive decimal number"),
  /** Source currency code (required) */
  from: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .toUpperCase()
    .refine(
      (val: string) => isSupportedCurrency(val),
      `Unsupported source currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    ),
  /** Target currency code (required) */
  to: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .toUpperCase()
    .refine(
      (val: string) => isSupportedCurrency(val),
      `Unsupported target currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    ),
  /** Optional date for rate lookup (ISO format) */
  date: z
    .string()
    .optional()
    .transform((val: string | undefined) => {
      if (!val) return undefined;
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) return undefined;
      return parsed;
    }),
});

export type CurrencyConversionRequest = z.infer<typeof CurrencyConversionRequestSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Schema for currency conversion result
 */
export const CurrencyConversionResultSchema = z.object({
  /** Converted value as decimal string (4 decimal places) */
  value: z.string(),
  /** Source currency code */
  fromCurrency: z.string().length(3),
  /** Target currency code */
  toCurrency: z.string().length(3),
  /** Exchange rate used for conversion */
  rate: z.string(),
  /** Date of the rate used */
  rateDate: z.coerce.date(),
  /** Provider that supplied the rate */
  rateSource: z.string(),
  /** Whether the rate was older than 24 hours */
  isStaleRate: z.boolean(),
});

export type CurrencyConversionResult = z.infer<typeof CurrencyConversionResultSchema>;

/**
 * Schema for full currency conversion API response
 */
export const CurrencyConversionResponseSchema = z.object({
  /** Conversion result data */
  data: CurrencyConversionResultSchema,
});

export type CurrencyConversionResponse = z.infer<typeof CurrencyConversionResponseSchema>;

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

/**
 * Schema for error response
 */
export const CurrencyConversionErrorSchema = z.object({
  /** Error message */
  error: z.string(),
  /** Error code */
  code: z.string(),
  /** Additional details */
  details: z.record(z.string(), z.unknown()).optional(),
});

export type CurrencyConversionError = z.infer<typeof CurrencyConversionErrorSchema>;

// =============================================================================
// BATCH CONVERSION SCHEMAS
// =============================================================================

/**
 * Schema for batch conversion input item
 */
export const BatchConversionInputSchema = z.object({
  /** Value to convert as decimal string */
  value: z
    .string()
    .min(1, "Value is required")
    .refine(isValidDecimalString, "Value must be a valid positive decimal number"),
  /** Source currency code */
  fromCurrency: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .toUpperCase()
    .refine(
      (val: string) => isSupportedCurrency(val),
      `Unsupported currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    ),
});

export type BatchConversionInput = z.infer<typeof BatchConversionInputSchema>;

/**
 * Schema for batch conversion request
 */
export const BatchConversionRequestSchema = z.object({
  /** Array of value/currency pairs to convert */
  conversions: z.array(BatchConversionInputSchema).min(1, "At least one conversion is required"),
  /** Target currency for all conversions */
  to: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .toUpperCase()
    .refine(
      (val: string) => isSupportedCurrency(val),
      `Unsupported target currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    ),
  /** Optional date for rate lookup */
  date: z
    .string()
    .optional()
    .transform((val: string | undefined) => {
      if (!val) return undefined;
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) return undefined;
      return parsed;
    }),
});

export type BatchConversionRequest = z.infer<typeof BatchConversionRequestSchema>;

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { SUPPORTED_CURRENCIES, type SupportedCurrency };
