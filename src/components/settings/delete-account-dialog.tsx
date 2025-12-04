"use client";

/**
 * Delete Account Dialog Component
 *
 * Story 2.8: Account Deletion
 *
 * Client component that allows users to delete their account.
 * Includes confirmation dialog requiring user to type "DELETE".
 *
 * AC-2.8.1: Delete Account button styled as destructive action (red)
 * AC-2.8.2: Confirmation dialog with consequences and "DELETE" input
 * AC-2.8.5: Success handling with toast and redirect
 */

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Delete Account Dialog
 *
 * Displays a "Danger Zone" section with account deletion functionality.
 * Requires user to type "DELETE" to confirm.
 */
export function DeleteAccountDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmationValid = confirmation === "DELETE";

  /**
   * Handles the account deletion process
   *
   * AC-2.8.3: Calls API to delete account
   * AC-2.8.5: Redirects to homepage on success
   */
  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }

      // Close dialog
      setIsOpen(false);

      // Show success message
      toast.success("Your account has been scheduled for deletion");

      // Redirect to homepage after short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Reset state when dialog closes
   */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmation("");
    }
  };

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                data-testid="delete-account-button"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </DialogTrigger>

            <DialogContent showCloseButton={!isDeleting}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription className="text-left">
                  This action cannot be undone after 30 days.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="rounded-md bg-destructive/10 p-4 text-sm">
                  <p className="font-medium text-destructive mb-2">This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Your account and profile information</li>
                    <li>All your portfolios and asset holdings</li>
                    <li>Your scoring criteria and configurations</li>
                    <li>All scores and investment history</li>
                    <li>All calculation events and audit data</li>
                  </ul>
                </div>

                <div className="rounded-md bg-muted p-4 text-sm">
                  <p className="font-medium mb-1">30-Day Grace Period</p>
                  <p className="text-muted-foreground">
                    Your data will be retained for 30 days before permanent deletion. During this
                    period, your account cannot be accessed or recovered.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="confirmation"
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    disabled={isDeleting}
                    autoComplete="off"
                    data-testid="delete-confirmation-input"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={!isConfirmationValid || isDeleting}
                  data-testid="confirm-delete-button"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete My Account
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
