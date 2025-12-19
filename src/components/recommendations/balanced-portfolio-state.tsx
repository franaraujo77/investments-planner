"use client";

/**
 * BalancedPortfolioState Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 9.6: Empty States & Helpful Messaging
 *
 * AC-7.5.4: Balanced Portfolio Empty State
 * AC-9.6.3: Empty Recommendations State Shows Encouraging Message
 *
 * Displays encouraging empty state when portfolio is balanced:
 * - "You're all set!" (per AC-9.6.3)
 * - "Your portfolio is balanced. Check back next month for new recommendations."
 * - Visually distinct and encouraging
 * - Optional allocation summary
 *
 * Features:
 * - EmptyState pattern per UX spec
 * - Celebration icon (CheckCircle2)
 * - Link to portfolio view
 */

import Link from "next/link";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Updated in Story 9.6 to match AC-9.6.3 requirements.
 *
 * @example
 * ```tsx
 * <BalancedPortfolioState />
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
      data-testid="empty-recommendations"
    >
      {/* Celebration Icon - AC-9.6.6: Relevant illustration */}
      <div
        className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100 dark:bg-green-900/30"
        aria-hidden="true"
      >
        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>

      {/* AC-9.6.3: Title - "You're all set!" */}
      <h3
        className="text-xl font-semibold text-foreground mb-2"
        data-testid="empty-recommendations-title"
      >
        You&apos;re all set!
      </h3>

      {/* AC-9.6.3: Message - encouraging, not confusing */}
      <p
        className="text-muted-foreground mb-6 max-w-md"
        data-testid="empty-recommendations-message"
      >
        Your portfolio is balanced. Check back next month for new recommendations.
      </p>

      {/* Allocation Summary (optional) */}
      {showAllocationSummary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <TrendingUp className="w-4 h-4" aria-hidden="true" />
          <span>All allocations on target</span>
        </div>
      )}

      {/* AC-9.6.3: Secondary CTA - "View Portfolio" */}
      {onViewPortfolio ? (
        <Button
          variant="outline"
          onClick={onViewPortfolio}
          data-testid="empty-recommendations-secondary-cta"
        >
          View Portfolio
        </Button>
      ) : (
        <Button asChild variant="outline" data-testid="empty-recommendations-secondary-cta">
          <Link href="/portfolio">View Portfolio</Link>
        </Button>
      )}
    </div>
  );
}
