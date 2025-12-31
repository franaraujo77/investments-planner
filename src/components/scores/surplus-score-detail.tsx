"use client";

/**
 * Surplus Score Detail Component
 *
 * Story 4.6: Historical Surplus Scoring
 * AC-4.6.3: Score Breakdown Display
 *
 * Displays detailed surplus scoring breakdown:
 * - Years of data available
 * - Consecutive surplus years
 * - Bonus applied (+5 for 5+ consecutive years)
 * - Penalty applied (-2 per missing year)
 * - Net impact on score
 *
 * Color coding:
 * - Green: Bonus applied (5+ consecutive years)
 * - Amber: Partial data (1-4 years)
 * - Red: Penalty applied (missing years)
 *
 * Component Structure:
 * - SurplusScoreDetail: Main component with compact/detailed mode
 * - CompactSurplusView: Inline summary for tight spaces
 * - DetailedSurplusView: Full breakdown with bonus/penalty details
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { EXPECTED_YEARS_OF_DATA } from "@/lib/calculations/surplus-scoring";

// =============================================================================
// TYPES
// =============================================================================

export interface SurplusScoreDetailProps {
  /** Years of data available */
  yearsOfData: number;
  /** Consecutive years with dividend surplus */
  consecutiveYears: number;
  /** Bonus points applied (0 or +5) */
  bonusApplied: number;
  /** Penalty points applied (0 or negative) */
  penaltyApplied: number;
  /** Total net impact on score */
  totalPoints?: number;
  /** Optional additional class names */
  className?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Surplus status types for icon and styling decisions
 */
export type SurplusStatus = "bonus" | "penalty" | "neutral";

/**
 * Determine surplus status based on bonus and penalty values
 *
 * Exported for independent testing and reuse in other components.
 *
 * @param bonusApplied - Bonus points (positive or 0)
 * @param penaltyApplied - Penalty points (negative or 0)
 * @returns Status: 'bonus' if positive bonus, 'penalty' if negative penalty, 'neutral' otherwise
 */
