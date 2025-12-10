"use client";

/**
 * Preview Impact Modal Component
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 *
 * AC-5.7.1: Preview Impact Button Available During Editing
 * AC-5.7.2: Preview Shows Top 10 Scoring Assets
 * AC-5.7.3: Preview Updates Live as Criteria Modified
 * AC-5.7.4: Shows Comparison (Improved/Worse/Same Counts)
 *
 * Displays:
 * - Top 10 scoring assets with scores
 * - Comparison summary (improved/declined/unchanged)
 * - Loading state during recalculation
 * - Score breakdown on row expansion
 */

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { PreviewAssetsTable } from "@/components/criteria/preview-assets-table";
import { cn } from "@/lib/utils";
import type { PreviewResult, ComparisonSummary } from "@/lib/calculations/quick-calc";

// =============================================================================
// TYPES
// =============================================================================

interface PreviewImpactModalProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Preview result data */
  result: PreviewResult | null;
  /** Whether loading/recalculating */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Comparison summary cards showing improved/declined/unchanged counts
 * AC-5.7.4: Shows Comparison (Improved/Worse/Same Counts)
 */
function ComparisonSummaryCards({ comparison }: { comparison: ComparisonSummary }) {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
      {/* Improved */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
          <ArrowUp className="h-5 w-5" />
          <span className="text-2xl font-bold">{comparison.improved}</span>
        </div>
        <div className="text-xs text-muted-foreground">Improved</div>
      </div>

      {/* Declined */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
          <ArrowDown className="h-5 w-5" />
          <span className="text-2xl font-bold">{comparison.declined}</span>
        </div>
        <div className="text-xs text-muted-foreground">Declined</div>
      </div>

      {/* Unchanged */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          <Minus className="h-5 w-5" />
          <span className="text-2xl font-bold">{comparison.unchanged}</span>
        </div>
        <div className="text-xs text-muted-foreground">Unchanged</div>
      </div>
    </div>
  );
}

/**
 * Average score comparison between current and previous
 */
function AverageScoreComparison({ comparison }: { comparison: ComparisonSummary }) {
  const currentScore = parseFloat(comparison.currentAverageScore);
  const previousScore = parseFloat(comparison.previousAverageScore);
  const diff = currentScore - previousScore;
  const percentDiff = previousScore !== 0 ? ((diff / previousScore) * 100).toFixed(1) : "0";
  const isHigher = diff > 0;
  const isEqual = diff === 0;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Average Score</div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground line-through">
            {comparison.previousAverageScore}
          </span>
          <span className="text-lg font-bold">{comparison.currentAverageScore}</span>
        </div>
      </div>
      {!isEqual && (
        <div
          className={cn(
            "flex items-center gap-1",
            isHigher ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {isHigher ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          <span className="text-sm font-medium">
            {isHigher ? "+" : ""}
            {percentDiff}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Loading overlay for recalculation
 * AC-5.7.3: Loading indicator appears during calculation
 */
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Recalculating...</span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Preview impact modal showing top assets and comparison
 *
 * AC-5.7.1: Preview Impact Button Available During Editing
 * AC-5.7.2: Preview Shows Top 10 Scoring Assets
 * AC-5.7.3: Preview Updates Live as Criteria Modified
 * AC-5.7.4: Shows Comparison (Improved/Worse/Same Counts)
 */
export function PreviewImpactModal({
  open,
  onOpenChange,
  result,
  isLoading,
  error,
}: PreviewImpactModalProps) {
  // Show comparison only when available
  const hasComparison = useMemo(() => result?.comparison !== undefined, [result?.comparison]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Impact
          </DialogTitle>
          <DialogDescription>
            {result
              ? `Top ${result.topAssets.length} scoring assets from ${result.sampleSize} samples`
              : "Loading preview..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 relative">
          {/* Loading overlay */}
          {isLoading && <LoadingOverlay />}

          {/* Error state */}
          {error && (
            <div className="text-center text-red-600 dark:text-red-400 py-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
              {error}
            </div>
          )}

          {/* Comparison Summary - if available */}
          {hasComparison && result?.comparison && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">Comparison with Saved Version</h4>
                <Badge variant="outline" className="text-xs">
                  vs. saved
                </Badge>
              </div>
              <ComparisonSummaryCards comparison={result.comparison} />
              <AverageScoreComparison comparison={result.comparison} />
            </div>
          )}

          {/* Top Assets Table */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Top Scoring Assets</h4>
                <span className="text-xs text-muted-foreground">
                  {result.sampleSize} assets evaluated
                </span>
              </div>
              <PreviewAssetsTable assets={result.topAssets} isLoading={isLoading && !result} />
            </div>
          )}

          {/* Empty state - no result yet */}
          {!result && !isLoading && !error && (
            <div className="text-center text-muted-foreground py-8 border rounded-lg">
              No preview data available yet.
            </div>
          )}

          {/* Timestamp */}
          {result && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Calculated at: {new Date(result.calculatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
