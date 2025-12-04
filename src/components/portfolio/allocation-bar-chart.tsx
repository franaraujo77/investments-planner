"use client";

/**
 * AllocationBarChart Component
 *
 * Story 3.7: Allocation Percentage View
 * AC-3.7.2: Bar chart comparing current allocation vs target range
 * AC-3.7.5: Status color coding
 * AC-3.7.7: Handle classes without targets gracefully
 *
 * Features:
 * - Horizontal bars per class
 * - Current allocation as filled bar
 * - Target range as reference markers or shaded area
 * - Color coding based on status
 * - Labels showing percentages
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Decimal } from "@/lib/calculations/decimal-config";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

export interface ClassAllocationForBar {
  classId: string;
  className: string;
  value: string;
  percentage: string;
  assetCount: number;
  targetMin: string | null;
  targetMax: string | null;
  status: AllocationStatus;
}

export interface AllocationBarChartProps {
  /** Array of class allocations to display */
  allocations: ClassAllocationForBar[];
  /** Whether to show target range indicators */
  showTargets?: boolean;
  /** Callback when a bar is clicked */
  onClassClick?: (classId: string) => void;
  /** Chart height (auto-calculated based on number of classes) */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color for status
 * Per UX spec:
 * - Green (on-target): emerald-500
 * - Amber (near boundary): amber-500
 * - Red (out of range): red-500
 * - Gray (no target): slate-400
 */
function getStatusColor(status: AllocationStatus): string {
  switch (status) {
    case "on-target":
      return "hsl(142, 71%, 45%)"; // emerald-500
    case "under":
      return "hsl(0, 84%, 60%)"; // red-500
    case "over":
      return "hsl(38, 92%, 50%)"; // amber-500
    case "no-target":
    default:
      return "hsl(215, 16%, 47%)"; // slate-500
  }
}

/**
 * Format percentage with 1 decimal precision
 * AC-3.7.4: Percentages show with 1 decimal precision
 */
function formatPercent(value: string | number): string {
  try {
    if (typeof value === "number") {
      return new Decimal(value).toFixed(1);
    }
    return new Decimal(value).toFixed(1);
  } catch {
    return String(value);
  }
}

/**
 * Custom tooltip component for the bar chart
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ClassAllocationForBar & { fill: string; percentValue: number };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]) {
    return null;
  }

  const data = payload[0].payload;
  const statusLabel = {
    "on-target": "On target",
    under: "Under-allocated",
    over: "Over-allocated",
    "no-target": "No target set",
  }[data.status];

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold flex items-center gap-2">
        <span className="w-3 h-3 rounded" style={{ backgroundColor: data.fill }} />
        {data.className}
      </div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>
          Current:{" "}
          <span className="font-mono text-foreground">{formatPercent(data.percentage)}%</span>
        </div>
        {data.targetMin !== null && data.targetMax !== null && (
          <div>
            Target:{" "}
            <span className="font-mono text-foreground">
              {formatPercent(data.targetMin)} - {formatPercent(data.targetMax)}%
            </span>
          </div>
        )}
        <div>
          Status:{" "}
          <span className="font-medium" style={{ color: data.fill }}>
            {statusLabel}
          </span>
        </div>
        <div>Assets: {data.assetCount}</div>
      </div>
    </div>
  );
}

/**
 * Custom Y-axis tick to show class names
 */
interface YAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

function CustomYAxisTick({ x, y, payload }: YAxisTickProps) {
  if (!payload) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        dy={4}
        textAnchor="end"
        fill="currentColor"
        className="text-xs fill-muted-foreground"
      >
        {payload.value.length > 12 ? `${payload.value.slice(0, 12)}...` : payload.value}
      </text>
    </g>
  );
}

/**
 * Custom label showing percentage on the bar
 */
interface BarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  fill?: string;
}

