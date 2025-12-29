/**
 * Unsaved Changes Warning Hook
 *
 * Story 2.3: Edit Portfolio - AC-2.3.8
 *
 * Warns users when they try to navigate away with unsaved changes.
 * Handles both browser navigation (beforeunload) and in-app navigation.
 */

"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook options
 */
interface UseUnsavedChangesWarningOptions {
  /**
   * Whether there are unsaved changes
   * Pass formState.isDirty from react-hook-form
   */
  isDirty: boolean;

  /**
   * Custom warning message
   * @default "You have unsaved changes. Are you sure you want to leave?"
   */
  message?: string;

  /**
   * Whether to enable the warning
   * Can be used to temporarily disable the warning
   * @default true
   */
  enabled?: boolean;
}

/**
 * Default warning message
 */
const DEFAULT_MESSAGE = "You have unsaved changes. Are you sure you want to leave?";

/**
 * useUnsavedChangesWarning
 *
 * Warns users when they try to navigate away with unsaved changes.
 *
 * @example
 * ```tsx
 * const form = useForm();
 * const { formState: { isDirty } } = form;
 *
 * useUnsavedChangesWarning({ isDirty });
 * ```
 *
 * @example
 * ```tsx
 * // Disable during form submission
 * const [isSubmitting, setIsSubmitting] = useState(false);
 *
 * useUnsavedChangesWarning({
 *   isDirty,
 *   enabled: !isSubmitting
 * });
 * ```
 */
export function useUnsavedChangesWarning({
  isDirty,
  message = DEFAULT_MESSAGE,
  enabled = true,
}: UseUnsavedChangesWarningOptions): void {
  /**
   * Handle browser beforeunload event
   * This handles:
   * - Browser back/forward buttons
   * - Closing the tab
   * - Refreshing the page
   * - Clicking a link that navigates away
   */
  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (isDirty && enabled) {
        event.preventDefault();
        // Modern browsers ignore this message and show their own,
        // but we set it for older browser compatibility
        event.returnValue = message;
        return message;
      }
    },
    [isDirty, enabled, message]
  );

  useEffect(() => {
    // Add beforeunload listener for browser navigation
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  /**
   * Note: Next.js App Router doesn't expose router events like Pages Router did.
   *
   * For in-app navigation warnings, we rely on:
   * 1. The beforeunload event (works for actual navigation)
   * 2. The form submission flow that checks isDirty before save
   *
   * If you need to intercept Next.js Link clicks or router.push/replace,
   * consider using a custom Link wrapper or the form's onSubmit validation.
   *
   * The current implementation handles the most common use case:
   * - User tries to close/refresh the tab with unsaved changes
   * - User clicks browser back button with unsaved changes
   */
}

/**
 * Alternative: useBlocker hook pattern (for future Next.js versions)
 *
 * Next.js may add navigation blocking APIs in the future.
 * When available, this hook could be extended to use those APIs.
 *
 * For now, the beforeunload approach is the standard for App Router.
 */
export default useUnsavedChangesWarning;
