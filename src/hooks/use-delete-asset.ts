"use client";

/**
 * useDeleteAsset Hook
 *
 * Story 3.4: Remove Asset from Portfolio
 *
 * A React hook for deleting an asset from a portfolio.
 * Shows success/error toasts and refreshes data on success.
 *
 * AC-3.4.3: Hard delete with success toast
 * AC-3.4.5: Error handling with rollback and error toast
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DeleteAssetResult {
  /**
   * Function to delete an asset
   * Returns true on success, error message on failure
   */
  deleteAsset: (assetId: string) => Promise<true | string>;
  /**
   * Whether a deletion is currently in progress
   */
  isDeleting: boolean;
}

/**
 * Hook for deleting portfolio assets
 *
 * Provides a function to delete an asset with:
 * - Automatic router refresh on success for React Server Component data sync
 * - Error handling with user-friendly messages
 * - Loading state tracking
 * - Toast notifications for success/error
 *
 * @example
 * const { deleteAsset, isDeleting } = useDeleteAsset();
 *
 * const handleDelete = async (assetId: string) => {
 *   const result = await deleteAsset(assetId);
 *   if (result === true) {
 *     // Success - UI will be refreshed via router.refresh()
 *   } else {
 *     // Error - result contains error message
 *   }
 * };
 */
export function useDeleteAsset(): DeleteAssetResult {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAsset = useCallback(
    async (assetId: string): Promise<true | string> => {
      setIsDeleting(true);

      try {
        const response = await fetch(`/api/assets/${assetId}`, {
          method: "DELETE",
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
            toast.error("Failed to remove asset. Please try again.");
            return "Failed to remove asset";
          }
        }

        // Success - show toast and refresh the page to get updated data
        toast.success("Asset removed successfully");
        router.refresh();
        return true;
      } catch (_error) {
        // Error displayed to user via toast - no additional logging needed in client
        toast.error("Failed to remove asset. Please try again.");
        return "Failed to remove asset";
      } finally {
        setIsDeleting(false);
      }
    },
    [router]
  );

  return { deleteAsset, isDeleting };
}
