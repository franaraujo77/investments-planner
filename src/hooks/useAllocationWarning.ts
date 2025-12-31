/**
 * Allocation Warning Hook
 *
 * Story 3.3: Allocation Validation
 * AC-3.3.3: Exit Warning for Incomplete Allocation
 *
 * Manages warning dialog state when user attempts to navigate away
 * with unsaved changes and invalid allocation.
 *
 * This hook extends useUnsavedChangesWarning by adding:
 * - Custom dialog state management for in-app navigation
 * - isValid checking for allocation-specific warnings
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

/**
 * Warning dialog title and message
 */
const WARNING_TITLE = "Unsaved Changes";
const WARNING_MESSAGE = "Your allocation doesn't equal 100%. Changes will be lost. Leave anyway?";

/**
 * State returned from warning computation
 */
export interface AllocationWarningState {
  /** Whether to show the warning dialog */
  shouldWarn: boolean;
  /** Title for the warning dialog */
  title: string;
  /** Message for the warning dialog */
  message: string;
}

/**
 * Input for computing warning state
 */
export interface ComputeWarningStateInput {
  isDirty: boolean;
  isValid: boolean;
  navigationAttempt: boolean;
}

/**
 * Pure function for computing warning state
 * Exported for unit testing
 */
export function computeWarningState({
  isDirty,
  isValid,
  navigationAttempt,
}: ComputeWarningStateInput): AllocationWarningState {
  const shouldWarn = navigationAttempt && isDirty && !isValid;

  return {
    shouldWarn,
    title: WARNING_TITLE,
    message: WARNING_MESSAGE,
  };
}

/**
 * Options for useAllocationWarning hook
 */
export interface UseAllocationWarningOptions {
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Whether allocation is valid (equals 100%) */
  isValid: boolean;
  /** Whether to enable the warning */
  enabled?: boolean;
}

/**
 * Result from useAllocationWarning hook
 */
export interface UseAllocationWarningResult {
  /** Whether warning dialog should be shown */
  showWarning: boolean;
  /** Handler to confirm leaving (proceed with navigation) */
  confirmLeave: () => void;
  /** Handler to cancel leaving (stay on page) */
  cancelLeave: () => void;
  /** Warning dialog title */
  title: string;
  /** Warning dialog message */
  message: string;
  /** Trigger a navigation attempt (for testing/programmatic use) */
  triggerWarning: () => void;
}

/**
 * useAllocationWarning
 *
 * Hook for managing warning dialog when user attempts to leave
 * with unsaved changes and invalid allocation.
 *
 * Combines:
 * - Browser beforeunload handling (via useUnsavedChangesWarning)
 * - Custom dialog state for in-app navigation
 *
 * @example
 * ```tsx
 * const form = useForm();
 * const { isDirty } = form.formState;
 * const { isValid } = useAllocationValidation("holdings");
 *
 * const { showWarning, confirmLeave, cancelLeave, title, message } =
 *   useAllocationWarning({ isDirty, isValid });
 *
 * // Render the dialog
 * <UnsavedChangesDialog
 *   open={showWarning}
 *   title={title}
 *   message={message}
 *   onStay={cancelLeave}
 *   onLeave={confirmLeave}
 * />
 * ```
 */
export function useAllocationWarning({
  isDirty,
  isValid,
  enabled = true,
}: UseAllocationWarningOptions): UseAllocationWarningResult {
  // Track navigation attempt state
  const [navigationAttempt, setNavigationAttempt] = useState(false);
  // Track pending navigation callback
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Use existing hook for browser beforeunload
  // Only warn if dirty AND invalid (can't save anyway)
  useUnsavedChangesWarning({
    isDirty: isDirty && !isValid,
    message: WARNING_MESSAGE,
    enabled,
  });

  // Compute show warning: need navigation attempt AND dirty AND invalid
  // If form becomes valid/clean while dialog is open, dialog stays open but
  // user can now safely leave (or close the dialog)
  const showWarning = navigationAttempt && enabled && isDirty && !isValid;

  /**
   * Trigger navigation attempt (shows warning if needed)
   */
  const triggerWarning = useCallback(() => {
    if (enabled && isDirty && !isValid) {
      setNavigationAttempt(true);
    }
  }, [enabled, isDirty, isValid]);

  /**
   * Confirm leaving - proceed with navigation
   */
  const confirmLeave = useCallback(() => {
    setNavigationAttempt(false);
    const pendingNav = pendingNavigationRef.current;
    if (pendingNav) {
      pendingNav();
      pendingNavigationRef.current = null;
    }
  }, []);

  /**
   * Cancel leaving - stay on page
   */
  const cancelLeave = useCallback(() => {
    setNavigationAttempt(false);
    pendingNavigationRef.current = null;
  }, []);

  return {
    showWarning,
    confirmLeave,
    cancelLeave,
    title: WARNING_TITLE,
    message: WARNING_MESSAGE,
    triggerWarning,
  };
}

export default useAllocationWarning;
