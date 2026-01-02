"use client";

/**
 * RecommendationList Component
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 6.3: Recommendation Display
 * AC-7.5.3: Cards Sorted by Amount
 * AC-6.3.4: Card Hover Tooltip with expected allocation
 *
 * Displays a list of recommendation cards:
 * - Renders RecommendationCards for each item
 * - Cards already sorted by recommendedAmount descending (from hook)
 * - Responsive grid layout (1 col mobile, 2-3 cols desktop)
 * - Delegates to BalancedPortfolioState for empty array
 *
 * Features:
 * - Responsive grid layout
 * - Deterministic ordering (same order on refresh)
 * - Click handler propagation for breakdown panel
 * - Expected allocation calculation for tooltip (AC-6.3.4)
 */

import { useMemo } from "react";
import { RecommendationCard } from "./recommendation-card";
import { BalancedPortfolioState } from "./balanced-portfolio-state";
import { calculateExpectedAllocation } from "./before-after-preview";
import { cn } from "@/lib/utils";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TYPES
// =============================================================================

export interface RecommendationListProps {
  /** Recommendation items (already sorted by amount) */
  items: RecommendationDisplayItem[];
  /** User's base currency for display */
  baseCurrency: string;
  /** Click handler for individual cards (Story 7.7 placeholder) */
  onCardClick?: (assetId: string) => void;
  /** Total investable amount (for calculating expected allocation) */
  totalInvestable?: string;
  /** Current portfolio value (for calculating expected allocation) */
  currentPortfolioValue?: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecommendationList Component
 *
 * Displays a grid of recommendation cards.
 *
 * @example
 * ```tsx
 * <RecommendationList
 *   items={recommendations.items}
 *   baseCurrency="USD"
 *   onCardClick={(assetId) => openBreakdown(assetId)}
 * />
 * ```
 */
export function RecommendationList({
  items,
  baseCurrency,
  onCardClick,
  totalInvestable,
  currentPortfolioValue,
  className,
}: RecommendationListProps) {
  // Calculate expected allocations for each item (AC-6.3.4)
  const expectedAllocations = useMemo(() => {
    if (!totalInvestable || !currentPortfolioValue) {
      return {};
    }

    const allocations: Record<string, string> = {};
    for (const item of items) {
      allocations[item.assetId] = calculateExpectedAllocation(
        item.currentAllocation,
        item.recommendedAmount,
        totalInvestable,
        currentPortfolioValue
      );
    }
    return allocations;
  }, [items, totalInvestable, currentPortfolioValue]);

  // Handle empty state - delegate to BalancedPortfolioState
  if (items.length === 0) {
    return <BalancedPortfolioState />;
  }

  return (
    <div
      className={cn(
        // Responsive grid: 1 col on mobile, 2 on md, 3 on lg
        "grid gap-4",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
      data-testid="recommendation-list"
      role="list"
      aria-label="Investment recommendations"
    >
      {items.map((item) => (
        <div key={item.assetId} role="listitem">
          <RecommendationCard
            item={item}
            baseCurrency={baseCurrency}
            onClick={onCardClick ? () => onCardClick(item.assetId) : undefined}
            expectedAllocation={expectedAllocations[item.assetId]}
          />
        </div>
      ))}
    </div>
  );
}
