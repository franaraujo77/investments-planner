"use client";

/**
 * Investment History Tab Component
 *
 * Story 2.8: Investment History
 *
 * AC-2.8.2: View Investment History Tab
 * AC-2.8.4: History Filtering
 * AC-2.8.5: Empty State
 * AC-2.8.6: Regional Number Formatting
 *
 * Displays a chronological list of all investments with filtering capabilities.
 */

import { useState, useMemo, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentEntryCard } from "./investment-entry-card";
import { InvestmentHistoryFilters } from "./investment-history-filters";
import { History } from "lucide-react";
import type { Investment } from "@/lib/db/schema";

/**
 * Investment with additional context for display
 */
export interface InvestmentWithContext extends Investment {
  assetName?: string | undefined;
  assetClass?: string | undefined;
}

/**
 * Filter state for investment history
 */
export interface InvestmentFilters {
  from?: Date | undefined;
  to?: Date | undefined;
  assetClass?: string | undefined;
  assetId?: string | undefined;
}

interface InvestmentHistoryTabProps {
  /** List of investments to display */
  investments: InvestmentWithContext[];
  /** Base currency for the portfolio */
  baseCurrency: string;
  /** Whether the data is loading */
  isLoading?: boolean;
  /** Portfolio ID for the empty state CTA */
  portfolioId: string;
  /** Available asset classes for filtering */
  availableAssetClasses?: string[];
  /** Available assets for autocomplete filtering */
  availableAssets?: Array<{ id: string; symbol: string; name?: string | null }>;
}

/**
 * Empty State Component for Investment History
 * AC-2.8.5: Empty state with message and CTA
 */
function EmptyInvestmentHistory() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-investment-history"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <History className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-semibold mb-2" data-testid="empty-investment-title">
        No investments recorded yet
      </h2>

      <p className="text-muted-foreground mb-6 max-w-md" data-testid="empty-investment-message">
        When you confirm investment recommendations, they will appear here. Track your investment
        decisions over time and analyze your investment patterns.
      </p>

      <div className="text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> Go to the Recommendations section to start investing based on your
        portfolio strategy.
      </div>
    </div>
  );
}

/**
 * Loading skeleton for investment history
 */
function InvestmentHistorySkeleton() {
  return (
    <div className="space-y-4" data-testid="investment-history-skeleton">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvestmentHistoryTab({
  investments,
  baseCurrency,
  isLoading = false,
  portfolioId: _portfolioId,
  availableAssetClasses = [],
  availableAssets = [],
}: InvestmentHistoryTabProps) {
  // Filter state
  const [filters, setFilters] = useState<InvestmentFilters>({});

  // Expanded investment ID for detail view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Apply filters to investments (client-side)
  // AC-2.8.4: Filters are applied immediately without page reload
  const filteredInvestments = useMemo(() => {
    return investments.filter((investment) => {
      // Date range filter
      if (filters.from && new Date(investment.investedAt) < filters.from) {
        return false;
      }
      if (filters.to) {
        const toEnd = new Date(filters.to);
        toEnd.setHours(23, 59, 59, 999);
        if (new Date(investment.investedAt) > toEnd) {
          return false;
        }
      }

      // Asset class filter
      if (filters.assetClass && investment.assetClass !== filters.assetClass) {
        return false;
      }

      // Specific asset filter
      if (filters.assetId && investment.assetId !== filters.assetId) {
        return false;
      }

      return true;
    });
  }, [investments, filters]);

  // Handle toggle expand
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: InvestmentFilters) => {
    setFilters(newFilters);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <InvestmentHistorySkeleton />
      </div>
    );
  }

  // Show empty state if no investments
  // AC-2.8.5: Empty state
  if (investments.length === 0) {
    return <EmptyInvestmentHistory />;
  }

  // Check if filters are producing no results
  const hasActiveFilters = filters.from || filters.to || filters.assetClass || filters.assetId;
  const noResultsAfterFilter = hasActiveFilters && filteredInvestments.length === 0;

  return (
    <div className="space-y-6" data-testid="investment-history-tab">
      {/* AC-2.8.4: Filtering UI */}
      <InvestmentHistoryFilters
        filters={filters}
        onChange={handleFiltersChange}
        availableAssetClasses={availableAssetClasses}
        availableAssets={availableAssets}
      />

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredInvestments.length} of {investments.length} investments
      </div>

      {/* No results after filter */}
      {noResultsAfterFilter && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No investments match your current filters.</p>
          <button className="text-primary hover:underline mt-2" onClick={() => setFilters({})}>
            Clear all filters
          </button>
        </div>
      )}

      {/* AC-2.8.2: Chronological list of investments (most recent first) */}
      <div className="space-y-4">
        {filteredInvestments.map((investment) => (
          <InvestmentEntryCard
            key={investment.id}
            investment={investment}
            baseCurrency={baseCurrency}
            isExpanded={expandedId === investment.id}
            onToggleExpand={() => handleToggleExpand(investment.id)}
          />
        ))}
      </div>
    </div>
  );
}
