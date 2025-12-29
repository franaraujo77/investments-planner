"use client";

/**
 * Investment Entry Card Component
 *
 * Story 2.8: Investment History
 *
 * AC-2.8.2: View Investment History Tab - Display entry summary
 * AC-2.8.3: Investment Entry Details - Expandable detail view
 * AC-2.8.6: Regional Number Formatting
 *
 * Displays individual investment entries with summary and expandable details.
 */

import { useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataFreshnessBadge } from "@/components/fintech/data-freshness-badge";
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
import { cn } from "@/lib/utils";
import type { InvestmentWithContext } from "./investment-history-tab";

interface InvestmentEntryCardProps {
  /** Investment data to display */
  investment: InvestmentWithContext;
  /** Base currency for the portfolio */
  baseCurrency: string;
  /** Whether the card is expanded to show details */
  isExpanded: boolean;
  /** Callback to toggle expand state */
  onToggleExpand: () => void;
}

/**
 * Calculate the difference between recommended and actual amount
 */
function calculateDifference(
  actual: string,
  recommended: string | null
): { value: number; percentage: number } | null {
  if (!recommended) return null;

  const actualNum = parseFloat(actual);
  const recommendedNum = parseFloat(recommended);

  if (recommendedNum === 0) return null;

  const value = actualNum - recommendedNum;
  const percentage = (value / recommendedNum) * 100;

  return { value, percentage };
}

export function InvestmentEntryCard({
  investment,
  baseCurrency,
  isExpanded,
  onToggleExpand,
}: InvestmentEntryCardProps) {
  const { formatCurrency, formatNumber, formatPercent, formatDateTime } = useNumberFormat();

  // Parse values for formatting
  const totalAmount = parseFloat(investment.totalAmount);
  const quantity = parseFloat(investment.quantity);
  const pricePerUnit = parseFloat(investment.pricePerUnit);
  const investedDate = new Date(investment.investedAt);

  // Calculate difference from recommended if available
  const difference = useMemo(
    () => calculateDifference(investment.totalAmount, investment.recommendedAmount),
    [investment.totalAmount, investment.recommendedAmount]
  );

  // Determine difference indicator
  const DifferenceIcon = useMemo(() => {
    if (!difference) return null;
    if (difference.value > 0) return TrendingUp;
    if (difference.value < 0) return TrendingDown;
    return Minus;
  }, [difference]);

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer hover:shadow-md",
        isExpanded && "ring-2 ring-primary/20"
      )}
      data-testid={`investment-entry-${investment.id}`}
      onClick={onToggleExpand}
    >
      <CardContent className="p-4">
        {/* Summary Row - AC-2.8.2: date, asset, amount, quantity, allocation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg">{investment.symbol}</span>
              {investment.assetName && (
                <span className="text-muted-foreground text-sm">{investment.assetName}</span>
              )}
              {investment.assetClass && (
                <Badge variant="secondary" className="text-xs">
                  {investment.assetClass}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <DataFreshnessBadge updatedAt={investedDate} source="Investment" size="sm" />
              <span>•</span>
              <span>{formatNumber(quantity)} units</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold text-lg" data-testid="investment-amount">
                {formatCurrency(totalAmount, investment.currency)}
              </div>
              {investment.currency !== baseCurrency && (
                <div className="text-xs text-muted-foreground">in {investment.currency}</div>
              )}
            </div>

            {/* Expand/Collapse indicator */}
            <div className="text-muted-foreground">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </div>

        {/* AC-2.8.3: Expanded Details View */}
        {isExpanded && (
          <div
            className="mt-4 pt-4 border-t space-y-4"
            data-testid="investment-details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Investment date and time */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                <div className="font-medium">{formatDateTime(investedDate)}</div>
              </div>

              {/* Asset symbol and name */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Asset</div>
                <div className="font-medium">
                  {investment.symbol}
                  {investment.assetName && (
                    <span className="text-muted-foreground ml-1">({investment.assetName})</span>
                  )}
                </div>
              </div>

              {/* Quantity purchased */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                <div className="font-medium font-mono">
                  {formatNumber(quantity, { maximumFractionDigits: 8 })}
                </div>
              </div>

              {/* Price per unit */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Price per Unit</div>
                <div className="font-medium font-mono">
                  {formatCurrency(pricePerUnit, investment.currency)}
                </div>
              </div>

              {/* Total amount invested */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total Invested</div>
                <div className="font-medium font-mono">
                  {formatCurrency(totalAmount, investment.currency)}
                </div>
              </div>

              {/* Currency used */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Currency</div>
                <div className="font-medium">{investment.currency}</div>
              </div>

              {/* Recommended amount (if from recommendation) */}
              {investment.recommendedAmount && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Recommended Amount</div>
                  <div className="font-medium font-mono">
                    {formatCurrency(parseFloat(investment.recommendedAmount), investment.currency)}
                  </div>
                </div>
              )}

              {/* Difference from recommended */}
              {difference && DifferenceIcon && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">vs Recommended</div>
                  <div
                    className={cn(
                      "font-medium flex items-center gap-1",
                      difference.value > 0 && "text-green-600",
                      difference.value < 0 && "text-red-600"
                    )}
                  >
                    <DifferenceIcon className="h-4 w-4" />
                    <span>
                      {difference.value > 0 ? "+" : ""}
                      {formatCurrency(difference.value, investment.currency)}
                    </span>
                    <span className="text-xs">
                      ({difference.percentage > 0 ? "+" : ""}
                      {formatPercent(difference.percentage / 100)})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
