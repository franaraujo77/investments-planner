"use client";

/**
 * ContributionInput Component
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.1: Enter contribution amount on dashboard with currency formatting
 * AC-7.1.2: Validation for invalid amounts with inline error display
 * AC-7.1.5: Currency display formatting for supported currencies
 *
 * Features:
 * - Currency symbol based on user's base currency
 * - Numeric input with validation (> 0)
 * - Locale-aware currency formatting
 * - Inline error display (red, 14px per UX spec)
 * - Supports decimal values up to 2 places
 */

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/services/exchange-rate-service";
import { parseDecimal } from "@/lib/calculations/decimal-utils";

export interface ContributionInputProps {
  /** Current value as decimal string (e.g., "2000.00") */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** ISO 4217 currency code (e.g., "USD", "BRL") */
  currency: string;
  /** Error message to display */
  error?: string | undefined;
  /** Callback when save as default is clicked */
  onSaveDefault?: (() => void) | undefined;
  /** Whether to show save as default option */
  showSaveDefault?: boolean | undefined;
  /** Whether the save as default is checked */
  saveDefaultChecked?: boolean | undefined;
  /** Callback when save default checkbox changes */
  onSaveDefaultChange?: ((checked: boolean) => void) | undefined;
  /** Optional label text */
  label?: string | undefined;
  /** Optional placeholder text */
  placeholder?: string | undefined;
  /** Whether input is disabled */
  disabled?: boolean | undefined;
  /** Additional CSS classes */
  className?: string | undefined;
  /** Callback on blur for validation */
  onBlur?: (() => void) | undefined;
}

/**
 * Get locale for currency formatting
 * Maps currency codes to appropriate locales
 */
function getLocaleForCurrency(currency: string): string {
  const localeMap: Record<string, string> = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    BRL: "pt-BR",
    CAD: "en-CA",
    AUD: "en-AU",
    JPY: "ja-JP",
    CHF: "de-CH",
  };
  return localeMap[currency] || "en-US";
}

/**
 * Format a numeric value for display with currency formatting
 */
