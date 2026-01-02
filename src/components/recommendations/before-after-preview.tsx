"use client";

/**
 * BeforeAfterPreview Component
 *
 * Story 6.3: Recommendation Display
 * AC-6.3.3: Multi-Asset Summary - Before/Expected After Allocation
 *
 * Displays side-by-side comparison of:
 * - Current allocation percentage per asset
 * - Expected allocation after investment
 *
 * Features:
 * - Two-column layout for visual comparison
 * - Color-coded changes (green for improvement, amber for minimal change)
 * - Uses Decimal.js for precise financial calculations
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { cn } from "@/lib/utils";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";
import Decimal from "decimal.js";

// =============================================================================
// TYPES
// =============================================================================

export interface BeforeAfterPreviewProps {
  /** Recommendation items with allocation data */
  items: RecommendationDisplayItem[];
  /** Total investable amount */
  totalInvestable: string;
  /** Current portfolio value (for calculating expected after) */
  currentPortfolioValue: string;
  /** Additional CSS classes */
  className?: string;
}

export interface AllocationChange {
  /** Asset ID */
  assetId: string;
  /** Asset symbol */
  symbol: string;
  /** Current allocation percentage */
  currentPercent: string;
  /** Expected allocation after investment */
  expectedPercent: string;
  /** Change in allocation (positive = improvement toward target) */
  change: string;
  /** Whether this is improving toward target */
  isImproving: boolean;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate expected allocation after investment
 *
 * Formula:
 * 1. Current asset value = portfolioValue × (currentAllocation / 100)
 * 2. New asset value = currentValue + recommendedAmount
 * 3. New portfolio value = portfolioValue + totalInvestable
 * 4. Expected allocation = (newAssetValue / newPortfolioValue) × 100
 *
 * @param currentAllocation - Current allocation percentage
 * @param recommendedAmount - Amount to invest in this asset
 * @param totalInvestable - Total amount being invested
 * @param currentPortfolioValue - Current portfolio value
 * @returns Expected allocation percentage after investment
 */
export function calculateExpectedAllocation(
  currentAllocation: string,
  recommendedAmount: string,
  totalInvestable: string,
  currentPortfolioValue: string
): string {
  const current = new Decimal(currentAllocation);
  const recommended = new Decimal(recommendedAmount);
  const total = new Decimal(totalInvestable);
  const portfolioValue = new Decimal(currentPortfolioValue);

  // Handle edge case: zero portfolio value
  if (portfolioValue.isZero()) {
    // If no current portfolio, new allocation is just recommended / total
    if (total.isZero()) return "0.00";
    return recommended.dividedBy(total).times(100).toFixed(2); // eslint-disable-line no-restricted-syntax
  }

  // Calculate new portfolio value after investment
  const newPortfolioValue = portfolioValue.plus(total);

  // Handle edge case: no new investment
  if (newPortfolioValue.isZero()) {
    return current.toFixed(2); // eslint-disable-line no-restricted-syntax
  }

  // Calculate current asset value
  const currentAssetValue = portfolioValue.times(current).dividedBy(100);

  // Calculate new asset value after investment
  const newAssetValue = currentAssetValue.plus(recommended);

  // Calculate expected allocation percentage
  const expectedAllocation = newAssetValue.dividedBy(newPortfolioValue).times(100);

  // Handle -0 edge case
  return expectedAllocation.isZero() ? "0.00" : expectedAllocation.toFixed(2); // eslint-disable-line no-restricted-syntax
}

/**
 * Calculate allocation changes for all recommendation items
 */
export function calculateAllocationChanges(
  items: RecommendationDisplayItem[],
  totalInvestable: string,
  currentPortfolioValue: string
): AllocationChange[] {
  return items.map((item) => {
    const expectedPercent = calculateExpectedAllocation(
      item.currentAllocation,
      item.recommendedAmount,
      totalInvestable,
      currentPortfolioValue
    );

    const currentNum = new Decimal(item.currentAllocation);
    const expectedNum = new Decimal(expectedPercent);
    const targetNum = new Decimal(item.targetAllocation);

    // Calculate change
    const changeValue = expectedNum.minus(currentNum);
    const change = changeValue.isZero() ? "0.00" : changeValue.toFixed(2); // eslint-disable-line no-restricted-syntax

    // Determine if improving toward target
    // Improving if: moving closer to target (gap is reducing)
    const currentGap = currentNum.minus(targetNum).abs();
    const expectedGap = expectedNum.minus(targetNum).abs();
    const isImproving = expectedGap.lt(currentGap);

    return {
      assetId: item.assetId,
      symbol: item.symbol,
      currentPercent: new Decimal(item.currentAllocation).toFixed(2), // eslint-disable-line no-restricted-syntax
      expectedPercent,
      change,
      isImproving,
    };
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BeforeAfterPreview Component
 *
 * Displays before/after allocation comparison for recommendations.
 *
 * @example
 * ```tsx
 * <BeforeAfterPreview
 *   items={recommendations.items}
 *   totalInvestable="1000.00"
 *   currentPortfolioValue="10000.00"
 * />
 * ```
 */
export function BeforeAfterPreview({
  items,
  totalInvestable,
  currentPortfolioValue,
  className,
}: BeforeAfterPreviewProps) {
  const { formatNumber } = useNumberFormat();

  // Calculate allocation changes
  const changes = useMemo(
    () => calculateAllocationChanges(items, totalInvestable, currentPortfolioValue),
    [items, totalInvestable, currentPortfolioValue]
  );

  // Filter to only show items with actual recommendations (not over-allocated)
  const activeChanges = changes.filter((c) => {
    const item = items.find((i) => i.assetId === c.assetId);
    return item && !item.isOverAllocated;
  });

  // Don't render if no active changes
  if (activeChanges.length === 0) {
    return null;
  }

  const formatPct = (val: string) =>
    formatNumber(parseFloat(val), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Card className={cn("", className)} data-testid="before-after-preview">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Allocation Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-2 px-2">
          <div>Asset</div>
          <div className="text-right">Current</div>
          <div className="text-right">After</div>
          <div className="text-right">Change</div>
        </div>

        {/* Data rows */}
        <div className="space-y-1">
          {activeChanges.map((change) => {
            const changeNum = parseFloat(change.change);
            const isPositive = changeNum > 0;
            const isZero = changeNum === 0;

            return (
              <div
                key={change.assetId}
                className={cn(
                  "grid grid-cols-4 gap-2 text-sm py-2 px-2 rounded-md",
                  change.isImproving && "bg-green-50/50 dark:bg-green-950/20"
                )}
                data-testid={`allocation-change-${change.assetId}`}
              >
                <div className="font-medium truncate" title={change.symbol}>
                  {change.symbol}
                </div>
                <div className="text-right font-mono text-muted-foreground">
                  {formatPct(change.currentPercent)}%
                </div>
                <div className="text-right font-mono">{formatPct(change.expectedPercent)}%</div>
                <div
                  className={cn(
                    "text-right font-mono",
                    isZero && "text-muted-foreground",
                    isPositive && "text-green-600 dark:text-green-400",
                    !isPositive && !isZero && "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatPct(change.change)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
