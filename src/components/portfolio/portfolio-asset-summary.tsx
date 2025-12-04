"use client";

/**
 * Portfolio Asset Summary Component
 *
 * Story 3.2: Add Asset to Portfolio
 * Story 3.5: Mark Asset as Ignored
 *
 * Displays total portfolio value and asset count
 * Uses decimal.js for accurate financial calculations
 *
 * AC-3.5.3: Allocation calculations exclude ignored assets
 * AC-3.5.4: Total value includes ignored assets
 */

import { Decimal } from "@/lib/calculations/decimal-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Wallet } from "lucide-react";
import type { PortfolioAsset } from "@/types/portfolio";

interface PortfolioAssetSummaryProps {
  assets: PortfolioAsset[];
  baseCurrency?: string;
}

/**
 * Calculate total portfolio value using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 *
 * Note: This is a simplified calculation that assumes all assets
 * are in the same currency. Currency conversion will be added in Epic 6.
 */
function calculateTotalValue(assets: PortfolioAsset[]): {
  total: string;
  byCurrency: Record<string, string>;
} {
  const byCurrency: Record<string, Decimal> = {};

  for (const asset of assets) {
    const value = new Decimal(asset.quantity).times(asset.purchasePrice);
    const currency = asset.currency;

    if (byCurrency[currency]) {
      byCurrency[currency] = byCurrency[currency].plus(value);
    } else {
      byCurrency[currency] = value;
    }
  }

  // Convert Decimal objects to strings
  const byCurrencyStr: Record<string, string> = {};
  let primaryTotal = new Decimal(0);

  for (const [currency, value] of Object.entries(byCurrency)) {
    byCurrencyStr[currency] = value.toFixed(2);
    // For now, just sum all values (proper currency conversion in Epic 6)
    primaryTotal = primaryTotal.plus(value);
  }

  return {
    total: primaryTotal.toFixed(2),
    byCurrency: byCurrencyStr,
  };
}

/**
 * Format currency amount for display
 */
function formatCurrency(value: string, currency: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function PortfolioAssetSummary({
  assets,
  baseCurrency = "USD",
}: PortfolioAssetSummaryProps) {
  // Total value includes ALL assets (even ignored ones) per AC-3.5.4
  const { byCurrency } = calculateTotalValue(assets);
  const currencies = Object.keys(byCurrency);
  const assetCount = assets.length;
  // Active assets exclude ignored ones (for future allocation calculations per AC-3.5.3)
  const activeAssetCount = assets.filter((a) => !a.isIgnored).length;
  const ignoredCount = assetCount - activeAssetCount;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Asset Count Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeAssetCount}</div>
          <p className="text-xs text-muted-foreground">
            {activeAssetCount === 1 ? "active asset" : "active assets"}
            {ignoredCount > 0 && (
              <span className="text-muted-foreground/70"> ({ignoredCount} ignored)</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Portfolio Value Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {currencies.length === 0 ? (
            <>
              <div className="text-2xl font-bold">{formatCurrency("0", baseCurrency)}</div>
              <p className="text-xs text-muted-foreground">Add assets to see value</p>
            </>
          ) : currencies.length === 1 && currencies[0] ? (
            <>
              <div className="text-2xl font-bold">
                {formatCurrency(byCurrency[currencies[0]] ?? "0", currencies[0])}
              </div>
              <p className="text-xs text-muted-foreground">Total invested value</p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                {currencies.map((currency) => (
                  <div key={currency} className="text-lg font-bold">
                    {formatCurrency(byCurrency[currency] ?? "0", currency)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Values in multiple currencies</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
