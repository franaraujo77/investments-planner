"use client";

/**
 * FocusModeHeader Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * AC-7.5.1: Focus Mode Header Display
 *
 * Displays the Focus Mode header with:
 * - "Ready to invest" message
 * - Total investable amount in user's base currency
 * - Prominent styling per UX spec
 *
 * Features:
 * - Currency formatting with proper symbols
 * - Updates when total investable changes
 * - Responsive design
 */

import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency-format";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface FocusModeHeaderProps {
  /** Total investable amount (decimal string) */
  totalInvestable: string;
  /** User's base currency for display */
  baseCurrency: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * FocusModeHeader Component
 *
 * Displays the Focus Mode header with total investable amount.
 *
 * @example
 * ```tsx
 * <FocusModeHeader
 *   totalInvestable="1500.00"
 *   baseCurrency="USD"
 * />
 * ```
 */
export function FocusModeHeader({
  totalInvestable,
  baseCurrency,
  className,
}: FocusModeHeaderProps) {
  // Format the total investable amount
  const formattedAmount = formatCurrency(totalInvestable, baseCurrency);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg",
        "bg-gradient-to-r from-primary/5 to-primary/10",
        "border border-primary/20",
        className
      )}
      data-testid="focus-mode-header"
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
        aria-hidden="true"
      >
        <Wallet className="w-5 h-5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-foreground" data-testid="header-title">
          Ready to invest
        </h2>
        <p className="text-sm text-muted-foreground" data-testid="header-subtitle">
          You have{" "}
          <span className="font-semibold text-primary" data-testid="total-amount">
            {formattedAmount}
          </span>{" "}
          available
        </p>
      </div>
    </div>
  );
}
