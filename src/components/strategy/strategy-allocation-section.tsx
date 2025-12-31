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
 *
 * Supports toggling between:
 * - Target Allocation: Shows configured target allocations from asset classes
 * - Current Allocation: Shows actual portfolio holdings allocation
 */

import { useState, useCallback } from "react";
import { Target, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyAllocationChart } from "./strategy-allocation-chart";
import { AllocationComparisonLegend } from "./allocation-comparison-legend";
import { useStrategyAllocation, type AllocationView } from "@/hooks";
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
 * - Toggle between Target and Current allocation views
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
  const {
    allocations,
    totalValue,
    unclassified,
    hasAssets,
    hasAssetClasses,
    view,
    setView,
    isLoading,
    error,
  } = useStrategyAllocation({ initialView: "target" });

  // Handle class selection from chart or legend
  const handleClassClick = useCallback((classId: string) => {
    setSelectedClassId((current) => (current === classId ? null : classId));
  }, []);

  // Handle view toggle
  const handleViewChange = useCallback(
    (value: string) => {
      setView(value as AllocationView);
    },
    [setView]
  );

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

  // Determine empty state message based on view and data availability
  const getEmptyStateMessage = () => {
    if (view === "target") {
      if (!hasAssetClasses) {
        return {
          title: "No asset classes configured",
          description: "Create asset classes to define your investment strategy",
        };
      }
      return {
        title: "No target allocations configured",
        description: "Add target allocation percentages to your asset classes to see your strategy",
      };
    }
    // Current view
    if (!hasAssets) {
      return {
        title: "No portfolio assets",
        description: "Add assets to your portfolio to see allocation breakdown",
      };
    }
    return {
      title: "No classified assets",
      description: "Assign asset classes to your portfolio assets to see allocation breakdown",
    };
  };

  // Show empty state when there's no data to display
  const showEmptyState = allocations.length === 0;

  // Empty state - show card with message
  if (showEmptyState) {
    const emptyState = getEmptyStateMessage();
    return (
      <Card className={cn("w-full", className)} data-testid="strategy-allocation-section-empty">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Portfolio Allocation Overview</CardTitle>
          <Tabs value={view} onValueChange={handleViewChange}>
            <TabsList className="h-8">
              <TabsTrigger value="target" className="text-xs px-2 gap-1">
                <Target className="h-3 w-3" />
                Target
              </TabsTrigger>
              <TabsTrigger value="current" className="text-xs px-2 gap-1">
                <PieChart className="h-3 w-3" />
                Current
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg"
            role="status"
            aria-label={emptyState.title}
          >
            <div className="text-lg font-medium">{emptyState.title}</div>
            <div className="text-sm text-center max-w-sm mt-1">{emptyState.description}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)} data-testid="strategy-allocation-section">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Portfolio Allocation Overview</CardTitle>
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList className="h-8">
            <TabsTrigger value="target" className="text-xs px-2 gap-1">
              <Target className="h-3 w-3" />
              Target
            </TabsTrigger>
            <TabsTrigger value="current" className="text-xs px-2 gap-1">
              <PieChart className="h-3 w-3" />
              Current
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
