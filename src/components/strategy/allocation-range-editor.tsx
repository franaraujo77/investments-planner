"use client";

/**
 * Allocation Range Editor Component
 *
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * AC-4.3.1: Set min/max allocation percentages for asset classes
 * AC-4.3.2: Validation - min cannot exceed max
 *
 * Dual input fields for setting target min/max allocation percentages.
 * Validates that min <= max and displays inline error.
 * Auto-saves on blur (debounced).
 */

import { useState, useCallback, useEffect } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AllocationRangeEditorProps {
  classId: string;
  targetMin: string | null;
  targetMax: string | null;
  onUpdate: (
    classId: string,
    input: { targetMin?: string | null; targetMax?: string | null }
  ) => Promise<unknown>;
  disabled?: boolean;
}

/**
 * Format percentage for display (add % symbol)
 */
function formatDisplay(value: string | null): string {
  if (!value) return "";
  return value;
}

/**
 * Validate percentage format and range
 */
function isValidPercentage(value: string): boolean {
  if (!value) return true; // Empty is valid (nullable)
  const regex = /^(100(\.00?)?|\d{1,2}(\.\d{1,2})?)$/;
  if (!regex.test(value)) return false;
  const num = parseFloat(value);
  return num >= 0 && num <= 100;
}

export function AllocationRangeEditor({
  classId,
  targetMin,
  targetMax,
  onUpdate,
  disabled = false,
}: AllocationRangeEditorProps) {
  const [minValue, setMinValue] = useState(formatDisplay(targetMin));
  const [maxValue, setMaxValue] = useState(formatDisplay(targetMax));
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setMinValue(formatDisplay(targetMin));
    setMaxValue(formatDisplay(targetMax));
  }, [targetMin, targetMax]);

  /**
   * Validate min <= max
   */
  const validateRange = useCallback((min: string, max: string): string | null => {
    // Validate formats first
    if (min && !isValidPercentage(min)) {
      return "Invalid min percentage format (0-100, up to 2 decimals)";
    }
    if (max && !isValidPercentage(max)) {
      return "Invalid max percentage format (0-100, up to 2 decimals)";
    }

    // Validate min <= max
    if (min && max) {
      const minNum = parseFloat(min);
      const maxNum = parseFloat(max);
      if (minNum > maxNum) {
        return "Minimum cannot exceed maximum";
      }
    }

    return null;
  }, []);

  /**
   * Handle save on blur
   */
  const handleSave = useCallback(async () => {
    // Validate
    const validationError = validateRange(minValue, maxValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // Check if values changed
    const newMin = minValue || null;
    const newMax = maxValue || null;

    if (newMin === targetMin && newMax === targetMax) {
      return; // No change
    }

    setIsUpdating(true);

    try {
      await onUpdate(classId, {
        targetMin: newMin,
        targetMax: newMax,
      });

      // Show saved indicator briefly
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      setError("Failed to save allocation range");
    } finally {
      setIsUpdating(false);
    }
  }, [classId, minValue, maxValue, targetMin, targetMax, onUpdate, validateRange]);

  /**
   * Handle min input change
   */
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinValue(value);

    // Clear error if corrected
    const validationError = validateRange(value, maxValue);
    if (error && !validationError) {
      setError(null);
    }
  };

  /**
   * Handle max input change
   */
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxValue(value);

    // Clear error if corrected
    const validationError = validateRange(minValue, value);
    if (error && !validationError) {
      setError(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor={`min-${classId}`} className="text-xs text-muted-foreground">
            Min %
          </Label>
          <div className="relative">
            <Input
              id={`min-${classId}`}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={minValue}
              onChange={handleMinChange}
              onBlur={handleSave}
              disabled={disabled || isUpdating}
              className={cn(
                "h-8 pr-6",
                error && error.toLowerCase().includes("min") && "border-destructive"
              )}
              aria-label="Minimum allocation percentage"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>

        <span className="text-muted-foreground pt-5">-</span>

        <div className="flex-1">
          <Label htmlFor={`max-${classId}`} className="text-xs text-muted-foreground">
            Max %
          </Label>
          <div className="relative">
            <Input
              id={`max-${classId}`}
              type="text"
              inputMode="decimal"
              placeholder="100"
              value={maxValue}
              onChange={handleMaxChange}
              onBlur={handleSave}
              disabled={disabled || isUpdating}
              className={cn(
                "h-8 pr-6",
                error && error.toLowerCase().includes("max") && "border-destructive"
              )}
              aria-label="Maximum allocation percentage"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="w-5 pt-5">
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
