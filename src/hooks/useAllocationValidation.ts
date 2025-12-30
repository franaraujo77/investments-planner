/**
 * Allocation Validation Hook
 *
 * Story 3.3: Allocation Validation
 * AC-3.3.1: Save Button Disabled When Invalid
 * AC-3.3.2: Save Button Enabled When Valid
 *
 * Provides validation state for forms with allocation percentages.
 * Integrates with useLiveAllocationTotal() from Story 3.1.
 */

"use client";

import { useMemo } from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { useLiveAllocationTotal } from "@/components/forms";

/**
 * Validation messages
 */
const VALIDATION_MESSAGE_VALID = "Ready to save";
const VALIDATION_MESSAGE_INVALID = "Allocation must equal 100%";

/**
 * Result of allocation validation
 */
export interface AllocationValidationResult {
  /** Whether allocation equals exactly 100% (within floating-point tolerance) */
  isValid: boolean;
  /** Whether form can be submitted (isValid && !isSubmitting && !hasFormErrors) */
  canSubmit: boolean;
  /** Message to display: "Ready to save" or "Allocation must equal 100%" */
  validationMessage: string;
  /** Current total percentage allocated */
  allocated: number;
  /** Remaining percentage to reach 100% (negative if overallocated) */
  remaining: number;
}

/**
 * Input for computing allocation validation
 * Used for testable pure function
 */
export interface ComputeAllocationValidationInput {
  total: number;
  remaining: number;
  isAllocationValid: boolean;
  isSubmitting: boolean;
  hasFormErrors: boolean;
}

/**
 * Pure function for computing validation state
 * Exported for unit testing
 */
export function computeAllocationValidation({
  total,
  remaining,
  isAllocationValid,
  isSubmitting,
  hasFormErrors,
}: ComputeAllocationValidationInput): AllocationValidationResult {
  // Determine canSubmit: all conditions must be true
  const canSubmit = isAllocationValid && !isSubmitting && !hasFormErrors;

  // Determine validation message
  const validationMessage = isAllocationValid
    ? VALIDATION_MESSAGE_VALID
    : VALIDATION_MESSAGE_INVALID;

  return {
    isValid: isAllocationValid,
    canSubmit,
    validationMessage,
    allocated: total,
    remaining,
  };
}

/**
 * Options for useAllocationValidation hook
 */
export interface UseAllocationValidationOptions {
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Whether form has any validation errors */
  hasFormErrors?: boolean;
  /** Target total percentage (default: 100) */
  targetTotal?: number;
}

/**
 * useAllocationValidation
 *
 * Hook that provides validation state for allocation forms.
 * Integrates with react-hook-form via useLiveAllocationTotal.
 *
 * Must be used within a FormProvider context.
 *
 * @example
 * ```tsx
 * const form = useForm();
 * const { canSubmit, validationMessage } = useAllocationValidation(
 *   "holdings",
 *   {
 *     isSubmitting: form.formState.isSubmitting,
 *     hasFormErrors: Object.keys(form.formState.errors).length > 0,
 *   }
 * );
 *
 * <Button disabled={!canSubmit}>Save</Button>
 * <FormValidityIndicator message={validationMessage} isValid={canSubmit} />
 * ```
 */
export function useAllocationValidation<TFieldValues extends FieldValues = FieldValues>(
  fieldPath: Path<TFieldValues>,
  options: UseAllocationValidationOptions = {}
): AllocationValidationResult {
  const { isSubmitting = false, hasFormErrors = false, targetTotal = 100 } = options;

  // Get form context to verify we're within FormProvider
  const formContext = useFormContext<TFieldValues>();

  if (!formContext) {
    throw new Error("useAllocationValidation must be used within a FormProvider");
  }

  // Use the existing hook from Story 3.1 for live allocation totals
  const {
    total,
    remaining,
    isValid: isAllocationValid,
  } = useLiveAllocationTotal<TFieldValues>(fieldPath, targetTotal);

  // Compute validation result
  return useMemo(
    () =>
      computeAllocationValidation({
        total,
        remaining,
        isAllocationValid,
        isSubmitting,
        hasFormErrors,
      }),
    [total, remaining, isAllocationValid, isSubmitting, hasFormErrors]
  );
}

export default useAllocationValidation;
