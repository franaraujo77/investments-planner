"use client";

/**
 * AllocationGuidance Component
 *
 * Story 3.4: Visual Status Feedback
 * AC-3.4.4: Error Messages with Guidance
 *
 * Displays actionable guidance messages for allocation adjustments.
 * Supports both simple (100% target) and range-based (min-max) allocation feedback.
 *
 * Features:
 * - Contextual messages for underallocated, overallocated, and range-based states
 * - i18n-aware percentage formatting via useNumberFormat()
 * - Accessibility support with appropriate ARIA roles
 * - Visual icons for emphasis
 */

import { useMemo } from "react";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { ALLOCATION_FP_TOLERANCE } from "./allocation-indicator";

/**
 * Guidance state types
 */
export type GuidanceState =
  | "valid"
  | "underallocated"
  | "overallocated"
  | "within-range"
  | "below-range"
  | "above-range";

/**
 * Props for the AllocationGuidance component
 */
export interface AllocationGuidanceProps {
  /** Current allocation percentage (0-100+) */
  current: number;
  /** Target total percentage (default: 100) */
  target: number;
  /** Optional: Minimum of target range for range-based validation */
  targetMin?: number | undefined;
  /** Optional: Maximum of target range for range-based validation */
  targetMax?: number | undefined;
  /** Optional: Asset class name for specific messaging */
  assetClassName?: string | undefined;
  /** Additional CSS classes */
  className?: string | undefined;
}

/**
 * Determine the guidance state based on current value and targets
 * Exported for testing
 */
export function getGuidanceState(
  current: number,
  target: number,
  targetMin?: number,
  targetMax?: number
): GuidanceState {
  // Range-based validation if min/max provided
  if (targetMin !== undefined && targetMax !== undefined) {
    if (
      current >= targetMin - ALLOCATION_FP_TOLERANCE &&
      current <= targetMax + ALLOCATION_FP_TOLERANCE
    ) {
      return "within-range";
    }
    if (current < targetMin - ALLOCATION_FP_TOLERANCE) {
      return "below-range";
    }
    return "above-range";
  }

  // Simple target validation (100% total)
  // Use ALLOCATION_FP_TOLERANCE for floating-point precision
  if (Math.abs(current - target) <= ALLOCATION_FP_TOLERANCE) {
    return "valid";
  }
  if (current < target - ALLOCATION_FP_TOLERANCE) {
    return "underallocated";
  }
  return "overallocated";
}

/**
 * Generate guidance message based on allocation state
 * Exported for testing
 *
 * @param current - Current allocation percentage
 * @param target - Target percentage (usually 100)
 * @param formatPercent - i18n formatting function (expects decimal: 0.55 for 55%)
 * @param targetMin - Optional minimum range
 * @param targetMax - Optional maximum range
 * @param assetClassName - Optional asset class name for specific messaging
 * @returns Guidance message string or null if no guidance needed
 */
export function generateGuidanceMessage(
  current: number,
  target: number,
  formatPercent: (value: number) => string,
  targetMin?: number,
  targetMax?: number,
  assetClassName?: string
): string | null {
  const state = getGuidanceState(current, target, targetMin, targetMax);

  switch (state) {
    case "valid":
    case "within-range":
      return null;

    case "underallocated": {
      const needed = target - current;
      // formatPercent expects decimal, so divide by 100
      return `Add ${formatPercent(needed / 100)} more to reach ${target}%`;
    }

    case "overallocated": {
      const excess = current - target;
      return `Reduce by ${formatPercent(excess / 100)} to reach ${target}%`;
    }

    case "below-range": {
      const needed = (targetMin ?? 0) - current;
      const subject = assetClassName ?? "allocation";
      return `Increase ${subject} by ${formatPercent(needed / 100)} to reach minimum`;
    }

    case "above-range": {
      const excess = current - (targetMax ?? 100);
      const subject = assetClassName ?? "allocation";
      return `Reduce ${subject} by ${formatPercent(excess / 100)} to reach maximum`;
    }
  }
}

/**
 * Get the appropriate icon for the guidance state
 */
function getGuidanceIcon(state: GuidanceState, className: string) {
  switch (state) {
    case "valid":
    case "within-range":
      return <CheckCircle2 className={className} aria-hidden="true" data-testid="guidance-icon" />;
    case "overallocated":
    case "above-range":
      return <AlertTriangle className={className} aria-hidden="true" data-testid="guidance-icon" />;
    case "underallocated":
    case "below-range":
    default:
      return <Info className={className} aria-hidden="true" data-testid="guidance-icon" />;
  }
}

/**
 * Get styling classes for guidance state
 */
function getGuidanceStyles(state: GuidanceState): {
  textColor: string;
  bgColor: string;
} {
  switch (state) {
    case "valid":
    case "within-range":
      return {
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100/50 dark:bg-emerald-900/20",
      };
    case "overallocated":
    case "above-range":
      return {
        textColor: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100/50 dark:bg-red-900/20",
      };
    case "underallocated":
    case "below-range":
    default:
      return {
        textColor: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100/50 dark:bg-amber-900/20",
      };
  }
}

/**
 * AllocationGuidance
 *
 * Displays actionable guidance for allocation adjustments.
 * Returns null if no guidance is needed (allocation is valid).
 *
 * @example
 * ```tsx
 * // Simple target (100%)
 * <AllocationGuidance current={45} target={100} />
 * // Output: "Add 55% more to reach 100%"
 *
 * // Range-based
 * <AllocationGuidance
 *   current={35}
 *   target={100}
 *   targetMin={40}
 *   targetMax={50}
 *   assetClassName="Stocks"
 * />
 * // Output: "Increase Stocks by 5% to reach minimum"
 * ```
 */
export function AllocationGuidance({
  current,
  target,
  targetMin,
  targetMax,
  assetClassName,
  className,
}: AllocationGuidanceProps) {
  const { formatPercent } = useNumberFormat();

  const state = useMemo(
    () => getGuidanceState(current, target, targetMin, targetMax),
    [current, target, targetMin, targetMax]
  );

  const message = useMemo(
    () =>
      generateGuidanceMessage(current, target, formatPercent, targetMin, targetMax, assetClassName),
    [current, target, formatPercent, targetMin, targetMax, assetClassName]
  );

  const styles = useMemo(() => getGuidanceStyles(state), [state]);

  // Don't render anything if no guidance is needed
  if (!message) {
    return null;
  }

  // Determine ARIA role based on severity
  const isError = state === "overallocated" || state === "above-range";
  const role = isError ? "alert" : "status";
  const ariaLive = isError ? "assertive" : "polite";

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={cn(
        "flex items-center gap-2 rounded-md p-2 text-sm",
        styles.bgColor,
        styles.textColor,
        className
      )}
      data-testid="allocation-guidance"
      data-state={state}
    >
      {getGuidanceIcon(state, "h-4 w-4 shrink-0")}
      <span>{message}</span>
    </div>
  );
}

export default AllocationGuidance;