function formatDisplayValue(value: string, currency: string): string {
  if (!value || value === "") return "";

  try {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;

    const locale = getLocaleForCurrency(currency);
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch {
    return value;
  }
}

/**
 * Parse a formatted value back to numeric string
 * Handles locale-specific thousand separators and decimal points
 */
function parseFormattedValue(formattedValue: string, currency: string): string {
  if (!formattedValue || formattedValue === "") return "";

  // Get locale to understand number format
  const locale = getLocaleForCurrency(currency);

  // Determine decimal separator for this locale
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
  const decimalSeparator = parts.find((p) => p.type === "decimal")?.value || ".";
  const groupSeparator = parts.find((p) => p.type === "group")?.value || ",";

  // Remove group separators and replace decimal separator with dot
  let normalized = formattedValue;

  // Remove group separators
  if (groupSeparator) {
    normalized = normalized.split(groupSeparator).join("");
  }

  // Replace decimal separator with standard dot
  if (decimalSeparator !== ".") {
    normalized = normalized.replace(decimalSeparator, ".");
  }

  // Remove any non-numeric characters except dot and minus
  normalized = normalized.replace(/[^\d.-]/g, "");

  return normalized;
}

/**
 * Validate contribution amount
 * Returns error message or undefined if valid
 */
export function validateContribution(value: string): string | undefined {
  if (!value || value.trim() === "") {
    return "Contribution amount is required";
  }

  try {
    const decimal = parseDecimal(value);

    // Check if positive
    if (decimal.isNegative() || decimal.isZero()) {
      return "Contribution must be greater than 0";
    }

    // Check decimal places (max 2)
    const decimalStr = decimal.toString();
    const decimalPointIndex = decimalStr.indexOf(".");
    if (decimalPointIndex !== -1) {
      const decimalPlaces = decimalStr.length - decimalPointIndex - 1;
      if (decimalPlaces > 2) {
        return "Maximum 2 decimal places allowed";
      }
    }

    return undefined;
  } catch {
    return "Please enter a valid number";
  }
}

export function ContributionInput({
  value,
  onChange,
  currency,
  error,
  onSaveDefault,
  showSaveDefault = false,
  saveDefaultChecked = false,
  onSaveDefaultChange,
  label = "Monthly Contribution",
  placeholder,
  disabled = false,
  className,
  onBlur,
}: ContributionInputProps) {
  // Track whether user is actively editing (show raw value) or viewing (show formatted)
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState("");

  const currencySymbol = getCurrencySymbol(currency);

  // Compute display value: when editing show internal value, otherwise format the prop value
  const displayValue = isEditing ? internalValue : value ? formatDisplayValue(value, currency) : "";

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    // Show raw value during editing
    setInternalValue(value || "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);

    // Parse the current internal value and format it
    const parsed = parseFormattedValue(internalValue, currency);
    if (parsed) {
      // Round to 2 decimal places using decimal.js
      try {
        const decimal = parseDecimal(parsed);
        const rounded = decimal.toDecimalPlaces(2).toString();
        onChange(rounded);
      } catch {
        // If parsing fails, just use the raw value
        onChange(parsed);
      }
    }
    // Clear internal value - display value will be computed from prop
    setInternalValue("");

    onBlur?.();
  }, [internalValue, currency, onChange, onBlur]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      if (isEditing) {
        // During editing, allow typing but filter to numeric characters
        // Allow: digits, one decimal point, one minus at start
        const filtered = rawValue.replace(/[^\d.-]/g, "");

        // Ensure only one decimal point
        const parts = filtered.split(".");
        const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : filtered;

        setInternalValue(sanitized);

        // Parse and notify parent (allow invalid values during editing)
        const parsed = parseFormattedValue(sanitized, currency);
        if (parsed) {
          onChange(parsed);
        }
      } else {
        setInternalValue(rawValue);
      }
    },
    [isEditing, currency, onChange]
  );

  const handleSaveDefaultChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSaveDefaultChange?.(e.target.checked);
    },
    [onSaveDefaultChange]
  );

  // Generate placeholder with currency symbol
  const defaultPlaceholder = placeholder || `0.00`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="contribution-input" className="text-sm font-medium">
        {label}
      </Label>

      <div className="relative">
        {/* Currency symbol prefix */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
          {currencySymbol}
        </span>

        <Input
          id="contribution-input"
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={defaultPlaceholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? "contribution-error" : undefined}
          className={cn(
            "pl-10 font-mono",
            error && "border-destructive focus-visible:ring-destructive/50"
          )}
        />
      </div>

      {/* Error message - AC-7.1.2: inline, red, 14px */}
      {error && (
        <p
          id="contribution-error"
          className="text-destructive text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {/* Save as default checkbox - AC-7.1.4 */}
      {showSaveDefault && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="save-default"
            checked={saveDefaultChecked}
            onChange={handleSaveDefaultChange}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="save-default" className="text-sm text-muted-foreground">
            Save as default for future months
          </label>
          {onSaveDefault && saveDefaultChecked && (
            <button
              type="button"
              onClick={onSaveDefault}
              className="text-sm text-primary hover:underline"
            >
              Save Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple variant without save default option
 * Useful for forms where default saving is handled externally
 */
export function SimpleContributionInput({
  value,
  onChange,
  currency,
  error,
  label,
  placeholder,
  disabled,
  className,
  onBlur,
}: Omit<
  ContributionInputProps,
  "onSaveDefault" | "showSaveDefault" | "saveDefaultChecked" | "onSaveDefaultChange"
>) {
  return (
    <ContributionInput
      value={value}
      onChange={onChange}
      currency={currency}
      error={error}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onBlur={onBlur}
      showSaveDefault={false}
    />
  );
}
