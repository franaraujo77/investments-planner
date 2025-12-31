"use client";

/**
 * AllocationHealthIndicator Component
 *
 * Story 3.4: Visual Status Feedback
 * AC-3.4.1-3.4.3: Range-based allocation feedback
 *
 * Displays visual feedback for range-based allocation health.
 * Shows color-coded status (healthy/attention/problem) with optional guidance.
 *
 * Features:
 * - Uses getAllocationHealthState() for state calculation
 * - Uses getHealthStateStyles() for consistent styling
 * - Integrates AllocationGuidance when showGuidance is true
 * - Accessibility support with ARIA attributes
 */

import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllocationHealthState,
  getHealthStateStyles,
  type AllocationHealthState,
} from "./allocation-indicator";
import { AllocationGuidance } from "./allocation-guidance";

/**
 * Props for the AllocationHealthIndicator component
 */
export interface AllocationHealthIndicatorProps {
  /** Current allocation percentage (0-100+) */
  current: number;
  /** Minimum of target range */
  targetMin: number;
  /** Maximum of target range */
  targetMax: number;
  /** Optional label for the allocation (e.g., "Stocks", "Bonds") */
  label?: string;
  /** Tolerance for "attention" state (default: 5%) */
  tolerance?: number;
  /** Show guidance message for out-of-range allocations */
  showGuidance?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Computed data for the health indicator
 */
export interface HealthIndicatorData {
  state: AllocationHealthState;
  styles: {
    textColor: string;
    bgColor: string;
    borderColor: string;
  };
  label?: string | undefined;
}

/**
 * Compute health indicator data from props
 * Exported for testing
 */
export function computeHealthIndicatorData(
  current: number,
  targetMin: number,
  targetMax: number,
  label?: string,
  tolerance: number = 5
): HealthIndicatorData {
  const state = getAllocationHealthState(current, targetMin, targetMax, tolerance);
  const styles = getHealthStateStyles(state);

  return {
    state,
    styles,
    label,
  };
}

/**
 * Get the appropriate icon for the health state
 */
function getHealthIcon(state: AllocationHealthState, className: string) {
  switch (state) {
    case "healthy":
      return <CheckCircle2 className={className} aria-hidden="true" data-testid="health-icon" />;
    case "attention":
      return <AlertTriangle className={className} aria-hidden="true" data-testid="health-icon" />;
    case "problem":
      return <AlertCircle className={className} aria-hidden="true" data-testid="health-icon" />;
  }
}

/**
 * Get descriptive message for the health state
 */
function getHealthMessage(state: AllocationHealthState, label?: string): string {
  const subject = label ?? "Allocation";
  switch (state) {
    case "healthy":
      return `${subject} is within target range`;
    case "attention":
      return `${subject} is slightly outside target range`;
    case "problem":
      return `${subject} is significantly outside target range`;
  }
}

/**
 * AllocationHealthIndicator
 *
 * Displays visual feedback for range-based allocation health.
 *
 * @example
 * ```tsx
 * <AllocationHealthIndicator
 *   current={45}
 *   targetMin={40}
 *   targetMax={50}
 *   label="Stocks"
 *   showGuidance
 * />
 * ```
 */
export function AllocationHealthIndicator({
  current,
  targetMin,
  targetMax,
  label,
  tolerance = 5,
  showGuidance = false,
  className,
}: AllocationHealthIndicatorProps) {
  const data = useMemo(
    () => computeHealthIndicatorData(current, targetMin, targetMax, label, tolerance),
    [current, targetMin, targetMax, label, tolerance]
  );

  const message = useMemo(() => getHealthMessage(data.state, label), [data.state, label]);

  // Build aria-label for accessibility
  const ariaLabel = useMemo(() => {
    const subject = label ?? "Allocation";
    const rangeInfo = `Target range: ${targetMin}% to ${targetMax}%`;
    const currentInfo = `Current: ${current}%`;
    return `${subject} health status: ${data.state}. ${currentInfo}. ${rangeInfo}`;
  }, [label, data.state, current, targetMin, targetMax]);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className={cn(
          "flex items-center gap-2 rounded-lg p-3 transition-all duration-200",
          data.styles.bgColor
        )}
        data-testid="allocation-health-indicator"
        data-state={data.state}
      >
        {getHealthIcon(data.state, cn("h-5 w-5", data.styles.textColor))}
        <span className={cn("text-sm font-medium", data.styles.textColor)}>{message}</span>
      </div>

      {showGuidance && data.state !== "healthy" && (
        <AllocationGuidance
          current={current}
          target={100}
          targetMin={targetMin}
          targetMax={targetMax}
          assetClassName={label}
        />
      )}
    </div>
  );
}

export default AllocationHealthIndicator;
