"use client";

/**
 * AllocationComparisonView Component
 *
 * Story 7.10: View Updated Allocation
 * AC-7.10.1: Before/After Allocation Comparison
 * AC-7.10.2: Improved Allocations Highlighted
 * AC-7.10.3: Navigate to Portfolio View
 *
 * Story 6.6: Before/After Comparison Enhancement
 * AC-6.6.5: Dual Pie Chart Comparison
 * AC-6.6.3: Portfolio Summary Display
 * AC-6.6.2: Color-Coded Allocation Changes
 *
 * Features:
 * - Before/after allocation comparison by asset class
 * - Delta calculation for each class
 * - Visual highlighting: green for improved, red for worse
 * - Direction indicators (↑ ↓)
 * - Navigation to Portfolio view
 * - Dual pie charts for visual comparison (AC-6.6.5)
 * - Portfolio summary section (AC-6.6.3)
 * - Tooltips showing movement toward/away from target (AC-6.6.2)
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import {
  AllocationPieChart,
  CHART_COLORS,
  type ClassAllocation,
} from "@/components/portfolio/allocation-pie-chart";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Threshold for significant allocation worsening (in percentage points)
 *
 * AC-6.6.2: Color-coded allocation changes
 * - Worsening > threshold = red (significant)
 * - Worsening <= threshold = amber (slight)
 */
const SIGNIFICANT_WORSENING_THRESHOLD = 2;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Portfolio summary data for display in comparison view
 *
 * Story 6.6: Before/After Comparison
 * AC-6.6.3: Portfolio Summary Display
 */
export interface PortfolioSummaryData {
  /** Total portfolio value before investment (decimal string) */
  valueBefore: string;
  /** Total portfolio value after investment (decimal string) */
  valueAfter: string;
  /** Total amount invested this cycle (decimal string) */
  amountInvested: string;
  /** Portfolio health score before (optional - calculated from allocation gaps) */
  healthScoreBefore?: string;
  /** Portfolio health score after */
  healthScoreAfter?: string;
}

export interface AllocationComparisonViewProps {
  /** Allocation percentages before investment (assetClass -> "48.5%") */
  before: Record<string, string>;
  /** Allocation percentages after investment (assetClass -> "52.3%") */
  after: Record<string, string>;
  /** Optional target ranges for improvement detection */
  targets?: Record<string, { min: string; max: string }> | undefined;
  /** Called when user clicks "View Portfolio" */
  onNavigateToPortfolio: () => void;
  /** Whether to show pie charts (default: true) - AC-6.6.5 */
  showPieCharts?: boolean | undefined;
  /** Portfolio summary data for before/after values - AC-6.6.3 */
  portfolioSummary?: PortfolioSummaryData | undefined;
  /** Currency code for formatting (default: "USD") */
  currency?: string | undefined;
}

