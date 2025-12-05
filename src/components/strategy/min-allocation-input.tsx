"use client";

/**
 * Min Allocation Input Component
 *
 * Story 4.6: Set Minimum Allocation Values
 *
 * AC-4.6.1: Set minimum allocation value in base currency
 * AC-4.6.3: No minimum when value is null or "0"
 * AC-4.6.4: Validation of minimum allocation value (0 to 1,000,000)
 *
 * Currency input field for setting the minimum allocation amount.
 * 0 or null means "no minimum" and is displayed as such.
 * Auto-saves on blur (following AssetCountInput pattern).
 */

import { useState, useCallback, useEffect } from "react";
import { Check, Loader2, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MinAllocationInputProps {
  /** ID of the class or subclass */
  entityId: string;
  /** Current min allocation value (null or "0" = no minimum) */
  minAllocationValue: string | null;
  /** Currency code for display (e.g., "USD", "BRL", "EUR") */
  currency: string;
  /** Callback to update the min allocation value */
  onUpdate: (entityId: string, minAllocationValue: string | null) => Promise<unknown>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
  /** Label text (defaults to "Min Allocation") */
  label?: string;
}

/**
 * Format value for display
 * null or "0" shows empty (placeholder shows "No minimum")
 */
function formatDisplay(value: string | null): string {
  if (value === null || value === "0" || value === "0.00" || value === "") return "";
  return value;
}

/**
 * Validate min allocation value
 * Must be a decimal between 0 and 1,000,000 with up to 4 decimal places
 */
function isValidMinAllocation(value: string): boolean {
  if (!value) return true; // Empty is valid (will be treated as no minimum)
  const regex = /^\d+(\.\d{1,4})?$/;
  if (!regex.test(value)) return false;
  const num = parseFloat(value);
  return num >= 0 && num <= 1000000;
}

/**
 * Get currency symbol for display
 */
function getCurrencySymbol(currency: string): string {
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      currencyDisplay: "symbol",
    });
    // Extract just the symbol from "US$0.00" -> "$"
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find((part) => part.type === "currency");
    return symbolPart?.value ?? currency;
  } catch {
    return currency;
  }
}

export function MinAllocationInput({
  entityId,
  minAllocationValue,
  currency = "USD",
  onUpdate,
  disabled = false,
  className,
  label = "Min Allocation",
}: MinAllocationInputProps) {
  const [value, setValue] = useState(formatDisplay(minAllocationValue));
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(currency);

  // Sync with prop changes
  useEffect(() => {
    setValue(formatDisplay(minAllocationValue));
  }, [minAllocationValue]);

  /**
   * Handle save on blur
   */
  const handleSave = useCallback(async () => {
    // Validate
    if (!isValidMinAllocation(value)) {
      setError("Must be 0-1,000,000 with up to 4 decimals");
      return;
    }

    setError(null);

    // Convert to string (empty string = null = no minimum)
    const newValue = value === "" ? null : value;

    // Normalize "0" to null (both mean no minimum)
    const normalizedNewValue = newValue === "0" || newValue === "0.00" ? null : newValue;
    const normalizedOldValue =
      minAllocationValue === "0" || minAllocationValue === "0.00" ? null : minAllocationValue;

    if (normalizedNewValue === normalizedOldValue) {
      return; // No change
    }

    setIsUpdating(true);

    try {
      await onUpdate(entityId, newValue);

      // Show saved indicator briefly
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      setError("Failed to save minimum allocation");
    } finally {
      setIsUpdating(false);
    }
  }, [entityId, value, minAllocationValue, onUpdate]);

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Clear error if corrected
    if (error && isValidMinAllocation(newValue)) {
      setError(null);
    }
  };

  /**
   * Handle clear button click (set to no minimum)
   */
  const handleClear = useCallback(async () => {
    if (disabled || isUpdating) return;

    setValue("");
    setIsUpdating(true);

    try {
      await onUpdate(entityId, null);

      // Show saved indicator briefly
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      setError("Failed to clear minimum");
    } finally {
      setIsUpdating(false);
    }
  }, [entityId, disabled, isUpdating, onUpdate]);

  const hasValue = value !== "" && value !== "0" && value !== "0.00";

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={`min-allocation-${entityId}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          {/* Currency symbol prefix */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currencySymbol}
          </div>
          <Input
            id={`min-allocation-${entityId}`}
            type="text"
            inputMode="decimal"
            placeholder="No minimum"
            value={value}
            onChange={handleChange}
            onBlur={handleSave}
            disabled={disabled || isUpdating}
            className={cn("h-8 w-28 pl-6", error && "border-destructive", hasValue && "pr-7")}
            aria-label={label}
          />
          {/* Clear button - shown only when there's a value */}
          {hasValue && !disabled && !isUpdating && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-7 hover:bg-transparent"
              onClick={handleClear}
              aria-label="Clear minimum"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>

        {/* Status indicator */}
        <div className="w-5 flex items-center justify-center">
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {showSaved && !isUpdating && <Check className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
