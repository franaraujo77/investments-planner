/**
 * Delete Asset Confirmation Dialog
 *
 * Story 3.4: Remove Asset from Portfolio
 *
 * AC-3.4.1: Delete icon button triggers dialog
 * AC-3.4.2: Confirmation dialog with asset details
 * AC-3.4.4: Cancel closes dialog without action
 */

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteAssetDialogProps {
  /** Asset details to display in dialog */
  asset: {
    symbol: string;
    value: string;
    currency: string;
  } | null;
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Whether deletion is in progress */
  isLoading?: boolean;
}

/**
 * Confirmation dialog for removing an asset from a portfolio.
 *
 * Shows asset symbol and value being removed, with destructive
 * confirm button styling per UX spec.
 */
export function DeleteAssetDialog({
  asset,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: DeleteAssetDialogProps) {
  if (!asset) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {asset.symbol}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">This cannot be undone.</span>
            <span className="block text-sm text-muted-foreground">
              Current value: {asset.currency} {asset.value}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
