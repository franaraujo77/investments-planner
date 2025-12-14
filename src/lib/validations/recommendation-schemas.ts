/**
 * Recommendation Validation Schemas
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.2: Validation for invalid amounts
 *
 * Provides Zod schemas for:
 * - Contribution amount validation
 * - Dividends validation
 * - Recommendation request validation
 */

import { z } from "zod";
import { parseDecimal } from "@/lib/calculations/decimal-utils";

// =============================================================================
// CONTRIBUTION VALIDATION
// =============================================================================

/**
 * Custom error messages matching AC requirements
 */
const CONTRIBUTION_ERRORS = {
  REQUIRED: "Contribution amount is required",
  MUST_BE_POSITIVE: "Contribution must be greater than 0",
  INVALID_NUMBER: "Please enter a valid number",
  TOO_MANY_DECIMALS: "Maximum 2 decimal places allowed",
  TOO_LARGE: "Contribution amount is too large",
} as const;

/**
 * Maximum contribution amount (reasonable upper limit)
 * 1 trillion in base currency units
 */
const MAX_CONTRIBUTION = "1000000000000";

/**
 * Validates a decimal string value
 * Returns true if valid, false otherwise
 */
function isValidDecimalString(value: string): boolean {
  if (!value || value.trim() === "") return false;

  try {
    const decimal = parseDecimal(value);
    return !decimal.isNaN();
  } catch {
    return false;
  }
}

/**
 * Checks if decimal string has at most N decimal places
 */
function hasMaxDecimalPlaces(value: string, maxPlaces: number): boolean {
  const decimalPointIndex = value.indexOf(".");
  if (decimalPointIndex === -1) return true;

  const decimalPlaces = value.length - decimalPointIndex - 1;
  return decimalPlaces <= maxPlaces;
}

/**
 * Contribution amount schema
 *
 * AC-7.1.2: Validates numeric string, > 0, max 2 decimal places
 *
 * @example
 * ```typescript
 * const result = contributionSchema.safeParse("2000.00");
 * if (result.success) {
 *   console.log(result.data); // "2000.00"
 * }
 * ```
 */
export const contributionSchema = z
  .string()
  .min(1, CONTRIBUTION_ERRORS.REQUIRED)
  .refine((val) => isValidDecimalString(val), {
    message: CONTRIBUTION_ERRORS.INVALID_NUMBER,
  })
  .refine((val) => hasMaxDecimalPlaces(val, 2), {
    message: CONTRIBUTION_ERRORS.TOO_MANY_DECIMALS,
  })
  .refine(
    (val) => {
      try {
        const decimal = parseDecimal(val);
        return decimal.isPositive() && !decimal.isZero();
      } catch {
        return false;
      }
    },
    { message: CONTRIBUTION_ERRORS.MUST_BE_POSITIVE }
  )
  .refine(
    (val) => {
      try {
        const decimal = parseDecimal(val);
        const max = parseDecimal(MAX_CONTRIBUTION);
        return decimal.lessThanOrEqualTo(max);
      } catch {
        return false;
      }
    },
    { message: CONTRIBUTION_ERRORS.TOO_LARGE }
  );

/**
 * Optional contribution schema (for updates where contribution might not change)
 */
export const optionalContributionSchema = contributionSchema.optional();

// =============================================================================
// DIVIDENDS VALIDATION
// =============================================================================

/**
 * Custom error messages for dividends
 */
const DIVIDENDS_ERRORS = {
  INVALID_NUMBER: "Please enter a valid number",
  MUST_BE_NON_NEGATIVE: "Dividends cannot be negative",
  TOO_MANY_DECIMALS: "Maximum 2 decimal places allowed",
  TOO_LARGE: "Dividends amount is too large",
} as const;

/**
 * Dividends amount schema
 *
 * Similar to contribution but allows 0 (dividends can be empty/zero)
 *
 * @example
 * ```typescript
 * const result = dividendsSchema.safeParse("0.00");
 * if (result.success) {
 *   console.log(result.data); // "0.00"
 * }
 * ```
 */
export const dividendsSchema = z
  .string()
  .refine((val) => !val || isValidDecimalString(val), {
    message: DIVIDENDS_ERRORS.INVALID_NUMBER,
  })
  .refine((val) => !val || hasMaxDecimalPlaces(val, 2), {
    message: DIVIDENDS_ERRORS.TOO_MANY_DECIMALS,
  })
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const decimal = parseDecimal(val);
        return !decimal.isNegative();
      } catch {
        return false;
      }
    },
    { message: DIVIDENDS_ERRORS.MUST_BE_NON_NEGATIVE }
  )
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const decimal = parseDecimal(val);
        const max = parseDecimal(MAX_CONTRIBUTION);
        return decimal.lessThanOrEqualTo(max);
      } catch {
        return false;
      }
    },
    { message: DIVIDENDS_ERRORS.TOO_LARGE }
  )
  .default("0.00");

// =============================================================================
// USER SETTINGS CONTRIBUTION VALIDATION
// =============================================================================

/**
 * Schema for updating user's default contribution setting
 *
 * AC-7.1.3, AC-7.1.4: Save default contribution preference
 */
export const updateDefaultContributionSchema = z.object({
  defaultContribution: contributionSchema.nullable(),
});

export type UpdateDefaultContributionInput = z.infer<typeof updateDefaultContributionSchema>;

// =============================================================================
// RECOMMENDATION REQUEST VALIDATION
// =============================================================================

/**
 * Schema for POST /api/recommendations/generate request body
 *
 * Per tech spec:
 * - contribution: Required, > 0
 * - dividends: Optional, >= 0 (defaults to "0.00")
 */
export const generateRecommendationSchema = z.object({
  contribution: contributionSchema,
  dividends: dividendsSchema,
});

export type GenerateRecommendationInput = z.infer<typeof generateRecommendationSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate contribution amount and return error message if invalid
 *
 * Convenience function for component-level validation
 *
 * @param value - Contribution amount as string
 * @returns Error message or undefined if valid
 */
export function validateContribution(value: string): string | undefined {
  const result = contributionSchema.safeParse(value);
  if (result.success) {
    return undefined;
  }
  return result.error.issues[0]?.message || CONTRIBUTION_ERRORS.INVALID_NUMBER;
}

/**
 * Validate dividends amount and return error message if invalid
 *
 * @param value - Dividends amount as string
 * @returns Error message or undefined if valid
 */
export function validateDividends(value: string): string | undefined {
  const result = dividendsSchema.safeParse(value);
  if (result.success) {
    return undefined;
  }
  return result.error.issues[0]?.message || DIVIDENDS_ERRORS.INVALID_NUMBER;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export { CONTRIBUTION_ERRORS, DIVIDENDS_ERRORS };
