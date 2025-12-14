"use client";

/**
 * BalancedPortfolioState Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * AC-7.5.4: Balanced Portfolio Empty State
 *
 * Displays encouraging empty state when portfolio is balanced:
 * - "Your portfolio is perfectly balanced this month!"
 * - Visually distinct and encouraging
 * - Optional allocation summary
 *
 * Features:
 * - EmptyState pattern per UX spec
 * - Celebration icon
 * - Optional link to portfolio view
 */

import { CheckCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface BalancedPortfolioStateProps {
  /** Additional CSS classes */
  className?: string;
  /** Show allocation summary (optional) */
  showAllocationSummary?: boolean;
  /** Optional callback to view portfolio */
  onViewPortfolio?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BalancedPortfolioState Component
 *
 * Displays an encouraging empty state for a balanced portfolio.
 *
 * @example
 * ```tsx
 * <BalancedPortfolioState
 *   onViewPortfolio={() => router.push("/portfolio")}
 * />
 * ```
 */
export function BalancedPortfolioState({
  className,
  showAllocationSummary = false,
  onViewPortfolio,
}: BalancedPortfolioStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6",
        "text-center",
        className
      )}
      data-testid="balanced-portfolio-state"
    >
      {/* Celebration Icon */}
      <div
        className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100 dark:bg-green-900/30"
        aria-hidden="true"
      >
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>

      {/* Main Message */}
      <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="balanced-title">
        Your portfolio is perfectly balanced this month!
      </h3>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-6 max-w-md" data-testid="balanced-subtitle">
        All your assets are within their target allocation ranges. No additional investments are
        needed right now.
      </p>

      {/* Allocation Summary (optional) */}
      {showAllocationSummary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <TrendingUp className="w-4 h-4" aria-hidden="true" />
          <span>All allocations on target</span>
        </div>
      )}

      {/* View Portfolio Link (optional) */}
      {onViewPortfolio && (
        <button
          type="button"
          onClick={onViewPortfolio}
          className={cn(
            "text-sm font-medium text-primary hover:text-primary/80",
            "underline underline-offset-4 transition-colors"
          )}
          data-testid="view-portfolio-link"
        >
          View your portfolio
        </button>
      )}
    </div>
  );
}
