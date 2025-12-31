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
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
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
 * Surplus scoring breakdown item
 * Story 4.6: AC-4.6.3 - Shows surplus scoring details inline
 */
function SurplusBreakdownItem({
  score,
  formatNumber,
}: {
  score: CriterionScore;
  formatNumber: (value: number) => string;
}) {
  const details = score.surplusDetails;
  if (!details) return null;

  const hasBonus = details.bonusApplied > 0;
  const hasPenalty = details.penaltyApplied < 0;
  const netPoints = details.bonusApplied + details.penaltyApplied;

  const bgColor = hasBonus
    ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
    : hasPenalty
      ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
      : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900";

  return (
    <div className={cn("p-2 rounded-md text-sm", bgColor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasBonus ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : hasPenalty ? (
            <TrendingDown className="h-4 w-4 text-red-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span className="font-medium">{score.criterionName}</span>
        </div>
        <Badge
          variant={hasBonus ? "default" : hasPenalty ? "destructive" : "secondary"}
          className="font-mono text-xs"
        >
          {netPoints > 0 ? "+" : ""}
          {formatNumber(netPoints)} pts
        </Badge>
      </div>
      <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-2">
        <div>
          Years of data: <span className="font-medium">{details.yearsOfData}/5</span>
        </div>
        <div>
          Consecutive: <span className="font-medium">{details.consecutiveYears} years</span>
        </div>
        {hasBonus && (
          <div className="text-green-600">Bonus: +{formatNumber(details.bonusApplied)} pts</div>
        )}
        {hasPenalty && (
          <div className="text-red-600">Penalty: {formatNumber(details.penaltyApplied)} pts</div>
        )}
      </div>
    </div>
  );
}

/**
 * Score breakdown for a single asset
 */
function ScoreBreakdown({
  breakdown,
  formatNumber,
}: {
  breakdown: CriterionScore[];
  formatNumber: (value: number) => string;
}) {
  // Separate regular criteria from surplus scoring
  const regularCriteria = breakdown.filter((s) => s.criterionId !== "surplus-consistency");
  const surplusCriterion = breakdown.find((s) => s.criterionId === "surplus-consistency");

  return (
    <div className="bg-muted/50 p-4 space-y-2">
      <h5 className="font-medium text-sm text-muted-foreground mb-3">Score Breakdown</h5>
      <div className="grid gap-2">
        {regularCriteria.map((score) => (
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
                Actual: {score.actualValue !== null ? formatNumber(score.actualValue) : "N/A"}
              </span>
              <Badge variant={score.passed ? "default" : "outline"} className="font-mono text-xs">
                +{score.pointsAwarded} / {score.maxPoints}
              </Badge>
            </div>
          </div>
        ))}

        {/* Story 4.6: Surplus scoring breakdown */}
        {surplusCriterion && surplusCriterion.surplusDetails && (
          <SurplusBreakdownItem score={surplusCriterion} formatNumber={formatNumber} />
        )}
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
  formatNumber,
}: {
  asset: PreviewAsset;
  isExpanded: boolean;
  onToggle: () => void;
  formatNumber: (value: number) => string;
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
            <ScoreBreakdown breakdown={asset.breakdown} formatNumber={formatNumber} />
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
  const { formatNumber } = useNumberFormat();

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
              formatNumber={formatNumber}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
