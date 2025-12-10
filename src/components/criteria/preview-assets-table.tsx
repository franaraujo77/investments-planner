"use client";

/**
 * Preview Assets Table Component
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 * Story 5.10: View Asset Score
 *
 * AC-5.7.2: Preview Shows Top 10 Scoring Assets
 * AC-5.10.1: Score badge display with color coding
 *
 * Displays:
 * - Top 10 assets ranked by score
 * - Score with color-coded badge (ScoreBadge component)
 * - Click to expand for score breakdown
 * - Loading skeleton state
 */

import { useState, Fragment } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/fintech/score-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { PreviewAsset, CriterionScore } from "@/lib/calculations/quick-calc";

// =============================================================================
// TYPES
// =============================================================================

interface PreviewAssetsTableProps {
  /** Assets to display */
  assets: PreviewAsset[];
  /** Whether the table is loading */
  isLoading?: boolean;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Score breakdown for a single asset
 */
function ScoreBreakdown({ breakdown }: { breakdown: CriterionScore[] }) {
  return (
    <div className="bg-muted/50 p-4 space-y-2">
      <h5 className="font-medium text-sm text-muted-foreground mb-3">Score Breakdown</h5>
      <div className="grid gap-2">
        {breakdown.map((score) => (
          <div
            key={score.criterionId}
            className={cn(
              "flex items-center justify-between p-2 rounded-md text-sm",
              score.passed
                ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                : "bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800"
            )}
          >
            <div className="flex items-center gap-2">
              {score.passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="font-medium">{score.criterionName}</span>
              <span className="text-muted-foreground text-xs">
                ({score.metricLabel} {score.operatorLabel} {score.targetValue}
                {score.targetValue2 ? ` - ${score.targetValue2}` : ""})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Actual: {score.actualValue !== null ? score.actualValue.toFixed(2) : "N/A"}
              </span>
              <Badge variant={score.passed ? "default" : "outline"} className="font-mono text-xs">
                +{score.pointsAwarded} / {score.maxPoints}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Single asset row with expandable breakdown
 */
function AssetRow({
  asset,
  isExpanded,
  onToggle,
}: {
  asset: PreviewAsset;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Fragment>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="w-[50px] text-center font-medium">{asset.rank}</TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 hover:text-primary">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {asset.symbol}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground max-w-[200px] truncate" title={asset.name}>
          {asset.name}
        </TableCell>
        <TableCell className="text-right">
          <ScoreBadge
            score={asset.score}
            assetId={asset.symbol}
            criteriaMatched={{
              matched: asset.breakdown.filter((b) => b.passed).length,
              total: asset.breakdown.length,
            }}
            size="sm"
            interactive={false}
          />
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={4} className="p-0">
            <ScoreBreakdown breakdown={asset.breakdown} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

/**
 * Loading skeleton for the table
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Preview assets table with expandable score breakdown
 *
 * AC-5.7.2: Each asset shows symbol, name, score, and key metrics
 */
export function PreviewAssetsTable({
  assets,
  isLoading = false,
  className,
}: PreviewAssetsTableProps) {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  const toggleExpand = (symbol: string) => {
    setExpandedAsset(expandedAsset === symbol ? null : symbol);
  };

  if (isLoading) {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground py-8 border rounded-lg", className)}>
        No assets to display. Add criteria to see preview results.
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">Rank</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <AssetRow
              key={asset.symbol}
              asset={asset}
              isExpanded={expandedAsset === asset.symbol}
              onToggle={() => toggleExpand(asset.symbol)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
