"use client";

/**
 * OverAllocatedExplanation Component
 *
 * Story 7.6: Zero Buy Signal for Over-Allocated
 * AC-7.6.3: Click Shows Explanation
 *
 * Displays a slide-over panel explaining why an asset is over-allocated
 * and provides guidance on contribution-only rebalancing.
 *
 * Features:
 * - Shows current allocation vs target range
 * - Displays rebalancing guidance message
 * - Uses AllocationGauge for visual representation
 * - Mobile-friendly Sheet component
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AllocationGauge } from "./allocation-gauge";
import { AlertTriangle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface OverAllocatedExplanationProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback to close the sheet */
  onOpenChange: (open: boolean) => void;
  /** Asset ticker symbol */
  symbol: string;
  /** Current allocation percentage (decimal string) */
  currentAllocation: string;
  /** Target allocation percentage (decimal string, midpoint) */
  targetAllocation: string;
  /** Allocation gap (negative = over-allocated) */
  allocationGap: string;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate target range from midpoint
 * Uses ±5% as default range (consistent with RecommendationCard)
 */
export function calculateTargetRange(targetMidpoint: string): {
  min: string;
  max: string;
} {
  const midpoint = parseFloat(targetMidpoint) || 0;
  const min = Math.max(midpoint - 5, 0).toFixed(1);
  const max = Math.min(midpoint + 5, 100).toFixed(1);
  return { min, max };
}

/**
 * Generate the rebalancing guidance message
 */
export function generateGuidanceMessage(
  currentAllocation: string,
  targetMin: string,
  targetMax: string
): string {
  const current = parseFloat(currentAllocation) || 0;
  return `This asset is currently over-allocated at ${current.toFixed(1)}%, above your target range of ${targetMin}%-${targetMax}%.

No additional investment is recommended. Over time, as you continue contributing to other assets, your portfolio will naturally rebalance toward your target allocation without needing to sell.`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * OverAllocatedExplanation Component
 *
 * Displays a sheet explaining over-allocation status and rebalancing guidance.
 *
 * @example
 * ```tsx
 * <OverAllocatedExplanation
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   symbol="AAPL"
 *   currentAllocation="55.0"
 *   targetAllocation="45.0"
 *   allocationGap="-10.0"
 * />
 * ```
 */
export function OverAllocatedExplanation({
  open,
  onOpenChange,
  symbol,
  currentAllocation,
  targetAllocation,
  allocationGap: _allocationGap,
}: OverAllocatedExplanationProps) {
  // Calculate target range
  const { min: targetMin, max: targetMax } = calculateTargetRange(targetAllocation);

  // Format current allocation for display
  const currentValue = parseFloat(currentAllocation) || 0;

  // Generate guidance message
  const guidanceMessage = generateGuidanceMessage(currentAllocation, targetMin, targetMax);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" data-testid="over-allocated-explanation-sheet">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <SheetTitle data-testid="explanation-title">{symbol} - Over-Allocated</SheetTitle>
          </div>
          <SheetDescription data-testid="explanation-description">
            No investment recommended for this asset
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {/* Current vs Target Summary */}
          <div
            className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-4"
            data-testid="allocation-summary"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Current Allocation</span>
              <span
                className="text-lg font-bold text-amber-700 dark:text-amber-300"
                data-testid="current-allocation-value"
              >
                {currentValue.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Target Range</span>
              <span className="text-lg font-semibold" data-testid="target-range-value">
                {targetMin}% - {targetMax}%
              </span>
            </div>
          </div>

          {/* Allocation Gauge Visual */}
          <div data-testid="allocation-gauge-container">
            <h4 className="text-sm font-medium mb-2">Allocation Status</h4>
            <AllocationGauge
              current={currentAllocation}
              targetMin={targetMin}
              targetMax={targetMax}
              size="lg"
              showValues
            />
          </div>

          {/* Rebalancing Guidance */}
          <div className="rounded-lg border p-4 bg-muted/30" data-testid="guidance-section">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span>Rebalancing Guidance</span>
            </h4>
            <p
              className="text-sm text-muted-foreground whitespace-pre-line"
              data-testid="guidance-message"
            >
              {guidanceMessage}
            </p>
          </div>

          {/* Key Takeaway */}
          <div
            className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10 p-4"
            data-testid="key-takeaway"
          >
            <p className="text-sm font-medium">
              Consider rebalancing through contributions to under-allocated assets.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
