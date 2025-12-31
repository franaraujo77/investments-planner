"use client";

/**
 * AllocationPieChart Component
 *
 * Story 3.7: Allocation Percentage View
 * AC-3.7.1: Pie/donut chart showing allocation by asset class
 * AC-3.7.4: Percentages show with 1 decimal precision
 *
 * Features:
 * - Donut chart using Recharts
 * - Labeled segments with class name + percentage
 * - Interactive: click to expand subclass breakdown
 * - Legend with color key
 * - Center shows total or "Portfolio Allocation"
 */

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

export interface ClassAllocation {
  classId: string;
  className: string;
  value: string;
  percentage: string;
  assetCount: number;
  targetMin: string | null;
  targetMax: string | null;
  status: AllocationStatus;
  color?: string;
}

export interface AllocationPieChartProps {
  /** Array of class allocations to display */
  allocations: ClassAllocation[];
  /** Callback when a class segment is clicked */
  onClassClick?: (classId: string) => void;
  /** Currently selected class (for highlighting) */
  selectedClassId?: string | null;
  /** Total portfolio value for center display */
  totalValue?: string;
  /** Currency code for value formatting */
  currency?: string;
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Chart height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Locale for number formatting (defaults to "en-US") */
  locale?: string;
}

/**
 * Color palette for chart segments
 * Using distinct colors that work well for financial data
 * Exported for testing
 */
export const CHART_COLORS = [
  "hsl(222, 47%, 51%)", // Blue
  "hsl(142, 71%, 45%)", // Green
  "hsl(38, 92%, 50%)", // Amber
  "hsl(0, 84%, 60%)", // Red
  "hsl(262, 83%, 58%)", // Purple
  "hsl(173, 80%, 40%)", // Teal
  "hsl(25, 95%, 53%)", // Orange
  "hsl(339, 80%, 51%)", // Pink
  "hsl(210, 40%, 52%)", // Steel Blue
  "hsl(142, 36%, 36%)", // Forest Green
];

/**
 * Get color for a chart segment
 * Exported for testing
 */
export function getSegmentColor(index: number, customColor?: string): string {
  if (customColor) return customColor;
  return CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0]!;
}

/**
 * Custom tooltip component for the pie chart
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ClassAllocation & { fill: string };
  }>;
  currency?: string | undefined;
}

function CustomTooltip({ active, payload, currency }: CustomTooltipProps) {
  const { formatNumber, formatCurrency } = useNumberFormat();

  if (!active || !payload || payload.length === 0 || !payload[0]) {
    return null;
  }

  const data = payload[0].payload;

  // Format percentage values with 1 decimal place
  const formatPct = (val: string) =>
    formatNumber(parseFloat(val), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Format value
  const formatVal = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num)) return val;
    return currency ? formatCurrency(num, currency) : formatNumber(num);
  };

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
        {data.className}
      </div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>
          Allocation:{" "}
          <span className="font-mono text-foreground">{formatPct(data.percentage)}%</span>
        </div>
        <div>
          Value: <span className="font-mono text-foreground">{formatVal(data.value)}</span>
        </div>
        <div>Assets: {data.assetCount}</div>
        {data.targetMin !== null && data.targetMax !== null && (
          <div>
            Target: {formatPct(data.targetMin)} - {formatPct(data.targetMax)}%
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom legend component
 */
interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: ClassAllocation;
  }>;
  onLegendClick?: ((classId: string) => void) | undefined;
  selectedClassId?: string | null | undefined;
}

function CustomLegend({ payload, onLegendClick, selectedClassId }: LegendProps) {
  const { formatNumber } = useNumberFormat();

  if (!payload) return null;

  const formatPct = (val: string) =>
    formatNumber(parseFloat(val), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div
      className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2"
      role="list"
      aria-label="Allocation legend"
    >
      {payload.map((entry) => (
        <button
          key={entry.payload.classId}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2 py-0.5 rounded transition-colors",
            onLegendClick && "cursor-pointer hover:bg-muted",
            selectedClassId === entry.payload.classId && "bg-muted ring-1 ring-ring"
          )}
          onClick={() => onLegendClick?.(entry.payload.classId)}
          type="button"
          role="listitem"
          aria-label={`${entry.value}: ${formatPct(entry.payload.percentage)}% allocation${selectedClassId === entry.payload.classId ? " (selected)" : ""}`}
          aria-current={selectedClassId === entry.payload.classId ? "true" : undefined}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span>{entry.value}</span>
          <span className="text-muted-foreground font-mono whitespace-nowrap">
            {formatPct(entry.payload.percentage)}%
          </span>
        </button>
      ))}
    </div>
  );
}

