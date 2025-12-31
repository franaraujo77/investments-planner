"use client";

/**
 * StrategyAllocationBalanceIndicator Component
 *
 * Story 3.7: Strategy Allocation Balance Indicator
 * AC-3.7.1: Strategy Page Allocation Summary
 * AC-3.7.2: Underallocated State
 * AC-3.7.3: Valid State (Exactly 100%)
 * AC-3.7.4: Overallocated State
 * AC-3.7.5: Empty State
 * AC-3.7.6: Real-Time Updates
 * AC-3.7.7: Screen Reader Accessibility
 *
 * Shows the total allocation balance across all asset classes on the strategy page.
 * Uses minimum allocations from asset classes to determine overall strategy health.
 *
 * Features:
 * - Three visual states: underallocated, valid (100%), overallocated
 * - i18n-aware percentage formatting via useNumberFormat()
 * - Accessibility support with ARIA live regions
 * - Real-time updates when asset classes change
 * - Progress bar visualization
 */

import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, Circle, Plus } from "lucide-react";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { useAllocationSummary } from "@/hooks/use-asset-classes";
import {
  ALLOCATION_FP_TOLERANCE,
  getState,
  getStateStyles,
  type AllocationState,
} from "@/components/forms/allocation-indicator";

/**
 * Props for the StrategyAllocationBalanceIndicator component
 */
export interface StrategyAllocationBalanceIndicatorProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get the appropriate icon for the state
 */
function getStateIcon(state: AllocationState, isEmpty: boolean, className: string) {
  if (isEmpty) {
    return <Plus className={className} aria-hidden="true" />;
  }

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
 * StrategyAllocationBalanceIndicator
 *
 * Displays the total allocation balance across all asset classes with appropriate visual feedback.
 * Fetches allocation summary and shows current configuration status.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StrategyAllocationBalanceIndicator />
 *
 * // With custom class
 * <StrategyAllocationBalanceIndicator className="mt-4" />
 * ```
 */
export function StrategyAllocationBalanceIndicator({
  className,
}: StrategyAllocationBalanceIndicatorProps) {
  const { summary, isLoading, error } = useAllocationSummary();
  const { formatPercent } = useNumberFormat();

  // Calculate derived values using Decimal.js for precision
  const {
    isEmpty,
    state,
    styles,
    progressWidth,
    formattedTotal,
    formattedRemaining,
    formattedOver,
  } = useMemo(() => {
    // Default to 0 if no summary
    const totalMinimums = summary?.totalMinimums ?? "0";
    const classCount = summary?.classCount ?? 0;

    const totalDecimal = new Decimal(totalMinimums);
    const remainingDecimal = new Decimal(100).minus(totalDecimal);
    const totalNum = totalDecimal.toNumber();
    const remainingNum = remainingDecimal.toNumber();

    // Check if empty (no asset classes)
    const isEmptyState = classCount === 0;

    // Check if valid (within floating-point tolerance of 100%)
    const isValidState = !isEmptyState && Math.abs(totalNum - 100) <= ALLOCATION_FP_TOLERANCE;

    // Determine visual state
    const allocState = getState(remainingNum, isValidState);
    const allocStyles = getStateStyles(allocState);

    // Calculate values for display
    const overAmount = remainingNum < 0 ? Math.abs(remainingNum) : 0;
    const formatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 1 };

    return {
      isEmpty: isEmptyState,
      state: allocState,
      styles: allocStyles,
      progressWidth: Math.min(Math.max(totalNum, 0), 100),
      formattedTotal: formatPercent(totalNum / 100, formatOptions),
      formattedRemaining: formatPercent(Math.abs(remainingNum) / 100, formatOptions),
      formattedOver: formatPercent(overAmount / 100, formatOptions),
    };
  }, [summary, formatPercent]);

  // Build the message based on state
  const message = useMemo(() => {
    if (isEmpty) {
      return "0% allocated — Add asset classes to get started";
    }

    switch (state) {
      case "valid":
        return `${formattedTotal} allocated`;
      case "overallocated":
        return `${formattedTotal} allocated (${formattedOver} over)`;
      case "underallocated":
      default:
        return `${formattedTotal} allocated, ${formattedRemaining} remaining`;
    }
  }, [isEmpty, state, formattedTotal, formattedRemaining, formattedOver]);

  // Build aria-label for accessibility (AC-3.7.7)
  const ariaLabel = useMemo(() => {
    if (isEmpty) {
      return "No asset classes configured. 0% allocated. Add asset classes to define your investment strategy.";
    }

    switch (state) {
      case "valid":
        return `Strategy allocation complete: ${formattedTotal} allocated across all asset classes. Configuration is balanced.`;
      case "overallocated":
        return `Strategy overallocated: ${formattedTotal} allocated, ${formattedOver} over the 100% target. Reduce minimum allocations to reach 100%.`;
      case "underallocated":
      default:
        return `Strategy underallocated: ${formattedTotal} allocated, ${formattedRemaining} remaining to reach 100%. Add or increase asset class allocations.`;
    }
  }, [isEmpty, state, formattedTotal, formattedRemaining, formattedOver]);

  // Guidance message for overallocated state (AC-3.7.4)
  const guidanceMessage = useMemo(() => {
    if (state === "overallocated") {
      return "Reduce allocations to reach 100%";
    }
    return null;
  }, [state]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn("flex flex-col gap-2 rounded-lg bg-muted/30 p-3 animate-pulse", className)}
        data-testid="strategy-balance-indicator"
        data-state="loading"
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg bg-red-100/50 dark:bg-red-900/20 p-3",
          className
        )}
        role="alert"
        data-testid="strategy-balance-indicator"
        data-state="error"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Unable to load allocation summary
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-col gap-2 rounded-lg p-3 transition-all duration-200",
        isEmpty ? "bg-muted/30" : styles.bgColor,
        className
      )}
      data-testid="strategy-balance-indicator"
      data-state={isEmpty ? "empty" : state}
    >
      {/* Main indicator row */}
      <div className="flex items-center gap-2">
        {getStateIcon(
          state,
          isEmpty,
          cn("h-5 w-5", isEmpty ? "text-muted-foreground" : styles.textColor)
        )}
        <span
          className={cn(
            "text-sm font-medium",
            isEmpty ? "text-muted-foreground" : styles.textColor
          )}
        >
          {message}
        </span>
      </div>

      {/* Progress bar with smooth transitions (AC-3.7.6) */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div
          className={cn(
            "h-full rounded-full origin-left transition-all duration-300 ease-out",
            isEmpty ? "bg-slate-300 dark:bg-slate-600" : styles.progressColor
          )}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {/* Guidance message for overallocated state (AC-3.7.4) */}
      {guidanceMessage && (
        <p className="text-xs text-red-600 dark:text-red-400">{guidanceMessage}</p>
      )}
    </div>
  );
}

export default StrategyAllocationBalanceIndicator;
