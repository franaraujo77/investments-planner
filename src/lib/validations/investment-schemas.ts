/**
 * Investment Validation Schemas
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.5: Validation Prevents Invalid Submissions
 *
 * Zod schemas for validating investment confirmation inputs.
 * Ensures all amounts are valid decimal strings, UUIDs are properly formatted,
 * and business rules are enforced.
 */

import { z } from "zod";

// =============================================================================
// INVESTMENT ITEM SCHEMA
// =============================================================================

/**
 * Schema for a single investment item in a confirmation request
 *
 * Validates:
 * - assetId is a valid UUID
 * - ticker is a non-empty string
 * - actualAmount is a non-negative decimal string
 * - pricePerUnit is a positive decimal string
 */
export const investmentItemSchema = z.object({
  assetId: z.string().uuid("Invalid asset ID format"),
  ticker: z.string().min(1, "Ticker is required").max(20, "Ticker too long"),
  actualAmount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: "Amount must be a non-negative number" }
    ),
  pricePerUnit: z
    .string()
    .min(1, "Price is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Price must be a positive number" }
    ),
});

// =============================================================================
// CONFIRM INVESTMENT SCHEMA
// =============================================================================

/**
 * Schema for the complete investment confirmation request
 *
 * Validates:
 * - recommendationId is a valid UUID
 * - investments array has at least one item
 * - All investment items pass individual validation
 */
export const confirmInvestmentSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID format"),
  investments: z.array(investmentItemSchema).min(1, "At least one investment is required"),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type InvestmentItemInput = z.infer<typeof investmentItemSchema>;
export type ConfirmInvestmentInput = z.infer<typeof confirmInvestmentSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate investment confirmation input
 *
 * @param input - Raw input to validate
 * @returns Parsed and validated input, or validation errors
 */
export function validateConfirmInvestment(input: unknown): {
  success: boolean;
  data?: ConfirmInvestmentInput;
  error?: z.ZodError;
} {
  const result = confirmInvestmentSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate that total does not exceed available capital
 *
 * AC-7.8.5: Total cannot exceed available capital
 *
 * @param investments - Array of investment items with amounts
 * @param availableCapital - Maximum available capital (decimal string)
 * @returns Error message if validation fails, null if valid
 */
export function validateTotalDoesNotExceedAvailable(
  investments: Array<{ actualAmount: string }>,
  availableCapital: string
): string | null {
  const total = investments.reduce((sum, inv) => {
    const amount = parseFloat(inv.actualAmount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const available = parseFloat(availableCapital);
  if (isNaN(available)) {
    return "Invalid available capital";
  }

  // Allow small floating point tolerance (0.01)
  if (total > available + 0.01) {
    return "Total exceeds available capital";
  }

  return null;
}

/**
 * Validate that no amounts are negative
 *
 * AC-7.8.5: No negative amounts allowed
 *
 * @param investments - Array of investment items with amounts
 * @returns Error message if validation fails, null if valid
 */
export function validateNoNegativeAmounts(
  investments: Array<{ actualAmount: string }>
): string | null {
  for (const inv of investments) {
    const amount = parseFloat(inv.actualAmount);
    if (isNaN(amount) || amount < 0) {
      return "Amount cannot be negative";
    }
  }
  return null;
}
