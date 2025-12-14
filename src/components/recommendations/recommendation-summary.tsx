"use client";

/**
 * RecommendationSummary Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * AC-7.5.5: Total Summary Display
 *
 * Displays summary of recommendations:
 * - "N assets totaling $X"
 * - Updates when recommendations change
 * - Amounts formatted in base currency
 *
 * Features:
 * - Currency formatting
 * - Pluralization of "asset" vs "assets"
 * - Responsive design
 */

import { formatCurrency } from "@/lib/utils/currency-format";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface RecommendationSummaryProps {
  /** Number of recommendation items */
  count: number;
  /** Total amount to invest (decimal string) */
  total: string;
  /** User's base currency for display */
  baseCurrency: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecommendationSummary Component
 *
 * Displays a summary of total recommendations.
 *
 * @example
 * ```tsx
 * <RecommendationSummary
 *   count={5}
 *   total="1500.00"
 *   baseCurrency="USD"
 * />
 * ```
 */
export function RecommendationSummary({
  count,
  total,
  baseCurrency,
  className,
}: RecommendationSummaryProps) {
  // Format the total amount
  const formattedTotal = formatCurrency(total, baseCurrency);

  // Pluralize "asset"
  const assetLabel = count === 1 ? "asset" : "assets";

  // Don't show if no recommendations
  if (count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center py-4 px-6",
        "bg-muted/50 rounded-lg",
        "text-sm text-muted-foreground",
        className
      )}
      data-testid="recommendation-summary"
    >
      <p>
        <span className="font-medium text-foreground" data-testid="asset-count">
          {count} {assetLabel}
        </span>
        {" totaling "}
        <span className="font-semibold text-primary" data-testid="total-amount">
          {formattedTotal}
        </span>
      </p>
    </div>
  );
}
