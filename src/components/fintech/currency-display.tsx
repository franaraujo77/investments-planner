"use client";

/**
 * CurrencyDisplay Component
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.2: Native currency display with appropriate symbols
 * AC-3.6.3: Exchange rate indicator with tooltip
 *
 * Displays formatted currency values with:
 * - Proper currency symbols ($, R$, €, etc.)
 * - Locale-aware number formatting
 * - Optional exchange rate tooltip
 * - Optional dual display (native + base)
 */

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/services/exchange-rate-service";

export interface CurrencyDisplayProps {
  /** Value to display (as string for decimal.js compatibility) */
  value: string;
  /** Currency code (e.g., "USD", "BRL") */
  currency: string;
  /** Whether to show currency symbol (default: true) */
  showSymbol?: boolean;
  /** Optional base currency for dual display */
  baseCurrency?: string;
  /** Optional base value for dual display */
  baseValue?: string;
  /** Optional exchange rate used for conversion */
  exchangeRate?: string;
  /** Whether to show exchange rate in tooltip (default: true when rate provided) */
  showExchangeRate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * Format a numeric value for currency display
 */
function formatCurrencyValue(value: string, currency: string, showSymbol: boolean = true): string {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Use Intl.NumberFormat for locale-aware formatting
    const formatter = new Intl.NumberFormat("en-US", {
      style: showSymbol ? "currency" : "decimal",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (showSymbol) {
      return formatter.format(num);
    }

    // For non-symbol display, format number and prepend symbol manually
    // This handles currencies like BRL where we want "R$" not "BRL"
    const symbol = getCurrencySymbol(currency);
    const formattedNum = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

    return `${symbol}${formattedNum}`;
  } catch {
    // Fallback for any formatting errors
    return `${getCurrencySymbol(currency)}${value}`;
  }
}

/**
 * Format exchange rate for display
 */
function formatExchangeRate(rate: string): string {
  try {
    const num = parseFloat(rate);
    if (isNaN(num)) return rate;

    // Show more decimals for small rates (like JPY conversion)
    const decimals = num < 0.01 ? 6 : num < 1 ? 4 : 4;
    return num.toFixed(decimals);
  } catch {
    return rate;
  }
}

/**
 * Size variants for the component
 */
const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg font-semibold",
};

export function CurrencyDisplay({
  value,
  currency,
  showSymbol = true,
  baseCurrency,
  baseValue,
  exchangeRate,
  showExchangeRate = true,
  className,
  size = "md",
}: CurrencyDisplayProps) {
  // Format the primary value
  const formattedValue = useMemo(
    () => formatCurrencyValue(value, currency, showSymbol),
    [value, currency, showSymbol]
  );

  // Format the base value if provided
  const formattedBaseValue = useMemo(() => {
    if (!baseCurrency || !baseValue) return null;
    return formatCurrencyValue(baseValue, baseCurrency, showSymbol);
  }, [baseCurrency, baseValue, showSymbol]);

  // Check if we need to show dual display
  const isDualDisplay = formattedBaseValue && baseCurrency && currency !== baseCurrency;

  // Check if we should show tooltip
  const hasTooltip = showExchangeRate && exchangeRate && isDualDisplay;

  const displayContent = (
    <span className={cn("font-mono", sizeClasses[size], className)}>
      {formattedValue}
      {isDualDisplay && (
        <span className="ml-1 text-muted-foreground text-xs">({formattedBaseValue})</span>
      )}
    </span>
  );

  if (!hasTooltip) {
    return displayContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("font-mono cursor-help", sizeClasses[size], className)}>
          {formattedValue}
          {isDualDisplay && (
            <span className="ml-1 text-muted-foreground text-xs">({formattedBaseValue})</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>
            1 {currency} = {formatExchangeRate(exchangeRate!)} {baseCurrency}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Currency symbol lookup for display purposes
 * Uses the exchange rate service symbols
 */
export function getCurrencyDisplaySymbol(currency: string): string {
  return getCurrencySymbol(currency);
}

/**
 * Simple currency value display without tooltip
 * Useful for inline values where tooltip would be distracting
 */
export function SimpleCurrencyDisplay({
  value,
  currency,
  className,
}: {
  value: string;
  currency: string;
  className?: string;
}) {
  const formattedValue = useMemo(
    () => formatCurrencyValue(value, currency, true),
    [value, currency]
  );

  return <span className={cn("font-mono", className)}>{formattedValue}</span>;
}

/**
 * Compact currency display showing just the symbol and abbreviated value
 * Useful for summary cards
 */
export function CompactCurrencyDisplay({
  value,
  currency,
  className,
}: {
  value: string;
  currency: string;
  className?: string;
}) {
  const formattedValue = useMemo(() => {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      const symbol = getCurrencySymbol(currency);

      // Abbreviate large numbers
      if (num >= 1_000_000) {
        return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
      }
      if (num >= 1_000) {
        return `${symbol}${(num / 1_000).toFixed(1)}K`;
      }

      return `${symbol}${num.toFixed(2)}`;
    } catch {
      return `${getCurrencySymbol(currency)}${value}`;
    }
  }, [value, currency]);

  return <span className={cn("font-mono font-semibold", className)}>{formattedValue}</span>;
}
