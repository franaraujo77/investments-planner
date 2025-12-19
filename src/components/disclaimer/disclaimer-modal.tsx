/**
 * Disclaimer Modal Component
 *
 * Story 9.4: Financial Disclaimers
 * AC-9.4.1: Modal shown on first dashboard visit, blocks access
 * AC-9.4.2: Disclaimer text explains non-financial-advice nature
 * AC-9.4.3: Must click acknowledge button to dismiss
 *
 * Key design decisions:
 * - Non-dismissible: No close button, no outside click, no Escape key
 * - Single action button to acknowledge
 * - Uses shadcn/ui Dialog with controlled state
 */

"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DisclaimerModalProps {
  open: boolean;
  onAcknowledge: () => void;
}

/**
 * Financial Disclaimer Modal
 *
 * Non-dismissible modal that blocks dashboard access until the user
 * acknowledges the financial disclaimer.
 *
 * AC-9.4.1: Cannot be dismissed by clicking outside or pressing Escape
 * AC-9.4.2: Contains full disclaimer text
 * AC-9.4.3: Only closeable via acknowledge button
 */
export function DisclaimerModal({ open, onAcknowledge }: DisclaimerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAcknowledge() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/disclaimer", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to acknowledge disclaimer");
      }

      // Success - call parent callback
      onAcknowledge();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to acknowledge disclaimer. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      // Prevent dismissal by any means other than the button
      onOpenChange={() => {
        // Intentionally empty - prevent all automatic close behaviors
      }}
    >
      <DialogContent
        // Disable close button and prevent escape/outside click dismissal
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-lg"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Important Investment Disclaimer</DialogTitle>
          </div>
          <DialogDescription>
            Please read and acknowledge the following before continuing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This application is a portfolio management tool that provides investment suggestions
            based on <strong>YOUR configured criteria</strong> and market data.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
            <p className="text-center text-lg font-semibold text-amber-800 dark:text-amber-200">
              This is NOT financial advice.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                Recommendations are <strong>mathematical calculations</strong>, not professional
                guidance
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                <strong>Past performance</strong> does not guarantee future results
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                Always <strong>consult a qualified financial advisor</strong> before making
                investment decisions
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                <strong>You are solely responsible</strong> for your investment choices
              </span>
            </li>
          </ul>

          <p className="text-xs text-muted-foreground">
            By clicking the button below, you confirm that you understand and acknowledge these
            terms.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleAcknowledge} disabled={isSubmitting} className="w-full" size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "I Understand and Acknowledge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
