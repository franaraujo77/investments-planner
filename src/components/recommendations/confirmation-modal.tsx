"use client";

/**
 * ConfirmationModal Component
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.1: Click Opens Confirmation Modal
 * AC-7.8.2: Real-time Total Updates
 * AC-7.8.3: Confirm Records Investments
 * AC-7.8.4: Success Toast Notification
 * AC-7.8.5: Validation Prevents Invalid Submissions
 *
 * Story 7.10: View Updated Allocation
 * AC-7.10.1: Before/After Allocation Comparison
 * AC-7.10.2: Improved Allocations Highlighted
 * AC-7.10.3: Navigate to Portfolio View
 *
 * Features:
 * - Pre-filled editable investment amounts
 * - Real-time total calculation as amounts change
 * - Over-allocated assets shown as $0.00 (non-editable)
 * - Validation: no negatives, total <= available capital
 * - Submit records investments and shows toast
 * - Success state with before/after allocation comparison
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { InvestmentAmountRow } from "./investment-amount-row";
import { AllocationComparisonView } from "./allocation-comparison-view";
import { formatCurrency } from "@/lib/utils/currency-format";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";
import type { ConfirmInvestmentResult } from "@/lib/types/recommendations";

// =============================================================================
// TYPES
// =============================================================================

export interface ConfirmationModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Called when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Recommendation session ID */
  recommendationId: string;
  /** Total investable capital (decimal string) */
  totalInvestable: string;
  /** User's base currency */
  baseCurrency: string;
  /** Recommendation items to confirm */
  items: RecommendationDisplayItem[];
  /** Called on successful confirmation */
  onConfirm: (
    investments: Array<{
      assetId: string;
      ticker: string;
      actualAmount: string;
      pricePerUnit: string;
    }>
  ) => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Error message from submission (optional) */
  submitError?: string | null;
  /** Confirmation result for success state (Story 7.10) */
  confirmationResult?: ConfirmInvestmentResult | null;
  /** Called when user navigates to Portfolio (Story 7.10) */
  onNavigateToPortfolio?: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate total from all amounts
 */
