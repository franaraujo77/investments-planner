"use client";

/**
 * RecommendationDetailsPanel Component
 *
 * Story 6.4: Recommendation Details
 *
 * AC-6.4.1: Why This Recommendation Panel
 * AC-6.4.2: Allocation Math Display
 * AC-6.4.3: Score Contribution Display
 * AC-6.4.4: Full Calculation Details
 *
 * Displays detailed breakdown explaining why an asset is recommended:
 * - Score ranking among portfolio assets
 * - Current vs target allocation with before/after visualization
 * - Top 3 scoring criteria
 * - Full calculation details (expandable)
 *
 * Features:
 * - Sheet slide-over panel (consistent with existing patterns)
 * - Collapsible sections for progressive disclosure
 * - Educational tone for explanations
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AllocationGauge } from "./allocation-gauge";
import { CalculationSteps } from "./calculation-steps";
import { calculateTargetRange } from "./constants";
import { ScoreBadge } from "@/components/fintech/score-badge";
import { formatCurrency } from "@/lib/utils/currency-format";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  Award,
  Calculator,
  FileText,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtendedBreakdown, TopCriterion, ScoreRanking } from "@/lib/types/recommendations";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TYPES
// =============================================================================

export interface RecommendationDetailsPanelProps {
  /** Recommendation item to display details for */
  item: RecommendationDisplayItem;
  /** Extended breakdown data from API (optional - will show loading state if missing) */
  breakdown?: ExtendedBreakdown | null | undefined;
  /** Whether breakdown is loading */
  isLoading?: boolean;
  /** User's base currency for display */
  baseCurrency: string;
  /** Whether the panel is open */
  open: boolean;
  /** Callback to control panel open state */
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Score ranking badge showing percentile position
 */
function RankingBadge({ ranking }: { ranking: ScoreRanking }) {
  const { rank, total, percentile } = ranking;

  // Determine color based on percentile
  const colorClass = useMemo(() => {
    if (percentile >= 80)
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30";
    if (percentile >= 50)
      return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30";
    return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
  }, [percentile]);

  return (
    <div
      className={cn("flex items-center gap-2 px-3 py-2 rounded-md", colorClass)}
      data-testid="ranking-badge"
    >
      <Award className="h-4 w-4" aria-hidden="true" />
      <span className="text-sm font-medium">
        Rank #{rank} of {total}
      </span>
      {total > 1 && <span className="text-xs opacity-75">(top {percentile}%)</span>}
    </div>
  );
}

/**
 * Top criteria list with optional expansion
 */
