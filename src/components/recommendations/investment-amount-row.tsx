"use client";

/**
 * InvestmentAmountRow Component
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.1: Click Opens Confirmation Modal
 * AC-7.8.2: Real-time Total Updates
 *
 * Displays a single asset row in the confirmation modal with:
 * - Asset symbol (ticker)
 * - Editable amount input (pre-filled with recommended)
 * - Price per unit display
 * - Over-allocated indicator ($0.00 locked)
 */

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency-format";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface InvestmentAmountRowProps {
  /** Portfolio asset ID */
  assetId: string;
  /** Asset ticker symbol */
  symbol: string;
  /** Recommended amount (decimal string) */
  recommendedAmount: string;
  /** Current amount value (decimal string) */
  currentAmount: string;
  /** Price per unit (decimal string) */
  pricePerUnit: string;
  /** Whether asset is over-allocated (locked to $0.00) */
  isOverAllocated: boolean;
  /** Currency code for formatting */
  currency: string;
  /** Called when amount changes */
  onAmountChange: (assetId: string, amount: string) => void;
  /** Validation error for this row (optional) */
  error?: string | undefined;
  /** Whether form is disabled (submitting) */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InvestmentAmountRow({
  assetId,
  symbol,
  recommendedAmount,
  currentAmount,
  pricePerUnit,
  isOverAllocated,
  currency,
  onAmountChange,
  error,
  disabled = false,
}: InvestmentAmountRowProps) {
  const [localValue, setLocalValue] = useState(currentAmount);

  // Sync local value when currentAmount changes externally
  useEffect(() => {
    setLocalValue(currentAmount);
  }, [currentAmount]);

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);

      // Debounce validation - validate on blur or after typing stops
      // For now, propagate immediately for real-time total updates (AC-7.8.2)
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onAmountChange(assetId, value);
      } else if (value === "" || value === "0") {
        onAmountChange(assetId, "0");
      }
    },
    [assetId, onAmountChange]
  );

  // Handle blur - format and validate
  const handleBlur = useCallback(() => {
    const numValue = parseFloat(localValue);
    if (isNaN(numValue) || numValue < 0) {
      setLocalValue("0");
      onAmountChange(assetId, "0");
    } else {
      // Format to 2 decimal places
      const formatted = numValue.toFixed(2);
      setLocalValue(formatted);
      onAmountChange(assetId, formatted);
    }
  }, [localValue, assetId, onAmountChange]);

  // Format price for display
  const formattedPrice = formatCurrency(pricePerUnit, currency);
  const formattedRecommended = formatCurrency(recommendedAmount, currency);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border",
        isOverAllocated && "bg-muted/50 opacity-75",
        error && "border-destructive"
      )}
      data-testid={`investment-row-${symbol}`}
    >
      {/* Symbol and status */}
      <div className="flex-shrink-0 w-24">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm">{symbol}</span>
          {isOverAllocated && (
            <Badge
              variant="outline"
              className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Over
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">@ {formattedPrice}</p>
      </div>

      {/* Recommended amount display */}
      <div className="flex-shrink-0 w-32 text-right">
        <Label className="text-xs text-muted-foreground">Recommended</Label>
        <p className="text-sm font-medium">{formattedRecommended}</p>
      </div>

      {/* Editable amount input */}
      <div className="flex-1 max-w-40">
        <Label htmlFor={`amount-${assetId}`} className="text-xs text-muted-foreground">
          Actual Amount
        </Label>
        <div className="relative mt-0.5">
          <Input
            id={`amount-${assetId}`}
            type="number"
            min="0"
            step="0.01"
            value={isOverAllocated ? "0.00" : localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled || isOverAllocated}
            className={cn(
              "text-right font-mono",
              isOverAllocated && "bg-muted cursor-not-allowed",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            aria-describedby={error ? `error-${assetId}` : undefined}
            aria-invalid={!!error}
          />
          {isOverAllocated && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-muted-foreground text-sm">$0.00</span>
            </div>
          )}
        </div>
        {error && (
          <p id={`error-${assetId}`} className="text-xs text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
