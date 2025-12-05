"use client";

/**
 * Subclass Allocation Warning Component
 *
 * Story 4.4: Set Allocation Ranges for Subclasses
 *
 * AC-4.4.2: Warning when subclass max exceeds parent class max
 * AC-4.4.3: Warning when sum of subclass minimums exceeds parent max
 *
 * Displays warning banners when subclass allocations conflict with
 * parent class constraints. These are non-blocking warnings
 * (configuration can still be saved).
 */

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubclassAllocationWarning {
  type: "SUBCLASS_EXCEEDS_PARENT_MAX" | "SUBCLASS_SUM_EXCEEDS_PARENT_MAX";
  message: string;
  subclassId?: string;
  subclassName?: string;
  totalMinimums?: string;
  parentMax?: string;
}

interface SubclassAllocationWarningProps {
  warnings: SubclassAllocationWarning[];
  className?: string | undefined;
  dismissible?: boolean;
}

export function SubclassAllocationWarningBanner({
  warnings,
  className,
  dismissible = true,
}: SubclassAllocationWarningProps) {
  const [dismissedTypes, setDismissedTypes] = useState<Set<string>>(new Set());

  if (!warnings || warnings.length === 0) {
    return null;
  }

  // Filter out dismissed warnings
  const visibleWarnings = warnings.filter(
    (w) => !dismissedTypes.has(w.type + (w.subclassId || ""))
  );

  if (visibleWarnings.length === 0) {
    return null;
  }

  const handleDismiss = (warning: SubclassAllocationWarning) => {
    setDismissedTypes((prev) => {
      const newSet = new Set(prev);
      newSet.add(warning.type + (warning.subclassId || ""));
      return newSet;
    });
  };

  // Group warnings by type for cleaner display
  const subclassExceedsWarnings = visibleWarnings.filter(
    (w) => w.type === "SUBCLASS_EXCEEDS_PARENT_MAX"
  );
  const sumExceedsWarning = visibleWarnings.find(
    (w) => w.type === "SUBCLASS_SUM_EXCEEDS_PARENT_MAX"
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Sum of minimums exceeds parent max warning */}
      {sumExceedsWarning && (
        <Alert
          variant="default"
          className={cn(
            "relative border-amber-500 bg-amber-50 dark:bg-amber-950/20",
            "[&>svg]:text-amber-600"
          )}
          role="alert"
          data-testid="subclass-sum-warning"
        >
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Subclass minimums exceed parent maximum
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {sumExceedsWarning.message}
            </AlertDescription>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
              onClick={() => handleDismiss(sumExceedsWarning)}
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </Alert>
      )}

      {/* Individual subclass exceeds parent max warnings */}
      {subclassExceedsWarnings.length > 0 && (
        <Alert
          variant="default"
          className={cn(
            "relative border-amber-500 bg-amber-50 dark:bg-amber-950/20",
            "[&>svg]:text-amber-600"
          )}
          role="alert"
          data-testid="subclass-exceeds-warning"
        >
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Subclass range exceeds parent maximum
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {subclassExceedsWarnings.length === 1 ? (
                subclassExceedsWarnings[0]?.message
              ) : (
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  {subclassExceedsWarnings.map((w, i) => (
                    <li key={w.subclassId || i}>{w.message}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
              onClick={() => subclassExceedsWarnings.forEach(handleDismiss)}
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </Alert>
      )}
    </div>
  );
}

/**
 * Wrapper component that receives validation data and displays warnings
 */
interface SubclassAllocationWarningWithDataProps {
  hasWarnings: boolean;
  warnings: SubclassAllocationWarning[];
  className?: string;
}

export function SubclassAllocationWarningWithData({
  hasWarnings,
  warnings,
  className,
}: SubclassAllocationWarningWithDataProps) {
  if (!hasWarnings || !warnings || warnings.length === 0) {
    return null;
  }

  return <SubclassAllocationWarningBanner warnings={warnings} className={className} />;
}
