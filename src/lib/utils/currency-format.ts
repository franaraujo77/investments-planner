/**
 * Currency Formatting Utilities
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.5: Currency display formatting
 *
 * Provides locale-aware currency formatting for:
 * - USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
 *
 * @see src/lib/calculations/decimal-utils.ts for Decimal-based formatting
 * @see src/components/fintech/currency-display.tsx for component-based display
 */

import { getCurrencySymbol, type SupportedCurrency } from "@/lib/services/exchange-rate-service";

// =============================================================================
// LOCALE MAPPING
// =============================================================================

/**
 * Maps currency codes to appropriate locales for formatting
 */
const CURRENCY_LOCALES: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  BRL: "pt-BR",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
  CHF: "de-CH",
};

/**
 * Get the locale for a given currency code
 */
export function getLocaleForCurrency(currency: string): string {
  return CURRENCY_LOCALES[currency] || "en-US";
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format a numeric value as currency string
 *
 * @param value - Numeric value (string or number)
 * @param currency - ISO 4217 currency code
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$2,000.00", "R$ 2.000,00")
 *
 * @example
 * ```typescript
 * formatCurrency("2000", "USD");  // "$2,000.00"
 * formatCurrency("2000", "BRL");  // "R$ 2.000,00"
 * formatCurrency("2000", "EUR");  // "2.000,00 €"
 * ```
 */
export function formatCurrency(
  value: string | number,
  currency: string,
  options?: {
    /** Whether to show currency symbol (default: true) */
    showSymbol?: boolean;
    /** Minimum decimal places (default: 2) */
    minimumFractionDigits?: number;
    /** Maximum decimal places (default: 2) */
    maximumFractionDigits?: number;
  }
): string {
  const { showSymbol = true, minimumFractionDigits = 2, maximumFractionDigits = 2 } = options || {};

  try {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return String(value);

    const locale = getLocaleForCurrency(currency);

    if (showSymbol) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(numValue);
    }

    // Without symbol - format number and prepend symbol manually
    const symbol = getCurrencySymbol(currency);
    const formattedNum = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numValue);

    return `${symbol}${formattedNum}`;
  } catch {
    // Fallback for any formatting errors
    return `${getCurrencySymbol(currency)}${value}`;
  }
}

/**
 * Format number without currency symbol (just locale formatting)
 *
 * @param value - Numeric value
 * @param currency - Currency code (for locale lookup)
 * @returns Formatted number string
 */
export function formatNumber(value: string | number, currency: string): string {
  try {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return String(value);

    const locale = getLocaleForCurrency(currency);
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch {
    return String(value);
  }
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Parse a formatted currency string to numeric value
 *
 * Handles locale-specific thousand separators and decimal points
 *
 * @param formattedValue - Formatted string (e.g., "2.000,00" or "2,000.00")
 * @param currency - Currency code (for locale lookup)
 * @returns Numeric string or empty string if invalid
 *
 * @example
 * ```typescript
 * parseCurrency("$2,000.00", "USD");  // "2000.00"
 * parseCurrency("R$ 2.000,00", "BRL"); // "2000.00"
 * ```
 */
export function parseCurrency(formattedValue: string, currency: string): string {
  if (!formattedValue || formattedValue.trim() === "") return "";

  // Get locale to understand number format
  const locale = getLocaleForCurrency(currency);

  // Determine decimal separator for this locale
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
  const decimalSeparator = parts.find((p) => p.type === "decimal")?.value || ".";
  const groupSeparator = parts.find((p) => p.type === "group")?.value || ",";

  // Remove currency symbols and whitespace
  let normalized = formattedValue.replace(/[$€£¥₹R\s]/g, "").trim();

  // Remove group separators
  if (groupSeparator) {
    normalized = normalized.split(groupSeparator).join("");
  }

  // Replace decimal separator with standard dot
  if (decimalSeparator !== ".") {
    normalized = normalized.replace(decimalSeparator, ".");
  }

  // Remove any remaining non-numeric characters except dot and minus
  normalized = normalized.replace(/[^\d.-]/g, "");

  // Validate it's a number
  const num = parseFloat(normalized);
  if (isNaN(num)) return "";

  return normalized;
}

/**
 * Check if a string is a valid currency amount
 *
 * @param value - Value to check
 * @returns true if valid numeric value
 */
export function isValidCurrencyAmount(value: string): boolean {
  if (!value || value.trim() === "") return false;

  try {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  } catch {
    return false;
  }
}

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

export { getCurrencySymbol, SUPPORTED_CURRENCIES } from "@/lib/services/exchange-rate-service";
export type { SupportedCurrency };
