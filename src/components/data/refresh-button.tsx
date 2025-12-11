"use client";

/**
 * Refresh Button Component
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Refresh Button Available on Dashboard and Portfolio
 * AC-6.6.2: Loading Spinner Shown During Refresh
 * AC-6.6.5: Rate Limit Exceeded Shows Countdown
 *
 * A button component for triggering data refresh with:
 * - Loading spinner during refresh
 * - Disabled state when rate limited
 * - Countdown display when rate limited
 * - Accessible with aria labels
 */

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataRefresh, type UseDataRefreshOptions } from "@/hooks/use-data-refresh";
import { cn } from "@/lib/utils";
import type { RefreshType } from "@/lib/validations/refresh-schemas";

// =============================================================================
// TYPES
// =============================================================================

export interface RefreshButtonProps {
  /** Type of data to refresh */
  type?: RefreshType;
  /** Specific symbols to refresh */
  symbols?: string[];
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  /** Button style variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Additional CSS classes */
  className?: string;
  /** Show text label (default: true for non-icon sizes) */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Callback when refresh starts */
  onRefreshStart?: () => void;
  /** Callback when refresh completes */
  onRefreshComplete?: (success: boolean) => void;
}

// =============================================================================
// RefreshButton COMPONENT
// =============================================================================

/**
 * RefreshButton Component
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Visible on Dashboard and Portfolio
 * AC-6.6.2: Shows loading spinner during refresh
 * AC-6.6.5: Shows countdown when rate limited
 *
 * @example
 * ```tsx
 * // Basic usage - refresh all data
 * <RefreshButton />
 *
 * // Refresh specific symbols
 * <RefreshButton type="prices" symbols={['PETR4', 'VALE3']} />
 *
 * // Icon-only variant
 * <RefreshButton size="icon" />
 *
 * // With custom label
 * <RefreshButton label="Update Prices" type="prices" />
 * ```
 */
export function RefreshButton({
  type = "all",
  symbols,
  size = "default",
  variant = "outline",
  className,
  showLabel,
  label,
  onRefreshStart,
  onRefreshComplete,
}: RefreshButtonProps) {
  const refreshOptions: UseDataRefreshOptions = {
    type,
    symbols,
  };

  const { refresh, isRefreshing, rateLimitStatus } = useDataRefresh(refreshOptions);

  // Determine if label should be shown
  const isIconSize = size === "icon" || size === "icon-sm" || size === "icon-lg";
  const shouldShowLabel = showLabel ?? !isIconSize;

  // Determine button text
  const getButtonText = () => {
    if (isRefreshing) {
      return "Refreshing...";
    }

    if (rateLimitStatus.isLimited && rateLimitStatus.countdownMinutes !== null) {
      return `${rateLimitStatus.countdownMinutes}m`;
    }

    return label ?? "Refresh Data";
  };

  // Determine aria-label for accessibility
  const getAriaLabel = () => {
    if (isRefreshing) {
      return "Data refresh in progress";
    }

    if (rateLimitStatus.isLimited && rateLimitStatus.countdownMinutes !== null) {
      return `Refresh rate limited. Available in ${rateLimitStatus.countdownMinutes} minutes`;
    }

    return label ?? "Refresh market data";
  };

  // Handle click
  const handleClick = async () => {
    onRefreshStart?.();
    const result = await refresh();
    onRefreshComplete?.(result !== null);
  };

  // Is button disabled
  const isDisabled = isRefreshing || rateLimitStatus.isLimited;

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", rateLimitStatus.isLimited && !isRefreshing && "opacity-70", className)}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={getAriaLabel()}
      aria-busy={isRefreshing}
    >
      {/* Icon - spinner when refreshing, refresh icon otherwise */}
      {isRefreshing ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw
          className={cn("size-4", rateLimitStatus.isLimited && "opacity-50")}
          aria-hidden="true"
        />
      )}

      {/* Label text - conditionally shown */}
      {shouldShowLabel && (
        <span className={cn(rateLimitStatus.isLimited && !isRefreshing && "text-muted-foreground")}>
          {getButtonText()}
        </span>
      )}

      {/* Screen reader status */}
      <span className="sr-only">
        {rateLimitStatus.remaining > 0 && !rateLimitStatus.isLimited
          ? `${rateLimitStatus.remaining} refreshes remaining this hour`
          : ""}
      </span>
    </Button>
  );
}

/**
 * RefreshIconButton - Compact icon-only variant
 *
 * Convenience component for icon-only refresh buttons.
 */
export function RefreshIconButton(props: Omit<RefreshButtonProps, "size" | "showLabel">) {
  return <RefreshButton {...props} size="icon" showLabel={false} />;
}
