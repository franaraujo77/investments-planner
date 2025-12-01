import { Decimal } from "./decimal-config";

/**
 * Financial Calculation Utilities
 *
 * All monetary calculations MUST use these helpers to ensure:
 * - Consistent precision (20 digits)
 * - Consistent rounding (ROUND_HALF_UP)
 * - No floating point errors
 *
 * NEVER use native JavaScript arithmetic (+, -, *, /) for money.
 */

/**
 * Parse a value into a Decimal
 *
 * @param value - String or number to parse
 * @returns Decimal instance
 * @throws Error if value cannot be parsed
 */
export function parseDecimal(value: string | number): Decimal {
  if (typeof value === "string" && value.trim() === "") {
    throw new Error("Cannot parse empty string as Decimal");
  }
  return new Decimal(value);
}

/**
 * Add multiple Decimal values
 *
 * @param values - Decimal values to add
 * @returns Sum of all values
 */
export function add(...values: Decimal[]): Decimal {
  if (values.length === 0) {
    return new Decimal(0);
  }
  return values.reduce((sum, val) => sum.plus(val), new Decimal(0));
}

/**
 * Multiply two Decimal values
 *
 * @param a - First value
 * @param b - Second value
 * @returns Product of a and b
 */
export function multiply(a: Decimal, b: Decimal): Decimal {
  return a.times(b);
}

/**
 * Divide two Decimal values
 *
 * @param a - Dividend
 * @param b - Divisor
 * @returns Quotient of a / b
 * @throws Error if b is zero
 */
export function divide(a: Decimal, b: Decimal): Decimal {
  if (b.isZero()) {
    throw new Error("Cannot divide by zero");
  }
  return a.dividedBy(b);
}

/**
 * Subtract b from a
 *
 * @param a - Value to subtract from
 * @param b - Value to subtract
 * @returns Difference (a - b)
 */
export function subtract(a: Decimal, b: Decimal): Decimal {
  return a.minus(b);
}

/**
 * Format a Decimal as currency string
 *
 * @param value - Decimal value to format
 * @param currency - ISO 4217 currency code (e.g., "USD", "BRL", "EUR")
 * @param locale - Locale for formatting (defaults to "en-US")
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: Decimal,
  currency: string,
  locale = "en-US"
): string {
  // Convert to number for Intl.NumberFormat (safe for display purposes)
  const numValue = value.toNumber();

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(numValue);
}

/**
 * Round a Decimal to specified decimal places
 *
 * Uses ROUND_HALF_UP as configured globally
 *
 * @param value - Decimal to round
 * @param decimalPlaces - Number of decimal places (default: 4 for fintech)
 * @returns Rounded Decimal
 */
export function round(value: Decimal, decimalPlaces = 4): Decimal {
  return value.toDecimalPlaces(decimalPlaces);
}

/**
 * Check if two Decimals are equal
 *
 * @param a - First value
 * @param b - Second value
 * @returns True if values are equal
 */
export function equals(a: Decimal, b: Decimal): boolean {
  return a.equals(b);
}

/**
 * Check if a Decimal is positive
 *
 * @param value - Value to check
 * @returns True if value > 0
 */
export function isPositive(value: Decimal): boolean {
  return value.isPositive() && !value.isZero();
}

/**
 * Check if a Decimal is negative
 *
 * @param value - Value to check
 * @returns True if value < 0
 */
export function isNegative(value: Decimal): boolean {
  return value.isNegative();
}

/**
 * Get the absolute value of a Decimal
 *
 * @param value - Value to get absolute of
 * @returns Absolute value
 */
export function abs(value: Decimal): Decimal {
  return value.abs();
}

/**
 * Convert Decimal to string for storage
 *
 * Use this when storing Decimal values in JSON or database text fields.
 * Preserves full precision without floating point conversion.
 *
 * @param value - Decimal to convert
 * @returns String representation
 */
export function toString(value: Decimal): string {
  return value.toString();
}

// Re-export Decimal for convenience
export { Decimal };
