"use client";

/**
 * StrategyAllocationSection Component
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Pie chart on strategy page
 * AC-3.6.5: Target range comparison legend
 *
 * Combines the allocation pie chart and comparison legend
 * in a responsive two-column layout.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StrategyAllocationChart } from "./strategy-allocation-chart";
import { AllocationComparisonLegend } from "./allocation-comparison-legend";
import { useStrategyAllocation } from "@/hooks";
import { AllocationPieChartSkeleton } from "@/components/portfolio/allocation-pie-chart";

// =============================================================================
// TYPES
// =============================================================================

export interface StrategyAllocationSectionProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Strategy Allocation Section
 *
 * Displays the portfolio allocation overview with:
 * - Pie chart (60% width on large screens)
 * - Comparison legend (40% width on large screens)
 * - Responsive stacking on mobile
 *
 * @example
 * ```tsx
 * <StrategyAllocationSection className="mb-6" />
 * ```
 */
export function StrategyAllocationSection({ className }: StrategyAllocationSectionProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { allocations, totalValue, unclassified, hasAssets, isLoading, error } =
    useStrategyAllocation();

  // Handle class selection from chart or legend
  const handleClassClick = useCallback((classId: string) => {
    setSelectedClassId((current) => (current === classId ? null : classId));
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)} data-testid="strategy-allocation-section-loading">
        <CardHeader>
          <CardTitle className="text-lg">Portfolio Allocation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Chart skeleton - 60% */}
            <div className="lg:col-span-3">
              <AllocationPieChartSkeleton height={300} />
            </div>
            {/* Legend skeleton - 40% */}
            <div className="lg:col-span-2 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-muted rounded-lg animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full", className)} data-testid="strategy-allocation-section-error">
        <CardHeader>
          <CardTitle className="text-lg">Portfolio Allocation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="text-destructive font-medium">Failed to load allocation data</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - show card with message
  if (!hasAssets || allocations.length === 0) {
    return (
      <Card className={cn("w-full", className)} data-testid="strategy-allocation-section-empty">
        <CardHeader>
          <CardTitle className="text-lg">Portfolio Allocation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg"
            role="status"
            aria-label="No allocation data"
          >
            <div className="text-lg font-medium">No allocation data</div>
            <div className="text-sm text-center max-w-sm mt-1">
              Add assets to your portfolio to see allocation breakdown
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)} data-testid="strategy-allocation-section">
      <CardHeader>
        <CardTitle className="text-lg">Portfolio Allocation Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pie chart - 60% width on large screens */}
          <div className="lg:col-span-3">
            <StrategyAllocationChart
              height={300}
              showLegend={false}
              onClassClick={handleClassClick}
              selectedClassId={selectedClassId}
              allocationsData={{
                allocations,
                totalValue,
                unclassified,
                hasAssets,
                isLoading,
                error,
              }}
            />
          </div>

          {/* Comparison legend - 40% width on large screens */}
          <div className="lg:col-span-2">
            <AllocationComparisonLegend
              allocations={allocations}
              unclassified={unclassified}
              onRowClick={handleClassClick}
              selectedClassId={selectedClassId}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
