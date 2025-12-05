"use client";

/**
 * Asset Count Badge Component
 *
 * Story 4.5: Set Asset Count Limits
 *
 * AC-4.5.2: Display warning when asset count exceeds limit
 * AC-4.5.4: Asset count display for classes
 * AC-4.5.5: Asset count display for subclasses
 *
 * Displays current asset count vs max limit with color-coded status.
 * Shows tooltip with explanation on hover.
 */

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package } from "lucide-react";

interface AssetCountBadgeProps {
  /** Current number of assets */
  currentCount: number;
  /** Maximum allowed assets (null or 0 = no limit) */
  maxAssets: number | null;
  /** Optional additional class names */
  className?: string;
  /** Whether to show the badge even when there's no limit */
  showWhenNoLimit?: boolean;
}

/**
 * Get the status of the asset count
 */
function getStatus(
  currentCount: number,
  maxAssets: number | null
): "no-limit" | "under" | "at" | "over" {
  // No limit set
  if (maxAssets === null || maxAssets === 0) {
    return "no-limit";
  }

  if (currentCount > maxAssets) {
    return "over";
  }

  if (currentCount === maxAssets) {
    return "at";
  }

  return "under";
}

/**
 * Get display text
 */
function getDisplayText(currentCount: number, maxAssets: number | null): string {
  if (maxAssets === null || maxAssets === 0) {
    return `${currentCount} assets`;
  }
  return `${currentCount}/${maxAssets} assets`;
}

/**
 * Get tooltip text
 */
function getTooltipText(
  currentCount: number,
  maxAssets: number | null,
  status: "no-limit" | "under" | "at" | "over"
): string {
  switch (status) {
    case "no-limit":
      return `${currentCount} asset${currentCount !== 1 ? "s" : ""} - no limit set`;
    case "under":
      return `${currentCount} of ${maxAssets} assets (${maxAssets! - currentCount} remaining)`;
    case "at":
      return `At capacity: ${currentCount} of ${maxAssets} assets`;
    case "over":
      return `Over limit: ${currentCount} assets (limit is ${maxAssets})`;
  }
}

/**
 * Get status-based styling
 */
function getStatusStyles(status: "no-limit" | "under" | "at" | "over"): string {
  switch (status) {
    case "no-limit":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "under":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "at":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "over":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
}

export function AssetCountBadge({
  currentCount,
  maxAssets,
  className,
  showWhenNoLimit = false,
}: AssetCountBadgeProps) {
  const status = getStatus(currentCount, maxAssets);

  // Don't show if no limit and showWhenNoLimit is false
  if (status === "no-limit" && !showWhenNoLimit) {
    return null;
  }

  const displayText = getDisplayText(currentCount, maxAssets);
  const tooltipText = getTooltipText(currentCount, maxAssets, status);
  const statusStyles = getStatusStyles(status);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              statusStyles,
              className
            )}
            role="status"
            aria-label={tooltipText}
          >
            <Package className="h-3 w-3" />
            <span>{displayText}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
