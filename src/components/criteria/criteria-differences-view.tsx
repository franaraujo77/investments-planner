"use client";

/**
 * Criteria Differences View Component
 *
 * Story 5.6: Compare Criteria Sets
 * AC-5.6.2: Side-by-Side Criteria Differences
 *
 * Displays criteria differences between two sets with color-coded highlighting:
 * - only_a: Criteria only in Set A (left-side highlight)
 * - only_b: Criteria only in Set B (right-side highlight)
 * - modified: Criteria present in both with different configurations
 * - identical: Criteria that are exactly the same (neutral styling)
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Equal, ArrowLeftRight } from "lucide-react";
import type { CriteriaDifference } from "@/lib/services/criteria-comparison-service";

// =============================================================================
// TYPES
// =============================================================================

interface CriteriaDifferencesViewProps {
  differences: CriteriaDifference[];
  setAName: string;
  setBName: string;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Displays a single criterion's details
 */
function CriterionDetails({
  criterion,
  className,
}: {
  criterion: {
    name: string;
    metricLabel: string;
    operatorLabel: string;
    value: string;
    value2?: string;
    points: number;
  } | null;
  className?: string;
}) {
  if (!criterion) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground italic", className)}
      >
        Not present
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="font-medium text-sm">{criterion.name}</div>
      <div className="text-xs text-muted-foreground">
        {criterion.metricLabel} {criterion.operatorLabel} {criterion.value}
        {criterion.value2 && ` - ${criterion.value2}`}
      </div>
      <Badge
        variant={
          criterion.points > 0 ? "default" : criterion.points < 0 ? "destructive" : "secondary"
        }
        className="text-xs"
      >
        {criterion.points > 0 ? "+" : ""}
        {criterion.points} pts
      </Badge>
    </div>
  );
}

/**
 * Icon for difference type
 */
function DifferenceIcon({ type }: { type: CriteriaDifference["differenceType"] }) {
  switch (type) {
    case "only_a":
      return <Minus className="h-4 w-4 text-orange-500" />;
    case "only_b":
      return <Plus className="h-4 w-4 text-blue-500" />;
    case "modified":
      return <ArrowLeftRight className="h-4 w-4 text-amber-500" />;
    case "identical":
      return <Equal className="h-4 w-4 text-green-500" />;
  }
}

/**
 * Label for difference type
 */
function getDifferenceLabel(type: CriteriaDifference["differenceType"]): string {
  switch (type) {
    case "only_a":
      return "Only in Set A";
    case "only_b":
      return "Only in Set B";
    case "modified":
      return "Modified";
    case "identical":
      return "Identical";
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Side-by-side criteria differences view
 *
 * AC-5.6.2: Visual highlighting for differences
 * - Rules only in Set A (orange highlight)
 * - Rules only in Set B (blue highlight)
 * - Rules present in both but different (amber highlight)
 * - Identical rules (green/neutral styling)
 */
export function CriteriaDifferencesView({
  differences,
  setAName,
  setBName,
  className,
}: CriteriaDifferencesViewProps) {
  // Group differences by type for summary
  const summary = {
    only_a: differences.filter((d) => d.differenceType === "only_a").length,
    only_b: differences.filter((d) => d.differenceType === "only_b").length,
    modified: differences.filter((d) => d.differenceType === "modified").length,
    identical: differences.filter((d) => d.differenceType === "identical").length,
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3 text-orange-500" />
          {summary.only_a} only in A
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Plus className="h-3 w-3 text-blue-500" />
          {summary.only_b} only in B
        </Badge>
        <Badge variant="outline" className="gap-1">
          <ArrowLeftRight className="h-3 w-3 text-amber-500" />
          {summary.modified} modified
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Equal className="h-3 w-3 text-green-500" />
          {summary.identical} identical
        </Badge>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center pb-2 border-b">
        <div className="font-medium text-sm text-center">{setAName}</div>
        <div className="w-8" />
        <div className="font-medium text-sm text-center">{setBName}</div>
      </div>

      {/* Differences list */}
      <div className="space-y-2">
        {differences.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No criteria to compare</div>
        ) : (
          differences.map((diff, index) => (
            <div
              key={`${diff.criterionName}-${index}`}
              className={cn(
                "grid grid-cols-[1fr_auto_1fr] gap-4 items-start p-3 rounded-lg border",
                diff.differenceType === "only_a" &&
                  "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900",
                diff.differenceType === "only_b" &&
                  "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
                diff.differenceType === "modified" &&
                  "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
                diff.differenceType === "identical" && "bg-muted/50"
              )}
            >
              {/* Set A side */}
              <CriterionDetails
                criterion={diff.inSetA}
                className={cn(
                  diff.differenceType === "only_a" && "font-medium",
                  diff.differenceType === "only_b" && "opacity-50"
                )}
              />

              {/* Center indicator */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <DifferenceIcon type={diff.differenceType} />
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {getDifferenceLabel(diff.differenceType)}
                </span>
              </div>

              {/* Set B side */}
              <CriterionDetails
                criterion={diff.inSetB}
                className={cn(
                  diff.differenceType === "only_b" && "font-medium",
                  diff.differenceType === "only_a" && "opacity-50"
                )}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
