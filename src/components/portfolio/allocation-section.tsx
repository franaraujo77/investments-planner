"use client";

/**
 * AllocationSection Component
 *
 * Story 3.7: Allocation Percentage View
 * AC-3.7.1 - AC-3.7.7: Combined allocation visualization
 *
 * Combines all allocation visualizations:
 * - Pie/donut chart for allocation overview
 * - Bar chart for current vs target comparison
 * - Allocation gauges for each class
 * - Subclass breakdown expansion
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, BarChart3, Gauge, Layers } from "lucide-react";
import {
  AllocationPieChart,
  AllocationPieChartSkeleton,
  type ClassAllocation,
} from "./allocation-pie-chart";
import { AllocationBarChart, AllocationBarChartSkeleton } from "./allocation-bar-chart";
import { AllocationGauge } from "@/components/fintech/allocation-gauge";
import { SubclassBreakdownList } from "./subclass-breakdown";
import { formatAllocationPercent } from "@/lib/calculations/allocation-utils";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

/**
 * Subclass allocation data
 */
interface SubclassAllocation {
  subclassId: string;
  subclassName: string;
  value: string;
  percentageOfClass: string;
  percentageOfPortfolio: string;
  assetCount: number;
}

/**
 * Class allocation data
 */
interface ClassAllocationData {
  classId: string;
  className: string;
  value: string;
  percentage: string;
  assetCount: number;
  targetMin: string | null;
  targetMax: string | null;
  status: AllocationStatus;
  subclasses: SubclassAllocation[];
}

/**
 * Full allocation breakdown data structure
 * Mirrors AllocationBreakdown from allocation-service but defined locally
 * to avoid importing server-only modules
 */
export interface AllocationBreakdown {
  classes: ClassAllocationData[];
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  };
  totalValueBase: string;
  totalActiveValueBase: string;
  baseCurrency: string;
  dataFreshness: Date;
}

export interface AllocationSectionProps {
  /** Allocation breakdown data */
  data: AllocationBreakdown | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state when no allocation data
 */
function AllocationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <PieChart className="h-12 w-12 mb-4 opacity-50" />
      <div className="text-lg font-medium">No allocation data</div>
      <div className="text-sm text-center max-w-sm mt-1">
        Add assets to your portfolio to see allocation breakdown by asset class.
      </div>
    </div>
  );
}

/**
 * Error state
 */
function AllocationErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-destructive">
      <div className="text-lg font-medium">Error loading allocations</div>
      <div className="text-sm mt-1">{error}</div>
    </div>
  );
}

/**
 * Loading skeleton for the entire section
 */
function AllocationLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <AllocationPieChartSkeleton height={250} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <AllocationBarChartSkeleton height={250} />
          </CardContent>
        </Card>
      </div>

      {/* Gauges skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AllocationSection({
  data,
  isLoading = false,
  error = null,
  className,
}: AllocationSectionProps) {
  // Track which class is expanded for subclass breakdown
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  // Track selected class in pie chart
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Handle class click from any chart
  const handleClassClick = useCallback((classId: string) => {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
    setSelectedClassId(classId);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)} data-testid="allocation-section-loading">
        <AllocationLoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("", className)} data-testid="allocation-section-error">
        <AllocationErrorState error={error} />
      </div>
    );
  }

  // No data state
  if (!data || (data.classes.length === 0 && data.unclassified.assetCount === 0)) {
    return (
      <div className={cn("", className)} data-testid="allocation-section-empty">
        <AllocationEmptyState />
      </div>
    );
  }

  // Prepare data for components
  const classAllocations: ClassAllocation[] = data.classes.map((c) => ({
    classId: c.classId,
    className: c.className,
    value: c.value,
    percentage: c.percentage,
    assetCount: c.assetCount,
    targetMin: c.targetMin,
    targetMax: c.targetMax,
    status: c.status,
  }));

  // Add unclassified as a special class if there are any
  if (data.unclassified.assetCount > 0) {
    classAllocations.push({
      classId: "unclassified",
      className: "Unclassified",
      value: data.unclassified.value,
      percentage: data.unclassified.percentage,
      assetCount: data.unclassified.assetCount,
      targetMin: null,
      targetMax: null,
      status: "no-target",
    });
  }

  // Prepare subclass data for breakdown
  const subclassData = data.classes.map((c) => ({
    classId: c.classId,
    className: c.className,
    classPercentage: c.percentage,
    subclasses: c.subclasses,
  }));

  return (
    <div className={cn("space-y-6", className)} data-testid="allocation-section">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portfolio Allocation</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{data.classes.length} asset classes</span>
          {data.unclassified.assetCount > 0 && (
            <span className="text-amber-600">{data.unclassified.assetCount} unclassified</span>
          )}
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="gauges" className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Gauges</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Breakdown</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview tab - Pie chart */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allocation by Asset Class</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationPieChart
                allocations={classAllocations}
                onClassClick={handleClassClick}
                selectedClassId={selectedClassId}
                totalValue={data.totalActiveValueBase}
                currency={data.baseCurrency}
                height={300}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison tab - Bar chart */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current vs Target Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationBarChart
                allocations={classAllocations}
                showTargets={true}
                onClassClick={handleClassClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gauges tab */}
        <TabsContent value="gauges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allocation Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classAllocations.map((alloc) => (
                <AllocationGauge
                  key={alloc.classId}
                  className={alloc.className}
                  currentPercent={alloc.percentage}
                  targetMin={alloc.targetMin}
                  targetMax={alloc.targetMax}
                  status={alloc.status}
                  onClick={() => handleClassClick(alloc.classId)}
                  isExpanded={expandedClassId === alloc.classId}
                  hasSubclasses={
                    (data.classes.find((c) => c.classId === alloc.classId)?.subclasses.length ??
                      0) > 0
                  }
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown tab - Subclass details */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subclass Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {subclassData.length > 0 ? (
                <SubclassBreakdownList
                  items={subclassData}
                  expandedClassId={expandedClassId}
                  onClassToggle={handleClassClick}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div>No subclass data available</div>
                  <div className="text-sm">Configure subclasses in settings.</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected class detail (shown below tabs when a class is selected) */}
      {expandedClassId && expandedClassId !== "unclassified" && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {data.classes.find((c) => c.classId === expandedClassId)?.className} Details
              </span>
              <button
                onClick={() => setExpandedClassId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const classData = data.classes.find((c) => c.classId === expandedClassId);
              if (!classData) return null;

              return (
                <div className="space-y-4">
                  {/* Class summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Allocation</div>
                      <div className="font-semibold text-lg">
                        {formatAllocationPercent(classData.percentage)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Assets</div>
                      <div className="font-semibold text-lg">{classData.assetCount}</div>
                    </div>
                    {classData.targetMin && classData.targetMax && (
                      <div>
                        <div className="text-muted-foreground">Target Range</div>
                        <div className="font-semibold text-lg">
                          {formatAllocationPercent(classData.targetMin)} -{" "}
                          {formatAllocationPercent(classData.targetMax)}%
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div
                        className={cn(
                          "font-semibold text-lg capitalize",
                          classData.status === "on-target" && "text-emerald-600",
                          classData.status === "under" && "text-red-600",
                          classData.status === "over" && "text-amber-600",
                          classData.status === "no-target" && "text-slate-600"
                        )}
                      >
                        {classData.status.replace("-", " ")}
                      </div>
                    </div>
                  </div>

                  {/* Subclasses */}
                  {classData.subclasses.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="text-sm font-medium mb-2">Subclasses</div>
                      <div className="space-y-2">
                        {classData.subclasses.map((sub) => (
                          <div
                            key={sub.subclassId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{sub.subclassName}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">{sub.assetCount} assets</span>
                              <span className="font-mono">
                                {formatAllocationPercent(sub.percentageOfClass)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Skeleton for the allocation section
 */
export function AllocationSectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("", className)}>
      <AllocationLoadingSkeleton />
    </div>
  );
}
