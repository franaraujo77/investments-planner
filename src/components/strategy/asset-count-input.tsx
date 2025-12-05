"use client";

/**
 * Asset Count Input Component
 *
 * Story 4.5: Set Asset Count Limits
 *
 * AC-4.5.1: Set max assets limit for asset classes and subclasses
 * AC-4.5.3: No limit when max assets is 0 or null
 *
 * Single input field for setting the maximum number of assets.
 * 0 means "no limit" and is displayed as such.
 * Auto-saves on blur (debounced).
 */

import { useState, useCallback, useEffect } from "react";
import { Check, Loader2, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssetCountInputProps {
  /** ID of the class or subclass */
  entityId: string;
  /** Current max assets value (null or 0 = no limit) */
  maxAssets: number | null;
  /** Callback to update the max assets value */
  onUpdate: (entityId: string, maxAssets: number | null) => Promise<unknown>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
  /** Label text (defaults to "Max Assets") */
  label?: string;
}

/**
 * Format value for display
 * null or 0 shows empty (placeholder shows "No limit")
 */
function formatDisplay(value: number | null): string {
  if (value === null || value === 0) return "";
  return String(value);
}

/**
 * Validate max assets value
 * Must be an integer between 0 and 100
 */
function isValidMaxAssets(value: string): boolean {
  if (!value) return true; // Empty is valid (will be treated as no limit)
  const num = parseInt(value, 10);
  if (isNaN(num)) return false;
  if (String(num) !== value) return false; // Must be integer (no decimals)
  return num >= 0 && num <= 100;
}

export function AssetCountInput({
  entityId,
  maxAssets,
  onUpdate,
  disabled = false,
  className,
  label = "Max Assets",
}: AssetCountInputProps) {
  const [value, setValue] = useState(formatDisplay(maxAssets));
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setValue(formatDisplay(maxAssets));
  }, [maxAssets]);

  /**
   * Handle save on blur
   */
  const handleSave = useCallback(async () => {
    // Validate
    if (!isValidMaxAssets(value)) {
      setError("Must be an integer between 0 and 100");
      return;
    }

    setError(null);

    // Convert to number (empty string = null = no limit)
    const newValue = value === "" ? null : parseInt(value, 10);

    // Treat 0 the same as null (no limit)
    const normalizedNewValue = newValue === 0 ? null : newValue;
    const normalizedOldValue = maxAssets === 0 ? null : maxAssets;

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
      setError("Failed to save max assets limit");
    } finally {
      setIsUpdating(false);
    }
  }, [entityId, value, maxAssets, onUpdate]);

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Clear error if corrected
    if (error && isValidMaxAssets(newValue)) {
      setError(null);
    }
  };

  /**
   * Handle clear button click (set to no limit)
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
      setError("Failed to clear limit");
    } finally {
      setIsUpdating(false);
    }
  }, [entityId, disabled, isUpdating, onUpdate]);

  const hasValue = value !== "" && value !== "0";

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={`max-assets-${entityId}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Input
            id={`max-assets-${entityId}`}
            type="text"
            inputMode="numeric"
            placeholder="No limit"
            value={value}
            onChange={handleChange}
            onBlur={handleSave}
            disabled={disabled || isUpdating}
            className={cn("h-8 w-20", error && "border-destructive", hasValue && "pr-7")}
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
              aria-label="Clear limit"
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
