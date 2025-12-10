"use client";

/**
 * Points Badge Component
 *
 * Story 5.1: Define Scoring Criteria
 *
 * AC-5.1.5: Points validation display
 * - Positive points display with green indicator
 * - Negative points display with red indicator
 * - Shows tooltip with point impact
 *
 * Displays scoring points with color-coded indication.
 */

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { POINTS_MIN, POINTS_MAX } from "@/lib/validations/criteria-schemas";

interface PointsBadgeProps {
  /** Points value (-100 to +100) */
  points: number;
  /** Optional additional class names */
  className?: string;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * Get the status of the points
 */
function getStatus(points: number): "positive" | "negative" | "neutral" {
  if (points > 0) return "positive";
  if (points < 0) return "negative";
  return "neutral";
}

/**
 * Format points for display with +/- prefix
 */
function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return String(points);
}

/**
 * Get tooltip text explaining the point impact
 */
function getTooltipText(points: number): string {
  if (points > 0) {
    return `Awards ${points} point${points !== 1 ? "s" : ""} when criterion is met`;
  }
  if (points < 0) {
    return `Deducts ${Math.abs(points)} point${Math.abs(points) !== 1 ? "s" : ""} when criterion is met`;
  }
  return "No points awarded or deducted";
}

/**
 * Get status-based styling
 */
function getStatusStyles(status: "positive" | "negative" | "neutral"): string {
  switch (status) {
    case "positive":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "negative":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "neutral":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

/**
 * Get size-based styling
 */
function getSizeStyles(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "px-1.5 py-0.5 text-xs";
    case "md":
      return "px-2 py-0.5 text-sm";
    case "lg":
      return "px-2.5 py-1 text-base";
  }
}

/**
 * Get icon size based on size variant
 */
function getIconSize(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "h-3 w-3";
    case "md":
      return "h-3.5 w-3.5";
    case "lg":
      return "h-4 w-4";
  }
}

/**
 * Get the appropriate icon component
 */
function getIcon(status: "positive" | "negative" | "neutral", iconSize: string) {
  switch (status) {
    case "positive":
      return <TrendingUp className={iconSize} />;
    case "negative":
      return <TrendingDown className={iconSize} />;
    case "neutral":
      return <Minus className={iconSize} />;
  }
}

export function PointsBadge({ points, className, showIcon = true, size = "md" }: PointsBadgeProps) {
  // Validate points range
  const validPoints = Math.max(POINTS_MIN, Math.min(POINTS_MAX, points));

  const status = getStatus(validPoints);
  const displayText = formatPoints(validPoints);
  const tooltipText = getTooltipText(validPoints);
  const statusStyles = getStatusStyles(status);
  const sizeStyles = getSizeStyles(size);
  const iconSize = getIconSize(size);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full font-medium",
              statusStyles,
              sizeStyles,
              className
            )}
            role="status"
            aria-label={tooltipText}
          >
            {showIcon && getIcon(status, iconSize)}
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
