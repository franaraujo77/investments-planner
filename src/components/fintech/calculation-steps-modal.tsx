"use client";

/**
 * CalculationStepsModal
 *
 * Story 7.2: Calculation Transparency
 * AC-7.2.3: Expandable Calculation Details Modal
 *
 * Displays step-by-step calculation walkthrough with:
 * - All input values with sources and timestamps
 * - Each criterion evaluation with detailed logic
 * - Final score computation
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check, X, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThreshold, type CriterionEvaluation } from "@/lib/types/calculation-breakdown";
import {
  useCalculationBreakdown,
  type CalculationBreakdownData,
} from "@/hooks/use-calculation-breakdown";

// =============================================================================
// TYPES
// =============================================================================

export interface CalculationStepsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  symbol: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Section wrapper for consistent styling
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 py-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Displays all input values used in calculation
 */
function InputsDisplay({ inputs }: { inputs: CalculationBreakdownData["inputs"] }) {
  return (
    <div className="space-y-2 text-sm">
      {inputs.price && (
        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded">
          <span className="text-muted-foreground">Price</span>
          <span className="font-mono">
            {inputs.price.value} {inputs.price.currency}
          </span>
        </div>
      )}
      {inputs.exchangeRate && (
        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded">
          <span className="text-muted-foreground">Exchange Rate</span>
          <span className="font-mono">
            {inputs.exchangeRate.from}/{inputs.exchangeRate.to}: {inputs.exchangeRate.value}
          </span>
        </div>
      )}
      {inputs.fundamentals && (
        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded">
          <span className="text-muted-foreground">Fundamentals</span>
          <span className="text-xs">
            {
              Object.keys(inputs.fundamentals.metrics).filter(
                (k) => inputs.fundamentals!.metrics[k] !== null
              ).length
            }{" "}
            metrics loaded
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Displays a single criterion evaluation step
 */
function CriterionStep({ evaluation, step }: { evaluation: CriterionEvaluation; step: number }) {
  const isSkipped = evaluation.skippedReason !== null;

  return (
    <div
      className={cn("py-2 px-3 rounded-md", isSkipped ? "bg-muted/30 opacity-60" : "bg-muted/20")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">#{step}</span>
          {isSkipped ? (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          ) : evaluation.passed ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm font-medium">{evaluation.name}</span>
        </div>
        <Badge
          variant={isSkipped ? "secondary" : evaluation.passed ? "default" : "destructive"}
          className="text-xs"
        >
          {isSkipped ? "Skipped" : `${evaluation.pointsAwarded} pts`}
        </Badge>
      </div>
      {!isSkipped && (
        <div className="ml-8 mt-1 text-xs text-muted-foreground">
          <span>Rule: {formatThreshold(evaluation.operator, evaluation.threshold)}</span>
          {evaluation.actualValue && <span className="ml-3">Actual: {evaluation.actualValue}</span>}
        </div>
      )}
      {isSkipped && (
        <div className="ml-8 mt-1 text-xs text-muted-foreground">
          Reason: {evaluation.skippedReason}
        </div>
      )}
    </div>
  );
}

/**
 * Displays final score summary
 */
function ScoreSummary({
  evaluations,
  score,
}: {
  evaluations: CriterionEvaluation[];
  score: CalculationBreakdownData["score"];
}) {
  const passed = evaluations.filter((e) => e.passed && !e.skippedReason).length;
  const failed = evaluations.filter((e) => !e.passed && !e.skippedReason).length;
  const skipped = evaluations.filter((e) => e.skippedReason).length;
  const totalPoints = evaluations.reduce((sum, e) => sum + e.pointsAwarded, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="py-2 px-3 bg-green-500/10 rounded">
          <div className="text-lg font-bold text-green-600">{passed}</div>
          <div className="text-xs text-muted-foreground">Passed</div>
        </div>
        <div className="py-2 px-3 bg-red-500/10 rounded">
          <div className="text-lg font-bold text-red-600">{failed}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="py-2 px-3 bg-muted/30 rounded">
          <div className="text-lg font-bold text-muted-foreground">{skipped}</div>
          <div className="text-xs text-muted-foreground">Skipped</div>
        </div>
      </div>
      <Separator />
      <div className="flex justify-between items-center py-2">
        <span className="font-medium">Final Score</span>
        <span className="text-2xl font-bold">{totalPoints} pts</span>
      </div>
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Max Possible</span>
        <span>
          {score.maxPossible} pts ({score.percentage}%)
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CalculationStepsModal({
  open,
  onOpenChange,
  assetId,
  symbol,
}: CalculationStepsModalProps) {
  // Fetch full breakdown data when modal opens
  const { data, isLoading, error } = useCalculationBreakdown(assetId, {
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="calculation-steps-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculation Details: {symbol}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <div className="overflow-y-auto max-h-[70vh] pr-4">
            {/* Step 1: Inputs */}
            <Section title="Step 1: Gather Input Data">
              <InputsDisplay inputs={data.inputs} />
            </Section>

            <Separator />

            {/* Step 2: Evaluations */}
            <Section title="Step 2: Evaluate Each Criterion">
              <div className="space-y-2">
                {data.evaluations.map((evaluation, idx) => (
                  <CriterionStep
                    key={evaluation.criterionId}
                    evaluation={evaluation}
                    step={idx + 1}
                  />
                ))}
              </div>
            </Section>

            <Separator />

            {/* Step 3: Final Score */}
            <Section title="Step 3: Sum Points">
              <ScoreSummary evaluations={data.evaluations} score={data.score} />
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
