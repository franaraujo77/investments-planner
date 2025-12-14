"use client";

/**
 * CalculationSteps Component
 *
 * Story 7.7: View Recommendation Breakdown
 * AC-7.7.3: Formula Display - shows step-by-step calculation
 *
 * Displays calculation steps in a clear, understandable format:
 * - Step number and description
 * - Calculated value
 * - Formula used
 *
 * Features:
 * - Visual step numbering
 * - Clear hierarchy
 * - Formula with explanatory text
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calculator } from "lucide-react";
import type { CalculationStep } from "@/lib/types/recommendations";

// =============================================================================
// TYPES
// =============================================================================

export interface CalculationStepsProps {
  /** Array of calculation steps to display */
  steps: CalculationStep[];
  /** Additional CSS classes */
  className?: string | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CalculationSteps Component
 *
 * Displays step-by-step calculation breakdown for a recommendation.
 *
 * @example
 * ```tsx
 * <CalculationSteps
 *   steps={[
 *     { step: "Calculate allocation gap", value: "2.0%", formula: "target - current" },
 *     { step: "Apply score weighting", value: "1.75", formula: "gap × (score/100)" },
 *     { step: "Distribute capital", value: "$800.00", formula: "weighted_share × total" },
 *   ]}
 * />
 * ```
 */
export function CalculationSteps({ steps, className }: CalculationStepsProps) {
  // Memoize step rendering for performance
  const renderedSteps = useMemo(() => {
    return steps.map((step, index) => (
      <div
        key={`step-${index}`}
        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
        data-testid={`calculation-step-${index + 1}`}
      >
        {/* Step number badge */}
        <div
          className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
          aria-hidden="true"
        >
          {index + 1}
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          {/* Step description */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground" data-testid="step-description">
              {step.step}
            </span>
            <span className="text-sm font-bold text-primary tabular-nums" data-testid="step-value">
              {step.value}
            </span>
          </div>

          {/* Formula */}
          <div className="mt-1 text-xs text-muted-foreground font-mono" data-testid="step-formula">
            {step.formula}
          </div>
        </div>
      </div>
    ));
  }, [steps]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="calculation-steps"
      role="list"
      aria-label="Calculation steps"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h4 className="text-sm font-medium text-muted-foreground">How it was calculated</h4>
      </div>

      {/* Steps */}
      {renderedSteps}
    </div>
  );
}
