"use client";

/**
 * Incomplete Data Notice Component
 *
 * Story 4.6: Historical Surplus Scoring
 * AC-4.6.4: Incomplete Data Notice
 *
 * Displays a notice when dividend surplus data is missing or incomplete:
 * - Shows prominent warning when less than 5 years of data available
 * - Indicates how many years are missing
 * - Explains the impact on scoring (-2 points per missing year)
 *
 * This component should be shown alongside score displays when an asset
 * has incomplete surplus history data.
 */

import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  EXPECTED_YEARS_OF_DATA,
  PENALTY_PER_MISSING_YEAR,
} from "@/lib/calculations/surplus-scoring";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Display mode for incomplete data notice
 * - 'compact': Single-line inline notice
 * - 'detailed': Full alert card with title and description
 */
export type IncompleteDataDisplayMode = "compact" | "detailed";

export interface IncompleteDataNoticeProps {
  /** Years of data available */
  yearsOfData: number;
  /** Optional asset symbol for context */
  assetSymbol?: string;
  /** Optional additional class names */
  className?: string;
  /** Variant: warning (default) or info */
  variant?: "warning" | "info";
  /** Display mode: 'compact' for inline, 'detailed' for full alert */
  displayMode?: IncompleteDataDisplayMode;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate missing years and penalty
 */
function calculateMissingInfo(yearsOfData: number): {
  missingYears: number;
  totalPenalty: number;
  isComplete: boolean;
} {
  const missingYears = Math.max(0, EXPECTED_YEARS_OF_DATA - yearsOfData);
  const totalPenalty = missingYears * PENALTY_PER_MISSING_YEAR;
  const isComplete = missingYears === 0;

  return { missingYears, totalPenalty, isComplete };
}

/**
 * Get appropriate message based on missing years
 */
function getMessage(
  missingYears: number,
  totalPenalty: number,
  assetSymbol?: string
): { title: string; description: string } {
  const assetText = assetSymbol ? `${assetSymbol} has` : "This asset has";

  if (missingYears === 0) {
    return {
      title: "Complete Data Available",
      description: `${assetText} complete dividend history data for the past ${EXPECTED_YEARS_OF_DATA} years.`,
    };
  }

  if (missingYears === EXPECTED_YEARS_OF_DATA) {
    return {
      title: "No Dividend Data Available",
      description: `${assetText} no dividend history data available. This results in a ${totalPenalty} point penalty.`,
    };
  }

  return {
    title: "Incomplete Dividend Data",
    description: `${assetText} only ${EXPECTED_YEARS_OF_DATA - missingYears} of ${EXPECTED_YEARS_OF_DATA} years of dividend history available. ${missingYears} missing year${missingYears > 1 ? "s" : ""} result${missingYears === 1 ? "s" : ""} in a ${totalPenalty} point penalty.`,
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Incomplete data notice component
 *
 * AC-4.6.4: Displays notice when dividend data is incomplete
 */
export function IncompleteDataNotice({
  yearsOfData,
  assetSymbol,
  className,
  variant = "warning",
  displayMode = "detailed",
}: IncompleteDataNoticeProps) {
  const { missingYears, totalPenalty, isComplete } = calculateMissingInfo(yearsOfData);

  // Don't show anything if data is complete
  if (isComplete) {
    return null;
  }

  const { title, description } = getMessage(missingYears, totalPenalty, assetSymbol);
  const Icon = variant === "warning" ? AlertTriangle : Info;
  const alertVariant = variant === "warning" ? "destructive" : "default";

  if (displayMode === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm",
          variant === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          className
        )}
        role="status"
        aria-label="Incomplete data notice"
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>
          {missingYears} year{missingYears > 1 ? "s" : ""} missing ({totalPenalty} pts)
        </span>
      </div>
    );
  }

  return (
    <Alert variant={alertVariant} className={cn(className)}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

/**
 * Export helper for checking if notice should be shown
 */
export function shouldShowIncompleteDataNotice(yearsOfData: number): boolean {
  return yearsOfData < EXPECTED_YEARS_OF_DATA;
}
