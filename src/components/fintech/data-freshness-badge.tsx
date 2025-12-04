"use client";

/**
 * DataFreshnessBadge Component
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.7: Data freshness indicator with color coding
 *
 * Shows when data was last updated with visual freshness indicators:
 * - Green: < 24 hours (fresh)
 * - Amber: 1-3 days (stale)
 * - Red: > 3 days (very stale)
 *
 * Features:
 * - Tooltip showing exact timestamp and source
 * - Optional refresh button (for Epic 6)
 */

import { useMemo } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataFreshnessBadgeProps {
  /** When the data was last updated */
  updatedAt: Date;
  /** Optional source of the data (e.g., "Yahoo Finance", "Mock Data") */
  source?: string;
  /** Optional click handler for refresh action */
  onClick?: () => void;
  /** Whether the refresh is in progress */
  isRefreshing?: boolean;
  /** Whether to show the refresh button (default: false for MVP) */
  showRefreshButton?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Freshness level based on age of data
 */
export type FreshnessLevel = "fresh" | "stale" | "very_stale";

/**
 * Calculate freshness level from timestamp
 *
 * - fresh: < 24 hours (green)
 * - stale: 1-3 days (amber)
 * - very_stale: > 3 days (red)
 */
export function getFreshnessLevel(updatedAt: Date): FreshnessLevel {
  const ageMs = Date.now() - updatedAt.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDays = 3 * oneDay;

  if (ageMs < oneDay) return "fresh";
  if (ageMs < threeDays) return "stale";
  return "very_stale";
}

/**
 * Get color classes for freshness level
 */
function getFreshnessColors(level: FreshnessLevel): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (level) {
    case "fresh":
      return {
        bg: "bg-green-500/10 hover:bg-green-500/20",
        text: "text-green-700 dark:text-green-400",
        icon: "text-green-600 dark:text-green-500",
      };
    case "stale":
      return {
        bg: "bg-amber-500/10 hover:bg-amber-500/20",
        text: "text-amber-700 dark:text-amber-400",
        icon: "text-amber-600 dark:text-amber-500",
      };
    case "very_stale":
      return {
        bg: "bg-red-500/10 hover:bg-red-500/20",
        text: "text-red-700 dark:text-red-400",
        icon: "text-red-600 dark:text-red-500",
      };
  }
}

/**
 * Format relative time for display
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  return "just now";
}

/**
 * Format exact timestamp for tooltip
 */
function formatExactTime(date: Date): string {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Get freshness label for display
 */
function getFreshnessLabel(level: FreshnessLevel): string {
  switch (level) {
    case "fresh":
      return "Fresh";
    case "stale":
      return "Stale";
    case "very_stale":
      return "Outdated";
  }
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
};

export function DataFreshnessBadge({
  updatedAt,
  source = "Data",
  onClick,
  isRefreshing = false,
  showRefreshButton = false,
  size = "sm",
  className,
}: DataFreshnessBadgeProps) {
  const freshnessLevel = useMemo(() => getFreshnessLevel(updatedAt), [updatedAt]);
  const colors = useMemo(() => getFreshnessColors(freshnessLevel), [freshnessLevel]);
  const relativeTime = useMemo(() => formatRelativeTime(updatedAt), [updatedAt]);
  const exactTime = useMemo(() => formatExactTime(updatedAt), [updatedAt]);
  const label = useMemo(() => getFreshnessLabel(freshnessLevel), [freshnessLevel]);

  const badgeContent = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-colors",
        colors.bg,
        colors.text,
        sizeClasses[size],
        showRefreshButton && onClick && "cursor-pointer",
        className
      )}
      data-testid="data-freshness-badge"
      data-freshness={freshnessLevel}
    >
      <Clock className={cn(colors.icon, iconSizes[size])} />
      <span className="font-medium">{relativeTime}</span>
      {showRefreshButton && onClick && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-4 w-4 p-0 ml-0.5", colors.text)}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          <span className="sr-only">Refresh data</span>
        </Button>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div className="font-semibold">{label}</div>
          <div>
            {source} updated: {exactTime}
          </div>
          {freshnessLevel !== "fresh" && (
            <div className="text-muted-foreground">
              {freshnessLevel === "stale"
                ? "Data may be slightly outdated"
                : "Data is significantly outdated"}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact version showing just an icon with tooltip
 * Useful for table cells where space is limited
 */
export function DataFreshnessIcon({
  updatedAt,
  source = "Data",
  className,
}: {
  updatedAt: Date;
  source?: string;
  className?: string;
}) {
  const freshnessLevel = useMemo(() => getFreshnessLevel(updatedAt), [updatedAt]);
  const colors = useMemo(() => getFreshnessColors(freshnessLevel), [freshnessLevel]);
  const exactTime = useMemo(() => formatExactTime(updatedAt), [updatedAt]);
  const label = useMemo(() => getFreshnessLabel(freshnessLevel), [freshnessLevel]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex items-center cursor-help", colors.text, className)}
          data-testid="data-freshness-icon"
          data-freshness={freshnessLevel}
        >
          <Clock className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div className="font-semibold">{label}</div>
          <div>
            {source} updated: {exactTime}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Re-export for convenience
 */
export { getFreshnessLevel as getDataFreshnessLevel };
