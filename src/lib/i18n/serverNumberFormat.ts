/**
 * Server Number Format Utility
 *
 * Story 7.9: Server-Side Number Formatting for i18n
 * AC-7.9.1: Server-Side Formatting Utility
 * AC-7.9.3: Backward Compatibility
 * AC-7.9.4: Consistent API with Client Hook
 *
 * Provides locale-aware number formatting for server-side code.
 * This utility mirrors the client-side useNumberFormat hook but
 * can be used without React hooks.
 *
 * Usage:
 * ```typescript
 * import { formatNumber, formatPercent, formatCurrency } from '@/lib/i18n/serverNumberFormat';
 *
 * // Format with user's locale
 * const message = `Score: ${formatNumber(85.5, userLocale)}`;
 *
 * // Default to en-US when no locale
 * const defaultMessage = `Score: ${formatNumber(85.5)}`;
 * ```
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "./locales";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for number formatting
 */
export interface ServerFormatOptions {
  /** Minimum number of decimal places (default: 2) */
  minimumFractionDigits?: number;
  /** Maximum number of decimal places (default: 2) */
  maximumFractionDigits?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Map of locale to default currency
 * Mirrors the client hook's LOCALE_CURRENCY_MAP
 */
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  "en-US": "USD",
  "pt-BR": "BRL",
  "de-DE": "EUR",
  "fr-FR": "EUR",
  "es-ES": "EUR",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates and normalizes a locale string
 *
 * AC-7.9.3: Falls back to en-US for invalid/unknown locales
 *
 * @param locale - Locale to validate
 * @returns Valid locale string
 */
function getSafeLocale(locale: string | undefined): Locale {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  // Check if locale is in supported locales
  const isSupported = SUPPORTED_LOCALES.some((l) => l.value === locale);
  return isSupported ? (locale as Locale) : DEFAULT_LOCALE;
}

/**
 * Checks if a number is valid for formatting
 *
 * @param value - Value to check
 * @returns True if value is a finite number
 */
function isValidNumber(value: number | string): boolean {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(num);
}

/**
 * Parses a value to number
 *
 * @param value - Value to parse
 * @returns Parsed number
 */
function toNumber(value: number | string): number {
  return typeof value === "string" ? parseFloat(value) : value;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Format a number according to the specified locale
 *
 * AC-7.9.1: Provides locale-aware number formatting for server-side use
 * AC-7.9.3: Defaults to en-US when no locale is provided
 * AC-7.9.4: Produces consistent locale-aware output
 *
 * @param value - Number to format
 * @param locale - Locale for formatting (default: en-US)
 * @param options - Formatting options
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234.56, "en-US") // "1,234.56"
 * formatNumber(1234.56, "pt-BR") // "1.234,56"
 * formatNumber(1234.56)          // "1,234.56" (defaults to en-US)
 */
export function formatNumber(
  value: number | string,
  locale: string = DEFAULT_LOCALE,
  options?: ServerFormatOptions
): string {
  if (!isValidNumber(value)) {
    return "-";
  }

  const num = toNumber(value);
  const safeLocale = getSafeLocale(locale);

  const formatter = new Intl.NumberFormat(safeLocale, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });

  return formatter.format(num);
}

/**
 * Format a percentage value according to the specified locale
 *
 * IMPORTANT: API DIFFERENCE FROM CLIENT HOOK
 * - Server utility: Expects value as percentage (85.5 → "85.50%")
 * - Client hook: Expects value as decimal (0.855 → "85.50%")
 *
 * This difference exists because server-side alert data stores percentages
 * as whole numbers (e.g., "65.12" for 65.12%), while the client hook uses
 * Intl.NumberFormat with style: "percent" which auto-multiplies by 100.
 *
 * AC-7.9.1: Provides locale-aware percentage formatting
 * AC-7.9.4: Produces locale-consistent output (note: input semantics differ from client hook)
 *
 * @param value - Percentage value as whole number (e.g., 85.5 for 85.5%)
 * @param locale - Locale for formatting (default: en-US)
 * @param options - Formatting options
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(85.5, "en-US") // "85.50%"
 * formatPercent(85.5, "pt-BR") // "85,50%"
 */
export function formatPercent(
  value: number | string,
  locale: string = DEFAULT_LOCALE,
  options?: ServerFormatOptions
): string {
  if (!isValidNumber(value)) {
    return "-";
  }

  // Format the number and append %
  // This matches the client hook behavior where percentages are passed as-is
  return `${formatNumber(value, locale, options)}%`;
}

/**
 * Format a currency value according to the specified locale
 *
 * AC-7.9.1: Provides locale-aware currency formatting
 * AC-7.9.3: Defaults to locale's default currency when not specified
 * AC-7.9.4: Produces identical output to the client hook
 *
 * @param value - Currency value
 * @param locale - Locale for formatting (default: en-US)
 * @param currency - Currency code (default: locale's default currency)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, "en-US", "USD") // "$1,234.56"
 * formatCurrency(1234.56, "pt-BR", "BRL") // "R$ 1.234,56"
 * formatCurrency(1234.56)                 // "$1,234.56" (defaults to en-US, USD)
 */
export function formatCurrency(
  value: number | string,
  locale: string = DEFAULT_LOCALE,
  currency?: string
): string {
  if (!isValidNumber(value)) {
    return "-";
  }

  const num = toNumber(value);
  const safeLocale = getSafeLocale(locale);
  const currencyCode = currency ?? LOCALE_CURRENCY_MAP[safeLocale] ?? "USD";

  const formatter = new Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(num);
}
