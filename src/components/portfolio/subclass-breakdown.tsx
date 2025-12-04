"use client";

/**
 * SubclassBreakdown Component
 *
 * Story 3.7: Allocation Percentage View
 * AC-3.7.6: Click on class expands to show subclass breakdown
 *
 * Features:
 * - Collapsible panel component
 * - List of subclasses with percentages
 * - Mini visualization (small bar)
 * - Animated expansion/collapse
 * - Handle classes with no subclasses
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Decimal } from "@/lib/calculations/decimal-config";
import { ChevronDown, ChevronRight, Package, Layers } from "lucide-react";

export interface SubclassAllocation {
  subclassId: string;
  subclassName: string;
  value: string;
  /** Percentage within parent class */
  percentageOfClass: string;
  /** Percentage of total portfolio */
  percentageOfPortfolio: string;
  assetCount: number;
}

export interface SubclassBreakdownProps {
  /** Parent class ID */
  classId: string;
  /** Parent class name */
  className: string;
  /** Parent class percentage of portfolio */
  classPercentage: string;
  /** Subclasses within this class */
  subclasses: SubclassAllocation[];
  /** Whether the breakdown is expanded */
  isExpanded: boolean;
  /** Toggle expansion */
  onToggle: () => void;
  /** Optional click handler for individual subclass */
  onSubclassClick?: ((subclassId: string) => void) | undefined;
  /** Additional CSS classes */
  classNameProp?: string;
}

/**
 * Color palette for subclass bars
 */
const SUBCLASS_COLORS = [
  "hsl(222, 47%, 51%)", // Blue
  "hsl(262, 83%, 58%)", // Purple
  "hsl(173, 80%, 40%)", // Teal
  "hsl(339, 80%, 51%)", // Pink
  "hsl(210, 40%, 52%)", // Steel Blue
];

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
 * Get color for subclass
 */
function getSubclassColor(index: number): string {
  return SUBCLASS_COLORS[index % SUBCLASS_COLORS.length] ?? SUBCLASS_COLORS[0]!;
}

/**
 * Mini bar chart for a single subclass
 */
function SubclassBar({ percentage, color }: { percentage: string; color: string }) {
  const width = Math.min(parseFloat(percentage) || 0, 100);

  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${width}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

/**
 * Individual subclass row
 */
function SubclassRow({
  subclass,
  color,
  onClick,
}: {
  subclass: SubclassAllocation;
  color: string;
  onClick?: (() => void) | undefined;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-md transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
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
      data-testid="subclass-row"
    >
      {/* Color indicator */}
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

      {/* Subclass name */}
      <span className="text-sm font-medium min-w-24 truncate">{subclass.subclassName}</span>

      {/* Mini bar showing percentage of class */}
      <SubclassBar percentage={subclass.percentageOfClass} color={color} />

      {/* Percentage of class */}
      <span className="text-sm font-mono text-right min-w-12">
        {formatPercent(subclass.percentageOfClass)}%
      </span>

      {/* Percentage of portfolio (smaller, muted) */}
      <span className="text-xs font-mono text-muted-foreground text-right min-w-16">
        ({formatPercent(subclass.percentageOfPortfolio)}% total)
      </span>

      {/* Asset count */}
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Package className="h-3 w-3" />
        {subclass.assetCount}
      </span>
    </div>
  );
}

export function SubclassBreakdown({
  classId,
  className,
  classPercentage,
  subclasses,
  isExpanded,
  onToggle,
  onSubclassClick,
  classNameProp,
}: SubclassBreakdownProps) {
  // Sort subclasses by percentage (descending)
  const sortedSubclasses = useMemo(() => {
    return [...subclasses].sort((a, b) => {
      const aVal = parseFloat(a.percentageOfClass) || 0;
      const bVal = parseFloat(b.percentageOfClass) || 0;
      return bVal - aVal;
    });
  }, [subclasses]);

  // Check if there are any subclasses
  const hasSubclasses = subclasses.length > 0;

  return (
    <div
      className={cn("border rounded-lg overflow-hidden", classNameProp)}
      data-testid="subclass-breakdown"
      data-class-id={classId}
      data-expanded={isExpanded}
    >
      {/* Header - always visible */}
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 transition-colors",
          "hover:bg-muted/50",
          isExpanded && "bg-muted/30 border-b"
        )}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`subclass-content-${classId}`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{className}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">{formatPercent(classPercentage)}%</span>
          <span className="text-xs text-muted-foreground">
            {subclasses.length} subclass{subclasses.length !== 1 ? "es" : ""}
          </span>
        </div>
      </button>

      {/* Expandable content */}
      <div
        id={`subclass-content-${classId}`}
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {hasSubclasses ? (
          <div className="p-2 space-y-1">
            {sortedSubclasses.map((subclass, index) => (
              <SubclassRow
                key={subclass.subclassId}
                subclass={subclass}
                color={getSubclassColor(index)}
                onClick={onSubclassClick ? () => onSubclassClick(subclass.subclassId) : undefined}
              />
            ))}

            {/* Total row */}
            <div className="flex items-center justify-between px-3 py-2 mt-2 border-t text-sm font-medium">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono">{formatPercent(classPercentage)}%</span>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <div className="text-sm">No subclasses defined</div>
            <div className="text-xs mt-1">
              All assets in this class are unclassified at the subclass level.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact list of subclass breakdowns
 * Useful for showing multiple class breakdowns at once
 */
export function SubclassBreakdownList({
  items,
  expandedClassId,
  onClassToggle,
  onSubclassClick,
  className,
}: {
  items: Array<{
    classId: string;
    className: string;
    classPercentage: string;
    subclasses: SubclassAllocation[];
  }>;
  expandedClassId: string | null;
  onClassToggle: (classId: string) => void;
  onSubclassClick?: (subclassId: string) => void;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-muted-foreground",
          className
        )}
        data-testid="subclass-breakdown-list-empty"
      >
        <Layers className="h-8 w-8 mb-2 opacity-50" />
        <div className="text-lg font-medium">No asset classes</div>
        <div className="text-sm">Configure asset classes to see subclass breakdowns.</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="subclass-breakdown-list">
      {items.map((item) => (
        <SubclassBreakdown
          key={item.classId}
          classId={item.classId}
          className={item.className}
          classPercentage={item.classPercentage}
          subclasses={item.subclasses}
          isExpanded={expandedClassId === item.classId}
          onToggle={() => onClassToggle(item.classId)}
          onSubclassClick={onSubclassClick}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for subclass breakdown
 */
export function SubclassBreakdownSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("border rounded-lg p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="w-24 h-5 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-12 h-6 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-2 pl-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2 h-2 bg-muted rounded-full animate-pulse" />
            <div className="w-20 h-4 bg-muted rounded animate-pulse" />
            <div className="flex-1 h-2 bg-muted rounded animate-pulse" />
            <div className="w-10 h-4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
