"use client";

/**
 * useFormFieldStatus Hook
 *
 * Story 3.4: Visual Status Feedback
 * AC-3.4.5: Field-Level Error Styling
 * AC-3.4.6: Field-Level Valid Styling
 *
 * A hook that extracts field status from react-hook-form context
 * and computes the appropriate border class.
 *
 * Features:
 * - Extracts error, touched, and valid state from form context
 * - Computes pre-computed border class for styling
 * - Supports nested field paths (e.g., "user.email", "holdings.0.percentage")
 */

import { useMemo } from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { getFieldBorderClassName } from "@/components/forms/form-field-status";

/**
 * Result returned by the useFormFieldStatus hook
 */
export interface FormFieldStatusResult {
  /** Whether the field has a validation error */
  hasError: boolean;
  /** Whether the field has been touched */
  isTouched: boolean;
  /** Whether the field is valid (no error and touched) */
  isValid: boolean;
  /** Error message if present */
  errorMessage: string | undefined;
  /** Pre-computed border class based on status */
  borderClassName: string;
}

/**
 * Options for the useFormFieldStatus hook
 */
export interface UseFormFieldStatusOptions<TFieldValues extends FieldValues> {
  /** Field name/path to check status for */
  name: Path<TFieldValues>;
}

/**
 * Get a nested value from an object using a dot-separated path
 * Handles array indices (e.g., "holdings.0.percentage")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Extract field status from form errors and touched state
 * Exported for testing without React context
 *
 * @param name - Field path (e.g., "email", "user.email", "holdings.0.percentage")
 * @param errors - Form errors object from react-hook-form
 * @param touchedFields - Touched fields object from react-hook-form
 * @returns FormFieldStatusResult with status and computed classes
 */
export function extractFieldStatus(
  name: string,
  errors: Record<string, unknown>,
  touchedFields: Record<string, unknown>
): FormFieldStatusResult {
  // Get error for the field
  const fieldError = getNestedValue(errors, name) as
    | { message?: string; type?: string }
    | undefined;
  const hasError = !!fieldError;
  const errorMessage = fieldError?.message;

  // Get touched state for the field
  const isTouched = !!getNestedValue(touchedFields, name);

  // Field is valid if touched and no error
  const isValid = isTouched && !hasError;

  // Compute border class
  const borderClassName = getFieldBorderClassName({
    hasError,
    isTouched,
    isValid,
  });

  return {
    hasError,
    isTouched,
    isValid,
    errorMessage,
    borderClassName,
  };
}

/**
 * useFormFieldStatus
 *
 * React hook that extracts field status from react-hook-form context.
 * Must be used within a FormProvider context.
 *
 * @example
 * ```tsx
 * function MyInput() {
 *   const { borderClassName, errorMessage, hasError } = useFormFieldStatus({ name: "email" });
 *
 *   return (
 *     <div>
 *       <input
 *         {...register("email")}
 *         className={cn("border", borderClassName)}
 *       />
 *       {hasError && <p className="text-destructive">{errorMessage}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormFieldStatus<TFieldValues extends FieldValues>({
  name,
}: UseFormFieldStatusOptions<TFieldValues>): FormFieldStatusResult {
  const formContext = useFormContext<TFieldValues>();

  if (!formContext) {
    throw new Error("useFormFieldStatus must be used within a FormProvider");
  }

  const {
    formState: { errors, touchedFields },
  } = formContext;

  // Memoize the result based on relevant form state
  return useMemo(() => {
    return extractFieldStatus(
      name as string,
      errors as unknown as Record<string, unknown>,
      touchedFields as unknown as Record<string, unknown>
    );
  }, [name, errors, touchedFields]);
}

export default useFormFieldStatus;
