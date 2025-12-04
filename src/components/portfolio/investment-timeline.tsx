"use client";

/**
 * InvestmentTimeline Component
 *
 * Story 3.9: Investment History View
 *
 * AC-3.9.1: Timeline showing investment entries grouped by date
 * AC-3.9.2: Expandable investment details
 * AC-3.9.3: Recommended vs actual amount comparison
 *
 * Displays investments as a timeline with:
 * - Date grouping (most recent first)
 * - Expandable entries showing individual assets
 * - Total invested per day and asset count
 * - Recommended vs actual amount comparison
 */

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SimpleCurrencyDisplay } from "@/components/fintech/currency-display";
import { Decimal } from "@/lib/calculations/decimal-config";
import type { Investment } from "@/lib/db/schema";

interface InvestmentTimelineProps {
  investments: Investment[];
}

interface GroupedInvestment {
  date: string;
  displayDate: string;
  investments: Investment[];
  totalAmount: string;
  assetCount: number;
}

/**
 * Groups investments by date (YYYY-MM-DD)
 * Returns groups sorted by date descending (most recent first)
 */
function groupInvestmentsByDate(investments: Investment[]): GroupedInvestment[] {
  const groups = new Map<string, Investment[]>();

  // Group by date
  for (const investment of investments) {
    const date = new Date(investment.investedAt);
    const dateKey = date.toISOString().split("T")[0] ?? "";

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(investment);
  }

  // Convert to array and sort by date descending
  const result: GroupedInvestment[] = [];

  for (const [dateKey, dayInvestments] of groups) {
    // Calculate daily total using decimal.js
    const totalAmount = dayInvestments
      .reduce((sum, inv) => sum.plus(inv.totalAmount), new Decimal(0))
      .toFixed(4);

    // Format display date
    const date = new Date(dateKey);
    const displayDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    result.push({
      date: dateKey,
      displayDate,
      investments: dayInvestments,
      totalAmount,
      assetCount: dayInvestments.length,
    });
  }

  // Sort by date descending
  result.sort((a, b) => b.date.localeCompare(a.date));

  return result;
}

/**
 * Calculates variance between recommended and actual amounts
 */
function calculateVariance(
  recommended: string | null,
  actual: string
): {
  variance: string;
  isPositive: boolean;
  isZero: boolean;
} | null {
  if (!recommended) {
    return null;
  }

  const rec = new Decimal(recommended);
  const act = new Decimal(actual);
  const variance = act.minus(rec);

  return {
    variance: variance.abs().toFixed(2),
    isPositive: variance.greaterThan(0),
    isZero: variance.equals(0),
  };
}

export function InvestmentTimeline({ investments }: InvestmentTimelineProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Group investments by date
  const groupedInvestments = useMemo(() => groupInvestmentsByDate(investments), [investments]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groupedInvestments.map((group) => {
        const isExpanded = expandedDates.has(group.date);

        return (
          <Card key={group.date} className="overflow-hidden">
            {/* Timeline Entry Header - AC-3.9.1 */}
            <CardHeader className="p-0">
              <button
                type="button"
                onClick={() => toggleDate(group.date)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                aria-expanded={isExpanded}
                aria-controls={`investments-${group.date}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-medium">{group.displayDate}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.assetCount} {group.assetCount === 1 ? "asset" : "assets"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Invested</p>
                    <p className="font-semibold">
                      {/* Use primary currency from first investment */}
                      <SimpleCurrencyDisplay
                        value={group.totalAmount}
                        currency={group.investments[0]?.currency ?? "USD"}
                      />
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CardHeader>

            {/* Expandable Details - AC-3.9.2 */}
            {isExpanded && (
              <CardContent id={`investments-${group.date}`} className="border-t bg-muted/30 p-0">
                <div className="divide-y">
                  {group.investments.map((investment) => (
                    <InvestmentRow key={investment.id} investment={investment} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Individual investment row within an expanded timeline entry
 * AC-3.9.2: Shows Symbol, Quantity, Price Per Unit, Total Amount, Currency
 * AC-3.9.3: Recommended vs actual amount comparison
 */
function InvestmentRow({ investment }: { investment: Investment }) {
  const variance = calculateVariance(investment.recommendedAmount, investment.totalAmount);

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        {/* Symbol Badge */}
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-background border font-mono text-sm font-medium">
          {investment.symbol.slice(0, 4)}
        </div>

        {/* Investment Details */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{investment.symbol}</span>
            <span className="text-muted-foreground">×</span>
            <span className="text-sm">
              {parseFloat(investment.quantity).toLocaleString()} units
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            @{" "}
            <SimpleCurrencyDisplay value={investment.pricePerUnit} currency={investment.currency} />
            {" per unit"}
          </p>
        </div>
      </div>

      {/* Total and Recommended - AC-3.9.3 */}
      <div className="text-right space-y-1">
        <div className="font-semibold">
          <SimpleCurrencyDisplay value={investment.totalAmount} currency={investment.currency} />
        </div>

        {/* Recommended vs Actual Comparison */}
        {variance ? (
          variance.isZero ? (
            <div className="flex items-center justify-end gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span>Matches recommended</span>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1 text-sm">
              <AlertCircle
                className={`h-3 w-3 ${variance.isPositive ? "text-blue-500" : "text-amber-500"}`}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">
                Rec:{" "}
                <SimpleCurrencyDisplay
                  value={investment.recommendedAmount!}
                  currency={investment.currency}
                />
              </span>
              <span className={variance.isPositive ? "text-blue-500" : "text-amber-500"}>
                ({variance.isPositive ? "+" : "-"}
                <SimpleCurrencyDisplay value={variance.variance} currency={investment.currency} />)
              </span>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Manual investment</p>
        )}
      </div>
    </div>
  );
}
