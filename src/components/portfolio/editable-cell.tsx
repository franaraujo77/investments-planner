"use client";

/**
 * Editable Cell Component
 *
 * Story 3.3: Update Asset Holdings
 *
 * A reusable inline-edit component for table cells.
 * Implements click-to-edit pattern with auto-save on blur.
 *
 * AC-3.3.1: Click on field enters edit mode
 * AC-3.3.2: Quantity validation (positive number)
 * AC-3.3.3: Price validation (positive number)
 * AC-3.3.4: Auto-save on blur
 * AC-3.3.7: Optimistic update with rollback on error
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type EditableCellType = "quantity" | "price";

type EditableCellState = "viewing" | "editing" | "saving" | "success" | "error";

interface EditableCellProps {
  /**
   * Current value to display and edit
   */
  value: string;
  /**
   * Callback to save the new value
   * Returns true on success, error message string on failure
   */
  onSave: (newValue: string) => Promise<true | string>;
  /**
   * Type of field - affects validation and formatting
   */
  type: EditableCellType;
  /**
   * Display formatter for the value in view mode
   */
  formatDisplay: (value: string) => string;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Test ID for E2E tests
   */
  testId?: string;
}

/**
 * Validate a positive number string
 */
function validatePositiveNumber(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Value is required";
  }

  const num = parseFloat(trimmed);

  if (isNaN(num)) {
    return "Must be a valid number";
  }

  if (num <= 0) {
    return "Value must be positive";
  }

  return null; // No error
}

export function EditableCell({
  value,
  onSave,
  type,
  formatDisplay,
  className,
  testId,
}: EditableCellProps) {
  const [state, setState] = useState<EditableCellState>("viewing");
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (state === "editing" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state]);

  // Clear success state after delay
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => {
        setState("viewing");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Enter edit mode on click
  const handleClick = useCallback(() => {
    if (state === "viewing") {
      setError(null);
      setState("editing");
    }
  }, [state]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditValue(value);
    setError(null);
    setState("viewing");
  }, [value]);

  // Save the value
  const handleSave = useCallback(async () => {
    // Don't save if no change
    if (editValue === value) {
      setState("viewing");
      return;
    }

    // Validate
    const validationError = validatePositiveNumber(editValue);
    if (validationError) {
      setError(type === "quantity" ? "Quantity must be positive" : "Price must be positive");
      return;
    }

    // Start saving
    setState("saving");
    setError(null);

    try {
      const result = await onSave(editValue.trim());

      if (result === true) {
        setState("success");
      } else {
        // Save failed with error message
        setError(result);
        setState("error");
        // Revert to original value after showing error
        setTimeout(() => {
          setEditValue(value);
          setState("viewing");
        }, 2000);
      }
    } catch {
      setError("Failed to update. Please try again.");
      setState("error");
      // Revert to original value after showing error
      setTimeout(() => {
        setEditValue(value);
        setState("viewing");
      }, 2000);
    }
  }, [editValue, value, type, onSave]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  // Handle blur (auto-save)
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Check if focus moved outside the container
      if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
        if (state === "editing") {
          handleSave();
        }
      }
    },
    [state, handleSave]
  );

  // Render based on state
  return (
    <div ref={containerRef} className={cn("relative group", className)} data-testid={testId}>
      {state === "viewing" && (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "w-full text-right font-mono cursor-pointer",
            "hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
          data-testid={testId ? `${testId}-button` : undefined}
        >
          {formatDisplay(value)}
        </button>
      )}

      {(state === "editing" || state === "error") && (
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              "h-8 text-right font-mono pr-2",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            data-testid={testId ? `${testId}-input` : undefined}
          />
          {error && (
            <div className="absolute left-0 top-full mt-1 z-10">
              <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {state === "saving" && (
        <div className="flex items-center justify-end h-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {state === "success" && (
        <div className="flex items-center justify-end gap-1 h-8">
          <span className="font-mono">{formatDisplay(editValue)}</span>
          <Check className="h-4 w-4 text-green-600 animate-in fade-in duration-200" />
        </div>
      )}
    </div>
  );
}
