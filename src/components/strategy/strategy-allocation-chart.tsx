"use client";

/**
 * StrategyAllocationChart Component
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Pie chart showing allocation by asset class
 * AC-3.6.3: Tooltip with asset class name, percentage, value, and asset count
 * AC-3.6.4: Empty state message for portfolios without assets
 * AC-3.6.5: Color-coded status indicators
 * AC-3.6.6: Screen reader accessibility
 *
 * Wraps AllocationPieChart with strategy-specific data transformation
 * and status-based color coding.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Decimal } from "@/lib/calculations/decimal-config";
import { useStrategyAllocation } from "@/hooks";
import {
  AllocationPieChart,
  AllocationPieChartSkeleton,
  getSegmentColor,
  type ClassAllocation,
} from "@/components/portfolio/allocation-pie-chart";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";

// =============================================================================
// TYPES
// =============================================================================

export interface StrategyAllocationChartProps {
  /** Additional CSS classes */
  className?: string;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Callback when a class segment is clicked */
  onClassClick?: (classId: string) => void;
  /** Currently selected class (for highlighting) */
  selectedClassId?: string | null;
  /**
   * Optional pre-fetched allocation data to avoid duplicate API calls.
   * If provided, the component will use this data instead of fetching.
   */
  allocationsData?: {
    allocations: StrategyAllocation[];
    totalValue: string;
    unclassified: {
      value: string;
      percentage: string;
      assetCount: number;
    };
    hasAssets: boolean;
    isLoading: boolean;
    error: string | null;
  };
}

// =============================================================================
// COLOR MAPPING
// =============================================================================

/**
 * Color for unclassified assets
 */
const UNCLASSIFIED_COLOR = "hsl(215, 16%, 47%)"; // Gray - matches legend

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Transform StrategyAllocation[] to ClassAllocation[] for pie chart
 *
 * Adds color based on index (matching legend colors) and formats for AllocationPieChart
 */
function transformToChartData(
  allocations: StrategyAllocation[],
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  }
): ClassAllocation[] {
  // Transform classified allocations with index-based colors
  const data: ClassAllocation[] = allocations.map((alloc, index) => ({
    classId: alloc.classId,
    className: alloc.className,
    value: alloc.currentValue,
    percentage: alloc.currentPercentage,
    assetCount: alloc.assetCount,
    targetMin: alloc.targetMin,
    targetMax: alloc.targetMax,
    status: alloc.status,
    color: getSegmentColor(index),
  }));

  // Add unclassified segment if there are unclassified assets
  const unclassifiedValue = new Decimal(unclassified.value);
  if (unclassifiedValue.greaterThan(0)) {
    data.push({
      classId: "unclassified",
      className: "Unclassified",
      value: unclassified.value,
      percentage: unclassified.percentage,
      assetCount: unclassified.assetCount,
      targetMin: null,
      targetMax: null,
      status: "on-target", // Unclassified is neutral
      color: UNCLASSIFIED_COLOR,
    });
  }

  return data;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Strategy Allocation Pie Chart
 *
 * Displays current portfolio allocation by asset class with status-based
 * color coding. Uses the useStrategyAllocation hook to fetch data.
 *
 * @example
 * ```tsx
 * <StrategyAllocationChart
 *   onClassClick={(classId) => router.push(`/strategy/${classId}`)}
 *   height={350}
 * />
 * ```
 */
export function StrategyAllocationChart({
  className,
  height = 300,
  showLegend = true,
  onClassClick,
  selectedClassId,
  allocationsData,
}: StrategyAllocationChartProps) {
  // Use provided data if available, otherwise fetch via hook
  // This prevents duplicate API calls when parent already has the data
  const hookData = useStrategyAllocation();
  const { allocations, totalValue, unclassified, hasAssets, isLoading, error } =
    allocationsData ?? hookData;

  // Transform data for pie chart
  const chartData = useMemo(
    () => transformToChartData(allocations, unclassified),
    [allocations, unclassified]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("w-full", className)} data-testid="strategy-allocation-chart-loading">
        <AllocationPieChartSkeleton height={height} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center text-muted-foreground", className)}
        style={{ height }}
        data-testid="strategy-allocation-chart-error"
      >
        <div className="text-lg font-medium text-destructive">Failed to load allocation</div>
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  // Empty state - AC-3.6.4
  if (!hasAssets || chartData.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg",
          className
        )}
        style={{ height }}
        data-testid="strategy-allocation-chart-empty"
        role="status"
        aria-label="No allocation data available"
      >
        <div className="text-lg font-medium">No allocation data</div>
        <div className="text-sm text-center max-w-xs mt-1">
          Add assets to your portfolio to see allocation breakdown
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} data-testid="strategy-allocation-chart">
      <AllocationPieChart
        allocations={chartData}
        totalValue={totalValue}
        height={height}
        showLegend={showLegend}
        {...(onClassClick && { onClassClick })}
        {...(selectedClassId !== undefined && { selectedClassId })}
      />
    </div>
  );
}

/**
 * Re-export skeleton for external use
 */
export { AllocationPieChartSkeleton as StrategyAllocationChartSkeleton };
