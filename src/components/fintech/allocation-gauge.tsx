"use client";

/**
 * AllocationGauge Component
 *
 * Story 3.7: Allocation Percentage View
 * Story 4.3: Set Allocation Ranges for Classes
 * AC-3.7.3: Gauge for each asset class showing current position within target range
 * AC-3.7.5: Status color coding (green/amber/red/gray)
 * AC-4.3.4: Visual AllocationGauge display with color coding
 *
 * Features:
 * - Horizontal gauge/progress bar
 * - Marker showing current position
 * - Shaded area showing target range
 * - Color coding based on status
 * - Tooltip with exact values
 */

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Decimal } from "@/lib/calculations/decimal-config";

export type AllocationStatus = "under" | "on-target" | "over" | "no-target";

export interface AllocationGaugeProps {
  /** Asset class name for display */
  className: string;
  /** Current allocation percentage (e.g., "42.5") */
  currentPercent: string;
  /** Target minimum percentage (e.g., "40") */
  targetMin?: string | null;
  /** Target maximum percentage (e.g., "50") */
  targetMax?: string | null;
  /** Current status relative to target */
  status: AllocationStatus;
  /** Click handler for expansion */
  onClick?: () => void;
  /** Whether this class is currently expanded */
  isExpanded?: boolean;
  /** Whether this class has subclasses */
  hasSubclasses?: boolean;
  /** Additional CSS classes */
  classNameProp?: string;
}

/**
 * Get color classes for status
 * Per UX spec:
 * - Green (on-target): emerald-600
 * - Amber (near boundary): amber-500
 * - Red (out of range): red-500
 * - Gray (no target): slate-500
 */
function getStatusColors(status: AllocationStatus): {
  bar: string;
  marker: string;
  text: string;
  bg: string;
} {
  switch (status) {
    case "on-target":
      return {
        bar: "bg-emerald-500",
        marker: "bg-emerald-600 border-emerald-700",
        text: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-100/50 dark:bg-emerald-900/20",
      };
    case "under":
      return {
        bar: "bg-red-500",
        marker: "bg-red-600 border-red-700",
        text: "text-red-700 dark:text-red-400",
        bg: "bg-red-100/50 dark:bg-red-900/20",
      };
    case "over":
      return {
        bar: "bg-amber-500",
        marker: "bg-amber-600 border-amber-700",
        text: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-100/50 dark:bg-amber-900/20",
      };
    case "no-target":
    default:
      return {
        bar: "bg-slate-400",
        marker: "bg-slate-500 border-slate-600",
        text: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-100/50 dark:bg-slate-900/20",
      };
  }
}

/**
 * Get status label for accessibility and tooltip
 */
function getStatusLabel(status: AllocationStatus): string {
  switch (status) {
    case "on-target":
      return "On target";
    case "under":
      return "Under-allocated";
    case "over":
      return "Over-allocated";
    case "no-target":
      return "No target set";
  }
}

/**
 * Format percentage with 1 decimal precision
 * AC-3.7.4: Percentages show with 1 decimal precision
 */
function formatPercent(value: string): string {
  try {
    return new Decimal(value).toFixed(1);
  } catch {
    return value;
  }
}

/**
 * Calculate the visual position of a percentage on a 0-100 scale
 * For gauges, we scale the view to max(100, current) so values over 100 are visible
 */
function calculatePosition(value: string, maxScale: number = 100): number {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return Math.min(Math.max((num / maxScale) * 100, 0), 100);
  } catch {
    return 0;
  }
}

