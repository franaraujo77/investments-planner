"use client";

/**
 * Allocation Warning Banner Component
 *
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * Displays a warning banner when the total minimum allocations
 * across all asset classes exceed 100%. This is a non-blocking
 * warning (configuration can still be saved).
 */

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AllocationWarningBannerProps {
  totalMinimums: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function AllocationWarningBanner({
  totalMinimums,
  message,
  className,
  onDismiss,
  dismissible = true,
}: AllocationWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert
      variant="default"
      className={cn(
        "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
        "[&>svg]:text-amber-600",
        className
      )}
      role="alert"
      data-testid="allocation-warning-banner"
    >
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Total minimums exceed 100%
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          {message ||
            `Your total minimum allocations (${totalMinimums}%) exceed 100%. This configuration may be impossible to satisfy.`}
        </AlertDescription>
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
          onClick={handleDismiss}
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}

/**
 * Wrapper component that fetches validation data and displays the banner if needed
 */
interface AllocationWarningBannerWithDataProps {
  hasWarnings: boolean;
  warnings: Array<{
    type: string;
    message: string;
    totalMinimums: string;
  }>;
  className?: string;
}

export function AllocationWarningBannerWithData({
  hasWarnings,
  warnings,
  className,
}: AllocationWarningBannerWithDataProps) {
  if (!hasWarnings || warnings.length === 0) {
    return null;
  }

  // Show the first warning (typically the sum > 100% warning)
  const warning = warnings[0];

  if (!warning) {
    return null;
  }

  return (
    <AllocationWarningBanner
      totalMinimums={warning.totalMinimums}
      message={warning.message}
      {...(className ? { className } : {})}
    />
  );
}
