import Decimal from "decimal.js";

/**
 * decimal.js Configuration for Financial Precision
 *
 * This configuration MUST be imported before any decimal calculations.
 * It ensures all financial math throughout the app uses consistent settings.
 *
 * Settings (per Architecture ADR-002):
 * - precision: 20 digits for accurate financial calculations
 * - rounding: ROUND_HALF_UP (banker's rounding standard)
 * - toExpNeg/toExpPos: Control exponential notation thresholds
 *
 * CRITICAL: Always use this configured Decimal for monetary values.
 * NEVER use JavaScript native Number for currency calculations.
 */
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 20,
});

export { Decimal };
export type { Decimal as DecimalType };
