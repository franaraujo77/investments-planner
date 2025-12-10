"use client";

/**
 * UnscoredIndicator Component
 *
 * Story 5.10: View Asset Score
 * AC-5.10.3: Unscored Asset Indicator
 *
 * Displays when an asset has no calculated score:
 * - Shows "Not scored" indicator instead of score badge
 * - Explains why (e.g., "No criteria configured for this market")
 * - Clicking shows option to configure criteria
 *
 * Reason codes:
 * - NO_CRITERIA: No criteria configured for asset's market
 * - MISSING_FUNDAMENTALS: Asset missing required fundamentals data
 * - NOT_CALCULATED: Scoring job hasn't run yet
 */

import { useMemo } from "react";
import { HelpCircle, AlertCircle, Settings, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type UnscoredReasonCode = "NO_CRITERIA" | "MISSING_FUNDAMENTALS" | "NOT_CALCULATED";

export interface UnscoredReason {
  code: UnscoredReasonCode;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export interface UnscoredIndicatorProps {
  /** Reason why asset is not scored */
  reason?: UnscoredReason;
  /** Asset ID for actions */
  assetId: string;
  /** Size variant (matches ScoreBadge sizes) */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Click handler (alternative to actionHref) */
  onClick?: () => void;
}

// =============================================================================
// REASON DEFINITIONS
// =============================================================================

/**
 * Default reason messages and actions
 */
export function getDefaultReason(code: UnscoredReasonCode): UnscoredReason {
  switch (code) {
    case "NO_CRITERIA":
      return {
        code,
        message: "No scoring criteria configured for this market",
        actionHref: "/criteria",
        actionLabel: "Configure criteria",
      };
    case "MISSING_FUNDAMENTALS":
      return {
        code,
        message: "Missing required data to calculate score",
        actionLabel: "View details",
      };
    case "NOT_CALCULATED":
      return {
        code,
        message: "Score calculation pending",
        actionLabel: "Check back later",
      };
  }
}

/**
 * Get icon for reason code
 */
function getReasonIcon(code: UnscoredReasonCode, className: string) {
  switch (code) {
    case "NO_CRITERIA":
      return <Settings className={className} aria-hidden="true" />;
    case "MISSING_FUNDAMENTALS":
      return <AlertCircle className={className} aria-hidden="true" />;
    case "NOT_CALCULATED":
      return <Clock className={className} aria-hidden="true" />;
    default:
      return <HelpCircle className={className} aria-hidden="true" />;
  }
}

// =============================================================================
// SIZE CLASSES (Matches ScoreBadge)
// =============================================================================

const sizeClasses = {
  sm: {
    badge: "text-xs px-1.5 py-0.5",
    icon: "h-3 w-3",
  },
  md: {
    badge: "text-sm px-2 py-1",
    icon: "h-3.5 w-3.5",
  },
  lg: {
    badge: "text-base px-3 py-1.5",
    icon: "h-4 w-4",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function UnscoredIndicator({
  reason,
  assetId,
  size = "md",
  className,
  onClick,
}: UnscoredIndicatorProps) {
  // Use default reason if not provided
  const effectiveReason = useMemo(() => reason ?? getDefaultReason("NOT_CALCULATED"), [reason]);

  const hasAction = effectiveReason.actionHref || onClick;

  const indicatorContent = (
    <div
      role={hasAction ? "button" : undefined}
      tabIndex={hasAction ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (hasAction && onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
        "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
        hasAction && "hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer",
        sizeClasses[size].badge,
        className
      )}
      data-testid="unscored-indicator"
      data-reason={effectiveReason.code}
      data-asset-id={assetId}
      aria-label={`Not scored: ${effectiveReason.message}`}
    >
      {getReasonIcon(effectiveReason.code, sizeClasses[size].icon)}
      <span>Not scored</span>
    </div>
  );

  // Wrap with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{indicatorContent}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <UnscoredTooltipContent reason={effectiveReason} />
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// TOOLTIP CONTENT
// =============================================================================

interface UnscoredTooltipContentProps {
  reason: UnscoredReason;
}

function UnscoredTooltipContent({ reason }: UnscoredTooltipContentProps) {
  return (
    <div className="space-y-2 text-xs">
      {/* Reason message */}
      <div className="flex items-start gap-1.5">
        {getReasonIcon(reason.code, "h-3.5 w-3.5 mt-0.5 flex-shrink-0")}
        <span>{reason.message}</span>
      </div>

      {/* Action link if available */}
      {reason.actionHref && (
        <Link
          href={reason.actionHref}
          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
        >
          <Settings className="h-3 w-3" aria-hidden="true" />
          {reason.actionLabel ?? "Configure"}
        </Link>
      )}

      {/* Non-link action hint */}
      {!reason.actionHref && reason.actionLabel && (
        <div className="text-muted-foreground">{reason.actionLabel}</div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { UnscoredTooltipContent };
