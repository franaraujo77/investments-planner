"use client";

/**
 * Dashboard Page
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 * Story 7.7: View Recommendation Breakdown
 * Story 7.8: Confirm Recommendations
 * Story 8.5: Instant Dashboard Load
 *
 * Main dashboard page displaying:
 * - Welcome message with refresh button
 * - Recommendation input section (contribution/dividends)
 * - Focus Mode with investment recommendations
 * - Recommendation breakdown panel on card click
 * - Confirmation modal for finalizing investments
 * - Data freshness badge showing when recommendations were generated
 *
 * AC-7.5.1: Focus Mode Header Display
 * AC-7.5.2: RecommendationCard Display
 * AC-7.5.3: Cards Sorted by Amount
 * AC-7.5.4: Balanced Portfolio Empty State
 * AC-7.5.5: Total Summary Display
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * AC-7.7.2: Breakdown Shows Score Breakdown Link
 * AC-7.7.3: Formula Display
 * AC-7.7.4: Audit Trail Information
 * AC-7.8.1: Click Opens Confirmation Modal
 * AC-7.8.2: Real-time Total Updates
 * AC-7.8.3: Confirm Records Investments
 * AC-7.8.4: Success Toast Notification
 * AC-7.8.5: Validation Prevents Invalid Submissions
 * AC-8.5.4: Dashboard Loads in Under 2 Seconds
 * AC-8.5.5: Data Freshness Badge Shows Generation Time
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshButton } from "@/components/data/refresh-button";
import { RecommendationInputSection } from "@/components/dashboard/recommendation-input-section";
import {
  FocusModeHeader,
  RecommendationList,
  RecommendationSummary,
  BalancedPortfolioState,
  RecommendationBreakdownPanel,
  ConfirmationModal,
} from "@/components/recommendations";
import { DataFreshnessBadge } from "@/components/fintech/data-freshness-badge";
import { useRecommendations, type RecommendationDisplayItem } from "@/hooks/use-recommendations";
import { useConfirmInvestments } from "@/hooks/use-confirm-investments";
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// LOADING SKELETON
// =============================================================================

function RecommendationsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Cards grid skeleton */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
              {/* Amount */}
              <div>
                <Skeleton className="h-3 w-32 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
              {/* Gauge */}
              <div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary skeleton */}
      <div className="flex justify-center py-4">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

interface RecommendationsErrorProps {
  message: string;
  onRetry: () => void;
}

function RecommendationsError({ message, onRetry }: RecommendationsErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Failed to load recommendations: {message}</span>
        <Button variant="outline" size="sm" onClick={onRetry} className="ml-4">
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// =============================================================================
// FOCUS MODE SECTION
// =============================================================================

function FocusModeSection() {
  const { data, isLoading, error, isEmpty, itemCount, refetch, isStale } = useRecommendations();

  // State for breakdown panel (Story 7.7)
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecommendationDisplayItem | null>(null);

  // State for confirmation modal (Story 7.8)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Confirmation hook (Story 7.8)
  const {
    isConfirming,
    error: confirmError,
    confirmInvestments,
  } = useConfirmInvestments({
    onSuccess: () => {
      setConfirmModalOpen(false);
      refetch(); // Refresh recommendations after confirmation
    },
  });

  // Handle card click to open breakdown panel
  const handleCardClick = useCallback(
    (assetId: string) => {
      if (!data) return;

      const item = data.items.find((i) => i.assetId === assetId);
      if (item && !item.isOverAllocated) {
        setSelectedItem(item);
        setBreakdownOpen(true);
      }
    },
    [data]
  );

  // AC-7.8.1: Handle confirm button click to open modal
  const handleOpenConfirmModal = useCallback(() => {
    setConfirmModalOpen(true);
  }, []);

  // AC-7.8.3: Handle confirm investments submission
  const handleConfirm = useCallback(
    async (
      investments: Array<{
        assetId: string;
        ticker: string;
        actualAmount: string;
        pricePerUnit: string;
      }>
    ) => {
      if (!data) return;
      await confirmInvestments(data.id, investments);
    },
    [data, confirmInvestments]
  );

  // Loading state
  if (isLoading) {
    return <RecommendationsLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return <RecommendationsError message={error} onRetry={refetch} />;
  }

  // Empty/Balanced state (no recommendations or no data)
  if (isEmpty || !data) {
    return <BalancedPortfolioState />;
  }

  // Check if there are any investable items (not over-allocated)
  const hasInvestableItems = data.items.some((item) => !item.isOverAllocated);

  // Recommendations display
  return (
    <div className="space-y-6" data-testid="focus-mode-section">
      {/* AC-7.5.1: Focus Mode Header with AC-8.5.5: Data Freshness Badge */}
      <div className="flex items-center justify-between">
        <FocusModeHeader totalInvestable={data.totalInvestable} baseCurrency={data.baseCurrency} />
        {/* AC-8.5.5: DataFreshnessBadge shows when recommendations were generated */}
        <DataFreshnessBadge
          updatedAt={new Date(data.generatedAt)}
          source="Recommendations"
          showRefreshButton
          onClick={refetch}
          isRefreshing={isStale}
        />
      </div>

      {/* AC-7.5.2 & AC-7.5.3: Recommendation Cards (sorted by amount) */}
      <RecommendationList
        items={data.items}
        baseCurrency={data.baseCurrency}
        onCardClick={handleCardClick}
      />

      {/* AC-7.5.5: Total Summary */}
      <RecommendationSummary
        count={itemCount}
        total={data.totalInvestable}
        baseCurrency={data.baseCurrency}
      />

      {/* AC-7.8.1: Confirm Investments Button */}
      {hasInvestableItems && (
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleOpenConfirmModal}
            className="gap-2"
            data-testid="confirm-investments-button"
          >
            <CheckCircle className="h-5 w-5" />
            Confirm Investments
          </Button>
        </div>
      )}

      {/* AC-7.7.1-7.7.4: Recommendation Breakdown Panel (Story 7.7) */}
      {selectedItem && (
        <RecommendationBreakdownPanel
          item={selectedItem}
          recommendationId={data.id}
          baseCurrency={data.baseCurrency}
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          correlationId={undefined}
          generatedAt={data.generatedAt}
        />
      )}

      {/* AC-7.8.1-7.8.5: Confirmation Modal (Story 7.8) */}
      <ConfirmationModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        recommendationId={data.id}
        totalInvestable={data.totalInvestable}
        baseCurrency={data.baseCurrency}
        items={data.items}
        onConfirm={handleConfirm}
        isSubmitting={isConfirming}
        submitError={confirmError}
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome message with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Welcome back</h1>
          <p className="text-muted-foreground">
            Here are your investment recommendations for this month.
          </p>
        </div>
        {/* Story 6.6: AC-6.6.1 - Refresh Button Available on Dashboard */}
        <RefreshButton type="all" variant="outline" />
      </div>

      {/* Story 7.1: Monthly Investment Setup - AC-7.1.1, AC-7.1.6 */}
      <RecommendationInputSection />

      {/* Story 7.5: Focus Mode - Investment Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <FocusModeSection />
        </CardContent>
      </Card>
    </div>
  );
}
