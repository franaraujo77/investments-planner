"use client";

/**
 * RecommendationCard Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 7.6: Zero Buy Signal for Over-Allocated
 * Story 6.3: Recommendation Display
 * Story 6.4: Recommendation Details
 *
 * AC-7.5.2: RecommendationCard Display
 * AC-7.6.1: Over-Allocated Asset Shows $0 with Label
 * AC-7.6.2: Over-Allocated Card Visual Treatment
 * AC-7.6.3: Click Shows Explanation
 * AC-6.3.4: Card Hover Tooltip (current %, target range, expected after %)
 * AC-6.4.1: "Why this recommendation?" button opens details panel
 *
 * Displays individual recommendation with:
 * - Ticker symbol prominently displayed
 * - Score badge with color coding (green: 80+, amber: 50-79, red: <50)
 * - Recommended amount in base currency
 * - AllocationGauge showing current vs target allocation
 * - Hover tooltip showing allocation details (AC-6.3.4)
 * - "Why?" button for detailed breakdown (AC-6.4.1)
 *
 * Features:
 * - Hover state styling
 * - Click handler for breakdown panel (Story 7.7 placeholder)
 * - Over-allocated indicator with explanation panel (Story 7.6)
 * - Hover tooltip with allocation details (Story 6.3)
 * - "Why this recommendation?" details panel (Story 6.4)
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreBadge } from "@/components/fintech/score-badge";
import { AllocationGauge } from "./allocation-gauge";
import { OverAllocatedExplanation } from "./over-allocated-explanation";
import { RecommendationDetailsPanel } from "./recommendation-details-panel";
import { calculateTargetRange } from "./constants";
import { formatCurrency } from "@/lib/utils/currency-format";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";
import type { ExtendedBreakdown } from "@/lib/types/recommendations";

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
  /** Expected allocation after investment (AC-6.3.4) */
  expectedAllocation?: string | undefined;
  /** Extended breakdown data for details panel (Story 6.4) */
  breakdown?: ExtendedBreakdown | null | undefined;
  /** Whether breakdown is loading */
  isBreakdownLoading?: boolean;
  /** Callback to fetch breakdown when details panel opens */
  onRequestBreakdown?: (() => void) | undefined;
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
  expectedAllocation,
  breakdown,
  isBreakdownLoading = false,
  onRequestBreakdown,
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

  const { formatNumber } = useNumberFormat();

  // State for over-allocated explanation sheet (Story 7.6)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // State for recommendation details panel (Story 6.4)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Calculate target min/max from targetAllocation
  // Uses centralized constant for target range (±TARGET_ALLOCATION_RANGE percentage points)
  const { min: targetMin, max: targetMax } = calculateTargetRange(targetAllocation);

  // Format recommended amount
  const formattedAmount = formatCurrency(recommendedAmount, baseCurrency);

  // Check if amount is zero (over-allocated assets)
  const isZeroAmount = parseFloat(recommendedAmount) === 0;

  // Format percentage for tooltip (AC-6.3.4)
  const formatPct = (val: string) =>
    formatNumber(parseFloat(val), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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

  /**
   * Handle "Why?" button click (Story 6.4 AC-6.4.1)
   * Opens the recommendation details panel
   */
  const handleWhyClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsDetailsOpen(true);
    // Request breakdown data if callback provided
    if (onRequestBreakdown) {
      onRequestBreakdown();
    }
  };

  // Tooltip content for AC-6.3.4
  const tooltipContent = (
    <div className="space-y-1 text-left" data-testid="recommendation-tooltip-content">
      <div className="font-semibold">{symbol}</div>
      <div>
        <span className="text-muted-foreground">Current:</span>{" "}
        <span className="font-mono">{formatPct(currentAllocation)}%</span>
      </div>
      <div>
        <span className="text-muted-foreground">Target:</span>{" "}
        <span className="font-mono">
          {formatPct(targetMin)}% - {formatPct(targetMax)}%
        </span>
      </div>
      {expectedAllocation && (
        <div>
          <span className="text-muted-foreground">After:</span>{" "}
          <span className="font-mono">{formatPct(expectedAllocation)}%</span>
        </div>
      )}
    </div>
  );

  const cardElement = (
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

          <div className="flex items-center gap-2">
            {/* Why button (Story 6.4 AC-6.4.1) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleWhyClick}
                  aria-label="Why this recommendation?"
                  data-testid="why-button"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Why this recommendation?</TooltipContent>
            </Tooltip>

            {/* Score Badge */}
            <ScoreBadge score={score} assetId={assetId} size="md" interactive={false} />
          </div>
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
          <div className="text-xs text-muted-foreground mt-3 text-center" data-testid="click-hint">
            Tap for details
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* AC-6.3.4: Wrap card in tooltip for hover information */}
      <Tooltip>
        <TooltipTrigger asChild>{cardElement}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>

      {/* Over-allocated explanation sheet (Story 7.6) */}
      <OverAllocatedExplanation
        open={isExplanationOpen}
        onOpenChange={setIsExplanationOpen}
        symbol={symbol}
        currentAllocation={currentAllocation}
        targetAllocation={targetAllocation}
        allocationGap={allocationGap}
      />

      {/* Recommendation details panel (Story 6.4) */}
      <RecommendationDetailsPanel
        item={item}
        breakdown={breakdown}
        isLoading={isBreakdownLoading}
        baseCurrency={baseCurrency}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </>
  );
}
