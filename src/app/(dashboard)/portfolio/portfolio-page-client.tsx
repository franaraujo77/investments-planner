"use client";

/**
 * Portfolio Page Client Component
 *
 * Story 3.1: Create Portfolio
 * Story 3.2: Add Asset to Portfolio
 * Story 3.6: Portfolio Overview with Values
 * Story 3.7: Allocation Percentage View
 *
 * Handles client-side interactivity for portfolio page
 * AC-3.2.1: Add Asset button visible when viewing portfolio
 * AC-3.2.6: Assets display with calculated values
 * AC-3.6.1: Portfolio table displays value columns
 * AC-3.6.4: Total portfolio value prominently displayed
 * AC-3.6.7: Data freshness indicator
 * AC-3.7.1-3.7.7: Allocation visualization
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, ChevronDown, ChevronUp, Wallet } from "lucide-react";

import { PortfolioEmptyState } from "@/components/portfolio/portfolio-empty-state";
import { CreatePortfolioModal } from "@/components/portfolio/create-portfolio-modal";
import { PortfolioTableWithValues } from "@/components/portfolio/portfolio-table";
import { AddAssetModal } from "@/components/portfolio/add-asset-modal";
import { DataFreshnessBadge } from "@/components/fintech/data-freshness-badge";
import { CompactCurrencyDisplay } from "@/components/fintech/currency-display";
import {
  AllocationSection,
  type AllocationBreakdown,
} from "@/components/portfolio/allocation-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_PORTFOLIOS_PER_USER } from "@/lib/validations/portfolio";
import type { Portfolio, AssetWithValue, PortfolioWithValues } from "@/types/portfolio";

interface PortfolioPageClientProps {
  initialPortfolios: Portfolio[];
  canCreate: boolean;
  baseCurrency?: string;
}

export function PortfolioPageClient({
  initialPortfolios,
  canCreate,
  baseCurrency = "USD",
}: PortfolioPageClientProps) {
  const router = useRouter();
  const [, setIsModalOpen] = useState(false);
  const [expandedPortfolioId, setExpandedPortfolioId] = useState<string | null>(
    // Expand first portfolio by default if there's only one
    initialPortfolios.length === 1 && initialPortfolios[0] ? initialPortfolios[0].id : null
  );

  const handleCreateSuccess = () => {
    router.refresh();
  };

  const togglePortfolio = (portfolioId: string) => {
    setExpandedPortfolioId((current) => (current === portfolioId ? null : portfolioId));
  };

  // Empty state - no portfolios
  if (initialPortfolios.length === 0) {
    return (
      <>
        <PortfolioEmptyState onCreateClick={() => setIsModalOpen(true)} canCreate={canCreate} />
        <CreatePortfolioModal
          trigger={<span className="hidden" />}
          onSuccess={handleCreateSuccess}
        />
      </>
    );
  }

  // Portfolio list view
  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialPortfolios.length} of {MAX_PORTFOLIOS_PER_USER} portfolios
        </p>
        <CreatePortfolioModal onSuccess={handleCreateSuccess} />
      </div>

      {/* Portfolio cards */}
      <div className="space-y-4">
        {initialPortfolios.map((portfolio) => (
          <PortfolioCardWithValues
            key={portfolio.id}
            portfolio={portfolio}
            isExpanded={expandedPortfolioId === portfolio.id}
            onToggle={() => togglePortfolio(portfolio.id)}
            baseCurrency={baseCurrency}
          />
        ))}

        {/* Add new portfolio card (if can create) */}
        {canCreate && (
          <CreatePortfolioModal
            trigger={
              <button
                type="button"
                className="flex w-full h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
              >
                <Plus className="h-6 w-6" aria-hidden="true" />
                <span className="text-sm">Add Portfolio</span>
              </button>
            }
            onSuccess={handleCreateSuccess}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Portfolio Value Summary Card
 *
 * Story 3.6: Portfolio Overview with Values
 * AC-3.6.4: Total portfolio value prominently displayed
 * AC-3.6.7: Data freshness indicator
 */
function PortfolioValueSummary({
  portfolioWithValues,
}: {
  portfolioWithValues: PortfolioWithValues;
}) {
  const { totalValueBase, baseCurrency, dataFreshness, activeAssetCount, ignoredAssetCount } =
    portfolioWithValues;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Portfolio Value - AC-3.6.4 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <CompactCurrencyDisplay value={totalValueBase} currency={baseCurrency} />
          </div>
          <p className="text-xs text-muted-foreground">In {baseCurrency}</p>
        </CardContent>
      </Card>

      {/* Asset Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assets</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeAssetCount}</div>
          <p className="text-xs text-muted-foreground">
            active{" "}
            {ignoredAssetCount > 0 && (
              <span className="text-muted-foreground/70">({ignoredAssetCount} ignored)</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Data Freshness - AC-3.6.7 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Data Updated</CardTitle>
        </CardHeader>
        <CardContent>
          <DataFreshnessBadge updatedAt={dataFreshness} source="Price & Rate" size="md" />
          <p className="text-xs text-muted-foreground mt-2">Last price/rate update</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Portfolio Card Component with Values (Story 3.6)
 *
 * Fetches portfolio data with calculated values and displays
 * enhanced table with sorting, filtering, and value columns.
 */
function PortfolioCardWithValues({
  portfolio,
  isExpanded,
  onToggle,
  baseCurrency,
}: {
  portfolio: Portfolio;
  isExpanded: boolean;
  onToggle: () => void;
  baseCurrency: string;
}) {
  const router = useRouter();
  const [portfolioWithValues, setPortfolioWithValues] = useState<PortfolioWithValues | null>(null);
  const [allocationData, setAllocationData] = useState<AllocationBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAllocation, setIsLoadingAllocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // Fetch assets with values when expanded
  useEffect(() => {
    if (isExpanded && !portfolioWithValues && !isLoading) {
      fetchPortfolioWithValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // Fetch allocation data when portfolio values are loaded
  useEffect(() => {
    if (
      portfolioWithValues &&
      portfolioWithValues.assets.length > 0 &&
      !allocationData &&
      !isLoadingAllocation
    ) {
      fetchAllocationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioWithValues]);

  const fetchPortfolioWithValues = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolios/${portfolio.id}/values`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch portfolio values");
      }

      // Parse dates that come as strings from JSON
      const data: PortfolioWithValues = {
        ...result.data,
        dataFreshness: new Date(result.data.dataFreshness),
        assets: result.data.assets.map((asset: AssetWithValue & { priceUpdatedAt: string }) => ({
          ...asset,
          priceUpdatedAt: new Date(asset.priceUpdatedAt),
          createdAt: asset.createdAt ? new Date(asset.createdAt) : null,
          updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : null,
        })),
      };

      setPortfolioWithValues(data);
    } catch (err) {
      // Error is captured in state and displayed to user - no console.error needed
      // Server-side logging happens in the API route
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllocationData = async () => {
    setIsLoadingAllocation(true);
    setAllocationError(null);

    try {
      const response = await fetch(`/api/portfolios/${portfolio.id}/allocations`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch allocation data");
      }

      // Parse date that comes as string from JSON
      const data: AllocationBreakdown = {
        ...result,
        dataFreshness: new Date(result.dataFreshness),
      };

      setAllocationData(data);
    } catch (err) {
      // Error is captured in state and displayed to user - no console.error needed
      // Server-side logging happens in the API route
      setAllocationError(err instanceof Error ? err.message : "Failed to load allocation");
    } finally {
      setIsLoadingAllocation(false);
    }
  };

  const handleAssetAdded = () => {
    // Refetch portfolio values and allocation after adding a new asset
    fetchPortfolioWithValues();
    setAllocationData(null); // Reset to trigger refetch
    router.refresh();
  };

  // Get summary info for collapsed view
  const assetCount = portfolioWithValues?.assetCount ?? 0;
  const totalValue = portfolioWithValues?.totalValueBase ?? "0";

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Portfolio header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-medium leading-none">{portfolio.name}</h3>
            <p className="text-sm text-muted-foreground">
              Created {new Date(portfolio.createdAt!).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Show total value when collapsed */}
          {!isExpanded && portfolioWithValues && (
            <div className="text-right hidden sm:block">
              <div className="font-semibold">
                <CompactCurrencyDisplay value={totalValue} currency={baseCurrency} />
              </div>
              <p className="text-xs text-muted-foreground">
                {assetCount} {assetCount === 1 ? "asset" : "assets"}
              </p>
            </div>
          )}
          {!isExpanded && !portfolioWithValues && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Click to view assets
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content - assets view */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading portfolio values...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPortfolioWithValues}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : portfolioWithValues ? (
            <>
              {/* Portfolio Value Summary - AC-3.6.4, AC-3.6.7 */}
              {portfolioWithValues.assets.length > 0 && (
                <PortfolioValueSummary portfolioWithValues={portfolioWithValues} />
              )}

              {/* Allocation Section - AC-3.7.1 to AC-3.7.7 */}
              {portfolioWithValues.assets.length > 0 && (
                <AllocationSection
                  data={allocationData}
                  isLoading={isLoadingAllocation}
                  error={allocationError}
                />
              )}

              {/* Enhanced Asset Table - AC-3.6.1, AC-3.6.2, AC-3.6.3, AC-3.6.5, AC-3.6.6 */}
              <PortfolioTableWithValues
                portfolioId={portfolio.id}
                assets={portfolioWithValues.assets}
                baseCurrency={portfolioWithValues.baseCurrency}
                defaultCurrency={baseCurrency}
                onAssetAdded={handleAssetAdded}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Quick add asset button when collapsed */}
      {!isExpanded && (
        <div className="border-t px-4 py-3 flex items-center justify-between">
          {portfolioWithValues && portfolioWithValues.assets.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {portfolioWithValues.assets.length}{" "}
              {portfolioWithValues.assets.length === 1 ? "asset" : "assets"} in portfolio
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No assets yet. Add your first asset to get started.
            </p>
          )}
          <AddAssetModal
            portfolioId={portfolio.id}
            defaultCurrency={baseCurrency}
            onSuccess={handleAssetAdded}
          />
        </div>
      )}
    </div>
  );
}
