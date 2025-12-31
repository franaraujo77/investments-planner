"use client";

/**
 * useStrategyAllocation Hook
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Auto-refresh on mount for pie chart display
 *
 * Fetches and manages strategy allocation data from the API.
 * Provides loading, error, and refresh states.
 */

import { useState, useEffect, useCallback } from "react";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";

// =============================================================================
// TYPES
// =============================================================================

export interface UseStrategyAllocationReturn {
  /** Array of asset class allocations */
  allocations: StrategyAllocation[];
  /** Total portfolio value */
  totalValue: string;
  /** Unclassified assets info */
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  };
  /** Whether user has any portfolio assets */
  hasAssets: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

interface StrategyAllocationApiResponse {
  data: {
    allocations: StrategyAllocation[];
    totalPortfolioValue: string;
    unclassifiedValue: string;
    unclassifiedPercentage: string;
    unclassifiedAssetCount: number;
  };
  meta: {
    hasAssets: boolean;
  };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook to fetch and manage strategy allocation data
 *
 * @returns UseStrategyAllocationReturn with allocation data and controls
 *
 * @example
 * ```tsx
 * function StrategyChart() {
 *   const { allocations, totalValue, isLoading, error } = useStrategyAllocation();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <AllocationPieChart allocations={allocations} totalValue={totalValue} />;
 * }
 * ```
 */
export function useStrategyAllocation(): UseStrategyAllocationReturn {
  const [allocations, setAllocations] = useState<StrategyAllocation[]>([]);
  const [totalValue, setTotalValue] = useState<string>("0");
  const [unclassified, setUnclassified] = useState<{
    value: string;
    percentage: string;
    assetCount: number;
  }>({
    value: "0",
    percentage: "0",
    assetCount: 0,
  });
  const [hasAssets, setHasAssets] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/strategy/allocation", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to view allocation data");
        }
        throw new Error("Failed to fetch allocation data");
      }

      const result: StrategyAllocationApiResponse = await response.json();

      setAllocations(result.data.allocations);
      setTotalValue(result.data.totalPortfolioValue);
      setUnclassified({
        value: result.data.unclassifiedValue,
        percentage: result.data.unclassifiedPercentage,
        assetCount: result.data.unclassifiedAssetCount,
      });
      setHasAssets(result.meta.hasAssets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    fetchAllocation();
  }, [fetchAllocation]);

  return {
    allocations,
    totalValue,
    unclassified,
    hasAssets,
    isLoading,
    error,
    refresh: fetchAllocation,
  };
}