export function AllocationPieChart({
  allocations,
  onClassClick,
  selectedClassId,
  totalValue,
  currency,
  showLegend = true,
  height = 300,
  className,
}: AllocationPieChartProps) {
  const { formatNumber, formatCurrency } = useNumberFormat();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Prepare chart data with colors
  const chartData = useMemo(() => {
    return allocations.map((alloc, index) => ({
      ...alloc,
      // Convert percentage to number for chart
      value: parseFloat(alloc.percentage) || 0,
      fill: getSegmentColor(index, alloc.color),
    }));
  }, [allocations]);

  // Compute active index from selectedClassId or hover state
  const currentActiveIndex = useMemo(() => {
    if (selectedClassId) {
      const index = chartData.findIndex((d) => d.classId === selectedClassId);
      if (index !== -1) return index;
    }
    return activeIndex;
  }, [selectedClassId, chartData, activeIndex]);

  // Handle segment click
  const handleClick = (_: unknown, index: number) => {
    const classId = chartData[index]?.classId;
    if (classId && onClassClick) {
      setActiveIndex(index);
      onClassClick(classId);
    }
  };

  // Handle mouse enter for hover effect
  const handleMouseEnter = (_: unknown, index: number) => {
    if (!selectedClassId) {
      setActiveIndex(index);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (!selectedClassId) {
      setActiveIndex(undefined);
    }
  };

  // Format percentage values with 1 decimal place
  const formatPct = (val: string) =>
    formatNumber(parseFloat(val), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Format value for center display
  const formatVal = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num)) return val;
    return currency ? formatCurrency(num, currency) : formatNumber(num);
  };

  // Generate accessible description of allocations
  // Must be before early return to follow rules of hooks
  const accessibleDescription = useMemo(() => {
    if (allocations.length === 0) return "No allocation data available";
    const descriptions = chartData.map(
      (alloc) => `${alloc.className}: ${formatPct(alloc.percentage)}%`
    );
    return `Portfolio allocation breakdown: ${descriptions.join(", ")}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations.length, chartData]);

  // Empty state
  if (allocations.length === 0) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center text-muted-foreground", className)}
        style={{ height }}
        data-testid="allocation-pie-chart-empty"
      >
        <div className="text-lg font-medium">No allocation data</div>
        <div className="text-sm">Add assets to see allocation breakdown</div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full", className)}
      data-testid="allocation-pie-chart"
      role="figure"
      aria-label="Portfolio allocation pie chart"
      aria-describedby="allocation-chart-description"
    >
      {/* Screen reader description */}
      <div id="allocation-chart-description" className="sr-only">
        {accessibleDescription}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="className"
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: onClassClick ? "pointer" : "default" }}
            // AC-3.1.2: Smooth animation transitions (<200ms)
            isAnimationActive={true}
            animationDuration={200}
            animationBegin={0}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${entry.classId}`}
                fill={entry.fill}
                stroke="transparent"
                opacity={currentActiveIndex !== undefined && currentActiveIndex !== index ? 0.6 : 1}
              />
            ))}
          </Pie>
          <RechartsTooltip
            content={<CustomTooltip currency={currency} />}
            wrapperStyle={{ outline: "none" }}
          />
          {showLegend && (
            <Legend
              content={
                <CustomLegend onLegendClick={onClassClick} selectedClassId={selectedClassId} />
              }
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Center label - only visible if we have a total value */}
      {totalValue && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-sm font-semibold">{formatVal(totalValue)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for the pie chart
 */
export function AllocationPieChartSkeleton({
  height = 300,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center", className)} style={{ height }}>
      <div className="relative">
        <div className="w-44 h-44 rounded-full border-8 border-muted animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-background" />
        </div>
      </div>
    </div>
  );
}

/**
 * Legacy export functions for backward compatibility in tests
 * @deprecated Use useNumberFormat hook directly
 */
export function formatPercent(value: string): string {
  try {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return value;
    return num.toFixed(1); // eslint-disable-line no-restricted-syntax
  } catch {
    return value;
  }
}

/**
 * Legacy export function for backward compatibility in tests
 * @deprecated Use useNumberFormat hook directly
 */
export function formatValue(value: string, currency?: string, locale: string = "en-US"): string {
  try {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return value;

    // eslint-disable-next-line no-restricted-syntax
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

    return currency ? `${currency} ${formatted}` : formatted;
  } catch {
    return value;
  }
}
