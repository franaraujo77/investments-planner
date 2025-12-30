"use client";

/**
 * FormFieldStatus Component
 *
 * Story 3.4: Visual Status Feedback
 * AC-3.4.5: Field-Level Error Styling
 * AC-3.4.6: Field-Level Valid Styling
 *
 * A reusable wrapper that provides visual status feedback for form fields.
 * Designed to work with any form library (not just react-hook-form).
 *
 * Features:
 * - Red border for error states (border-destructive)
 * - Green border for valid + touched states (border-green-500)
 * - Error message display below the field
 * - Works with any child input component
 */

import { cn } from "@/lib/utils";

/**
 * Props for the FormFieldStatus component
 */
export interface FormFieldStatusProps {
  /** Whether the field has a validation error */
  hasError: boolean;
  /** Whether the field has been touched (focused and blurred) */
  isTouched: boolean;
  /** Whether the field is valid (no error) */
  isValid: boolean;
  /** Error message to display when hasError is true */
  errorMessage?: string;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** The form field(s) to wrap */
  children: React.ReactNode;
}

/**
 * Get the border class based on field status
 * Exported for testing
 *
 * Logic per project-context.md:
 * - Error: border-destructive (red)
 * - Valid + Touched: border-green-500 (green)
 * - Default: empty (inherit from parent/Input)
 *
 * @param status - Object containing hasError, isTouched, and isValid
 * @returns CSS class string for the border
 */
export function getFieldBorderClassName(status: {
  hasError: boolean;
  isTouched: boolean;
  isValid: boolean;
}): string {
  // Error takes precedence
  if (status.hasError) {
    return "border-destructive";
  }

  // Valid + Touched shows green
  if (status.isTouched && status.isValid) {
    return "border-green-500";
  }

  // Default: no special styling
  return "";
}

/**
 * FormFieldStatus
 *
 * Wraps a form field and provides visual status feedback.
 * Renders error messages below the field when errors exist.
 *
 * @example
 * ```tsx
 * <FormFieldStatus
 *   hasError={!!errors.email}
 *   isTouched={touchedFields.email}
 *   isValid={!errors.email}
 *   errorMessage={errors.email?.message}
 * >
 *   <Input
 *     {...register("email")}
 *     className={cn(
 *       "border",
 *       getFieldBorderClassName({ hasError, isTouched, isValid })
 *     )}
 *   />
 * </FormFieldStatus>
 * ```
 */
export function FormFieldStatus({
  hasError,
  isTouched,
  isValid,
  errorMessage,
  className,
  children,
}: FormFieldStatusProps) {
  return (
    <div
      className={cn("relative", className)}
      data-testid="form-field-status"
      data-touched={isTouched}
      data-valid={isValid}
      data-error={hasError}
    >
      {children}
      {hasError && errorMessage && (
        <p role="alert" className="mt-1 text-sm text-destructive" data-testid="field-error-message">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default FormFieldStatus;
