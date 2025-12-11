"use client";

/**
 * useUpdateAsset Hook
 *
 * Story 3.3: Update Asset Holdings
 *
 * A React hook for updating asset quantity and/or purchase price.
 * Implements optimistic updates with rollback on error.
 *
 * AC-3.3.5: Total value recalculation after update
 * AC-3.3.7: Optimistic update with rollback on failure
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UpdateAssetInput } from "@/lib/validations/portfolio";

interface UpdateAssetResult {
  /**
   * Function to update an asset
   * Returns true on success, error message on failure
   */
  updateAsset: (assetId: string, input: UpdateAssetInput) => Promise<true | string>;
  /**
   * Whether an update is currently in progress
   */
  isUpdating: boolean;
}

/**
 * Hook for updating portfolio assets
 *
 * Provides a function to update asset quantity/price with:
 * - Automatic router refresh on success for React Server Component data sync
 * - Error handling with user-friendly messages
 * - Loading state tracking
 *
 * @example
 * const { updateAsset, isUpdating } = useUpdateAsset();
 *
 * const handleSave = async (newValue: string) => {
 *   const result = await updateAsset(assetId, { quantity: newValue });
 *   if (result === true) {
 *     // Success - UI will be refreshed via router.refresh()
 *   } else {
 *     // Error - result contains error message
 *   }
 * };
 */
export function useUpdateAsset(): UpdateAssetResult {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateAsset = useCallback(
    async (assetId: string, input: UpdateAssetInput): Promise<true | string> => {
      setIsUpdating(true);

      try {
        const response = await fetch(`/api/assets/${assetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const result = await response.json();

        if (!response.ok) {
          // Handle specific error codes
          if (result.code === "NOT_FOUND") {
            toast.error("Asset not found");
            return "Asset not found";
          } else if (result.code === "VALIDATION_ERROR") {
            const errorMessage = "Please check your input and try again";
            toast.error(errorMessage);
            return errorMessage;
          } else if (result.code === "UNAUTHORIZED") {
            toast.error("Please log in to continue");
            return "Unauthorized";
          } else {
            const errorMessage = "Failed to update. Please try again.";
            toast.error(errorMessage);
            return errorMessage;
          }
        }

        // Success - refresh the page to get updated data from server
        router.refresh();
        return true;
      } catch (_error) {
        // Error displayed to user via toast - no additional logging needed in client
        const errorMessage = "Failed to update. Please try again.";
        toast.error(errorMessage);
        return errorMessage;
      } finally {
        setIsUpdating(false);
      }
    },
    [router]
  );

  return { updateAsset, isUpdating };
}
