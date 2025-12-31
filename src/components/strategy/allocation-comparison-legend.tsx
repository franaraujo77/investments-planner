"use client";

/**
 * AllocationComparisonLegend Component
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.5: Target range comparison with color-coded status indicators
 *
 * Displays a legend showing each asset class with:
 * - Class name
 * - Current percentage
 * - Target range (min% - max%)
 * - Status indicator
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Decimal } from "@/lib/calculations/decimal-config";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

// =============================================================================
// TYPES
// =============================================================================

export interface AllocationComparisonLegendProps {
  /** Array of asset class allocations */
  allocations: StrategyAllocation[];
  /** Unclassified assets info */
  unclassified?: {
    percentage: string;
    assetCount: number;
  };
  /** Callback when a row is clicked */
  onRowClick?: (classId: string) => void;
  /** Currently selected class (for highlighting) */
  selectedClassId?: string | null;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// STATUS STYLING
// =============================================================================

/**
 * Get status indicator styling
 */
function getStatusIndicatorClass(status: AllocationStatus): string {
  switch (status) {
    case "under":
      return "bg-amber-500";
    case "on-target":
      return "bg-emerald-500";
    case "over":
      return "bg-red-500";
    case "no-target":
    default:
      return "bg-slate-400";
  }
}

/**
 * Get status text color
 */
function getStatusTextClass(status: AllocationStatus): string {
  switch (status) {
    case "under":
      return "text-amber-700 dark:text-amber-400";
    case "on-target":
      return "text-emerald-700 dark:text-emerald-400";
    case "over":
      return "text-red-700 dark:text-red-400";
    case "no-target":
    default:
      return "text-slate-600 dark:text-slate-400";
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: AllocationStatus): string {
  switch (status) {
    case "under":
      return "Under";
    case "on-target":
      return "On target";
    case "over":
      return "Over";
    case "no-target":
      return "No target";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Allocation Comparison Legend
 *
 * Shows a list of asset classes with their allocation status.
 * Each row displays the class name, current %, target range, and status.
 *
 * @example
 * ```tsx
 * <AllocationComparisonLegend
 *   allocations={allocations}
 *   unclassified={{ percentage: "5.0", assetCount: 2 }}
 *   onRowClick={(classId) => console.log('Clicked:', classId)}
 *   selectedClassId="stocks"
 * />
 * ```
 */
export function AllocationComparisonLegend({
  allocations,
  unclassified,
  onRowClick,
  selectedClassId,
  className,
}: AllocationComparisonLegendProps) {
  // Use i18n-compliant number formatting per project-context.md
  const { formatPercent } = useNumberFormat();

  // Check if there are unclassified assets to display
  const showUnclassified = useMemo(() => {
    if (!unclassified) return false;
    try {
      // Decimal check is acceptable here - we only need boolean result
      return new Decimal(unclassified.percentage).greaterThan(0);
    } catch {
      // Silent catch: invalid percentage string means no unclassified to show
      return false;
    }
  }, [unclassified]);

  // Empty state
  if (allocations.length === 0 && !showUnclassified) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-4 text-muted-foreground text-sm",
          className
        )}
        data-testid="allocation-comparison-legend-empty"
      >
        No allocation data available
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-1", className)}
      role="list"
      aria-label="Asset class allocation comparison"
      data-testid="allocation-comparison-legend"
    >
      {/* Asset class rows */}
      {allocations.map((alloc) => (
        <AllocationRow
          key={alloc.classId}
          classId={alloc.classId}
          className={alloc.className}
          currentPercentage={alloc.currentPercentage}
          targetMin={alloc.targetMin}
          targetMax={alloc.targetMax}
          status={alloc.status}
          isSelected={selectedClassId === alloc.classId}
          onClick={onRowClick}
          formatPercent={formatPercent}
        />
      ))}

      {/* Unclassified row */}
      {showUnclassified && unclassified && (
        <AllocationRow
          classId="unclassified"
          className="Unclassified"
          currentPercentage={unclassified.percentage}
          targetMin={null}
          targetMax={null}
          status="no-target"
          isSelected={selectedClassId === "unclassified"}
          onClick={onRowClick}
          isUnclassified
          formatPercent={formatPercent}
        />
      )}
    </div>
  );
}

// =============================================================================
// ALLOCATION ROW SUB-COMPONENT
// =============================================================================

interface AllocationRowProps {
  classId: string;
  className: string;
  currentPercentage: string;
  targetMin: string | null;
  targetMax: string | null;
  status: AllocationStatus;
  isSelected: boolean;
  onClick: ((classId: string) => void) | undefined;
  isUnclassified?: boolean;
  /** Formatter function from useNumberFormat hook */
  formatPercent: (value: number) => string;
}

function AllocationRow({
  classId,
  className: classNameStr,
  currentPercentage,
  targetMin,
  targetMax,
  status,
  isSelected,
  onClick,
  isUnclassified = false,
  formatPercent,
}: AllocationRowProps) {
  const hasTarget = targetMin !== null && targetMax !== null;

  // Helper to parse string percentage to decimal for i18n formatPercent
  // Database stores 3.00 for 3%, but Intl.NumberFormat expects 0.03 for 3%
  const parsePercentToDecimal = (value: string): number => {
    try {
      return new Decimal(value).dividedBy(100).toNumber();
    } catch {
      return 0;
    }
  };

  const currentPct = parsePercentToDecimal(currentPercentage);
  const minPct = targetMin ? parsePercentToDecimal(targetMin) : 0;
  const maxPct = targetMax ? parsePercentToDecimal(targetMax) : 0;

  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
        isSelected && "bg-muted ring-1 ring-ring",
        isUnclassified && "text-muted-foreground"
      )}
      onClick={() => onClick?.(classId)}
      disabled={!onClick}
      role="listitem"
      aria-label={`${classNameStr}: ${formatPercent(currentPct)} allocation${hasTarget ? `, target ${formatPercent(minPct)} to ${formatPercent(maxPct)}` : ""}${isSelected ? " (selected)" : ""}`}
      aria-current={isSelected ? "true" : undefined}
      data-testid={`allocation-row-${classId}`}
    >
      {/* Status indicator dot */}
      <span
        className={cn("w-3 h-3 rounded-full flex-shrink-0", getStatusIndicatorClass(status))}
        aria-hidden="true"
      />

      {/* Class name */}
      <span className="flex-1 font-medium text-sm min-w-[120px]">{classNameStr}</span>

      {/* Current percentage */}
      <span className={cn("font-mono text-sm font-semibold", getStatusTextClass(status))}>
        {formatPercent(currentPct)}
      </span>

      {/* Target range */}
      <span className="text-xs text-muted-foreground min-w-[80px] text-right">
        {hasTarget ? (
          <>
            {formatPercent(minPct)} - {formatPercent(maxPct)}
          </>
        ) : (
          <span className="italic">No target</span>
        )}
      </span>

      {/* Status badge */}
      <span
        className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full min-w-[65px] text-center",
          status === "on-target" &&
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          status === "under" &&
            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          status === "over" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          status === "no-target" &&
            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        )}
      >
        {getStatusLabel(status)}
      </span>
    </button>
  );
}
