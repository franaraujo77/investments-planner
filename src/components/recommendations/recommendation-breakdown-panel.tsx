"use client";

/**
 * RecommendationBreakdownPanel Component
 *
 * Story 7.7: View Recommendation Breakdown
 *
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * AC-7.7.2: Breakdown Shows Score Breakdown Link
 * AC-7.7.3: Formula Display
 * AC-7.7.4: Audit Trail Information
 *
 * Displays detailed breakdown for a recommendation including:
 * - Current vs target allocation with visual gauge
 * - Score badge with link to score breakdown
 * - Step-by-step calculation breakdown
 * - Audit trail information
 *
 * Features:
 * - Sheet slide-over panel (consistent with OverAllocatedExplanation)
 * - Clear visual hierarchy
 * - Educational tone for calculation explanations
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AllocationGauge } from "./allocation-gauge";
import { CalculationSteps } from "./calculation-steps";
import { ScoreBadge } from "@/components/fintech/score-badge";
import { formatCurrency } from "@/lib/utils/currency-format";
import { Clock, ExternalLink, FileText } from "lucide-react";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TYPES
// =============================================================================

export interface RecommendationBreakdownPanelProps {
  /** Recommendation item to display breakdown for */
  item: RecommendationDisplayItem;
  /** Recommendation ID for API calls */
  recommendationId: string;
  /** User's base currency for display */
  baseCurrency: string;
  /** Whether the panel is open */
  open: boolean;
  /** Callback to control panel open state */
  onOpenChange: (open: boolean) => void;
  /** Correlation ID for audit trail (optional) */
  correlationId?: string | undefined;
  /** When recommendation was generated (ISO string, optional) */
  generatedAt?: string | undefined;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate target range from midpoint (±5% with bounds)
 */
function calculateTargetRange(targetMidpoint: string): {
  min: string;
  max: string;
} {
  const midpoint = parseFloat(targetMidpoint) || 0;
  const min = Math.max(midpoint - 5, 0).toFixed(1);
  const max = Math.min(midpoint + 5, 100).toFixed(1);
  return { min, max };
}

/**
 * Build simplified calculation steps from item data
 * For detailed steps, the API should be called
 */
function buildSimpleCalculationSteps(
  allocationGap: string,
  score: string,
  recommendedAmount: string
): Array<{ step: string; value: string; formula: string }> {
  const gapValue = parseFloat(allocationGap);
  const scoreValue = parseFloat(score);
  const amountValue = parseFloat(recommendedAmount);

  // Calculate the score contribution
  const scoreContribution = gapValue * (scoreValue / 100);

  return [
    {
      step: "Calculate allocation gap",
      value: `${Math.abs(gapValue).toFixed(2)}%`,
      formula: "target_midpoint - current_allocation",
    },
    {
      step: "Apply score weighting",
      value: scoreContribution.toFixed(4),
      formula: "allocation_gap × (score / 100)",
    },
    {
      step: "Distribute capital proportionally",
      value: `$${amountValue.toFixed(2)}`,
      formula: "weighted_priority ÷ total_priority × total_investable",
    },
  ];
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string | undefined): string {
  if (!isoString) return "Unknown";
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Unknown";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecommendationBreakdownPanel Component
 *
 * Displays a detailed breakdown panel for a recommendation.
 *
 * @example
 * ```tsx
 * <RecommendationBreakdownPanel
 *   item={recommendationItem}
 *   recommendationId="uuid"
 *   baseCurrency="USD"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   correlationId="uuid"
 *   generatedAt="2025-12-13T04:00:00Z"
 * />
 * ```
 */
export function RecommendationBreakdownPanel({
  item,
  recommendationId: _recommendationId,
  baseCurrency,
  open,
  onOpenChange,
  correlationId,
  generatedAt,
}: RecommendationBreakdownPanelProps) {
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

  // Build calculation steps
  const calculationSteps = useMemo(
    () => buildSimpleCalculationSteps(allocationGap, score, recommendedAmount),
    [allocationGap, score, recommendedAmount]
  );

  // Format values for display
  const currentValue = parseFloat(currentAllocation) || 0;
  const gapValue = parseFloat(allocationGap) || 0;
  const formattedAmount = formatCurrency(recommendedAmount, baseCurrency);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="recommendation-breakdown-panel"
      >
        <SheetHeader>
          <SheetTitle data-testid="breakdown-title">{symbol} - Recommendation Breakdown</SheetTitle>
          <SheetDescription data-testid="breakdown-description">
            Understanding how this recommendation was calculated
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {/* Allocation Summary */}
          <div className="rounded-lg border bg-card p-4" data-testid="allocation-summary">
            <h4 className="text-sm font-medium mb-3">Allocation Status</h4>

            {/* Current vs Target */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Allocation</span>
                <span
                  className="text-sm font-bold tabular-nums"
                  data-testid="current-allocation-value"
                >
                  {currentValue.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Target Range</span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  data-testid="target-range-value"
                >
                  {targetMin}% - {targetMax}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gap</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    gapValue > 0
                      ? "text-green-600"
                      : gapValue < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }`}
                  data-testid="gap-value"
                >
                  {gapValue > 0 ? "+" : ""}
                  {gapValue.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Allocation Gauge */}
            <AllocationGauge
              current={currentAllocation}
              targetMin={targetMin}
              targetMax={targetMax}
              size="md"
              showValues={false}
            />

            {/* Over-allocated indicator */}
            {isOverAllocated && (
              <div
                className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1"
                data-testid="over-allocated-indicator"
              >
                This asset is over-allocated. No investment recommended.
              </div>
            )}
          </div>

          {/* Score Section */}
          <div className="rounded-lg border bg-card p-4" data-testid="score-section">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium mb-1">Asset Score</h4>
                <p className="text-xs text-muted-foreground">Based on your scoring criteria</p>
              </div>
              <ScoreBadge score={score} assetId={assetId} size="lg" interactive={false} />
            </div>

            {/* Link to full score breakdown */}
            <Link
              href={`/scores/${assetId}`}
              className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="score-breakdown-link"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View Score Breakdown
            </Link>
          </div>

          {/* Formula Summary */}
          <div className="rounded-lg border bg-card p-4" data-testid="formula-summary">
            <h4 className="text-sm font-medium mb-3">Recommendation Formula</h4>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
              <span data-testid="formula-display">
                Gap: <strong>{Math.abs(gapValue).toFixed(2)}%</strong>, Score:{" "}
                <strong>{parseFloat(score).toFixed(1)}</strong>, Amount:{" "}
                <strong>{formattedAmount}</strong>
              </span>
            </div>
          </div>

          {/* Calculation Steps */}
          <div className="rounded-lg border bg-card p-4" data-testid="calculation-steps-section">
            <CalculationSteps steps={calculationSteps} />
          </div>

          {/* Audit Trail */}
          <div className="rounded-lg border bg-muted/30 p-4" data-testid="audit-trail-section">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h4 className="text-sm font-medium text-muted-foreground">Audit Trail</h4>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              {/* Generation timestamp */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Generated
                </span>
                <span className="font-mono" data-testid="generated-at">
                  {formatTimestamp(generatedAt)}
                </span>
              </div>

              {/* Correlation ID */}
              {correlationId && (
                <div className="flex items-center justify-between gap-2">
                  <span>Correlation ID</span>
                  <span
                    className="font-mono truncate max-w-[180px]"
                    title={correlationId}
                    data-testid="correlation-id"
                  >
                    {correlationId.slice(0, 8)}...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
