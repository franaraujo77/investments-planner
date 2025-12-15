"use client";

/**
 * useDashboard Hook
 *
 * Story 8.5: Instant Dashboard Load
 *
 * AC-8.5.1: Dashboard API reads from cache first
 * AC-8.5.2: Falls back to PostgreSQL if cache miss
 * AC-8.5.3: Response includes fromCache indicator
 * AC-8.5.4: Dashboard loads in <2 seconds
 * AC-8.5.5: DataFreshnessBadge shows generation time
 *
 * Features:
 * - Fetches dashboard data from /api/dashboard (cache-first)
 * - Provides loading, error, and success states
 * - Exposes fromCache indicator for UI display
 * - Provides refetch capability for manual refresh
 * - Tracks data freshness for DataFreshnessBadge
 */

import { useState, useCallback, useEffect, useMemo } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dashboard recommendation item (matches API response)
 */
export interface DashboardRecommendationItem {
  assetId: string;
  symbol: string;
  score: string;
  amount: string;
  currency: string;
  allocationGap: string;
  breakdown: {
    criteriaCount: number;
    topContributor: string;
  };
}

/**
 * Dashboard portfolio summary
 */
export interface DashboardPortfolioSummary {
  totalValue: string;
  baseCurrency: string;
  allocations: Record<string, string>;
}

/**
 * Dashboard data freshness
 */
export interface DashboardDataFreshness {
  generatedAt: string;
  pricesAsOf: string;
  ratesAsOf: string;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  recommendations: DashboardRecommendationItem[];
  portfolioSummary: DashboardPortfolioSummary;
  totalInvestable: string;
  baseCurrency: string;
  dataFreshness: DashboardDataFreshness;
  fromCache: boolean;
}

interface APIResponse {
  data: DashboardData;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface UseDashboardOptions {
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean;
}

interface UseDashboardReturn {
  /** Dashboard data (null if not loaded or no data) */
  data: DashboardData | null;
  /** Whether dashboard data is loading */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Whether no recommendations exist */
  isEmpty: boolean;
  /** Refetch dashboard data from server */
  refetch: () => Promise<void>;
  /** Whether data is from cache */
  fromCache: boolean;
  /** Count of recommendation items */
  itemCount: number;
  /** When recommendations were generated (ISO string) */
  generatedAt: string | null;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
}

// =============================================================================
// API FUNCTION
// =============================================================================

async function fetchDashboardData(): Promise<DashboardData | null> {
  const response = await fetch("/api/dashboard", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  // Handle 404 - no recommendations available
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.error || "Failed to fetch dashboard data");
  }

  const result: APIResponse = await response.json();
  return result.data;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sort recommendations by recommended amount (highest first)
 * AC-7.5.3: Cards sorted by recommended amount descending
 */
function sortByAmount(items: DashboardRecommendationItem[]): DashboardRecommendationItem[] {
  return [...items].sort((a, b) => {
    const amountA = parseFloat(a.amount);
    const amountB = parseFloat(b.amount);
    return amountB - amountA;
  });
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for fetching and displaying dashboard data
 *
 * @param options - Configuration options
 * @returns Dashboard state and functions
 *
 * @example
 * ```tsx
 * function DashboardSection() {
 *   const {
 *     data,
 *     isLoading,
 *     error,
 *     isEmpty,
 *     fromCache,
 *     generatedAt,
 *     refetch,
 *   } = useDashboard();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage message={error} />;
 *   if (isEmpty) return <BalancedPortfolioState />;
 *
 *   return (
 *     <>
 *       <DataFreshnessBadge updatedAt={new Date(generatedAt)} />
 *       <RecommendationList items={data.recommendations} />
 *     </>
 *   );
 * }
 * ```
 */
export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { fetchOnMount = true } = options;

  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(fetchOnMount);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const refetch = useCallback(async (): Promise<void> => {
    try {
      // Only show loading state if data is not already loaded
      if (!data) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const result = await fetchDashboardData();

      if (result) {
        // Sort items by recommended amount (highest first)
        const sortedRecommendations = sortByAmount(result.recommendations);
        setData({
          ...result,
          recommendations: sortedRecommendations,
        });
      } else {
        // No recommendations available (404 response)
        setData(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch dashboard data";
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  // Fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed values
  const isEmpty = useMemo((): boolean => {
    return data === null || data.recommendations.length === 0;
  }, [data]);

  const itemCount = useMemo((): number => {
    return data?.recommendations.length ?? 0;
  }, [data]);

  const fromCache = useMemo((): boolean => {
    return data?.fromCache ?? false;
  }, [data]);

  const generatedAt = useMemo((): string | null => {
    return data?.dataFreshness.generatedAt ?? null;
  }, [data]);

  return {
    data,
    isLoading,
    error,
    isEmpty,
    refetch,
    fromCache,
    itemCount,
    generatedAt,
    isRefreshing,
  };
}
