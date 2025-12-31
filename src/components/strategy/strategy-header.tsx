"use client";

/**
 * Strategy Header Component
 *
 * Story 3.7: Strategy Allocation Balance Indicator
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * AC-3.7.1: Strategy Page Allocation Summary
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * Client component that displays page header, allocation balance indicator,
 * and allocation warning banner.
 */

import { useAllocationValidation } from "@/hooks/use-asset-classes";
import { AllocationWarningBannerWithData } from "./allocation-warning-banner";
import { StrategyAllocationBalanceIndicator } from "./strategy-allocation-balance-indicator";

export function StrategyHeader() {
  const { validation, hasWarnings, isLoading } = useAllocationValidation();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Strategy</h1>
        <p className="text-muted-foreground">
          Define your investment strategy with asset classes and allocation targets.
        </p>
      </div>

      {/* Strategy Allocation Balance Indicator - Story 3.7 */}
      <StrategyAllocationBalanceIndicator className="max-w-md" />

      {/* Allocation Warning Banner - Story 4.3 */}
      {!isLoading && hasWarnings && validation && (
        <AllocationWarningBannerWithData hasWarnings={hasWarnings} warnings={validation.warnings} />
      )}
    </div>
  );
}
