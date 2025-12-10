"use client";

/**
 * Criteria Search Component
 *
 * Story 5.4: Criteria Library View
 *
 * AC-5.4.4: Search/Filter Criteria by Name
 * - Search input with icon
 * - Clear button when search has value
 * - Debounced input (300ms)
 * - Accessible with ARIA labels
 *
 * Search input for filtering criteria by name.
 */

import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CriteriaSearchProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
}

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Search input component for filtering criteria
 */
export function CriteriaSearch({
  value,
  onChange,
  placeholder = "Search criteria...",
  disabled = false,
  className,
}: CriteriaSearchProps) {
  // Internal state for immediate UI feedback
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [internalValue, value, onChange]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  }, []);

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    setInternalValue("");
    onChange("");
  }, [onChange]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && internalValue) {
        e.preventDefault();
        handleClear();
      }
    },
    [internalValue, handleClear]
  );

  const hasValue = internalValue.length > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Search icon */}
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />

      {/* Search input */}
      <Input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pl-9 pr-9", hasValue && "pr-9")}
        aria-label="Search criteria by name"
      />

      {/* Clear button */}
      {hasValue && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 hover:bg-transparent"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
}
