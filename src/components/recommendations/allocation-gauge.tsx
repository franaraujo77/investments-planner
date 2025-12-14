"use client";

/**
 * AllocationGauge Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * AC-7.5.2: RecommendationCard Display - Shows current vs target allocation
 *
 * Visual gauge showing:
 * - Current allocation position
 * - Target range (min to max)
 * - Color coding based on position relative to target
 *
 * Colors:
 * - Green: Within target range
 * - Amber: Near target (within 5% of boundary)
 * - Red: Outside target range
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type AllocationStatus = "within" | "near" | "outside";

export interface AllocationGaugeProps {
  /** Current allocation percentage (decimal string) */
  current: string;
  /** Target minimum percentage (decimal string) */
  targetMin: string;
  /** Target maximum percentage (decimal string) */
  targetMax: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show percentage values */
  showValues?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Determine allocation status relative to target range
 *
 * @param current - Current allocation percentage
 * @param targetMin - Target minimum percentage
 * @param targetMax - Target maximum percentage
 * @returns Allocation status
 */
export function getAllocationStatus(
  current: number,
  targetMin: number,
  targetMax: number
): AllocationStatus {
  const nearThreshold = 5; // 5% threshold for "near" status

  if (current >= targetMin && current <= targetMax) {
    return "within";
  }

  // Check if near the boundary
  if (
    (current >= targetMin - nearThreshold && current < targetMin) ||
    (current > targetMax && current <= targetMax + nearThreshold)
  ) {
    return "near";
  }

  return "outside";
}

/**
 * Get color classes for allocation status
 */
function getStatusColors(status: AllocationStatus): {
  bar: string;
  text: string;
} {
  switch (status) {
    case "within":
      return {
        bar: "bg-green-500",
        text: "text-green-600",
      };
    case "near":
      return {
        bar: "bg-amber-500",
        text: "text-amber-600",
      };
    case "outside":
      return {
        bar: "bg-red-500",
        text: "text-red-600",
      };
  }
}

// =============================================================================
// SIZE CLASSES
// =============================================================================

const sizeClasses = {
  sm: {
    container: "h-1.5",
    text: "text-xs",
  },
  md: {
    container: "h-2",
    text: "text-sm",
  },
  lg: {
    container: "h-3",
    text: "text-base",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AllocationGauge Component
 *
 * Displays a visual gauge showing current allocation vs target range.
 *
 * @example
 * ```tsx
 * <AllocationGauge
 *   current="25.5"
 *   targetMin="20"
 *   targetMax="30"
 *   showValues
 * />
 * ```
 */
export function AllocationGauge({
  current,
  targetMin,
  targetMax,
  className,
  showValues = true,
  size = "md",
}: AllocationGaugeProps) {
  // Parse values
  const currentValue = useMemo(() => parseFloat(current) || 0, [current]);
  const minValue = useMemo(() => parseFloat(targetMin) || 0, [targetMin]);
  const maxValue = useMemo(() => parseFloat(targetMax) || 100, [targetMax]);

  // Calculate status
  const status = useMemo(
    () => getAllocationStatus(currentValue, minValue, maxValue),
    [currentValue, minValue, maxValue]
  );

  // Get colors
  const colors = useMemo(() => getStatusColors(status), [status]);

  // Calculate target midpoint for display
  const targetMidpoint = useMemo(
    () => ((minValue + maxValue) / 2).toFixed(1),
    [minValue, maxValue]
  );

  // Calculate bar width (clamp to 0-100)
  const barWidth = useMemo(() => Math.min(Math.max(currentValue, 0), 100), [currentValue]);

  // Calculate target range position for visual indicator
  const rangeStart = useMemo(() => Math.min(Math.max(minValue, 0), 100), [minValue]);
  const rangeEnd = useMemo(() => Math.min(Math.max(maxValue, 0), 100), [maxValue]);

  return (
    <div className={cn("w-full", className)} data-testid="allocation-gauge">
      {/* Values display */}
      {showValues && (
        <div className={cn("flex justify-between mb-1", sizeClasses[size].text)}>
          <span className={cn("font-medium", colors.text)} data-testid="current-value">
            {currentValue.toFixed(1)}%
          </span>
          <span className="text-muted-foreground" data-testid="target-value">
            Target: {targetMidpoint}%
          </span>
        </div>
      )}

      {/* Gauge bar */}
      <div
        className={cn(
          "relative w-full rounded-full bg-muted overflow-hidden",
          sizeClasses[size].container
        )}
        role="progressbar"
        aria-valuenow={currentValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Allocation: ${currentValue.toFixed(1)}% (target: ${minValue.toFixed(1)}-${maxValue.toFixed(1)}%)`}
      >
        {/* Target range indicator (background) */}
        <div
          className="absolute h-full bg-muted-foreground/10"
          style={{
            left: `${rangeStart}%`,
            width: `${rangeEnd - rangeStart}%`,
          }}
          data-testid="target-range"
        />

        {/* Current value bar */}
        <div
          className={cn("h-full rounded-full transition-all duration-300", colors.bar)}
          style={{ width: `${barWidth}%` }}
          data-testid="current-bar"
        />
      </div>

      {/* Status indicator */}
      <div className={cn("mt-1 flex items-center gap-1", sizeClasses[size].text)}>
        <span className={cn("inline-block w-2 h-2 rounded-full", colors.bar)} aria-hidden="true" />
        <span className={cn("text-muted-foreground capitalize")} data-testid="status-text">
          {status === "within" ? "On target" : status === "near" ? "Near target" : "Off target"}
        </span>
      </div>
    </div>
  );
}