export function getSurplusStatus(bonusApplied: number, penaltyApplied: number): SurplusStatus {
  if (bonusApplied > 0) return "bonus";
  if (penaltyApplied < 0) return "penalty";
  return "neutral";
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Status icon based on score impact
 *
 * Uses getSurplusStatus for logic, renders appropriate icon.
 */
function StatusIcon({
  bonusApplied,
  penaltyApplied,
}: {
  bonusApplied: number;
  penaltyApplied: number;
}) {
  const status = getSurplusStatus(bonusApplied, penaltyApplied);

  switch (status) {
    case "bonus":
      return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Bonus applied" />;
    case "penalty":
      return <XCircle className="h-4 w-4 text-red-600" aria-label="Penalty applied" />;
    case "neutral":
      return <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Neutral" />;
  }
}

/**
 * Format points with sign
 */
function formatPoints(points: number, formatNumber: (n: number) => string): string {
  if (points > 0) return `+${formatNumber(points)}`;
  if (points < 0) return formatNumber(points);
  return formatNumber(0);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Props shared by compact and detailed views
 */
interface SurplusViewProps {
  yearsOfData: number;
  consecutiveYears: number;
  bonusApplied: number;
  penaltyApplied: number;
  netPoints: number;
  hasBonus: boolean;
  hasPenalty: boolean;
  formatNumber: (n: number) => string;
  className: string | undefined;
}

/**
 * Compact inline view for surplus score
 *
 * Displays a single-line summary with status icon, streak info, and points badge.
 * Used in tight spaces like table cells or inline displays.
 */
function CompactSurplusView({
  consecutiveYears,
  yearsOfData,
  bonusApplied,
  penaltyApplied,
  netPoints,
  hasBonus,
  hasPenalty,
  formatNumber,
  className,
}: SurplusViewProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label="Surplus score summary"
    >
      <StatusIcon bonusApplied={bonusApplied} penaltyApplied={penaltyApplied} />
      <span className="text-sm text-muted-foreground">
        {consecutiveYears}y streak, {yearsOfData}y data
      </span>
      <Badge
        variant={hasBonus ? "default" : hasPenalty ? "destructive" : "secondary"}
        className="font-mono text-xs"
      >
        {formatPoints(netPoints, formatNumber)} pts
      </Badge>
    </div>
  );
}

/**
 * Detailed card view for surplus score
 *
 * Displays full breakdown with years of data, consecutive years,
 * and explicit bonus/penalty details. Used in score detail panels.
 */
function DetailedSurplusView({
  yearsOfData,
  consecutiveYears,
  bonusApplied,
  penaltyApplied,
  netPoints,
  hasBonus,
  hasPenalty,
  formatNumber,
  className,
}: SurplusViewProps) {
  // Determine overall status color
  const statusColor = hasBonus
    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
    : hasPenalty
      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
      : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900";

  const missingYears = Math.max(0, EXPECTED_YEARS_OF_DATA - yearsOfData);

  return (
    <div
      className={cn("rounded-lg border p-4 space-y-3", statusColor, className)}
      role="region"
      aria-labelledby="surplus-score-title"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon bonusApplied={bonusApplied} penaltyApplied={penaltyApplied} />
          <h5 id="surplus-score-title" className="font-medium text-sm">
            Surplus Consistency
          </h5>
        </div>
        <Badge
          variant={hasBonus ? "default" : hasPenalty ? "destructive" : "secondary"}
          className="font-mono"
        >
          {formatPoints(netPoints, formatNumber)} pts
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Years of Data */}
        <div className="space-y-1">
          <span className="text-muted-foreground">Years of Data</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatNumber(yearsOfData)} years</span>
            {yearsOfData >= EXPECTED_YEARS_OF_DATA ? (
              <span className="text-green-600 text-xs">(Complete)</span>
            ) : (
              <span className="text-amber-600 text-xs">({missingYears} missing)</span>
            )}
          </div>
        </div>

        {/* Consecutive Years */}
        <div className="space-y-1">
          <span className="text-muted-foreground">Consecutive Surplus</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatNumber(consecutiveYears)} years</span>
            {consecutiveYears >= EXPECTED_YEARS_OF_DATA ? (
              <span className="text-green-600 text-xs">(Bonus!)</span>
            ) : (
              <span className="text-muted-foreground text-xs">
                (Need {EXPECTED_YEARS_OF_DATA}+ for bonus)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bonus/Penalty Details */}
      <div className="border-t pt-3 space-y-2">
        {hasBonus && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>Consistency Bonus</span>
            </div>
            <span className="font-mono font-medium text-green-600">
              +{formatNumber(bonusApplied)} pts
            </span>
          </div>
        )}

        {hasPenalty && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span>Missing Data Penalty</span>
            </div>
            <span className="font-mono font-medium text-red-600">
              {formatNumber(penaltyApplied)} pts
            </span>
          </div>
        )}

        {!hasBonus && !hasPenalty && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>No bonus or penalty</span>
            <span className="font-mono">0 pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Surplus score detail component
 *
 * AC-4.6.3: Shows years of data, consecutive years, bonus/penalty applied
 *
 * Delegates to CompactSurplusView or DetailedSurplusView based on compact prop.
 */
export function SurplusScoreDetail({
  yearsOfData,
  consecutiveYears,
  bonusApplied,
  penaltyApplied,
  totalPoints,
  className,
  compact = false,
}: SurplusScoreDetailProps) {
  const { formatNumber } = useNumberFormat();
  const netPoints = totalPoints ?? bonusApplied + penaltyApplied;
  const hasBonus = bonusApplied > 0;
  const hasPenalty = penaltyApplied < 0;

  const sharedProps: SurplusViewProps = {
    yearsOfData,
    consecutiveYears,
    bonusApplied,
    penaltyApplied,
    netPoints,
    hasBonus,
    hasPenalty,
    formatNumber,
    className,
  };

  if (compact) {
    return <CompactSurplusView {...sharedProps} />;
  }

  return <DetailedSurplusView {...sharedProps} />;
}
