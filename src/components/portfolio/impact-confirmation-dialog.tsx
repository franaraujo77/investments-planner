"use client";

/**
 * Impact Confirmation Dialog
 *
 * Story 2.3: Edit Portfolio
 *
 * AC-2.3.3: Industry sector change impact warning
 * AC-2.3.4: Asset type removal impact warning
 * AC-2.3.5: Confirm destructive change
 * AC-2.3.6: Cancel destructive change
 */

import { AlertTriangle } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Asset to be removed
 */
interface ImpactedAsset {
  id: string;
  symbol: string;
  name: string | null;
  assetType: string;
}

/**
 * Dialog props
 */
interface ImpactConfirmationDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Assets that will be removed
   */
  assetsToRemove: ImpactedAsset[];

  /**
   * Type of change being made
   */
  changeType: "assetType" | "industrySector";

  /**
   * The value being changed to (for display)
   */
  newValue?: string;

  /**
   * Callback when user confirms the change
   */
  onConfirm: () => void;

  /**
   * Callback when user cancels
   */
  onCancel: () => void;

  /**
   * Whether the confirm action is in progress
   */
  isLoading?: boolean;
}

/**
 * ImpactConfirmationDialog
 *
 * Displays a warning dialog when portfolio changes would remove assets.
 * Shows a list of assets to be removed and requires explicit confirmation.
 *
 * AC-2.3.5: Click Confirm → proceed with update including asset removal
 * AC-2.3.6: Click Cancel → close dialog, no changes
 */
export function ImpactConfirmationDialog({
  open,
  onOpenChange,
  assetsToRemove,
  changeType,
  newValue,
  onConfirm,
  onCancel,
  isLoading = false,
}: ImpactConfirmationDialogProps) {
  const assetCount = assetsToRemove.length;

  // Build description based on change type
  const changeDescription =
    changeType === "assetType"
      ? `Removing asset type ${newValue ? `"${newValue}"` : ""} will permanently remove ${assetCount} ${assetCount === 1 ? "asset" : "assets"} from this portfolio:`
      : `Changing industry sector ${newValue ? `to "${newValue}"` : ""} will permanently remove ${assetCount} ${assetCount === 1 ? "asset" : "assets"} from this portfolio:`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="impact-confirmation-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Confirm Destructive Change</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{changeDescription}</p>

              {/* List of assets to be removed */}
              {assetsToRemove.length > 0 && (
                <ul
                  className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3 text-sm"
                  data-testid="impacted-assets-list"
                >
                  {assetsToRemove.map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between py-1">
                      <span className="font-medium">{asset.symbol}</span>
                      {asset.name && (
                        <span className="text-muted-foreground truncate ml-2">{asset.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-destructive font-medium">
                This action cannot be undone. The assets will be permanently removed.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            disabled={isLoading}
            data-testid="impact-dialog-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(buttonVariants({ variant: "destructive" }))}
            data-testid="impact-dialog-confirm"
          >
            {isLoading ? "Removing..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ImpactConfirmationDialog;