export function AllocationGauge({
  className,
  currentPercent,
  targetMin,
  targetMax,
  status,
  onClick,
  isExpanded = false,
  hasSubclasses = false,
  classNameProp,
}: AllocationGaugeProps) {
  const colors = useMemo(() => getStatusColors(status), [status]);
  const statusLabel = useMemo(() => getStatusLabel(status), [status]);
  const formattedCurrent = useMemo(() => formatPercent(currentPercent), [currentPercent]);

  // Calculate visual positions
  const currentNum = parseFloat(currentPercent) || 0;
  const maxScale = Math.max(100, currentNum, parseFloat(targetMax || "0") || 0);
  const currentPosition = calculatePosition(currentPercent, maxScale);

  // Target range positions (only if we have targets)
  const hasTargets = targetMin !== null && targetMax !== null;
  const targetMinPosition = hasTargets ? calculatePosition(targetMin!, maxScale) : 0;
  const targetMaxPosition = hasTargets ? calculatePosition(targetMax!, maxScale) : 0;

  const gaugeContent = (
    <div
      className={cn(
        "group rounded-lg border p-3 transition-all",
        colors.bg,
        onClick && "cursor-pointer hover:shadow-sm",
        classNameProp
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-expanded={hasSubclasses ? isExpanded : undefined}
      aria-label={`${className}: ${formattedCurrent}% allocation, ${statusLabel}`}
      data-testid="allocation-gauge"
      data-status={status}
    >
      {/* Header row with class name and percentage */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasSubclasses && (
            <span className="text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          <span className="font-medium text-sm">{className}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-bold text-lg", colors.text)}>{formattedCurrent}%</span>
          {hasTargets && (
            <span className="text-xs text-muted-foreground">
              ({formatPercent(targetMin!)} - {formatPercent(targetMax!)}%)
            </span>
          )}
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Target range indicator (if has targets) */}
        {hasTargets && (
          <div
            className="absolute h-full bg-emerald-200/50 dark:bg-emerald-700/30"
            style={{
              left: `${targetMinPosition}%`,
              width: `${targetMaxPosition - targetMinPosition}%`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Current allocation bar */}
        <div
          className={cn("absolute h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${currentPosition}%` }}
          aria-hidden="true"
        />

        {/* Target range markers (if has targets) */}
        {hasTargets && (
          <>
            <div
              className="absolute h-full w-0.5 bg-emerald-600 dark:bg-emerald-400"
              style={{ left: `${targetMinPosition}%` }}
              aria-hidden="true"
            />
            <div
              className="absolute h-full w-0.5 bg-emerald-600 dark:bg-emerald-400"
              style={{ left: `${targetMaxPosition}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-between mt-1.5">
        <span className={cn("text-xs font-medium", colors.text)}>{statusLabel}</span>
        {status === "no-target" && (
          <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Set target &rarr;
          </span>
        )}
      </div>
    </div>
  );

  // Wrap with tooltip for more details
  return (
    <Tooltip>
      <TooltipTrigger asChild>{gaugeContent}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <div className="font-semibold">{className}</div>
          <div>
            Current: <span className="font-mono">{formattedCurrent}%</span>
          </div>
          {hasTargets && (
            <>
              <div>
                Target range:{" "}
                <span className="font-mono">
                  {formatPercent(targetMin!)} - {formatPercent(targetMax!)}%
                </span>
              </div>
              <div className={colors.text}>{statusLabel}</div>
            </>
          )}
          {!hasTargets && (
            <div className="text-muted-foreground">
              No target range configured. Click to set allocation targets.
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact version of the gauge for list displays
 */
export function CompactAllocationGauge({
  className,
  currentPercent,
  targetMin,
  targetMax,
  status,
  onClick,
}: Omit<AllocationGaugeProps, "isExpanded" | "hasSubclasses" | "classNameProp">) {
  const colors = useMemo(() => getStatusColors(status), [status]);
  const formattedCurrent = useMemo(() => formatPercent(currentPercent), [currentPercent]);
  const hasTargets = targetMin !== null && targetMax !== null;

  const currentNum = parseFloat(currentPercent) || 0;
  const maxScale = Math.max(100, currentNum, parseFloat(targetMax || "0") || 0);
  const currentPosition = calculatePosition(currentPercent, maxScale);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 py-1 rounded",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid="compact-allocation-gauge"
      data-status={status}
    >
      <span className="text-sm font-medium min-w-24 truncate">{className}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", colors.bar)}
          style={{ width: `${currentPosition}%` }}
        />
      </div>
      <span className={cn("text-sm font-mono min-w-12 text-right", colors.text)}>
        {formattedCurrent}%
      </span>
      {hasTargets && (
        <span className="text-xs text-muted-foreground min-w-16">
          ({formatPercent(targetMin!)} - {formatPercent(targetMax!)}%)
        </span>
      )}
    </div>
  );
}

/**
 * Calculate allocation status based on current vs target
 * CRITICAL: Uses decimal.js for precise comparison
 */
export function calculateAllocationStatus(
  current: string,
  targetMin: string | null,
  targetMax: string | null
): AllocationStatus {
  if (targetMin === null || targetMax === null) {
    return "no-target";
  }

  try {
    const curr = new Decimal(current);
    const min = new Decimal(targetMin);
    const max = new Decimal(targetMax);

    if (curr.lessThan(min)) return "under";
    if (curr.greaterThan(max)) return "over";
    return "on-target";
  } catch {
    return "no-target";
  }
}

/**
 * Check if allocation is near boundary (within threshold of min or max)
 * Used for amber status coloring when close to limits
 */
export function isNearBoundary(
  current: string,
  targetMin: string,
  targetMax: string,
  threshold: string = "5"
): boolean {
  try {
    const curr = new Decimal(current);
    const min = new Decimal(targetMin);
    const max = new Decimal(targetMax);
    const thresh = new Decimal(threshold);

    const nearMin = curr.minus(min).abs().lessThanOrEqualTo(thresh);
    const nearMax = max.minus(curr).abs().lessThanOrEqualTo(thresh);

    return nearMin || nearMax;
  } catch {
    return false;
  }
}
