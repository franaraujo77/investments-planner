"use client";

/**
 * ScoreBreakdown Component
 *
 * Story 5.11: Score Breakdown View
 *
 * Slide-over panel showing detailed score breakdown for an asset.
 * Opens when user clicks on a ScoreBadge.
 *
 * AC-5.11.1: Breakdown Panel Opens on Score Click
 * AC-5.11.2: Overall Score Display
 * AC-5.11.3: Criterion-by-Criterion Breakdown
 * AC-5.11.4: Visual Bar Chart of Point Contributions
 * AC-5.11.5: Skipped Criteria Display
 * AC-5.11.6: Edit Criteria Link
 * AC-5.11.7: Calculation History Link
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  History,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getScoreLevel, type ScoreLevel } from "@/components/fintech/score-badge";
import type { CriterionResult } from "@/hooks/use-asset-score";

// =============================================================================
// TYPES
// =============================================================================

export interface ScoreBreakdownProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Asset ID for the breakdown */
  assetId: string;
  /** Asset symbol for display */
  symbol: string;
  /** Asset name for display (optional) */
  name?: string | undefined;
  /** Overall score value */
  score: number | string;
  /** Criterion breakdown data */
  breakdown: CriterionResult[];
  /** When the score was calculated */
  calculatedAt: Date;
  /** Criteria version ID (for edit link) */
  criteriaVersionId: string;
  /** Target market (for edit link navigation) */
  targetMarket?: string | undefined;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get color classes for score level (matching ScoreBadge)
 */
