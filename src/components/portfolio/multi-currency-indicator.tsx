"use client";

/**
 * MultiCurrencyIndicator Component
 *
 * Story 2.7: Multi-Currency Portfolio Display
 *
 * AC-2.7.4: Multi-Currency Portfolio Summary
 * - Visual indicator of currencies present (e.g., "Currencies: USD, EUR, BRL")
 * - Tooltip explaining all values converted to base currency
 *
 * Task 1.1: Create MultiCurrencyIndicator component
 * Task 1.2: Extract unique currencies from portfolio assets
 * Task 1.3: Display currency badges in portfolio header
 * Task 1.4: Add tooltip explaining base currency conversion
 */

import { useMemo } from "react";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface MultiCurrencyIndicatorProps {
  /** Array of currencies present in the portfolio */
  currencies: string[];
  /** The portfolio's base currency */
  baseCurrency: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Extract unique currencies from array, sorted alphabetically
 */
function extractUniqueCurrencies(currencies: string[]): string[] {
  const unique = [...new Set(currencies)];
  return unique.sort();
}

/**
 * Determine if multi-currency indicator should be shown
 * Only show when portfolio has multiple currencies OR single non-base currency
 */
function shouldShowIndicator(currencies: string[], baseCurrency: string): boolean {
  const uniqueCurrencies = extractUniqueCurrencies(currencies);

  // Don't show if no currencies
  if (uniqueCurrencies.length === 0) {
    return false;
  }

  // Don't show if single currency matches base
  if (uniqueCurrencies.length === 1 && uniqueCurrencies[0] === baseCurrency) {
    return false;
  }

  return true;
}

/**
 * MultiCurrencyIndicator displays currency badges for multi-currency portfolios
 *
 * Shows unique currencies present with the base currency highlighted.
 * Includes tooltip explaining that all values are converted to base currency.
 *
 * Returns null for single-currency portfolios where currency matches base.
 */
export function MultiCurrencyIndicator({
  currencies,
  baseCurrency,
  className,
}: MultiCurrencyIndicatorProps) {
  const uniqueCurrencies = useMemo(() => extractUniqueCurrencies(currencies), [currencies]);

  const showIndicator = useMemo(
    () => shouldShowIndicator(currencies, baseCurrency),
    [currencies, baseCurrency]
  );

  // Don't render for single-currency portfolios matching base
  if (!showIndicator) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 cursor-help",
            className
          )}
          data-testid="multi-currency-indicator"
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Currencies:</span>
          <div className="flex flex-wrap gap-1">
            {uniqueCurrencies.map((currency) => (
              <Badge
                key={currency}
                variant={currency === baseCurrency ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  currency === baseCurrency && "bg-primary text-primary-foreground"
                )}
                data-testid="currency-badge"
                data-currency={currency}
              >
                {currency}
              </Badge>
            ))}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-medium">All values converted to {baseCurrency}</p>
          <p className="text-muted-foreground">Using previous trading day rates (T-1)</p>
          <p className="text-muted-foreground text-[10px]">MVP uses static exchange rates</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Extract currencies from portfolio assets
 * Helper function for use in parent components
 */
export function extractCurrenciesFromAssets(
  assets: Array<{ currency: string; isIgnored?: boolean }>
): string[] {
  return assets.filter((a) => !a.isIgnored).map((a) => a.currency);
}

// Export helper functions for testing
export { extractUniqueCurrencies, shouldShowIndicator };
