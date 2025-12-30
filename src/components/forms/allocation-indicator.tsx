"use client";

/**
 * AllocationIndicator Component
 *
 * Story 3.2: Live Allocation Indicator
 * AC-3.2.1: Live Allocation Display
 * AC-3.2.2: Remaining Percentage (Underallocated)
 * AC-3.2.3: Valid Allocation Display
 * AC-3.2.4: Overallocated Display
 * AC-3.2.5: Real-Time Updates
 *
 * Features:
 * - Three visual states: underallocated, valid (100%), overallocated
 * - i18n-aware percentage formatting via useNumberFormat()
 * - Accessibility support with ARIA attributes
 * - Optional progress bar visualization
 * - Real-time updates when integrated with react-hook-form
 */

import { useMemo } from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { CheckCircle2, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { useLiveAllocationTotal } from "./allocation-pie-chart-live";

/**
 * Floating-point tolerance for equality comparisons
 * Per project-context.md and Story 3.3/3.4
 * Using 0.02 to account for JS floating-point precision errors
 * (e.g., |99.99 - 100| = 0.010000000000005116)
 */
export const ALLOCATION_FP_TOLERANCE = 0.02;

/**
 * Visual state of the allocation indicator
 */
export type AllocationState = "underallocated" | "valid" | "overallocated";

/**
 * Visual state for range-based allocation health
 * Story 3.4: Visual Status Feedback
 * AC-3.4.1-3.4.3
 */
export type AllocationHealthState = "healthy" | "attention" | "problem";

/**
 * Props for the AllocationIndicator component
 */
export interface AllocationIndicatorProps {
  /** Current total allocation (0-100+) */
  allocated: number;
  /** Remaining to reach 100% (can be negative if overallocated) */
  remaining: number;
  /** Is exactly 100%? */
  valid: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show visual progress bar */
  showProgress?: boolean;
}

/**
 * Determine the visual state based on allocation values
 * Exported for testing
 *
 * Logic:
 * - If valid flag is true → "valid" (exactly 100%)
 * - If remaining < 0 → "overallocated" (> 100%)
 * - Otherwise → "underallocated" (< 100%)
 */
export function getState(remaining: number, valid: boolean): AllocationState {
  if (valid) return "valid";
  if (remaining < 0) return "overallocated";
  return "underallocated";
}

/**
 * Get styling classes based on state
 * Exported for testing
 */
export function getStateStyles(state: AllocationState): {
  textColor: string;
  bgColor: string;
  progressColor: string;
} {
  switch (state) {
    case "valid":
      return {
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100/50 dark:bg-emerald-900/20",
        progressColor: "bg-emerald-500",
      };
    case "overallocated":
      return {
        textColor: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100/50 dark:bg-red-900/20",
        progressColor: "bg-red-500",
      };
    case "underallocated":
    default:
      return {
        textColor: "text-muted-foreground",
        bgColor: "bg-muted/30",
        progressColor: "bg-slate-400",
      };
  }
}

/**
 * Determine allocation health state based on range comparison
 * Story 3.4: Visual Status Feedback (AC-3.4.1-3.4.3)
 *
 * @param current - Current allocation percentage (0-100+)
 * @param targetMin - Minimum of target range
 * @param targetMax - Maximum of target range
 * @param tolerance - Tolerance for "attention" state (default 5%)
 * @returns AllocationHealthState - healthy, attention, or problem
 *
 * Logic:
 * - Within range (with 0.01 floating-point tolerance) → healthy
 * - Within tolerance of range → attention
 * - Beyond tolerance → problem
 */
export function getAllocationHealthState(
  current: number,
  targetMin: number,
  targetMax: number,
  tolerance: number = 5
): AllocationHealthState {
  // Check if within target range (with floating-point tolerance)
  const isWithinRange =
    current >= targetMin - ALLOCATION_FP_TOLERANCE &&
    current <= targetMax + ALLOCATION_FP_TOLERANCE;

  if (isWithinRange) {
    return "healthy";
  }

  // Calculate how far outside the range
  const deviationBelow = current < targetMin ? targetMin - current : 0;
  const deviationAbove = current > targetMax ? current - targetMax : 0;
  const deviation = Math.max(deviationBelow, deviationAbove);

  // Within tolerance → attention; beyond tolerance → problem
  if (deviation <= tolerance) {
    return "attention";
  }

  return "problem";
}

/**
 * Get styling classes for allocation health state
 * Story 3.4: Visual Status Feedback
 *
 * Color palette from Dev Notes:
 * - Healthy: emerald (green)
 * - Attention: amber (yellow)
 * - Problem: red
 */
export function getHealthStateStyles(state: AllocationHealthState): {
  textColor: string;
  bgColor: string;
  borderColor: string;
} {
  switch (state) {
    case "healthy":
      return {
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100/50 dark:bg-emerald-900/20",
        borderColor: "border-emerald-500",
      };
    case "attention":
      return {
        textColor: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100/50 dark:bg-amber-900/20",
        borderColor: "border-amber-500",
      };
    case "problem":
      return {
        textColor: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100/50 dark:bg-red-900/20",
        borderColor: "border-red-500",
      };
  }
}

/**
 * Get the appropriate icon for the state
 */
function getStateIcon(state: AllocationState, className: string) {
  switch (state) {
    case "valid":
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case "overallocated":
      return <AlertTriangle className={className} aria-hidden="true" />;
    case "underallocated":
    default:
      return <Circle className={className} aria-hidden="true" />;
  }
}

/**
 * AllocationIndicator
 *
 * Displays the current allocation status with appropriate visual feedback.
 * Can be used standalone with explicit props or wrapped with AllocationIndicatorLive
 * for automatic form integration.
 *
 * @example
 * ```tsx
 * // Standalone usage
 * <AllocationIndicator
 *   allocated={45}
 *   remaining={55}
 *   valid={false}
 * />
 *
 * // Within a form (use AllocationIndicatorLive instead)
 * <FormProvider {...form}>
 *   <AllocationIndicatorLive fieldPath="holdings" />
 * </FormProvider>
 * ```
 */
export function AllocationIndicator({
  allocated,
  remaining,
  valid,
  className,
  showProgress = false,
}: AllocationIndicatorProps) {
  const { formatPercent } = useNumberFormat();

  const state = useMemo(() => getState(remaining, valid), [remaining, valid]);
  const styles = useMemo(() => getStateStyles(state), [state]);

  // Calculate derived values in a single useMemo to reduce recalculations
  const { progressWidth, formattedAllocated, formattedRemaining, formattedOver } = useMemo(() => {
    const overPct = remaining < 0 ? Math.abs(remaining) : 0;
    const formatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 1 };

    return {
      // Progress bar width (capped at 100% for display)
      progressWidth: Math.min(Math.max(allocated, 0), 100),
      // Format percentages using i18n hook (expects decimal: 0.45 for 45%)
      formattedAllocated: formatPercent(allocated / 100, formatOptions),
      formattedRemaining: formatPercent(Math.abs(remaining) / 100, formatOptions),
      formattedOver: formatPercent(overPct / 100, formatOptions),
    };
  }, [allocated, remaining, formatPercent]);

  // Build the message based on state
  const message = useMemo(() => {
    switch (state) {
      case "valid":
        return `${formattedAllocated} allocated`;
      case "overallocated":
        return `${formattedAllocated} allocated (${formattedOver} over)`;
      case "underallocated":
      default:
        return `${formattedAllocated} allocated, ${formattedRemaining} remaining`;
    }
  }, [state, formattedAllocated, formattedRemaining, formattedOver]);

  // Build aria-label for accessibility
  const ariaLabel = useMemo(() => {
    switch (state) {
      case "valid":
        return `Allocation complete: ${formattedAllocated} allocated, exactly 100%`;
      case "overallocated":
        return `Overallocated: ${formattedAllocated} allocated, ${formattedOver} over the 100% target`;
      case "underallocated":
      default:
        return `Underallocated: ${formattedAllocated} allocated, ${formattedRemaining} remaining to reach 100%`;
    }
  }, [state, formattedAllocated, formattedRemaining, formattedOver]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-col gap-2 rounded-lg p-3 transition-all duration-200",
        styles.bgColor,
        className
      )}
      data-testid="allocation-indicator"
      data-state={state}
    >
      {/* Main indicator row */}
      <div className="flex items-center gap-2">
        {getStateIcon(state, cn("h-5 w-5", styles.textColor))}
        <span className={cn("text-sm font-medium", styles.textColor)}>{message}</span>
      </div>

      {/* Optional progress bar with smooth transitions */}
      {showProgress && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <div
            className={cn(
              "h-full rounded-full origin-left transition-all duration-300 ease-out",
              styles.progressColor
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Props for the AllocationIndicatorLive component
 */
export interface AllocationIndicatorLiveProps<TFieldValues extends FieldValues = FieldValues> {
  /** Form field path to watch for changes */
  fieldPath: Path<TFieldValues>;
  /** Target total percentage (default: 100) */
  targetTotal?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show visual progress bar */
  showProgress?: boolean;
}

/**
 * AllocationIndicatorLive
 *
 * A wrapper for AllocationIndicator that integrates with react-hook-form
 * for real-time updates when editing allocations.
 *
 * Must be used within a FormProvider context.
 *
 * @example
 * ```tsx
 * <FormProvider {...form}>
 *   <AllocationIndicatorLive fieldPath="holdings" showProgress />
 * </FormProvider>
 * ```
 */
export function AllocationIndicatorLive<TFieldValues extends FieldValues = FieldValues>({
  fieldPath,
  targetTotal = 100,
  className,
  showProgress,
}: AllocationIndicatorLiveProps<TFieldValues>) {
  // Get form context to verify we're within FormProvider
  const formContext = useFormContext<TFieldValues>();

  if (!formContext) {
    throw new Error("AllocationIndicatorLive must be used within a FormProvider");
  }

  // Use the existing hook from allocation-pie-chart-live.tsx
  const { total, remaining, isValid } = useLiveAllocationTotal<TFieldValues>(
    fieldPath,
    targetTotal
  );

  // Build props object conditionally to satisfy exactOptionalPropertyTypes
  const indicatorProps: AllocationIndicatorProps = {
    allocated: total,
    remaining: remaining,
    valid: isValid,
  };

  // Only add optional props if they are defined
  if (className !== undefined) {
    indicatorProps.className = className;
  }
  if (showProgress !== undefined) {
    indicatorProps.showProgress = showProgress;
  }

  return <AllocationIndicator {...indicatorProps} />;
}

export default AllocationIndicator;
