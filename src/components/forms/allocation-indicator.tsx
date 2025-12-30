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
 * Visual state of the allocation indicator
 */
export type AllocationState = "underallocated" | "valid" | "overallocated";

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

  // Calculate progress bar width (cap at 100% for display)
  const progressWidth = useMemo(() => Math.min(Math.max(allocated, 0), 100), [allocated]);

  // Calculate the over percentage for overallocated state
  const overPercent = useMemo(() => (remaining < 0 ? Math.abs(remaining) : 0), [remaining]);

  // Format percentages using i18n hook
  // formatPercent expects a decimal (0.45 for 45%), so divide by 100
  const formattedAllocated = formatPercent(allocated / 100, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const formattedRemaining = formatPercent(Math.abs(remaining) / 100, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const formattedOver = formatPercent(overPercent / 100, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

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

      {/* Optional progress bar */}
      {showProgress && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <div
            className={cn("h-full rounded-full transition-all duration-200", styles.progressColor)}
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
