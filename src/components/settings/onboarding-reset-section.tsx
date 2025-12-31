"use client";

/**
 * Onboarding Reset Section Component
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.4: Reset Onboarding Tips Option
 *
 * Client component that allows users to reset their onboarding tips
 * so they can see them again.
 */

import { useState } from "react";
import { Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useOnboardingContextOptional } from "@/contexts/onboarding-context";

/**
 * Onboarding Reset Section
 *
 * Displays a card allowing users to reset all onboarding tips.
 * Tips will be shown again on relevant pages after reset.
 */
export function OnboardingResetSection() {
  const context = useOnboardingContextOptional();
  const [isResetting, setIsResetting] = useState(false);

  // Handle reset
  const handleReset = async () => {
    setIsResetting(true);

    try {
      // Use context if available (for localStorage sync)
      if (context) {
        await context.resetAllTips();
      } else {
        // Fallback to direct API call
        const response = await fetch("/api/user/onboarding", {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 401) {
          throw new Error("Failed to reset tips");
        }
      }

      toast.success("Onboarding tips have been reset. You'll see them again on relevant pages.");
    } catch {
      toast.error("Failed to reset onboarding tips. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  // Check if there are tips to reset
  const hasDismissedTips = context ? context.dismissedTips.size > 0 : false;

  return (
    <div className="rounded-lg border bg-card p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Onboarding Tips</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Onboarding tips help you learn about features as you use the app. If you&apos;ve dismissed
        tips and want to see them again, you can reset them here.
      </p>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          data-testid="reset-onboarding-button"
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Resetting...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reset Tips
            </>
          )}
        </Button>

        {context && !context.isLoading && (
          <span className="text-sm text-muted-foreground">
            {hasDismissedTips
              ? `${context.dismissedTips.size} tip${context.dismissedTips.size === 1 ? "" : "s"} dismissed`
              : "No tips dismissed yet"}
          </span>
        )}
      </div>
    </div>
  );
}