function calculateTotal(amounts: Record<string, string>): number {
  return Object.values(amounts).reduce((sum, amt) => {
    const num = parseFloat(amt);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
}

/**
 * Validate all amounts are non-negative
 */
function validateAmounts(amounts: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [assetId, amount] of Object.entries(amounts)) {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      errors[assetId] = "Amount cannot be negative";
    }
  }
  return errors;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ConfirmationModal({
  open,
  onOpenChange,
  recommendationId: _recommendationId,
  totalInvestable,
  baseCurrency,
  items,
  onConfirm,
  isSubmitting = false,
  submitError = null,
  confirmationResult = null,
  onNavigateToPortfolio,
}: ConfirmationModalProps) {
  // Track if we should show success state
  // Success state shows after confirmation when result is available
  const showSuccess = confirmationResult !== null && confirmationResult.success;
  // Initialize amounts from recommended values
  const initialAmounts = useMemo(() => {
    const amounts: Record<string, string> = {};
    for (const item of items) {
      // Over-allocated assets always get $0.00
      amounts[item.assetId] = item.isOverAllocated ? "0.00" : item.recommendedAmount;
    }
    return amounts;
  }, [items]);

  const [amounts, setAmounts] = useState<Record<string, string>>(initialAmounts);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset amounts when modal opens with new items
  // This effect synchronizes external prop (open) with internal state (amounts)
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset state when modal opens from closed
      setAmounts(initialAmounts);
      setErrors({});
    }
  }, [open, initialAmounts]);

  // Calculate totals for real-time display (AC-7.8.2)
  const currentTotal = useMemo(() => calculateTotal(amounts), [amounts]);
  const availableCapital = parseFloat(totalInvestable);
  const remaining = availableCapital - currentTotal;
  const isOverBudget = remaining < -0.01; // Allow small floating point tolerance

  // Handle amount change
  const handleAmountChange = useCallback((assetId: string, amount: string) => {
    setAmounts((prev) => ({
      ...prev,
      [assetId]: amount,
    }));
    // Clear error for this field
    setErrors((prev) => {
      const next = { ...prev };
      delete next[assetId];
      return next;
    });
  }, []);

  // Handle confirm click
  const handleConfirm = useCallback(async () => {
    // Validate all amounts (AC-7.8.5)
    const validationErrors = validateAmounts(amounts);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Validate total <= available (AC-7.8.5)
    if (isOverBudget) {
      return; // Button should already be disabled
    }

    // Build investment data
    const investmentData = items
      .filter((item) => {
        const amount = parseFloat(amounts[item.assetId] ?? "0");
        return amount > 0;
      })
      .map((item) => ({
        assetId: item.assetId,
        ticker: item.symbol,
        actualAmount: amounts[item.assetId] ?? "0",
        pricePerUnit: "1.00", // TODO: Get actual price from market data
      }));

    await onConfirm(investmentData);
  }, [amounts, items, isOverBudget, onConfirm]);

  // Sort items: investable assets first, then over-allocated
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isOverAllocated && !b.isOverAllocated) return 1;
      if (!a.isOverAllocated && b.isOverAllocated) return -1;
      // Sort by recommended amount descending
      const amtA = parseFloat(a.recommendedAmount);
      const amtB = parseFloat(b.recommendedAmount);
      return amtB - amtA;
    });
  }, [items]);

  // Format values for display
  const formattedTotal = formatCurrency(currentTotal.toString(), baseCurrency);
  const formattedAvailable = formatCurrency(totalInvestable, baseCurrency);
  const formattedRemaining = formatCurrency(Math.abs(remaining).toString(), baseCurrency);

  // Count investable vs over-allocated
  const investableCount = items.filter((i) => !i.isOverAllocated).length;
  const overAllocatedCount = items.filter((i) => i.isOverAllocated).length;

  // Handle navigation to portfolio (AC-7.10.3)
  const handleNavigateToPortfolio = useCallback(() => {
    onOpenChange(false); // Close modal
    onNavigateToPortfolio?.(); // Navigate
  }, [onOpenChange, onNavigateToPortfolio]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/*
          Story 7.10: Show success state with allocation comparison
          after confirmation completes successfully
        */}
        {showSuccess && confirmationResult ? (
          /* SUCCESS STATE - AC-7.10.1, AC-7.10.2, AC-7.10.3 */
          <AllocationComparisonView
            before={confirmationResult.allocations.before}
            after={confirmationResult.allocations.after}
            onNavigateToPortfolio={handleNavigateToPortfolio}
          />
        ) : (
          /* CONFIRMATION FORM STATE */
          <>
            <DialogHeader>
              <DialogTitle>Confirm Your Investments</DialogTitle>
              <DialogDescription>
                Review and adjust the investment amounts below. Over-allocated assets are locked at
                $0.00.
              </DialogDescription>
            </DialogHeader>

            {/* Summary Banner */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Available Capital</p>
                <p className="text-lg font-semibold">{formattedAvailable}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Total</p>
                <p
                  className={`text-lg font-semibold ${isOverBudget ? "text-destructive" : "text-green-600"}`}
                >
                  {formattedTotal}
                </p>
              </div>
            </div>

            {/* Over-budget warning */}
            {isOverBudget && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your total exceeds available capital by {formattedRemaining}. Please reduce
                  amounts.
                </AlertDescription>
              </Alert>
            )}

            {/* Remaining indicator */}
            {!isOverBudget && remaining > 0.01 && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>{formattedRemaining} remaining to allocate.</AlertDescription>
              </Alert>
            )}

            {/* Submit error */}
            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Investment rows */}
            <div className="space-y-2">
              {investableCount > 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  {investableCount} asset{investableCount !== 1 ? "s" : ""} to invest
                </p>
              )}

              {sortedItems.map((item) => (
                <InvestmentAmountRow
                  key={item.assetId}
                  assetId={item.assetId}
                  symbol={item.symbol}
                  recommendedAmount={item.recommendedAmount}
                  currentAmount={amounts[item.assetId] ?? "0"}
                  pricePerUnit="1.00" // TODO: Get from market data
                  isOverAllocated={item.isOverAllocated}
                  currency={baseCurrency}
                  onAmountChange={handleAmountChange}
                  error={errors[item.assetId]}
                  disabled={isSubmitting}
                />
              ))}

              {overAllocatedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overAllocatedCount} over-allocated asset{overAllocatedCount !== 1 ? "s" : ""}{" "}
                  locked at $0.00
                </p>
              )}
            </div>

            <Separator />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting || isOverBudget || Object.keys(errors).length > 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm {formattedTotal}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
