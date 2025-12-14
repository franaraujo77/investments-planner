"use client";

/**
 * RecommendationCard Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 7.6: Zero Buy Signal for Over-Allocated
 *
 * AC-7.5.2: RecommendationCard Display
 * AC-7.6.1: Over-Allocated Asset Shows $0 with Label
 * AC-7.6.2: Over-Allocated Card Visual Treatment
 * AC-7.6.3: Click Shows Explanation
 *
 * Displays individual recommendation with:
 * - Ticker symbol prominently displayed
 * - Score badge with color coding (green: 80+, amber: 50-79, red: <50)
 * - Recommended amount in base currency
 * - AllocationGauge showing current vs target allocation
 *
 * Features:
 * - Hover state styling
 * - Click handler for breakdown panel (Story 7.7 placeholder)
 * - Over-allocated indicator with explanation panel (Story 7.6)
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBadge } from "@/components/fintech/score-badge";
import { AllocationGauge } from "./allocation-gauge";
import { OverAllocatedExplanation } from "./over-allocated-explanation";
import { formatCurrency } from "@/lib/utils/currency-format";
import { cn } from "@/lib/utils";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TYPES
// =============================================================================

export interface RecommendationCardProps {
  /** Recommendation item data */
  item: RecommendationDisplayItem;
  /** User's base currency for display */
  baseCurrency: string;
  /** Click handler for viewing breakdown (Story 7.7) */
  onClick?: (() => void) | undefined;
  /** Additional CSS classes */
  className?: string | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecommendationCard Component
 *
 * Displays a single investment recommendation card.
 *
 * @example
 * ```tsx
 * <RecommendationCard
 *   item={{
 *     assetId: "uuid",
 *     symbol: "AAPL",
 *     score: "85.5",
 *     currentAllocation: "15.2",
 *     targetAllocation: "20.0",
 *     allocationGap: "4.8",
 *     recommendedAmount: "500.00",
 *     isOverAllocated: false,
 *   }}
 *   baseCurrency="USD"
 *   onClick={() => openBreakdown(item.assetId)}
 * />
 * ```
 */
export function RecommendationCard({
  item,
  baseCurrency,
  onClick,
  className,
}: RecommendationCardProps) {
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

  // State for over-allocated explanation sheet (Story 7.6)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // Calculate target min/max from targetAllocation and allocationGap
  // For display purposes, we'll show a reasonable range around the target
  const targetValue = parseFloat(targetAllocation) || 0;
  const targetMin = Math.max(targetValue - 5, 0).toFixed(1);
  const targetMax = Math.min(targetValue + 5, 100).toFixed(1);

  // Format recommended amount
  const formattedAmount = formatCurrency(recommendedAmount, baseCurrency);

  // Check if amount is zero (over-allocated assets)
  const isZeroAmount = parseFloat(recommendedAmount) === 0;

  /**
   * Handle card click
   * - For over-allocated items: open explanation panel (AC-7.6.3)
   * - For regular items: call onClick prop (Story 7.7 breakdown)
   */
  const handleClick = () => {
    if (isOverAllocated) {
      // Open over-allocated explanation (Story 7.6)
      setIsExplanationOpen(true);
    } else if (onClick) {
      // Regular click handler for breakdown panel (Story 7.7)
      onClick();
    }
  };

  // Determine if card should be clickable
  const isClickable = isOverAllocated || !!onClick;

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-200",
          isClickable && "cursor-pointer hover:shadow-md hover:border-primary/20",
          isOverAllocated &&
            "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
          className
        )}
        onClick={handleClick}
        data-testid="recommendation-card"
        data-asset-id={assetId}
        data-over-allocated={isOverAllocated}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <CardContent className="pt-6">
          {/* Header: Symbol and Score */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Ticker Symbol */}
              <span className="text-lg font-bold tracking-tight" data-testid="ticker-symbol">
                {symbol}
              </span>

              {/* Over-allocated indicator */}
              {isOverAllocated && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  data-testid="over-allocated-badge"
                >
                  Over-allocated
                </span>
              )}
            </div>

            {/* Score Badge */}
            <ScoreBadge score={score} assetId={assetId} size="md" interactive={false} />
          </div>

          {/* Recommended Amount */}
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-1">Recommended Investment</div>
            <div
              className={cn("text-2xl font-semibold", isZeroAmount && "text-muted-foreground")}
              data-testid="recommended-amount"
            >
              {isZeroAmount ? "No buy needed" : formattedAmount}
            </div>
            {/* Over-allocated label next to amount (AC-7.6.1) */}
            {isOverAllocated && isZeroAmount && (
              <div
                className="text-xs text-amber-600 dark:text-amber-400 mt-1"
                data-testid="over-allocated-amount-label"
              >
                (over-allocated)
              </div>
            )}
          </div>

          {/* Allocation Gauge */}
          <AllocationGauge
            current={currentAllocation}
            targetMin={targetMin}
            targetMax={targetMax}
            size="sm"
          />

          {/* Click hint for over-allocated cards */}
          {isOverAllocated && (
            <div
              className="text-xs text-muted-foreground mt-3 text-center"
              data-testid="click-hint"
            >
              Tap for details
            </div>
          )}
        </CardContent>
      </Card>

      {/* Over-allocated explanation sheet (Story 7.6) */}
      <OverAllocatedExplanation
        open={isExplanationOpen}
        onOpenChange={setIsExplanationOpen}
        symbol={symbol}
        currentAllocation={currentAllocation}
        targetAllocation={targetAllocation}
        allocationGap={allocationGap}
      />
    </>
  );
}
