"use client";

/**
 * Portfolio Summary Card Component
 *
 * Story 2.2: View Portfolio and Holdings
 *
 * Task 3.1: Create portfolio summary card
 * Task 3.2: Display total portfolio value in base currency
 * Task 3.3: Display active asset count vs total asset count
 * Task 3.4: Display ignored asset count (if any)
 * Task 3.5: Display data freshness timestamp
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, TrendingUp, Clock, EyeOff } from "lucide-react";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";

interface PortfolioSummaryCardProps {
  totalValueBase: string;
  baseCurrency: string;
  activeAssetCount: number;
  assetCount: number;
  ignoredAssetCount: number;
  dataFreshness: Date;
}

export function PortfolioSummaryCard({
  totalValueBase,
  baseCurrency,
  activeAssetCount,
  assetCount,
  ignoredAssetCount,
  dataFreshness,
}: PortfolioSummaryCardProps) {
  const { formatCurrency } = useNumberFormat();

  // Calculate data freshness
  const freshnessInfo = getDataFreshnessInfo(dataFreshness);

  return (
    <Card data-testid="portfolio-summary-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          Portfolio Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Value - Task 3.2 */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold" data-testid="total-value">
              {formatCurrency(parseFloat(totalValueBase), baseCurrency)}
            </p>
          </div>

          {/* Asset Count - Task 3.3 */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Assets</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold" data-testid="asset-count">
                {activeAssetCount === assetCount
                  ? `${assetCount} ${assetCount === 1 ? "asset" : "assets"}`
                  : `${activeAssetCount} of ${assetCount} active`}
              </span>
            </div>
          </div>

          {/* Ignored Assets - Task 3.4 */}
          {ignoredAssetCount > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ignored</p>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold" data-testid="ignored-count">
                        {ignoredAssetCount}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        excluded
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Ignored assets are not included in allocation calculations
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Data Freshness - Task 3.5 */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Data Updated</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Clock className={`h-4 w-4 ${freshnessInfo.colorClass}`} />
                  <span className="text-sm font-medium" data-testid="data-freshness">
                    {freshnessInfo.label}
                  </span>
                  <Badge
                    variant={freshnessInfo.isStale ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {freshnessInfo.status}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p>Last price/rate update:</p>
                  <p className="font-mono">{new Date(dataFreshness).toLocaleString()}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FreshnessInfo {
  label: string;
  status: string;
  isStale: boolean;
  colorClass: string;
}

/**
 * Calculate data freshness information
 */
function getDataFreshnessInfo(dataFreshness: Date): FreshnessInfo {
  const now = new Date();
  const diffMs = now.getTime() - new Date(dataFreshness).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Fresh: < 1 hour
  if (diffMins < 60) {
    return {
      label: diffMins < 1 ? "Just now" : `${diffMins}m ago`,
      status: "Fresh",
      isStale: false,
      colorClass: "text-green-500",
    };
  }

  // Recent: 1-24 hours
  if (diffHours < 24) {
    return {
      label: `${diffHours}h ago`,
      status: "Recent",
      isStale: false,
      colorClass: "text-blue-500",
    };
  }

  // Stale: > 24 hours
  return {
    label: diffDays === 1 ? "1 day ago" : `${diffDays} days ago`,
    status: "Stale",
    isStale: true,
    colorClass: "text-amber-500",
  };
}
