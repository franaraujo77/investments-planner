"use client";

/**
 * DataFreshnessBadge Component
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.2: Colors Based on Data Age
 * AC-6.7.3: Hover Shows Exact Timestamp and Source
 * AC-6.7.4: Click Triggers Refresh (Within Rate Limit)
 *
 * A badge component that displays data freshness with:
 * - Relative timestamp (e.g., "2h ago")
 * - Color-coded freshness indicator (green/amber/red)
 * - Tooltip with exact timestamp and source
 * - Optional click-to-refresh functionality
 *
 * @module @/components/data/data-freshness-badge
 */

import { useMemo } from "react";
import { Clock, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type FreshnessInfo,
  type FreshnessStatus,
  getFreshnessStatus,
  formatRelativeTime,
  formatExactTime,
  getFreshnessColorClasses,
  getFreshnessAriaLabel,
} from "@/lib/types/freshness";
import { getProviderDisplayName } from "@/lib/types/source-attribution";

// =============================================================================
// TYPES
// =============================================================================

export interface DataFreshnessBadgeProps {
  /** Freshness information (source, fetchedAt, isStale) */
  freshnessInfo: FreshnessInfo;
  /** Callback to trigger data refresh (optional) */
  onRefresh?: () => void;
  /** Whether to show data source in badge (default: false) */
  showSource?: boolean;
  /** Badge size variant */
  size?: "sm" | "default";
  /** Whether clicking the badge triggers refresh (default: false) */
  refreshable?: boolean;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
  /** Rate limit countdown message (shown when rate limited) */
  rateLimitMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

/**
 * Get the appropriate icon for freshness status
 *
 * AC-6.7.1: Use appropriate icon based on freshness state
 * - Clock for fresh data
 * - AlertCircle for stale data
 * - AlertTriangle for very stale data
 */
function FreshnessIcon({ status, className }: { status: FreshnessStatus; className?: string }) {
  switch (status) {
    case "fresh":
      return <Clock className={className} aria-hidden="true" />;
    case "stale":
      return <AlertCircle className={className} aria-hidden="true" />;
    case "very-stale":
      return <AlertTriangle className={className} aria-hidden="true" />;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * DataFreshnessBadge - displays data freshness with visual indicators
 *
 * AC-6.7.1: Shows timestamp and freshness indicator
 * AC-6.7.2: Color-coded based on data age (green/amber/red)
 * AC-6.7.3: Tooltip with exact timestamp and source
 * AC-6.7.4: Optional click-to-refresh with rate limit handling
 *
 * @example
 * ```tsx
 * // Basic usage
 * <DataFreshnessBadge
 *   freshnessInfo={{
 *     source: "Gemini API",
 *     fetchedAt: new Date("2025-12-10T12:00:00"),
 *     isStale: false,
 *   }}
 * />
 *
 * // With click-to-refresh
 * <DataFreshnessBadge
 *   freshnessInfo={freshnessInfo}
 *   refreshable
 *   onRefresh={handleRefresh}
 *   isRefreshing={isRefreshing}
 * />
 * ```
 */
export function DataFreshnessBadge({
  freshnessInfo,
  onRefresh,
  showSource = false,
  size = "default",
  refreshable = false,
  isRefreshing = false,
  rateLimitMessage,
  className,
}: DataFreshnessBadgeProps) {
  // Calculate freshness status and formatting
  const status = useMemo(
    () => getFreshnessStatus(freshnessInfo.fetchedAt),
    [freshnessInfo.fetchedAt]
  );

  const relativeTime = useMemo(
    () => formatRelativeTime(freshnessInfo.fetchedAt),
    [freshnessInfo.fetchedAt]
  );

  const exactTime = useMemo(
    () => formatExactTime(freshnessInfo.fetchedAt),
    [freshnessInfo.fetchedAt]
  );

  const colorClasses = useMemo(() => getFreshnessColorClasses(status), [status]);

  const ariaLabel = useMemo(
    () => getFreshnessAriaLabel(status, relativeTime),
    [status, relativeTime]
  );

  // Determine if clickable
  const isClickable = refreshable && !isRefreshing && !rateLimitMessage;

  // Handle click
  const handleClick = () => {
    if (isClickable && onRefresh) {
      onRefresh();
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && isClickable && onRefresh) {
      event.preventDefault();
      onRefresh();
    }
  };

  // Size classes
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  // Badge content
  const badgeContent = (
    <span
      role={refreshable ? "button" : undefined}
      tabIndex={refreshable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={
        refreshable
          ? `${ariaLabel}. ${rateLimitMessage ? rateLimitMessage : "Click to refresh"}`
          : ariaLabel
      }
      aria-busy={isRefreshing}
      aria-disabled={!!rateLimitMessage}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        sizeClasses,
        colorClasses.bg,
        colorClasses.text,
        colorClasses.border,
        refreshable && !isRefreshing && !rateLimitMessage && "cursor-pointer hover:opacity-80",
        refreshable && rateLimitMessage && "cursor-not-allowed opacity-60",
        isRefreshing && "cursor-wait",
        className
      )}
      data-testid="data-freshness-badge"
      data-status={status}
      data-refreshable={refreshable}
    >
      {/* Icon - spinner when refreshing */}
      {isRefreshing ? (
        <Loader2 className={cn(iconSize, "animate-spin")} aria-hidden="true" />
      ) : (
        <FreshnessIcon status={status} className={cn(iconSize, colorClasses.icon)} />
      )}

      {/* Relative time or rate limit message */}
      <span className="tabular-nums">{rateLimitMessage || relativeTime}</span>

      {/* Optional source display - AC-6.8.2: Use human-readable provider names */}
      {showSource && !rateLimitMessage && (
        <span className="text-muted-foreground ml-0.5">
          ({getProviderDisplayName(freshnessInfo.source)})
        </span>
      )}
    </span>
  );

  // Wrap in tooltip for hover info
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]" data-testid="data-freshness-tooltip">
        <div className="space-y-1">
          {/* AC-6.7.3: Exact timestamp */}
          <div className="font-medium">{exactTime}</div>
          {/* AC-6.7.3: Data source - AC-6.8.2: Use human-readable provider names */}
          <div className="text-muted-foreground text-[10px]">
            Source: {getProviderDisplayName(freshnessInfo.source)}
          </div>
          {/* Click instruction if refreshable */}
          {refreshable && !rateLimitMessage && (
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              Click to refresh
            </div>
          )}
          {/* Rate limit message */}
          {rateLimitMessage && (
            <div className="text-[10px] text-amber-500 pt-1 border-t border-border/50">
              {rateLimitMessage}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { FreshnessIcon };
export type { FreshnessStatus } from "@/lib/types/freshness";
