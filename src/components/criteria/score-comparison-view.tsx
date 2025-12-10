"use client";

/**
 * Score Comparison View Component
 *
 * Story 5.6: Compare Criteria Sets
 * AC-5.6.3: Average Scores Per Set
 * AC-5.6.4: Assets with Different Rankings Highlighted
 *
 * Displays:
 * - Average score cards for Set A and Set B
 * - Score difference indicator with percentage
 * - Sample size information
 * - Ranking changes table with position change arrows
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CriteriaSetSummary, RankingChange } from "@/lib/services/criteria-comparison-service";

// =============================================================================
// TYPES
// =============================================================================

interface ScoreComparisonViewProps {
  setA: CriteriaSetSummary;
  setB: CriteriaSetSummary;
  rankingChanges: RankingChange[];
  sampleSize: number;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Score card for a criteria set
 */
function ScoreCard({
  title,
  score,
  criteriaCount,
  market,
  variant,
}: {
  title: string;
  score: string;
  criteriaCount: number;
  market: string;
  variant: "a" | "b";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-2",
        variant === "a"
          ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
          : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
      )}
    >
      <div className="text-sm font-medium text-muted-foreground">Set {variant.toUpperCase()}</div>
      <div className="font-semibold truncate" title={title}>
        {title}
      </div>
      <div className="text-3xl font-bold">{score}</div>
      <div className="text-xs text-muted-foreground">
        {criteriaCount} criteria | {market}
      </div>
    </div>
  );
}

/**
 * Score difference indicator
 */
function ScoreDifferenceIndicator({ scoreA, scoreB }: { scoreA: string; scoreB: string }) {
  const numA = parseFloat(scoreA);
  const numB = parseFloat(scoreB);

  if (isNaN(numA) || isNaN(numB) || numA === 0) {
    return null;
  }

  const diff = numB - numA;
  const percentDiff = ((diff / numA) * 100).toFixed(1);
  const isHigher = diff > 0;
  const isEqual = diff === 0;

  if (isEqual) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Minus className="h-5 w-5" />
        <span className="text-sm">Scores are equal</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isHigher ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {isHigher ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      <span className="text-sm font-medium">
        Set B scores {Math.abs(parseFloat(percentDiff))}% {isHigher ? "higher" : "lower"} on average
      </span>
    </div>
  );
}

/**
 * Ranking change row with arrow indicators
 */
function RankingChangeRow({ change }: { change: RankingChange }) {
  const isSignificant = change.positionChange > 3;

  return (
    <TableRow className={cn(isSignificant && "bg-muted/50")}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {change.assetSymbol}
          {isSignificant && (
            <Badge variant="outline" className="text-xs">
              Significant
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[150px] truncate" title={change.assetName}>
        {change.assetName}
      </TableCell>
      <TableCell className="text-center">{change.rankA}</TableCell>
      <TableCell className="text-center">{change.rankB}</TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {change.change === "improved" ? (
            <>
              <ArrowUp className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                +{change.positionChange}
              </span>
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                -{change.positionChange}
              </span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center text-muted-foreground">{change.scoreA}</TableCell>
      <TableCell className="text-center text-muted-foreground">{change.scoreB}</TableCell>
    </TableRow>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Score comparison view with average scores and ranking changes
 *
 * AC-5.6.3: Average Scores Per Set
 * AC-5.6.4: Assets with Different Rankings Highlighted
 */
export function ScoreComparisonView({
  setA,
  setB,
  rankingChanges,
  sampleSize,
  className,
}: ScoreComparisonViewProps) {
  const significantChanges = rankingChanges.filter((c) => c.positionChange > 3);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreCard
          title={setA.name}
          score={setA.averageScore}
          criteriaCount={setA.criteriaCount}
          market={setA.market}
          variant="a"
        />
        <ScoreCard
          title={setB.name}
          score={setB.averageScore}
          criteriaCount={setB.criteriaCount}
          market={setB.market}
          variant="b"
        />
      </div>

      {/* Score Difference */}
      <div className="flex flex-col items-center gap-2 py-4 border-y">
        <ScoreDifferenceIndicator scoreA={setA.averageScore} scoreB={setB.averageScore} />
        <span className="text-xs text-muted-foreground">Based on {sampleSize} sample assets</span>
      </div>

      {/* Ranking Changes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Ranking Changes</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{rankingChanges.length} changes</Badge>
            {significantChanges.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <ArrowUp className="h-3 w-3" />
                {significantChanges.length} significant
              </Badge>
            )}
          </div>
        </div>

        {rankingChanges.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 border rounded-lg">
            No ranking changes between the two sets
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Rank A</TableHead>
                  <TableHead className="text-center">Rank B</TableHead>
                  <TableHead className="text-center">Change</TableHead>
                  <TableHead className="text-center">Score A</TableHead>
                  <TableHead className="text-center">Score B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingChanges.map((change) => (
                  <RankingChangeRow key={change.assetSymbol} change={change} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
