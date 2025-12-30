"use client";

/**
 * FormValidityIndicator Component
 *
 * Story 3.3: Allocation Validation
 * AC-3.3.1: Save Button Disabled When Invalid
 * AC-3.3.2: Save Button Enabled When Valid
 * AC-3.3.4: Clear Validity Indicator
 *
 * Features:
 * - Two visual states: valid and invalid
 * - Uses consistent color palette with AllocationIndicator
 * - Accessibility support with ARIA attributes
 * - Clear messaging for form submission readiness
 */

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the FormValidityIndicator component
 */
export interface FormValidityIndicatorProps {
  /** Message to display (e.g., "Ready to save" or "Allocation must equal 100%") */
  message: string;
  /** Whether the form is in a valid state */
  isValid: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get styling classes based on validity state
 * Exported for testing
 *
 * Uses same color palette as AllocationIndicator for consistency:
 * - Valid: emerald (green)
 * - Invalid: red
 */
export function getValidityStyles(isValid: boolean): {
  textColor: string;
} {
  return {
    textColor: isValid
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400",
  };
}

/**
 * Get the icon name based on validity state
 * Exported for testing
 *
 * @returns Icon name as string (for testing), actual component uses the icon
 */
export function getValidityIcon(isValid: boolean): "CheckCircle2" | "XCircle" {
  return isValid ? "CheckCircle2" : "XCircle";
}

/**
 * FormValidityIndicator
 *
 * Displays the current form validity status with appropriate visual feedback.
 * Designed to be placed next to the Save button to show whether the form
 * can be submitted.
 *
 * @example
 * ```tsx
 * // With useAllocationValidation hook
 * const { canSubmit, validationMessage } = useAllocationValidation("holdings");
 *
 * <div className="flex items-center gap-4">
 *   <FormValidityIndicator message={validationMessage} isValid={canSubmit} />
 *   <Button type="submit" disabled={!canSubmit}>
 *     Save Changes
 *   </Button>
 * </div>
 * ```
 */
export function FormValidityIndicator({ message, isValid, className }: FormValidityIndicatorProps) {
  const styles = getValidityStyles(isValid);
  const Icon = isValid ? CheckCircle2 : XCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2", styles.textColor, className)}
      data-testid="form-validity-indicator"
      data-valid={String(isValid)}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

export default FormValidityIndicator;