function TopCriteriaList({
  criteria,
  showAll,
  onToggle,
}: {
  criteria: TopCriterion[];
  showAll: boolean;
  onToggle: () => void;
}) {
  const displayCriteria = showAll ? criteria : criteria.slice(0, 3);

  if (criteria.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">No scoring criteria available</div>
    );
  }

  return (
    <div className="space-y-2">
      {displayCriteria.map((criterion) => (
        <div
          key={criterion.criterionId}
          className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
          data-testid={`criterion-${criterion.criterionId}`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{criterion.criterionName}</div>
            {criterion.actualValue && (
              <div className="text-xs text-muted-foreground">Value: {criterion.actualValue}</div>
            )}
          </div>
          <div
            className={cn(
              "text-sm font-bold tabular-nums ml-2",
              criterion.pointsAwarded > 0 && "text-green-600 dark:text-green-400",
              criterion.pointsAwarded < 0 && "text-red-600 dark:text-red-400"
            )}
          >
            {criterion.pointsAwarded > 0 ? "+" : ""}
            {criterion.pointsAwarded} pts
          </div>
        </div>
      ))}

      {criteria.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full text-xs"
          data-testid="toggle-criteria-btn"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show all {criteria.length} criteria
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Allocation movement visualization
 */
function AllocationMovement({
  currentPercent,
  expectedPercent,
  targetMin,
  targetMax,
}: {
  currentPercent: string;
  expectedPercent: string;
  targetMin: string;
  targetMax: string;
}) {
  const { formatNumber } = useNumberFormat();
  const current = parseFloat(currentPercent);
  const expected = parseFloat(expectedPercent);
  const change = expected - current;

  const formatPct = (val: number) =>
    formatNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Determine if moving toward target
  const targetMid = (parseFloat(targetMin) + parseFloat(targetMax)) / 2;
  const isImproving = Math.abs(expected - targetMid) < Math.abs(current - targetMid);

  return (
    <div className="space-y-3" data-testid="allocation-movement">
      {/* Visual bar showing movement */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Target zone */}
        <div
          className="absolute h-full bg-green-100 dark:bg-green-900/30"
          style={{
            left: `${parseFloat(targetMin)}%`,
            width: `${parseFloat(targetMax) - parseFloat(targetMin)}%`,
          }}
        />
        {/* Current position marker */}
        <div
          className="absolute w-2 h-full bg-muted-foreground rounded"
          style={{ left: `${Math.min(current, 98)}%` }}
          title={`Current: ${formatPct(current)}%`}
        />
        {/* Expected position marker */}
        <div
          className="absolute w-2 h-full bg-primary rounded"
          style={{ left: `${Math.min(expected, 98)}%` }}
          title={`Expected: ${formatPct(expected)}%`}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-muted-foreground" />
          <span>Current: {formatPct(current)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-primary" />
          <span>After: {formatPct(expected)}%</span>
        </div>
      </div>

      {/* Change indicator */}
      <div
        className={cn(
          "flex items-center justify-center gap-1 text-sm font-medium py-1 rounded",
          isImproving
            ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
            : "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
        )}
      >
        <TrendingUp className="h-4 w-4" />
        <span>
          {change >= 0 ? "+" : ""}
          {formatPct(change)}% {isImproving ? "toward target" : "allocation change"}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RecommendationDetailsPanel Component
 *
 * Displays a detailed "Why this recommendation?" panel.
 *
 * @example
 * ```tsx
 * <RecommendationDetailsPanel
 *   item={recommendationItem}
 *   breakdown={breakdownData}
 *   isLoading={false}
 *   baseCurrency="USD"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * />
 * ```
 */
export function RecommendationDetailsPanel({
  item,
  breakdown,
  isLoading = false,
  baseCurrency,
  open,
  onOpenChange,
}: RecommendationDetailsPanelProps) {
  const { formatNumber } = useNumberFormat();
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const [showFullCalculation, setShowFullCalculation] = useState(false);

  const {
    assetId,
    symbol,
    score,
    currentAllocation,
    targetAllocation,
    allocationGap,
    recommendedAmount,
    isOverAllocated,
  } = item;

  // Calculate target range
  const { min: targetMin, max: targetMax } = useMemo(
    () => calculateTargetRange(targetAllocation),
    [targetAllocation]
  );

  // Format values
  const formattedAmount = formatCurrency(recommendedAmount, baseCurrency);
  const gapValue = parseFloat(allocationGap) || 0;
  const formatPct = (val: string) =>
    formatNumber(parseFloat(val), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Get extended data from breakdown
  const topCriteria = breakdown?.topCriteria ?? [];
  const expectedAllocationAfter = breakdown?.expectedAllocationAfter ?? currentAllocation;
  const scoreRanking = breakdown?.scoreRanking ?? { percentile: 0, rank: 1, total: 1 };
  const calculationSteps = breakdown?.calculation?.steps ?? [];
  const generatedAt = breakdown?.auditTrail?.generatedAt;
  const correlationId = breakdown?.auditTrail?.correlationId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        data-testid="recommendation-details-panel"
      >
        <SheetHeader>
          <SheetTitle data-testid="details-title">{symbol} - Why This Recommendation?</SheetTitle>
          <SheetDescription data-testid="details-description">
            Understanding why this asset is recommended for investment
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 py-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {!isLoading && (
            <>
              {/* Section 1: Score & Ranking (AC-6.4.1) */}
              <div className="rounded-lg border bg-card p-4" data-testid="score-ranking-section">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" aria-hidden="true" />
                  Score & Ranking
                </h4>

                <div className="flex items-center justify-between mb-3">
                  <ScoreBadge score={score} assetId={assetId} size="lg" interactive={false} />
                  <RankingBadge ranking={scoreRanking} />
                </div>

                <Link
                  href={`/scores/${assetId}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                  data-testid="score-breakdown-link"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  View Full Score Breakdown
                </Link>
              </div>

              {/* Section 2: Allocation Math (AC-6.4.2) */}
              <div className="rounded-lg border bg-card p-4" data-testid="allocation-section">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  Allocation Impact
                </h4>

                {/* Current allocation details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current</span>
                    <span className="text-sm font-bold tabular-nums">
                      {formatPct(currentAllocation)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target Range</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {targetMin}% - {targetMax}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gap</span>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        gapValue > 0 && "text-green-600 dark:text-green-400",
                        gapValue < 0 && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {gapValue > 0 ? "+" : ""}
                      {/* eslint-disable-next-line no-restricted-syntax -- Internal gap calculation display, not user-facing currency/number that requires i18n formatting */}
                      {gapValue.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Recommended</span>
                    <span className="text-sm font-bold">{formattedAmount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expected After</span>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {formatPct(expectedAllocationAfter)}%
                    </span>
                  </div>
                </div>

                {/* Allocation gauge */}
                <AllocationGauge
                  current={currentAllocation}
                  targetMin={targetMin}
                  targetMax={targetMax}
                  size="md"
                  showValues={false}
                />

                {/* Movement visualization */}
                <div className="mt-4">
                  <AllocationMovement
                    currentPercent={currentAllocation}
                    expectedPercent={expectedAllocationAfter}
                    targetMin={targetMin}
                    targetMax={targetMax}
                  />
                </div>

                {/* Over-allocated indicator */}
                {isOverAllocated && (
                  <div
                    className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1"
                    data-testid="over-allocated-indicator"
                  >
                    This asset is over-allocated. No additional investment recommended.
                  </div>
                )}
              </div>

              {/* Section 3: Top Criteria (AC-6.4.3) */}
              <div className="rounded-lg border bg-card p-4" data-testid="criteria-section">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  Top Scoring Criteria
                </h4>

                <TopCriteriaList
                  criteria={topCriteria}
                  showAll={showAllCriteria}
                  onToggle={() => setShowAllCriteria(!showAllCriteria)}
                />
              </div>

              {/* Section 4: Full Calculation (AC-6.4.4) */}
              <div className="rounded-lg border bg-card" data-testid="full-calculation-section">
                <button
                  type="button"
                  onClick={() => setShowFullCalculation(!showFullCalculation)}
                  className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left"
                  data-testid="full-calculation-trigger"
                  aria-expanded={showFullCalculation}
                >
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Full Calculation Details
                  </h4>
                  {showFullCalculation ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showFullCalculation && (
                  <div className="px-4 pb-4" data-testid="full-calculation-content">
                    {calculationSteps.length > 0 ? (
                      <CalculationSteps steps={calculationSteps} />
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        Calculation details not available
                      </div>
                    )}

                    {/* Audit Trail */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground font-medium">
                          Audit Trail
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {generatedAt && (
                          <div className="flex justify-between">
                            <span>Generated</span>
                            {/* TODO: Consider adding date formatting to useNumberFormat hook for locale consistency */}
                            <span className="font-mono">
                              {new Date(generatedAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        )}
                        {correlationId && (
                          <div className="flex justify-between">
                            <span>Correlation ID</span>
                            <span
                              className="font-mono truncate max-w-[150px]"
                              title={correlationId}
                            >
                              {correlationId.slice(0, 8)}...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
