"use client";

/**
 * DividendsInput Component
 *
 * Story 7.2: Enter Dividends Received
 * AC-7.2.1: Enter dividends amount on dashboard with currency formatting
 * AC-7.2.4: Validation for invalid amounts with inline error display
 *
 * Features:
 * - Currency symbol based on user's base currency
 * - Numeric input with validation (>= 0, unlike contribution which requires > 0)
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
import { TrendingUp } from "lucide-react";

export interface DividendsInputProps {
  /** Current value as decimal string (e.g., "100.00") */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** ISO 4217 currency code (e.g., "USD", "BRL") */
  currency: string;
  /** Error message to display */
  error?: string | undefined;
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
 * Validate dividends amount
 * Returns error message or undefined if valid
 * Note: Unlike contribution, dividends allows zero
 */
export function validateDividendsInput(value: string): string | undefined {
  // Empty is valid for dividends (defaults to 0)
  if (!value || value.trim() === "") {
    return undefined;
  }

  try {
    const decimal = parseDecimal(value);

    // Check if non-negative (unlike contribution which requires positive)
    if (decimal.isNegative()) {
      return "Dividends cannot be negative";
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

export function DividendsInput({
  value,
  onChange,
  currency,
  error,
  label = "Dividends Received",
  placeholder,
  disabled = false,
  className,
  onBlur,
}: DividendsInputProps) {
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
    } else {
      // Empty value - use default "0.00"
      onChange("0.00");
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

  // Generate placeholder with currency symbol
  const defaultPlaceholder = placeholder || `0.00`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="dividends-input" className="text-sm font-medium flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        {label}
      </Label>

      <div className="relative">
        {/* Currency symbol prefix */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
          {currencySymbol}
        </span>

        <Input
          id="dividends-input"
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={defaultPlaceholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? "dividends-error" : undefined}
          className={cn(
            "pl-10 font-mono",
            error && "border-destructive focus-visible:ring-destructive/50"
          )}
        />
      </div>

      {/* Error message - AC-7.2.4: inline, red, 14px */}
      {error && (
        <p
          id="dividends-error"
          className="text-destructive text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {/* Help text */}
      {!error && (
        <p className="text-xs text-muted-foreground">
          Enter any dividends received this period (optional)
        </p>
      )}
    </div>
  );
}

/**
 * Simple variant with default props
 * Useful for forms where validation is handled externally
 */
export function SimpleDividendsInput({
  value,
  onChange,
  currency,
  error,
  label,
  placeholder,
  disabled,
  className,
  onBlur,
}: DividendsInputProps) {
  return (
    <DividendsInput
      value={value}
      onChange={onChange}
      currency={currency}
      error={error}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onBlur={onBlur}
    />
  );
}
