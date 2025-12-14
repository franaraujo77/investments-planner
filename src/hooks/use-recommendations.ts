"use client";

/**
 * useRecommendations Hook
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 *
 * AC-7.5.1: Focus Mode Header Display - Total investable available
 * AC-7.5.2: RecommendationCard Display - Items with score, allocation, amount
 * AC-7.5.3: Cards Sorted by Amount - Sorted by recommendedAmount descending
 * AC-7.5.4: Balanced Portfolio Empty State - Empty items array
 * AC-7.5.5: Total Summary Display - Count and total amount
 *
 * Features:
 * - Fetches recommendations from /api/recommendations
 * - Handles loading, error, and success states
 * - Provides sorted recommendations (highest amount first)
 * - Provides refetch capability for manual refresh
 * - Handles 404 (no recommendations) as empty state
 */

import { useState, useCallback, useEffect, useMemo } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Individual recommendation item for display
 */
export interface RecommendationDisplayItem {
  /** Portfolio asset ID */
  assetId: string;
  /** Asset ticker symbol */
  symbol: string;
  /** Asset score (decimal string) */
  score: string;
  /** Current allocation percentage (decimal string) */
  currentAllocation: string;
  /** Target allocation percentage (decimal string) */
  targetAllocation: string;
  /** Allocation gap (decimal string) */
  allocationGap: string;
  /** Recommended investment amount (decimal string) */
  recommendedAmount: string;
  /** Whether asset is over-allocated */
  isOverAllocated: boolean;
}

/**
 * Complete recommendation data for display
 */
export interface RecommendationData {
  /** Recommendation session ID */
  id: string;
  /** Input contribution amount (decimal string) */
  contribution: string;
  /** Input dividends amount (decimal string) */
  dividends: string;
  /** Total investable: contribution + dividends (decimal string) */
  totalInvestable: string;
  /** User's base currency */
  baseCurrency: string;
  /** When recommendations were generated (ISO string) */
  generatedAt: string;
  /** When recommendations expire (ISO string) */
  expiresAt: string;
  /** Individual asset recommendations (already sorted by amount) */
  items: RecommendationDisplayItem[];
}

interface APIResponse {
  data: RecommendationData;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface UseRecommendationsOptions {
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean;
}

interface UseRecommendationsReturn {
  /** Recommendation data (null if not loaded or no recommendations) */
  data: RecommendationData | null;
  /** Whether recommendations are loading */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Whether no recommendations exist (balanced portfolio) */
  isEmpty: boolean;
  /** Refetch recommendations from server */
  refetch: () => Promise<void>;
  /** Count of recommendation items */
  itemCount: number;
  /** Whether data is stale and should be refetched */
  isStale: boolean;
}

// =============================================================================
// API FUNCTION
// =============================================================================

async function fetchRecommendations(): Promise<RecommendationData | null> {
  const response = await fetch("/api/recommendations", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  // Handle 404 - no recommendations available (balanced portfolio)
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.error || "Failed to fetch recommendations");
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
 *
 * Uses string comparison on decimal strings for deterministic ordering
 */
function sortByAmount(items: RecommendationDisplayItem[]): RecommendationDisplayItem[] {
  return [...items].sort((a, b) => {
    const amountA = parseFloat(a.recommendedAmount);
    const amountB = parseFloat(b.recommendedAmount);
    // Highest first (descending)
    return amountB - amountA;
  });
}

/**
 * Check if recommendations are stale (expired)
 */
function checkIsStale(expiresAt: string): boolean {
  try {
    const expiryDate = new Date(expiresAt);
    return expiryDate < new Date();
  } catch {
    return true;
  }
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for fetching and displaying investment recommendations
 *
 * @param options - Configuration options
 * @returns Recommendation state and functions
 *
 * @example
 * ```tsx
 * function RecommendationsSection() {
 *   const {
 *     data,
 *     isLoading,
 *     error,
 *     isEmpty,
 *     itemCount,
 *     refetch,
 *   } = useRecommendations();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage message={error} />;
 *   if (isEmpty) return <BalancedPortfolioState />;
 *
 *   return (
 *     <>
 *       <FocusModeHeader
 *         totalInvestable={data.totalInvestable}
 *         baseCurrency={data.baseCurrency}
 *       />
 *       <RecommendationList items={data.items} />
 *       <RecommendationSummary
 *         count={itemCount}
 *         total={data.totalInvestable}
 *         baseCurrency={data.baseCurrency}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useRecommendations(
  options: UseRecommendationsOptions = {}
): UseRecommendationsReturn {
  const { fetchOnMount = true } = options;

  // State
  const [data, setData] = useState<RecommendationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations
  const refetch = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await fetchRecommendations();

      if (result) {
        // Sort items by recommended amount (highest first) for display
        const sortedItems = sortByAmount(result.items);
        setData({
          ...result,
          items: sortedItems,
        });
      } else {
        // No recommendations available (404 response)
        setData(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch recommendations";
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount, refetch]);

  // Computed values
  const isEmpty = useMemo((): boolean => {
    // Empty if no data or no items
    return data === null || data.items.length === 0;
  }, [data]);

  const itemCount = useMemo((): number => {
    return data?.items.length ?? 0;
  }, [data]);

  const isStale = useMemo((): boolean => {
    if (!data) return false;
    return checkIsStale(data.expiresAt);
  }, [data]);

  return {
    data,
    isLoading,
    error,
    isEmpty,
    refetch,
    itemCount,
    isStale,
  };
}