function BarLabel({ x, y, width, height, value }: BarLabelProps) {
  if (!x || !y || !width || !height || value === undefined) return null;

  // Position label to the right of the bar
  const labelX = x + width + 8;
  const labelY = y + height / 2;

  return (
    <text
      x={labelX}
      y={labelY}
      dy={4}
      textAnchor="start"
      className="text-xs fill-foreground font-mono"
    >
      {formatPercent(value)}%
    </text>
  );
}

export function AllocationBarChart({
  allocations,
  showTargets = true,
  onClassClick,
  height: propHeight,
  className,
}: AllocationBarChartProps) {
  // Calculate height based on number of items
  const barHeight = 40;
  const calculatedHeight = Math.max(150, allocations.length * barHeight + 40);
  const height = propHeight ?? calculatedHeight;

  // Prepare chart data
  const chartData = useMemo(() => {
    return allocations.map((alloc) => ({
      ...alloc,
      // Convert percentage to number for chart
      percentValue: parseFloat(alloc.percentage) || 0,
      fill: getStatusColor(alloc.status),
      targetMinNum: alloc.targetMin ? parseFloat(alloc.targetMin) : null,
      targetMaxNum: alloc.targetMax ? parseFloat(alloc.targetMax) : null,
    }));
  }, [allocations]);

  // Calculate domain max (ensure bars don't overflow)
  const maxValue = useMemo(() => {
    let max = 100;
    for (const item of chartData) {
      max = Math.max(max, item.percentValue, item.targetMaxNum ?? 0);
    }
    return Math.ceil(max / 10) * 10; // Round up to nearest 10
  }, [chartData]);

  // Handle bar click
  const handleBarClick = (data: ClassAllocationForBar) => {
    if (onClassClick) {
      onClassClick(data.classId);
    }
  };

  // Empty state
  if (allocations.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-muted-foreground p-8",
          className
        )}
        style={{ height: 150 }}
        data-testid="allocation-bar-chart-empty"
      >
        <div className="text-lg font-medium">No allocation data</div>
        <div className="text-sm">Add assets to see allocation comparison</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} data-testid="allocation-bar-chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 50, left: 80, bottom: 5 }}
        >
          <XAxis
            type="number"
            domain={[0, maxValue]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            type="category"
            dataKey="className"
            tick={<CustomYAxisTick />}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <RechartsTooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: "none" }}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          />

          {/* Target range reference lines (if showing targets) */}
          {showTargets && (
            <>{/* We'll add individual reference lines per bar via custom rendering */}</>
          )}

          {/* Main allocation bars */}
          <Bar
            dataKey="percentValue"
            radius={[0, 4, 4, 0]}
            onClick={(data) => handleBarClick(data as unknown as ClassAllocationForBar)}
            style={{ cursor: onClassClick ? "pointer" : "default" }}
            label={<BarLabel />}
          >
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.classId}`} fill={entry.fill} />
            ))}
          </Bar>

          {/* Target markers as reference lines */}
          {showTargets &&
            chartData
              .filter((d) => d.targetMinNum !== null)
              .map((d) => (
                <ReferenceLine
                  key={`target-min-${d.classId}`}
                  x={d.targetMinNum!}
                  stroke="hsl(142, 71%, 45%)"
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
              ))}
          {showTargets &&
            chartData
              .filter((d) => d.targetMaxNum !== null)
              .map((d) => (
                <ReferenceLine
                  key={`target-max-${d.classId}`}
                  x={d.targetMaxNum!}
                  stroke="hsl(142, 71%, 45%)"
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
              ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span>On Target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span>Under</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500" />
          <span>Over</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-500" />
          <span>No Target</span>
        </div>
        {showTargets && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-emerald-500" />
            <span>Target Range</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the bar chart
 */
export function AllocationBarChartSkeleton({
  height = 200,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 p-4", className)} style={{ height }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-20 h-4 bg-muted rounded animate-pulse" />
          <div className="flex-1 h-6 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
