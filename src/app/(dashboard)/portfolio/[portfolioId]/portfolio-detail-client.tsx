"use client";

/**
 * Portfolio Detail Client Component
 *
 * Story 2.2: View Portfolio and Holdings
 * Story 2.4: Delete Portfolio
 * Story 2.5: Add Holdings to Portfolio
 * Story 2.8: Investment History
 * Story 5.5: Manual Data Refresh
 *
 * AC-2.2.1: Holdings list display with asset name, quantity, price, value
 * AC-2.2.2: Base currency display with allocation percentages
 * AC-2.2.3: Empty state with "Add your first asset" CTA
 * AC-2.2.4: Holding detail navigation on row click
 * AC-2.4.1: Delete button styled as destructive action
 * AC-2.4.4: Successful deletion redirects to portfolio list
 * AC-2.5.1: Add Asset button prominently displayed
 * AC-2.5.7: Allocation recalculation after addition
 * AC-2.8.2: View Investment History Tab
 * AC-5.5.1: Refresh button in portfolio header with loading indicator
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { RefreshButton } from "@/components/data/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary-card";
import { EmptyHoldingsState } from "@/components/portfolio/empty-holdings-state";
import { HoldingDetailDrawer } from "@/components/portfolio/holding-detail-drawer";
import { DeletePortfolioDialog } from "@/components/portfolio/delete-portfolio-dialog";
import { AddAssetModal } from "@/components/portfolio/add-asset-modal";
import { MultiCurrencyIndicator } from "@/components/portfolio/multi-currency-indicator";
import { OnboardingWrapper } from "@/components/onboarding";
import {
  InvestmentHistoryTab,
  type InvestmentWithContext,
} from "@/components/portfolio/investment-history-tab";
import type { PortfolioWithValues, AssetWithValue } from "@/lib/services/portfolio-service";
import type { AssetType } from "@/lib/validations/portfolio";
import type { Investment } from "@/lib/db/schema";

interface PortfolioDetailClientProps {
  portfolioWithValues: PortfolioWithValues;
  acceptedAssetTypes: AssetType[];
  investments: Investment[];
}

export function PortfolioDetailClient({
  portfolioWithValues,
  acceptedAssetTypes,
  investments,
}: PortfolioDetailClientProps) {
  const {
    portfolio,
    assets,
    baseCurrency,
    dataFreshness,
    exchangeRateFreshness,
    currencies,
    assetCount,
    activeAssetCount,
    ignoredAssetCount,
    totalValueBase,
  } = portfolioWithValues;

  const router = useRouter();
  const searchParams = useSearchParams();

  // Story 2.8: Tab state from URL query params (AC-5.4: URL query params for tab state)
  const activeTab = searchParams.get("tab") ?? "holdings";

  // Handle tab change and update URL
  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "holdings") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const query = params.toString();
      router.push(`/portfolio/${portfolio.id}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [portfolio.id, router, searchParams]
  );

  // Story 2.8: Transform investments to include asset context
  const investmentsWithContext: InvestmentWithContext[] = useMemo(() => {
    // Create a map of asset IDs to asset details for quick lookup
    const assetMap = new Map(assets.map((asset) => [asset.id, { name: asset.name }]));

    return investments.map((investment) => {
      const assetDetails = assetMap.get(investment.assetId);
      return {
        ...investment,
        assetName: assetDetails?.name ?? undefined,
        assetClass: undefined, // Asset class not available in AssetWithValue
      };
    });
  }, [investments, assets]);

  // Story 2.8: Extract unique asset classes for filtering (empty for now, asset class not in AssetWithValue)
  const availableAssetClasses = useMemo(() => {
    // Note: AssetWithValue doesn't currently include assetClassName
    // This can be enhanced when that field is added to the interface
    return [] as string[];
  }, []);

  // Story 2.8: Extract assets for autocomplete filtering
  const availableAssets = useMemo(() => {
    return assets.map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
    }));
  }, [assets]);

  // State for holding detail drawer
  const [selectedHolding, setSelectedHolding] = useState<AssetWithValue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Story 2.4: State for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Handle holding row click - AC-2.2.4
  const handleHoldingClick = useCallback((holding: AssetWithValue) => {
    setSelectedHolding(holding);
    setIsDrawerOpen(true);
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback((open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      // Delay clearing selected holding to allow animation to complete
      setTimeout(() => setSelectedHolding(null), 300);
    }
  }, []);

  /**
   * Handle successful portfolio deletion
   * AC-2.4.4: Redirect to portfolio list with success toast
   */
  const handleDeleteSuccess = useCallback(() => {
    setIsDeleteDialogOpen(false);
    toast.success("Portfolio deleted");
    router.push("/portfolio");
  }, [router]);

  /**
   * Handle successful asset addition
   * AC-2.5.6: Success toast shown by AddAssetModal
   * AC-2.5.7: Allocation percentages refresh via router.refresh() in modal
   */
  const handleAssetAdded = useCallback(() => {
    router.refresh();
  }, [router]);

  // Determine if we should show empty state
  const hasNoHoldings = assets.length === 0;

  // Story 3.2: Calculate total allocation percentage from active assets
  const totalAllocationPercent = useMemo(() => {
    return assets
      .filter((asset) => !asset.isIgnored)
      .reduce((sum, asset) => sum + parseFloat(asset.allocationPercent), 0);
  }, [assets]);

  // Story 5.5: Extract symbols for data refresh - AC-5.5.1
  const portfolioSymbols = useMemo(() => {
    return assets.map((asset) => asset.symbol);
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation - Task 1.4 */}
      <nav
        className="flex items-center gap-2 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          href="/portfolio"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Portfolios
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{portfolio.name}</span>
      </nav>

      {/* Portfolio Header - Task 1.3 */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{portfolio.name}</h1>
            <p className="text-muted-foreground">
              Base currency: {baseCurrency}
              {portfolio.industrySector && ` • ${portfolio.industrySector}`}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Story 5.5: Refresh Data - AC-5.5.1: Refresh button in portfolio header */}
            {portfolioSymbols.length > 0 && (
              <RefreshButton
                type="all"
                symbols={portfolioSymbols}
                size="default"
                variant="outline"
                showLabel={true}
                label="Refresh Data"
                data-testid="portfolio-refresh-button"
              />
            )}
            {/* Story 2.5: Add Asset - AC-2.5.1: Add Asset button prominently displayed */}
            <AddAssetModal
              portfolioId={portfolio.id}
              defaultCurrency={baseCurrency}
              onSuccess={handleAssetAdded}
              trigger={
                <Button data-testid="add-asset-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Asset
                </Button>
              }
            />
            {/* Story 2.3: Edit Portfolio - AC-2.3.1: Edit button link */}
            <Button asChild variant="outline" data-testid="portfolio-edit-button">
              <Link href={`/portfolio/${portfolio.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            {/* Story 2.4: Delete Portfolio - AC-2.4.1: Delete button */}
            <Button
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setIsDeleteDialogOpen(true)}
              data-testid="portfolio-delete-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button asChild variant="outline">
              <Link href="/portfolio">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Portfolios
              </Link>
            </Button>
          </div>
        </div>

        {/* Asset Types Badges */}
        {acceptedAssetTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {acceptedAssetTypes.map((assetType) => (
              <Badge key={assetType} variant="secondary">
                {formatAssetType(assetType)}
              </Badge>
            ))}
          </div>
        )}

        {/* Story 2.7: Multi-Currency Indicator - AC-2.7.4 */}
        <MultiCurrencyIndicator currencies={currencies} baseCurrency={baseCurrency} />
      </div>

      {/* Portfolio Summary Card - always show */}
      {/* Story 3.5: Onboarding tip for pie chart interaction (AC-3.5.5) */}
      <OnboardingWrapper tipId="pie-chart-interaction" side="bottom" align="start">
        <PortfolioSummaryCard
          totalValueBase={totalValueBase}
          baseCurrency={baseCurrency}
          activeAssetCount={activeAssetCount}
          assetCount={assetCount}
          ignoredAssetCount={ignoredAssetCount}
          dataFreshness={dataFreshness}
          exchangeRateFreshness={exchangeRateFreshness}
          currencies={currencies}
          totalAllocationPercent={totalAllocationPercent}
        />
      </OnboardingWrapper>

      {/* Story 2.8: Tab Navigation for Holdings and History */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList data-testid="portfolio-tabs">
          <TabsTrigger value="holdings" data-testid="holdings-tab">
            Holdings
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="history-tab">
            History
          </TabsTrigger>
        </TabsList>

        {/* Holdings Tab Content */}
        <TabsContent value="holdings" className="space-y-6">
          {hasNoHoldings ? (
            // AC-2.2.3: Empty state
            <EmptyHoldingsState portfolioId={portfolio.id} />
          ) : (
            // AC-2.2.1, AC-2.2.2: Holdings table with values
            // Story 3.5: Onboarding tip for allocation validation (AC-3.5.5)
            <OnboardingWrapper tipId="allocation-validation" side="top" align="start">
              {/* AC-7.3.1: Pass data freshness to holdings table for header badge */}
              <HoldingsTable
                assets={assets}
                baseCurrency={baseCurrency}
                onHoldingClick={handleHoldingClick}
                dataFreshness={dataFreshness}
              />
            </OnboardingWrapper>
          )}
        </TabsContent>

        {/* Story 2.8: Investment History Tab Content - AC-2.8.2 */}
        <TabsContent value="history" className="space-y-6">
          <InvestmentHistoryTab
            investments={investmentsWithContext}
            baseCurrency={baseCurrency}
            portfolioId={portfolio.id}
            availableAssetClasses={availableAssetClasses}
            availableAssets={availableAssets}
          />
        </TabsContent>
      </Tabs>

      {/* Holding Detail Drawer - AC-2.2.4 */}
      <HoldingDetailDrawer
        holding={selectedHolding}
        baseCurrency={baseCurrency}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
      />

      {/* Story 2.4: Delete Portfolio Dialog - AC-2.4.2, AC-2.4.3, AC-2.4.6 */}
      <DeletePortfolioDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        portfolioId={portfolio.id}
        portfolioName={portfolio.name}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

/**
 * Format asset type for display
 * Asset types are already in display format from ASSET_TYPES constant
 */
function formatAssetType(assetType: AssetType): string {
  // Asset types are already human-readable (e.g., "Stocks", "ETFs", "REITs")
  return assetType;
}
