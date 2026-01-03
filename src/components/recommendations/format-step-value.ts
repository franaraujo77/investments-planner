/**
 * Format Step Value Helper
 *
 * Story 7.7 (i18n): API Precision i18n Refactoring
 * AC-7.7.2: Client-Side Locale-Aware Formatting
 *
 * Provides locale-aware formatting for CalculationStep values.
 * Prefers rawValue + valueType when available, falls back to pre-formatted string.
 */

import type { UseNumberFormatResult } from "@/lib/i18n/useNumberFormat";
import type { CalculationStep } from "@/lib/types/recommendations";

/**
 * Format a calculation step value using locale-aware formatters
 *
 * Story 7.7 (i18n): AC-7.7.2 - Client-Side Locale-Aware Formatting
 *
 * @param step - The calculation step containing value, rawValue, and valueType
 * @param formatters - Formatting functions from useNumberFormat hook
 * @returns Formatted string appropriate for the user's locale
 *
 * @example
 * // With en-US locale
 * formatStepValue({ rawValue: 15.5, valueType: "percent", value: "15.50%" }, formatters)
 * // Returns: "15.50%"
 *
 * // With pt-BR locale
 * formatStepValue({ rawValue: 15.5, valueType: "percent", value: "15.50%" }, formatters)
 * // Returns: "15,50%"
 */
export function formatStepValue(step: CalculationStep, formatters: UseNumberFormatResult): string {
  // Prefer raw value with type hint for locale-aware formatting
  if (step.rawValue !== undefined && step.valueType) {
    switch (step.valueType) {
      case "percent":
        // rawValue is already in percentage points (e.g., 15.5 means 15.5%)
        // Intl.NumberFormat percent style expects decimal (0.155 for 15.5%)
        return formatters.formatPercent(step.rawValue / 100);

      case "currency":
        return formatters.formatCurrency(step.rawValue);

      case "weight":
        // Weights need high precision (4 decimal places, no trailing zero trimming)
        return formatters.formatNumber(step.rawValue, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        });

      case "number":
      default:
        return formatters.formatNumber(step.rawValue);
    }
  }

  // Fallback to pre-formatted string for backward compatibility
  return step.value;
}

/**
 * Check if a step supports locale-aware formatting
 *
 * @param step - The calculation step to check
 * @returns true if the step has rawValue and valueType
 */
export function supportsLocaleFormatting(step: CalculationStep): boolean {
  return step.rawValue !== undefined && step.valueType !== undefined;
}
