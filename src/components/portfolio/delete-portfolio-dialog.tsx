"use client";

/**
 * Delete Portfolio Dialog Component
 *
 * Story 2.4: Delete Portfolio
 *
 * AC-2.4.2: Confirmation dialog explaining action cannot be undone
 * AC-2.4.3: Must type exact portfolio name to enable "Delete" button
 * AC-2.4.6: Cancel closes dialog without changes
 *
 * Follows delete-account-dialog.tsx pattern for name-confirmation flow.
 */

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Props for DeletePortfolioDialog component
 */
export interface DeletePortfolioDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Portfolio ID to delete */
  portfolioId: string;
  /** Portfolio name for confirmation */
  portfolioName: string;
  /** Callback when deletion succeeds */
  onDeleteSuccess: () => void;
  /** External deleting state */
  isDeleting?: boolean;
}

/**
 * Delete Portfolio Confirmation Dialog
 *
 * Requires user to type the exact portfolio name to confirm deletion.
 * This prevents accidental deletions of important portfolios.
 */
export function DeletePortfolioDialog({
  open,
  onOpenChange,
  portfolioId,
  portfolioName,
  onDeleteSuccess,
  isDeleting: externalIsDeleting,
}: DeletePortfolioDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combine internal and external deleting states
  const isCurrentlyDeleting = isDeleting || externalIsDeleting;

  // AC-2.4.3: Exact match required
  const isConfirmationValid = confirmation.trim() === portfolioName;

  /**
   * Handle portfolio deletion
   *
   * AC-2.4.4: Calls DELETE API endpoint
   */
  const handleDelete = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete portfolio");
      }

      // Success - call the success callback
      onDeleteSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete portfolio");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Reset state when dialog closes
   * AC-2.4.6: Cancel behavior
   */
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Reset state after dialog animation completes
      setTimeout(() => {
        setConfirmation("");
        setError(null);
      }, 150);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isCurrentlyDeleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Portfolio
          </DialogTitle>
          <DialogDescription className="text-left">This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Message - AC-2.4.2 */}
          <div className="rounded-md bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive mb-2">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>The portfolio &quot;{portfolioName}&quot;</li>
              <li>All its holdings and assets</li>
              <li>All investment history for this portfolio</li>
              <li>Any cached recommendations</li>
            </ul>
          </div>

          {/* Confirmation Input - AC-2.4.3 */}
          <div className="space-y-2">
            <Label htmlFor="portfolio-name-confirmation">
              Type <span className="font-mono font-bold">{portfolioName}</span> to confirm
            </Label>
            <Input
              id="portfolio-name-confirmation"
              type="text"
              placeholder={
                portfolioName.length > 25
                  ? "Type portfolio name to confirm"
                  : `Type "${portfolioName}" to confirm`
              }
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isCurrentlyDeleting}
              autoComplete="off"
              data-testid="delete-portfolio-confirmation-input"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          {/* Cancel Button - AC-2.4.6 */}
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCurrentlyDeleting}
            data-testid="delete-portfolio-cancel-button"
          >
            Cancel
          </Button>

          {/* Delete Button - AC-2.4.3: Disabled until name matches */}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isCurrentlyDeleting}
            data-testid="delete-portfolio-confirm-button"
          >
            {isCurrentlyDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Portfolio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
