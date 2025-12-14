"use client";

/**
 * RecommendationInputSection Component
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.1: Enter contribution amount on dashboard
 * AC-7.1.5: Currency display formatting
 * AC-7.1.6: Real-time total update
 *
 * Story 7.2: Enter Dividends Received
 * AC-7.2.1: Enter dividends amount on dashboard
 * AC-7.2.3: Capital breakdown display
 * AC-7.2.5: Real-time total update
 *
 * Story 7.3: Calculate Total Investable Capital
 * AC-7.3.3: Prominent total display ("You have $X to invest")
 *
 * Dashboard Focus Mode section for entering:
 * - Monthly contribution amount
 * - Dividends received
 * - Displays total investable capital with breakdown
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContributionInput } from "@/components/recommendations/contribution-input";
import { DividendsInput } from "@/components/recommendations/dividends-input";
import { useContribution } from "@/hooks/use-contribution";
import { SimpleCurrencyDisplay } from "@/components/fintech/currency-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, Wallet, TrendingUp } from "lucide-react";

export function RecommendationInputSection() {
  const {
    contribution,
    setContribution,
    error,
    validate,
    clearError,
    isLoading,
    isSaving,
    saveAsDefault,
    baseCurrency,
    dividends,
    setDividends,
    dividendsError,
    validateDividendsValue,
    clearDividendsError,
    totalInvestable,
  } = useContribution();

  // Track if user wants to save as default
  const [saveDefaultChecked, setSaveDefaultChecked] = useState(false);

  // Handle blur validation for contribution
  const handleBlur = useCallback(() => {
    if (contribution) {
      validate();
    }
  }, [contribution, validate]);

  // Handle blur validation for dividends - AC-7.2.4
  const handleDividendsBlur = useCallback(() => {
    validateDividendsValue();
  }, [validateDividendsValue]);

  // Handle save default
  const handleSaveDefault = useCallback(async () => {
    if (validate()) {
      await saveAsDefault();
    }
  }, [validate, saveAsDefault]);

  // Handle contribution change - clear error on change
  const handleContributionChange = useCallback(
    (value: string) => {
      setContribution(value);
      clearError();
    },
    [setContribution, clearError]
  );

  // Handle dividends change - clear error on change - AC-7.2.5
  const handleDividendsChange = useCallback(
    (value: string) => {
      setDividends(value);
      clearDividendsError();
    },
    [setDividends, clearDividendsError]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Monthly Investment Setup
          </CardTitle>
          <CardDescription>Loading your settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Monthly Investment Setup
        </CardTitle>
        <CardDescription>
          Enter your available capital for this month to get personalized recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Contribution Input - AC-7.1.1 */}
          <div className="space-y-1">
            <ContributionInput
              value={contribution}
              onChange={handleContributionChange}
              currency={baseCurrency}
              error={error}
              onBlur={handleBlur}
              label="Monthly Contribution"
              showSaveDefault={true}
              saveDefaultChecked={saveDefaultChecked}
              onSaveDefaultChange={setSaveDefaultChecked}
              onSaveDefault={handleSaveDefault}
              disabled={isSaving}
            />
          </div>

          {/* Dividends Input - AC-7.2.1 */}
          <div className="space-y-1">
            <DividendsInput
              value={dividends}
              onChange={handleDividendsChange}
              currency={baseCurrency}
              error={dividendsError}
              onBlur={handleDividendsBlur}
              disabled={isSaving}
            />
          </div>

          {/* Total Investable - AC-7.1.6 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Investable
            </label>
            <div className="flex items-center h-9 px-3 rounded-md bg-muted/50 border">
              <SimpleCurrencyDisplay
                value={totalInvestable}
                currency={baseCurrency}
                className="text-lg font-semibold"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Contribution + Dividends = Total available
            </p>
          </div>
        </div>

        {/* Prominent Total Display - AC-7.3.3 */}
        {contribution && !error && parseFloat(contribution) > 0 && (
          <div className="mt-6 pt-4 border-t">
            {/* Hero-style "You have $X to invest" callout - AC-7.3.3 */}
            <div
              className="flex items-center justify-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4"
              data-testid="total-investable-hero"
            >
              <TrendingUp className="h-6 w-6 text-primary" />
              <p className="text-xl sm:text-2xl font-bold">
                <span className="text-muted-foreground font-normal">You have </span>
                <span data-testid="total-investable-amount">
                  <SimpleCurrencyDisplay
                    value={totalInvestable}
                    currency={baseCurrency}
                    className="text-primary"
                  />
                </span>
                <span className="text-muted-foreground font-normal"> to invest</span>
              </p>
            </div>

            {/* Capital Breakdown - AC-7.2.3 */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Contribution:</span>
              <SimpleCurrencyDisplay
                value={contribution}
                currency={baseCurrency}
                className="font-semibold text-foreground"
              />
              <span className="text-muted-foreground">+</span>
              <span className="text-muted-foreground">Dividends:</span>
              <SimpleCurrencyDisplay
                value={dividends || "0.00"}
                currency={baseCurrency}
                className="font-semibold text-foreground"
              />
              <span className="text-muted-foreground">=</span>
              <SimpleCurrencyDisplay
                value={totalInvestable}
                currency={baseCurrency}
                className="font-bold text-foreground"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
