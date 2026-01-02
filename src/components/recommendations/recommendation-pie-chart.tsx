"use client";

/**
 * RecommendationPieChart Component
 *
 * Story 6.3: Recommendation Display
 * AC-6.3.2: Pie Chart Visualization
 *
 * Displays a pie chart showing recommended allocation distribution:
 * - Shows proportional distribution of recommended amounts
 * - Colors match asset class colors (uses consistent CHART_COLORS)
 * - Transforms recommendation items into chart data format
 *
 * Features:
 * - Responsive sizing for mobile display
 * - Accessible labels and descriptions
 * - Total investable shown in center
 */

import { useMemo } from "react";
import {
  AllocationPieChart,
  CHART_COLORS,
  type ClassAllocation,
} from "@/components/portfolio/allocation-pie-chart";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface RecommendationPieChartProps {
  /** Recommendation items to display */
  items: RecommendationDisplayItem[];
  /** Total investable amount for center display */
  totalInvestable: string;
  /** Currency code for formatting */
  baseCurrency: string;
  /** Chart height (default: 250) */
  height?: number;
  /** Whether to show legend (default: true) */
  showLegend?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Transform recommendation items into pie chart data format
 *
 * @param items - Recommendation items
 * @param totalInvestable - Total investable amount
 * @returns Array of ClassAllocation for pie chart
 */
export function transformToChartData(
  items: RecommendationDisplayItem[],
  totalInvestable: string
): ClassAllocation[] {
  const total = new Decimal(totalInvestable);

  // Filter out zero amounts (over-allocated items)
  const investableItems = items.filter(
    (item) => !item.isOverAllocated && new Decimal(item.recommendedAmount).gt(0)
  );

  return investableItems.map((item, index) => {
    const amount = new Decimal(item.recommendedAmount);
    const percentage = total.gt(0)
      ? amount.dividedBy(total).times(100).toFixed(1) // eslint-disable-line no-restricted-syntax
      : "0";

    // Get color with fallback for strict typing
    const colorIndex = index % CHART_COLORS.length;
    const color = CHART_COLORS[colorIndex] ?? CHART_COLORS[0] ?? "hsl(222, 47%, 51%)";

    return {
      classId: item.assetId,
      className: item.symbol,
      value: item.recommendedAmount,
      percentage,
      assetCount: 1,
      targetMin: null,
      targetMax: null,
      status: "on-target" as const,
      color,
    };
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecommendationPieChart Component
 *
 * Displays a pie chart visualization of recommendation distribution.
 *
 * @example
 * ```tsx
 * <RecommendationPieChart
 *   items={recommendations.items}
 *   totalInvestable="1000.00"
 *   baseCurrency="USD"
 * />
 * ```
 */
export function RecommendationPieChart({
  items,
  totalInvestable,
  baseCurrency,
  height = 250,
  showLegend = true,
  className,
}: RecommendationPieChartProps) {
  // Transform recommendation items to chart data
  const chartData = useMemo(
    () => transformToChartData(items, totalInvestable),
    [items, totalInvestable]
  );

  // Don't render chart if no investable items
  if (chartData.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("w-full", className)}
      data-testid="recommendation-pie-chart"
      aria-label="Recommended allocation distribution"
    >
      <AllocationPieChart
        allocations={chartData}
        totalValue={totalInvestable}
        currency={baseCurrency}
        showLegend={showLegend}
        height={height}
      />
    </div>
  );
}
