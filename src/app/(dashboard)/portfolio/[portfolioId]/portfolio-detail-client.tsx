"use client";

/**
 * Portfolio Detail Client Component
 *
 * Story 2.2: View Portfolio and Holdings
 *
 * AC-2.2.1: Holdings list display with asset name, quantity, price, value
 * AC-2.2.2: Base currency display with allocation percentages
 * AC-2.2.3: Empty state with "Add your first asset" CTA
 * AC-2.2.4: Holding detail navigation on row click
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary-card";
import { EmptyHoldingsState } from "@/components/portfolio/empty-holdings-state";
import { HoldingDetailDrawer } from "@/components/portfolio/holding-detail-drawer";
import type { PortfolioWithValues, AssetWithValue } from "@/lib/services/portfolio-service";
import type { AssetType } from "@/lib/validations/portfolio";

interface PortfolioDetailClientProps {
  portfolioWithValues: PortfolioWithValues;
  acceptedAssetTypes: AssetType[];
}

export function PortfolioDetailClient({
  portfolioWithValues,
  acceptedAssetTypes,
}: PortfolioDetailClientProps) {
  const {
    portfolio,
    assets,
    baseCurrency,
    dataFreshness,
    assetCount,
    activeAssetCount,
    ignoredAssetCount,
    totalValueBase,
  } = portfolioWithValues;

  // State for holding detail drawer
  const [selectedHolding, setSelectedHolding] = useState<AssetWithValue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Determine if we should show empty state
  const hasNoHoldings = assets.length === 0;

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
          <Button asChild variant="outline">
            <Link href="/portfolio">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portfolios
            </Link>
          </Button>
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
      </div>

      {/* Portfolio Summary Card - always show */}
      <PortfolioSummaryCard
        totalValueBase={totalValueBase}
        baseCurrency={baseCurrency}
        activeAssetCount={activeAssetCount}
        assetCount={assetCount}
        ignoredAssetCount={ignoredAssetCount}
        dataFreshness={dataFreshness}
      />

      {/* Holdings Section */}
      {hasNoHoldings ? (
        // AC-2.2.3: Empty state
        <EmptyHoldingsState portfolioId={portfolio.id} />
      ) : (
        // AC-2.2.1, AC-2.2.2: Holdings table with values
        <HoldingsTable
          assets={assets}
          baseCurrency={baseCurrency}
          onHoldingClick={handleHoldingClick}
        />
      )}

      {/* Holding Detail Drawer - AC-2.2.4 */}
      <HoldingDetailDrawer
        holding={selectedHolding}
        baseCurrency={baseCurrency}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
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
