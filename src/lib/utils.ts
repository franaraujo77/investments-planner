import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a currency value using Intl.NumberFormat
 *
 * Story 4.6: Set Minimum Allocation Values
 * AC-4.6.5: Currency Formatting
 *
 * @param value - The numeric value to format (string or number)
 * @param currency - The ISO 4217 currency code (default: "USD")
 * @returns Formatted currency string (e.g., "$100", "R$100.50", "€1,000")
 *
 * @example
 * formatCurrency(100, 'USD') => "$100"
 * formatCurrency(100.50, 'BRL') => "R$100.50"
 * formatCurrency(1000, 'EUR') => "€1,000"
 * formatCurrency(null, 'USD') => ""
 * formatCurrency(0, 'USD') => "$0"
 */
export function formatCurrency(
  value: string | number | null | undefined,
  currency: string = "USD"
): string {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle NaN
  if (isNaN(numValue)) {
    return "";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch {
    // Fallback for invalid currency codes
    return `${numValue.toFixed(2)} ${currency}`;
  }
}
