"use client";

/**
 * useToggleIgnore Hook
 *
 * Story 3.5: Mark Asset as Ignored
 *
 * A React hook for toggling an asset's ignored status.
 * Shows success/error toasts and refreshes data on success.
 *
 * AC-3.5.5: Instant toggle with success toast
 * AC-3.5.6: Toggle reversibility
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ToggleIgnoreResult {
  /**
   * Function to toggle an asset's ignored status
   * Returns true on success, error message on failure
   */
  toggleIgnore: (assetId: string) => Promise<true | string>;
  /**
   * Whether a toggle is currently in progress
   */
  isToggling: boolean;
}

/**
 * Hook for toggling portfolio asset ignored status
 *
 * Provides a function to toggle an asset's ignored state with:
 * - Automatic router refresh on success for React Server Component data sync
 * - Error handling with user-friendly messages
 * - Loading state tracking
 * - Toast notifications for success/error
 *
 * @example
 * const { toggleIgnore, isToggling } = useToggleIgnore();
 *
 * const handleToggle = async (assetId: string) => {
 *   const result = await toggleIgnore(assetId);
 *   if (result === true) {
 *     // Success - UI will be refreshed via router.refresh()
 *   } else {
 *     // Error - result contains error message
 *   }
 * };
 */
export function useToggleIgnore(): ToggleIgnoreResult {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);

  const toggleIgnore = useCallback(
    async (assetId: string): Promise<true | string> => {
      setIsToggling(true);

      try {
        const response = await fetch(`/api/assets/${assetId}/ignore`, {
          method: "PATCH",
        });

        if (!response.ok) {
          const result = await response.json();

          // Handle specific error codes
          if (result.code === "NOT_FOUND") {
            toast.error("Asset not found");
            return "Asset not found";
          } else if (result.code === "UNAUTHORIZED") {
            toast.error("Please log in to continue");
            return "Unauthorized";
          } else {
            toast.error("Failed to update asset. Please try again.");
            return "Failed to update asset";
          }
        }

        // Parse the response to get the new state
        const result = await response.json();
        const isNowIgnored = result.data?.isIgnored;

        // Success - show appropriate toast based on new state
        if (isNowIgnored) {
          toast.success("Asset ignored");
        } else {
          toast.success("Asset restored");
        }

        // Refresh the page to get updated data
        router.refresh();
        return true;
      } catch (_error) {
        // Error displayed to user via toast - no additional logging needed in client
        toast.error("Failed to update asset. Please try again.");
        return "Failed to update asset";
      } finally {
        setIsToggling(false);
      }
    },
    [router]
  );

  return { toggleIgnore, isToggling };
}
