"use client";

/**
 * Delete Criteria Set Dialog
 *
 * Story 4.4: Criteria Library and Management
 * AC-4.4.4: Delete with Confirmation
 *
 * A confirmation dialog for deleting a criteria set.
 * Shows the criteria set name and warns about the irreversible action.
 */

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
import { Loader2 } from "lucide-react";

interface DeleteCriteriaSetDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change dialog open state */
  onOpenChange: (open: boolean) => void;
  /** The name of the criteria set to delete */
  criteriaSetName: string;
  /** The number of criteria in the set */
  criteriaCount: number;
  /** Callback to confirm deletion */
  onConfirm: () => Promise<void>;
  /** Whether deletion is in progress */
  isDeleting: boolean;
}

export function DeleteCriteriaSetDialog({
  open,
  onOpenChange,
  criteriaSetName,
  criteriaCount,
  onConfirm,
  isDeleting,
}: DeleteCriteriaSetDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      // Only close on success - parent handles the actual close via state
    } catch {
      // Error is handled by parent component, keep dialog open
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Criteria Set</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{criteriaSetName}&quot;? This criteria set
            contains {criteriaCount} {criteriaCount === 1 ? "criterion" : "criteria"} and will be
            removed from your library. You won&apos;t be able to use it for scoring anymore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