function getScoreColorClasses(level: ScoreLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case "high":
      return {
        bg: "bg-green-500",
        text: "text-green-500",
        border: "border-green-500",
      };
    case "medium":
      return {
        bg: "bg-amber-500",
        text: "text-amber-500",
        border: "border-amber-500",
      };
    case "low":
      return {
        bg: "bg-red-500",
        text: "text-red-500",
        border: "border-red-500",
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
 * Normalize score to integer for display
 */
function normalizeScore(score: number | string): number {
  const numericScore = typeof score === "string" ? parseFloat(score) : score;
  return Math.round(numericScore);
}

/**
 * Format the human-readable skip reason
 */
function formatSkipReason(reason: string | null): string {
  if (!reason) return "Unknown reason";

  switch (reason) {
    case "missing_fundamental":
      return "Missing data";
    case "data_stale":
      return "Stale data";
    default:
      return reason.replace(/_/g, " ");
  }
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

/**
 * CriterionResultRow - displays a single criterion result
 *
 * AC-5.11.3: Shows name, condition, points awarded, pass/fail indicator, actual value
 */
interface CriterionResultRowProps {
  criterion: CriterionResult;
  isSkipped: boolean;
}

function CriterionResultRow({ criterion, isSkipped }: CriterionResultRowProps) {
  const pointsColorClass =
    criterion.pointsAwarded > 0
      ? "text-green-600"
      : criterion.pointsAwarded < 0
        ? "text-red-600"
        : "text-muted-foreground";

  if (isSkipped) {
    return (
      <div
        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md opacity-60"
        data-testid="criterion-row-skipped"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-muted-foreground truncate">{criterion.criterionName}</span>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          Skipped
        </Badge>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md"
      data-testid="criterion-row"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {criterion.matched ? (
          <Check className="h-4 w-4 text-green-500 flex-shrink-0" aria-label="Passed" />
        ) : (
          <X className="h-4 w-4 text-red-500 flex-shrink-0" aria-label="Failed" />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium truncate block">{criterion.criterionName}</span>
          {criterion.actualValue && (
            <span className="text-xs text-muted-foreground">Actual: {criterion.actualValue}</span>
          )}
        </div>
      </div>
      <div
        className={cn("text-sm font-semibold tabular-nums flex-shrink-0 ml-2", pointsColorClass)}
      >
        {criterion.pointsAwarded > 0 ? "+" : ""}
        {criterion.pointsAwarded} pts
      </div>
    </div>
  );
}

/**
 * PointsContributionChart - horizontal bar chart of point contributions
 *
 * AC-5.11.4: Visual Bar Chart of Point Contributions
 * - Positive points: green bars (right)
 * - Negative points: red bars (left)
 */
interface PointsContributionChartProps {
  breakdown: CriterionResult[];
  totalScore: number;
}

function PointsContributionChart({ breakdown, totalScore }: PointsContributionChartProps) {
  // Filter out skipped criteria and prepare chart data
  const chartData = useMemo(() => {
    return breakdown
      .filter((c) => !c.skippedReason)
      .filter((c) => c.pointsAwarded !== 0)
      .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
      .slice(0, 10) // Show top 10 contributors
      .map((c) => ({
        name: c.criterionName.length > 20 ? c.criterionName.slice(0, 17) + "..." : c.criterionName,
        fullName: c.criterionName,
        points: c.pointsAwarded,
        fill: c.pointsAwarded >= 0 ? "#22c55e" : "#ef4444",
      }));
  }, [breakdown]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No point contributions to display
      </div>
    );
  }

  // Calculate domain for x-axis to center around 0
  const maxAbsPoints = Math.max(
    ...chartData.map((d) => Math.abs(d.points)),
    Math.abs(totalScore) / 2
  );
  const domain = [-maxAbsPoints * 1.2, maxAbsPoints * 1.2];

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
      >
        <XAxis
          type="number"
          domain={domain}
          tickFormatter={(value) => `${value > 0 ? "+" : ""}${value}`}
          tick={{ fontSize: 11 }}
        />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number) => [`${value > 0 ? "+" : ""}${value} pts`, "Points"]}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
        />
        <ReferenceLine x={0} stroke="#888" strokeDasharray="3 3" />
        <Bar dataKey="points" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * SkippedCriteriaSection - collapsible section for skipped criteria
 *
 * AC-5.11.5: Skipped Criteria Display
 */
interface SkippedCriteriaSectionProps {
  skippedCriteria: CriterionResult[];
}

function SkippedCriteriaSection({ skippedCriteria }: SkippedCriteriaSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (skippedCriteria.length === 0) {
    return null;
  }

  // Show first 3 by default, rest when expanded
  const showCollapse = skippedCriteria.length > 3;
  const displayedCriteria = isExpanded ? skippedCriteria : skippedCriteria.slice(0, 3);

  return (
    <div className="space-y-2" data-testid="skipped-criteria-section">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Skipped Criteria ({skippedCriteria.length})
        </h4>
        {showCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-xs"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Show all <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        {displayedCriteria.map((criterion) => (
          <div
            key={criterion.criterionId}
            className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded text-sm"
            data-testid="skipped-criterion"
          >
            <span className="text-muted-foreground truncate flex-1">{criterion.criterionName}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {formatSkipReason(criterion.skippedReason)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ScoreBreakdown - slide-over panel showing detailed score breakdown
 *
 * AC-5.11.1: Opens as Sheet on score click
 * AC-5.11.2: Shows overall score prominently with color coding
 * AC-5.11.3: Shows criterion-by-criterion breakdown
 * AC-5.11.4: Includes bar chart visualization
 * AC-5.11.5: Shows skipped criteria with reasons
 * AC-5.11.6: Edit Criteria link
 * AC-5.11.7: Calculation History link (placeholder)
 */
export function ScoreBreakdown({
  open,
  onOpenChange,
  assetId,
  symbol,
  name,
  score,
  breakdown,
  calculatedAt,
  criteriaVersionId,
  targetMarket,
}: ScoreBreakdownProps) {
  const displayScore = useMemo(() => normalizeScore(score), [score]);
  const scoreLevel = useMemo(() => getScoreLevel(displayScore), [displayScore]);
  const scoreColors = useMemo(() => getScoreColorClasses(scoreLevel), [scoreLevel]);
  const relativeTime = useMemo(() => formatRelativeTime(calculatedAt), [calculatedAt]);

  // Separate matched/unmatched and skipped criteria
  const { evaluatedCriteria, skippedCriteria } = useMemo(() => {
    const evaluated: CriterionResult[] = [];
    const skipped: CriterionResult[] = [];

    for (const c of breakdown) {
      if (c.skippedReason) {
        skipped.push(c);
      } else {
        evaluated.push(c);
      }
    }

    // Sort evaluated by absolute points impact (highest first)
    evaluated.sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded));

    return { evaluatedCriteria: evaluated, skippedCriteria: skipped };
  }, [breakdown]);

  // Calculate summary stats
  const matchedCount = evaluatedCriteria.filter((c) => c.matched).length;
  const totalEvaluated = evaluatedCriteria.length;

  // Build edit criteria URL with market filter if available
  const editCriteriaUrl = targetMarket
    ? `/criteria?market=${encodeURIComponent(targetMarket)}`
    : "/criteria";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="score-breakdown-panel"
      >
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
                <span>{symbol}</span>
              </SheetTitle>
              {name && <SheetDescription className="text-sm">{name}</SheetDescription>}
            </div>
            {/* AC-5.11.2: Overall score prominently displayed */}
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 rounded-full text-white text-2xl font-bold",
                scoreColors.bg
              )}
              data-testid="score-display"
              data-score={displayScore}
              aria-label={`Score: ${displayScore} out of 100`}
            >
              {displayScore}
            </div>
          </div>

          {/* AC-5.11.2: Data freshness timestamp */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
            <span>
              {matchedCount}/{totalEvaluated} criteria matched
            </span>
            <span data-testid="freshness-timestamp">Calculated {relativeTime}</span>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* AC-5.11.4: Bar Chart Visualization */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Point Contributions</h3>
          <PointsContributionChart breakdown={breakdown} totalScore={displayScore} />
        </div>

        <Separator className="my-4" />

        {/* AC-5.11.3: Criterion-by-Criterion Breakdown */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Criteria Breakdown</h3>
          <div className="space-y-1.5">
            {evaluatedCriteria.map((criterion) => (
              <CriterionResultRow
                key={criterion.criterionId}
                criterion={criterion}
                isSkipped={false}
              />
            ))}
          </div>
        </div>

        {/* AC-5.11.5: Skipped Criteria Section */}
        {skippedCriteria.length > 0 && (
          <>
            <Separator className="my-4" />
            <SkippedCriteriaSection skippedCriteria={skippedCriteria} />
          </>
        )}

        <Separator className="my-4" />

        {/* AC-5.11.6 & AC-5.11.7: Navigation Links */}
        <div className="space-y-2">
          {/* AC-5.11.6: Edit Criteria Link */}
          <Button
            variant="outline"
            className="w-full justify-start"
            asChild
            data-testid="edit-criteria-link"
          >
            <Link href={editCriteriaUrl}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Criteria
            </Link>
          </Button>

          {/* AC-5.11.7: Calculation History Link (placeholder) */}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            disabled
            data-testid="history-link"
          >
            <History className="mr-2 h-4 w-4" />
            View calculation history
            <Badge variant="secondary" className="ml-auto text-xs">
              Coming soon
            </Badge>
          </Button>
        </div>

        {/* Debug info for development */}
        <div className="mt-4 text-xs text-muted-foreground hidden">
          <div>Asset ID: {assetId}</div>
          <div>Criteria Version: {criteriaVersionId}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  CriterionResultRow,
  PointsContributionChart,
  SkippedCriteriaSection,
  formatRelativeTime,
  getScoreColorClasses,
};
