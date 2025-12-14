"use client";

/**
 * AllocationComparisonView Component
 *
 * Story 7.10: View Updated Allocation
 * AC-7.10.1: Before/After Allocation Comparison
 * AC-7.10.2: Improved Allocations Highlighted
 * AC-7.10.3: Navigate to Portfolio View
 *
 * Features:
 * - Before/after allocation comparison by asset class
 * - Delta calculation for each class
 * - Visual highlighting: green for improved, red for worse
 * - Direction indicators (↑ ↓)
 * - Navigation to Portfolio view
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface AllocationComparisonViewProps {
  /** Allocation percentages before investment (assetClass -> "48.5%") */
  before: Record<string, string>;
  /** Allocation percentages after investment (assetClass -> "52.3%") */
  after: Record<string, string>;
  /** Optional target ranges for improvement detection */
  targets?: Record<string, { min: string; max: string }> | undefined;
  /** Called when user clicks "View Portfolio" */
  onNavigateToPortfolio: () => void;
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
  const sign = delta > 0 ? "+" : "";
  const formatted = `${sign}${delta.toFixed(1)}%`;

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
 * />
 * ```
 */
export function AllocationComparisonView({
  before,
  after,
  targets,
  onNavigateToPortfolio,
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

  return (
    <Card className="w-full" data-testid="allocation-comparison-view">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg">Investments Confirmed!</CardTitle>
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
          {deltas.map((delta) => (
            <AllocationRow key={delta.className} delta={delta} />
          ))}
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
 */
function getColorClasses(delta: AllocationDelta): { text: string; bg: string } {
  // AC-7.10.2: Green for improved, different color for worse
  if (delta.isImproved === true) {
    return {
      text: "text-green-600",
      bg: "bg-green-50",
    };
  }
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
 */
function AllocationRow({ delta }: AllocationRowProps) {
  const colors = getColorClasses(delta);

  return (
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
}

export default AllocationComparisonView;