export interface AllocationDelta {
  /** Asset class name */
  className: string;
  /** Before value as percentage string */
  before: string;
  /** After value as percentage string */
  after: string;
  /** Delta value (number) */
  deltaValue: number;
  /** Formatted delta string (+3.8% or -2.1%) */
  deltaFormatted: string;
  /** Whether this is an improvement (closer to target) */
  isImproved: boolean | null;
  /** Direction: 'up', 'down', or 'none' */
  direction: "up" | "down" | "none";
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse percentage string to number
 * Handles formats like "48.5%", "48.5", "48.50%"
 */
export function parsePercentage(value: string): number {
  const cleaned = value.replace("%", "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculate delta between before and after allocations
 *
 * AC-7.10.1: Delta (change) is calculated for each class
 */
export function calculateDelta(
  before: string,
  after: string
): { value: number; formatted: string } {
  const beforeValue = parsePercentage(before);
  const afterValue = parsePercentage(after);
  const delta = afterValue - beforeValue;

  // Format with sign and 1 decimal place
  // Note: toFixed is acceptable here as this is a calculation helper for delta formatting,
  // not user-facing currency/number display (which should use useNumberFormat hook)
  const sign = delta > 0 ? "+" : "";
  const formatted = `${sign}${delta.toFixed(1)}%`; // eslint-disable-line no-restricted-syntax

  return { value: delta, formatted };
}

/**
 * Determine if allocation improved (moved closer to target)
 *
 * AC-7.10.2: Improved allocations are highlighted (green for closer to target)
 *
 * @param before - Before allocation percentage
 * @param after - After allocation percentage
 * @param targetMin - Target range minimum
 * @param targetMax - Target range maximum
 * @returns true if improved, false if worse, null if no target available
 */
export function isImproved(
  before: string,
  after: string,
  targetMin?: string,
  targetMax?: string
): boolean | null {
  // Cannot determine improvement without targets
  if (!targetMin || !targetMax) {
    return null;
  }

  const beforeValue = parsePercentage(before);
  const afterValue = parsePercentage(after);
  const minValue = parsePercentage(targetMin);
  const maxValue = parsePercentage(targetMax);

  // Target midpoint
  const targetMid = (minValue + maxValue) / 2;

  // Calculate distance from target midpoint
  const beforeDistance = Math.abs(beforeValue - targetMid);
  const afterDistance = Math.abs(afterValue - targetMid);

  // Improved if closer to target
  return afterDistance < beforeDistance;
}

/**
 * Get direction of change
 */
export function getDirection(delta: number): "up" | "down" | "none" {
  if (delta > 0.01) return "up";
  if (delta < -0.01) return "down";
  return "none";
}

/**
 * Calculate all allocation deltas
 *
 * @param before - Before allocations
 * @param after - After allocations
 * @param targets - Optional targets for improvement detection
 * @returns Array of allocation deltas
 */
export function calculateAllocationDeltas(
  before: Record<string, string>,
  after: Record<string, string>,
  targets?: Record<string, { min: string; max: string }>
): AllocationDelta[] {
  // Combine all unique class names
  const classNames = new Set([...Object.keys(before), ...Object.keys(after)]);

  const deltas: AllocationDelta[] = [];

  for (const className of classNames) {
    const beforeValue = before[className] ?? "0.0%";
    const afterValue = after[className] ?? "0.0%";
    const target = targets?.[className];

    const delta = calculateDelta(beforeValue, afterValue);
    const improved = isImproved(beforeValue, afterValue, target?.min, target?.max);
    const direction = getDirection(delta.value);

    deltas.push({
      className,
      before: beforeValue,
      after: afterValue,
      deltaValue: delta.value,
      deltaFormatted: delta.formatted,
      isImproved: improved,
      direction,
    });
  }

  // Sort by absolute delta (biggest changes first)
  deltas.sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue));

  return deltas;
}

/**
 * Calculate the distance moved toward or away from target
 *
 * AC-6.6.2: Tooltip showing "Moved X% closer/further from target"
 *
 * @param before - Before allocation percentage
 * @param after - After allocation percentage
 * @param targetMin - Target range minimum
 * @param targetMax - Target range maximum
 * @returns Description of movement toward/away from target, or null if no target
 */
export function calculateTargetMovement(
  before: string,
  after: string,
  targetMin?: string,
  targetMax?: string
): string | null {
  if (!targetMin || !targetMax) {
    return null;
  }

  const beforeValue = parsePercentage(before);
  const afterValue = parsePercentage(after);
  const minValue = parsePercentage(targetMin);
  const maxValue = parsePercentage(targetMax);
  const targetMid = (minValue + maxValue) / 2;

  const beforeDistance = Math.abs(beforeValue - targetMid);
  const afterDistance = Math.abs(afterValue - targetMid);
  const movement = beforeDistance - afterDistance;

  // Note: toFixed is acceptable here for tooltip display formatting (internal calculation)
  // eslint-disable-next-line no-restricted-syntax -- tooltip string, not user number display
  const movementAbs = Math.abs(movement).toFixed(1);

  if (movement > 0.01) {
    return `Moved ${movementAbs}% closer to target`;
  } else if (movement < -0.01) {
    return `Moved ${movementAbs}% further from target`;
  }
  return "No change in distance to target";
}

/**
 * Transform allocation record to pie chart data format
 *
 * AC-6.6.5: Dual Pie Chart Comparison
 *
 * @param allocations - Allocation percentages (assetClass -> "48.5%")
 * @returns Array of ClassAllocation for pie chart
 */
export function transformToPieChartData(allocations: Record<string, string>): ClassAllocation[] {
  const entries = Object.entries(allocations);

  return entries.map(([className, percentage], index) => {
    const value = parsePercentage(percentage);
    // Get color with fallback for strict typing
    const colorIndex = index % CHART_COLORS.length;
    const color = CHART_COLORS[colorIndex] ?? CHART_COLORS[0] ?? "hsl(222, 47%, 51%)";

    return {
      classId: className.toLowerCase().replace(/\s+/g, "-"),
      className,
      // Note: toString/toFixed used here for internal data transformation, not user display
      value: value.toString(),
      // eslint-disable-next-line no-restricted-syntax -- chart data format, not user display
      percentage: value.toFixed(1),
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
 * AllocationComparisonView Component
 *
 * Displays before/after allocation comparison with visual highlighting.
 *
 * @example
 * ```tsx
 * <AllocationComparisonView
 *   before={{ "Variable Income": "48.5%", "Fixed Income": "51.5%" }}
 *   after={{ "Variable Income": "52.3%", "Fixed Income": "47.7%" }}
 *   onNavigateToPortfolio={() => router.push("/portfolio")}
 *   showPieCharts={true}
 *   portfolioSummary={{
 *     valueBefore: "10000.00",
 *     valueAfter: "11000.00",
 *     amountInvested: "1000.00",
 *     healthScoreBefore: "75",
 *     healthScoreAfter: "85",
 *   }}
 *   currency="USD"
 * />
 * ```
 */
export function AllocationComparisonView({
  before,
  after,
  targets,
  onNavigateToPortfolio,
  showPieCharts = true,
  portfolioSummary,
  currency = "USD",
}: AllocationComparisonViewProps) {
  // Calculate deltas for all classes
  const deltas = useMemo(
    () => calculateAllocationDeltas(before, after, targets),
    [before, after, targets]
  );

  // Count improvements
  const improvementCount = useMemo(
    () => deltas.filter((d) => d.isImproved === true).length,
    [deltas]
  );

  // AC-6.5.4: Use "{Month} investments recorded" format
  // Use undefined locale to respect user's browser/system locale preference
  const monthName = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date()),
    []
  );

  // Transform allocations to pie chart data (AC-6.6.5)
  const beforeChartData = useMemo(() => transformToPieChartData(before), [before]);
  const afterChartData = useMemo(() => transformToPieChartData(after), [after]);

  return (
    <Card className="w-full" data-testid="allocation-comparison-view">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg">{monthName} Investments Recorded</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Your portfolio allocations have been updated.
          {improvementCount > 0 && (
            <span className="text-green-600 font-medium">
              {" "}
              {improvementCount} allocation{improvementCount !== 1 ? "s" : ""} improved.
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Portfolio Summary Section (AC-6.6.3) */}
        {portfolioSummary && (
          <>
            <PortfolioSummarySection summary={portfolioSummary} currency={currency} />
            <Separator />
          </>
        )}

        {/* Dual Pie Charts Section (AC-6.6.5) */}
        {showPieCharts && beforeChartData.length > 0 && afterChartData.length > 0 && (
          <>
            <BeforeAfterPieSection beforeData={beforeChartData} afterData={afterChartData} />
            <Separator />
          </>
        )}

        {/* Allocation comparison table */}
        <div className="rounded-lg border">
          {/* Header row */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
            <div>Asset Class</div>
            <div className="text-right">Before</div>
            <div className="text-right">After</div>
            <div className="text-right">Change</div>
          </div>

          {/* Data rows */}
          <TooltipProvider>
            {deltas.map((delta) => (
              <AllocationRow
                key={delta.className}
                delta={delta}
                target={targets?.[delta.className]}
              />
            ))}
          </TooltipProvider>
        </div>

        {/* Navigation button */}
        <div className="flex justify-end pt-2">
          <Button onClick={onNavigateToPortfolio} variant="default">
            View Portfolio
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface AllocationRowProps {
  delta: AllocationDelta;
  /** Target range for this allocation (for tooltip) */
  target?: { min: string; max: string } | undefined;
}

/**
 * Get direction icon based on direction
 * Defined outside component to avoid recreating during render
 */
function DirectionIcon({ direction }: { direction: "up" | "down" | "none" }) {
  // AC-7.10.2: Direction indicators (↑ ↓)
  switch (direction) {
    case "up":
      return <TrendingUp className="h-4 w-4" />;
    case "down":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get color classes based on improvement status
 *
 * AC-6.6.2: Color-coded changes
 * - Green: closer to target
 * - Red: significantly further from target (>2%)
 * - Amber: slightly further from target (0-2%)
 */
export function getColorClasses(
  delta: AllocationDelta,
  target?: { min: string; max: string }
): { text: string; bg: string } {
  // AC-7.10.2: Green for improved
  if (delta.isImproved === true) {
    return {
      text: "text-green-600",
      bg: "bg-green-50",
    };
  }

  // AC-6.6.2: Red for significant negative movement (>2% away from target)
  if (delta.isImproved === false && target) {
    const beforeValue = parsePercentage(delta.before);
    const afterValue = parsePercentage(delta.after);
    const minValue = parsePercentage(target.min);
    const maxValue = parsePercentage(target.max);
    const targetMid = (minValue + maxValue) / 2;

    const beforeDistance = Math.abs(beforeValue - targetMid);
    const afterDistance = Math.abs(afterValue - targetMid);
    const worsenedBy = afterDistance - beforeDistance;

    // More than threshold away from target = red (significant)
    if (worsenedBy > SIGNIFICANT_WORSENING_THRESHOLD) {
      return {
        text: "text-red-600",
        bg: "bg-red-50",
      };
    }
    // Within threshold = amber (slight)
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
    };
  }

  // isImproved === false without target - still show amber as a warning
  if (delta.isImproved === false) {
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
    };
  }

  // No target available - neutral based on direction
  if (delta.direction === "none") {
    return {
      text: "text-muted-foreground",
      bg: "",
    };
  }
  return {
    text: "text-foreground",
    bg: "",
  };
}

/**
 * Single row in the allocation comparison table
 *
 * AC-6.6.2: Includes tooltip showing movement toward/away from target
 */
function AllocationRow({ delta, target }: AllocationRowProps) {
  const colors = getColorClasses(delta, target);

  // Calculate tooltip message for target movement
  const tooltipMessage = calculateTargetMovement(
    delta.before,
    delta.after,
    target?.min,
    target?.max
  );

  const rowContent = (
    <div
      className={cn("grid grid-cols-4 gap-2 p-3 text-sm border-b last:border-b-0", colors.bg)}
      data-testid={`allocation-row-${delta.className.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Class name */}
      <div className="font-medium">{delta.className}</div>

      {/* Before */}
      <div className="text-right text-muted-foreground">{delta.before}</div>

      {/* After */}
      <div className="text-right font-medium">{delta.after}</div>

      {/* Delta with icon */}
      <div className={cn("text-right flex items-center justify-end gap-1", colors.text)}>
        <DirectionIcon direction={delta.direction} />
        <span>{delta.deltaFormatted}</span>
      </div>
    </div>
  );

  // Wrap in tooltip if we have a message (AC-6.6.2)
  if (tooltipMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return rowContent;
}

// =============================================================================
// PORTFOLIO SUMMARY SECTION (AC-6.6.3)
// =============================================================================

interface PortfolioSummarySectionProps {
  summary: PortfolioSummaryData;
  currency: string;
}

/**
 * Portfolio summary section showing value changes and health score
 *
 * AC-6.6.3: Portfolio Summary Display
 * - Total value before
 * - Amount invested (highlighted)
 * - Total value after
 * - Health score change (+/- indicator)
 */
function PortfolioSummarySection({ summary, currency }: PortfolioSummarySectionProps) {
  const { formatCurrency, formatNumber } = useNumberFormat();

  // Parse values for display
  const valueBefore = parseFloat(summary.valueBefore);
  const valueAfter = parseFloat(summary.valueAfter);
  const amountInvested = parseFloat(summary.amountInvested);

  // Health score change
  const healthBefore = summary.healthScoreBefore ? parseFloat(summary.healthScoreBefore) : null;
  const healthAfter = summary.healthScoreAfter ? parseFloat(summary.healthScoreAfter) : null;
  const healthChange =
    healthBefore !== null && healthAfter !== null ? healthAfter - healthBefore : null;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg"
      data-testid="portfolio-summary-section"
    >
      {/* Value Before */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Value Before</p>
        <p className="text-sm font-semibold">{formatCurrency(valueBefore, currency)}</p>
      </div>

      {/* Amount Invested (highlighted) */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Invested</p>
        <p className="text-sm font-semibold text-green-600">
          +{formatCurrency(amountInvested, currency)}
        </p>
      </div>

      {/* Value After */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Value After</p>
        <p className="text-sm font-semibold">{formatCurrency(valueAfter, currency)}</p>
      </div>

      {/* Health Score Change */}
      {healthChange !== null && healthAfter !== null && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Health Score</p>
          <p className="text-sm font-semibold">
            <span>{formatNumber(healthAfter, { maximumFractionDigits: 0 })}</span>
            <span
              className={cn(
                "ml-1 text-xs",
                healthChange > 0 ? "text-green-600" : healthChange < 0 ? "text-red-600" : ""
              )}
            >
              {healthChange > 0 ? "+" : ""}
              {healthChange !== 0 && formatNumber(healthChange, { maximumFractionDigits: 0 })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BEFORE/AFTER PIE SECTION (AC-6.6.5)
// =============================================================================

/**
 * Props for BeforeAfterPieSection component
 */
interface BeforeAfterPieSectionProps {
  /** Allocation data for "before" pie chart */
  beforeData: ClassAllocation[];
  /** Allocation data for "after" pie chart */
  afterData: ClassAllocation[];
}

/**
 * Side-by-side pie charts showing before and after allocations
 *
 * Story 6.6: Before/After Comparison Enhancement
 * AC-6.6.5: Dual Pie Chart Comparison
 *
 * Features:
 * - Before and after pie charts rendered side by side
 * - Responsive layout: side-by-side on desktop (md+), stacked on mobile
 * - "Before" and "After" labels above each chart
 * - Reuses AllocationPieChart component for consistent styling
 *
 * @param props - Component props
 * @param props.beforeData - Array of ClassAllocation for the "before" state
 * @param props.afterData - Array of ClassAllocation for the "after" state
 * @returns JSX element containing two pie charts in a responsive grid
 *
 * @example
 * ```tsx
 * <BeforeAfterPieSection
 *   beforeData={[{ classId: "1", className: "Stocks", value: "60", percentage: "60.0", ... }]}
 *   afterData={[{ classId: "1", className: "Stocks", value: "55", percentage: "55.0", ... }]}
 * />
 * ```
 */
function BeforeAfterPieSection({ beforeData, afterData }: BeforeAfterPieSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="before-after-pie-section">
      {/* Before Pie Chart */}
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground mb-2">Before</p>
        <AllocationPieChart
          allocations={beforeData}
          showLegend={false}
          height={200}
          className="mx-auto"
        />
      </div>

      {/* After Pie Chart */}
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground mb-2">After</p>
        <AllocationPieChart
          allocations={afterData}
          showLegend={false}
          height={200}
          className="mx-auto"
        />
      </div>
    </div>
  );
}

export default AllocationComparisonView;
