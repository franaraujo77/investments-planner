"use client";

/**
 * ScoreBadge Component
 *
 * Story 5.10: View Asset Score
 * AC-5.10.1: Score Badge Display
 * AC-5.10.4: Score Freshness Timestamp
 *
 * Displays asset scores with color-coded badges:
 * - Green: Score >= 80 (high)
 * - Amber: Score 50-79 (medium)
 * - Red: Score < 50 (low)
 *
 * Features:
 * - Size variants (sm, md, lg)
 * - Freshness indicator based on calculatedAt
 * - Tooltip with score details and summary
 * - Click handler for opening breakdown panel
 * - Warning icon for stale scores (>7 days)
 */

import { useMemo } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type ScoreLevel = "high" | "medium" | "low";
export type ScoreFreshnessLevel = "fresh" | "stale" | "very_stale" | "warning";

export interface ScoreBadgeProps {
  /** Score value (0-100 scale, can be decimal) */
  score: number | string;
  /** When the score was calculated */
  calculatedAt?: Date | undefined;
  /** Summary of criteria matched (for tooltip) */
  criteriaMatched?: { matched: number; total: number } | undefined;
  /** Asset ID for breakdown navigation */
  assetId: string;
  /** Click handler (opens breakdown panel) */
  onClick?: (() => void) | undefined;
  /** Size variant */
  size?: "sm" | "md" | "lg" | undefined;
  /** Additional CSS classes */
  className?: string | undefined;
  /** Whether the badge is interactive (clickable) */
  interactive?: boolean | undefined;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get score level based on value
 *
 * AC-5.10.1: Color thresholds
 * - green (80+): high score
 * - amber (50-79): medium score
 * - red (<50): low score
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/**
 * Get freshness level based on calculatedAt timestamp
 *
 * AC-5.10.4: Freshness thresholds
 * - fresh: < 24 hours (green)
 * - stale: 1-3 days (amber)
 * - very_stale: > 3 days (red)
 * - warning: > 7 days (shows warning icon)
 */
export function getScoreFreshnessLevel(calculatedAt: Date): ScoreFreshnessLevel {
  const ageMs = Date.now() - calculatedAt.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDays = 3 * oneDay;
  const sevenDays = 7 * oneDay;

  if (ageMs >= sevenDays) return "warning";
  if (ageMs >= threeDays) return "very_stale";
  if (ageMs >= oneDay) return "stale";
  return "fresh";
}

/**
 * Get color classes for score level
 */
function getScoreColors(level: ScoreLevel): {
  bg: string;
  text: string;
  hover: string;
} {
  switch (level) {
    case "high":
      return {
        bg: "bg-green-500",
        text: "text-white",
        hover: "hover:bg-green-600",
      };
    case "medium":
      return {
        bg: "bg-amber-500",
        text: "text-white",
        hover: "hover:bg-amber-600",
      };
    case "low":
      return {
        bg: "bg-red-500",
        text: "text-white",
        hover: "hover:bg-red-600",
      };
  }
}

/**
 * Get freshness indicator classes
 */
function getFreshnessIndicatorClasses(level: ScoreFreshnessLevel): string {
  switch (level) {
    case "fresh":
      return "border-green-400";
    case "stale":
      return "border-amber-400";
    case "very_stale":
    case "warning":
      return "border-red-400";
  }
}

/**
 * Format relative time for tooltip display
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
 * Normalize score to integer for display
 *
 * AC-5.10.1: Scores display as integers (0-100 scale)
 */
export function normalizeScore(score: number | string): number {
  const numericScore = typeof score === "string" ? parseFloat(score) : score;
  return Math.round(numericScore);
}

// =============================================================================
// SIZE CLASSES
// =============================================================================

const sizeClasses = {
  sm: {
    badge: "text-xs px-1.5 py-0.5 min-w-[28px]",
    icon: "h-2.5 w-2.5",
    ring: "ring-1",
  },
  md: {
    badge: "text-sm px-2 py-1 min-w-[36px]",
    icon: "h-3 w-3",
    ring: "ring-2",
  },
  lg: {
    badge: "text-base px-3 py-1.5 min-w-[44px]",
    icon: "h-4 w-4",
    ring: "ring-2",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ScoreBadge({
  score,
  calculatedAt,
  criteriaMatched,
  assetId,
  onClick,
  size = "md",
  className,
  interactive = true,
}: ScoreBadgeProps) {
  const displayScore = useMemo(() => normalizeScore(score), [score]);
  const scoreLevel = useMemo(() => getScoreLevel(displayScore), [displayScore]);
  const colors = useMemo(() => getScoreColors(scoreLevel), [scoreLevel]);

  const freshnessLevel = useMemo(
    () => (calculatedAt ? getScoreFreshnessLevel(calculatedAt) : null),
    [calculatedAt]
  );
  const freshnessClasses = useMemo(
    () => (freshnessLevel ? getFreshnessIndicatorClasses(freshnessLevel) : ""),
    [freshnessLevel]
  );

  const relativeTime = useMemo(
    () => (calculatedAt ? formatRelativeTime(calculatedAt) : null),
    [calculatedAt]
  );

  const showWarningIcon = freshnessLevel === "warning";

  const badgeContent = (
    <div
      role="button"
      tabIndex={interactive && onClick ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={(e) => {
        if (interactive && onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full font-semibold transition-colors",
        colors.bg,
        colors.text,
        interactive && onClick && colors.hover,
        interactive && onClick && "cursor-pointer",
        sizeClasses[size].badge,
        // Freshness indicator ring
        freshnessLevel &&
          freshnessClasses &&
          `ring-offset-1 ${sizeClasses[size].ring} ${freshnessClasses}`,
        className
      )}
      data-testid="score-badge"
      data-score={displayScore}
      data-level={scoreLevel}
      data-freshness={freshnessLevel}
      data-asset-id={assetId}
      aria-label={`Score ${displayScore} out of 100${relativeTime ? `, calculated ${relativeTime}` : ""}`}
    >
      {showWarningIcon && (
        <AlertTriangle className={cn(sizeClasses[size].icon, "flex-shrink-0")} aria-hidden="true" />
      )}
      <span>{displayScore}</span>
    </div>
  );

  // If no tooltip data, just render the badge
  if (!calculatedAt && !criteriaMatched) {
    return badgeContent;
  }

  // Wrap with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <ScoreTooltipContent
          score={displayScore}
          calculatedAt={calculatedAt}
          criteriaMatched={criteriaMatched}
          freshnessLevel={freshnessLevel}
          hasOnClick={!!onClick}
        />
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// TOOLTIP CONTENT (Inline for Story 5.10.2)
// =============================================================================

interface ScoreTooltipContentProps {
  score: number;
  calculatedAt?: Date | undefined;
  criteriaMatched?: { matched: number; total: number } | undefined;
  freshnessLevel: ScoreFreshnessLevel | null;
  hasOnClick?: boolean | undefined;
}

/**
 * ScoreTooltipContent Component
 *
 * AC-5.10.2: Score Tooltip with Preview
 * - Shows "Score: 87 - Click for breakdown"
 * - Includes score freshness timestamp
 * - Shows brief summary (e.g., "5/8 criteria matched")
 */
function ScoreTooltipContent({
  score,
  calculatedAt,
  criteriaMatched,
  freshnessLevel,
  hasOnClick,
}: ScoreTooltipContentProps) {
  const relativeTime = calculatedAt ? formatRelativeTime(calculatedAt) : null;

  return (
    <div className="space-y-1.5 text-xs">
      {/* Score with hint */}
      <div className="flex items-center gap-1.5 font-medium">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Score: {score}</span>
        {hasOnClick && <span className="text-muted-foreground">- Click for breakdown</span>}
      </div>

      {/* Criteria summary */}
      {criteriaMatched && (
        <div className="text-muted-foreground">
          {criteriaMatched.matched}/{criteriaMatched.total} criteria matched
        </div>
      )}

      {/* Freshness timestamp */}
      {relativeTime && (
        <div
          className={cn(
            "text-muted-foreground",
            freshnessLevel === "warning" && "text-red-500",
            freshnessLevel === "very_stale" && "text-amber-600"
          )}
        >
          Calculated {relativeTime}
          {freshnessLevel === "warning" && " (stale)"}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ScoreTooltipContent };
