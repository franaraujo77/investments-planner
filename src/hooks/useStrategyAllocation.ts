"use client";

/**
 * useStrategyAllocation Hook
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Auto-refresh on mount for pie chart display
 *
 * Fetches and manages strategy allocation data from the API.
 * Supports switching between "target" and "current" allocation views.
 * Provides loading, error, and refresh states.
 */

import { useState, useEffect, useCallback } from "react";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";

// =============================================================================
// TYPES
// =============================================================================

/**
 * View type for allocation display
 * - target: Shows configured target allocations from asset classes (default)
 * - current: Shows actual portfolio holdings allocation
 */
export type AllocationView = "target" | "current";

export interface UseStrategyAllocationOptions {
  /** Initial view type (default: "target") */
  initialView?: AllocationView;
}

export interface UseStrategyAllocationReturn {
  /** Array of asset class allocations */
  allocations: StrategyAllocation[];
  /** Total portfolio value (only meaningful for "current" view) */
  totalValue: string;
  /** Unclassified assets info (only meaningful for "current" view) */
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  };
  /** Whether user has any portfolio assets */
  hasAssets: boolean;
  /** Whether user has any asset classes configured */
  hasAssetClasses: boolean;
  /** Current view type */
  view: AllocationView;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Switch to a different view */
  setView: (view: AllocationView) => void;
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
    view: AllocationView;
    hasAssets: boolean;
    hasAssetClasses: boolean;
  };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook to fetch and manage strategy allocation data
 *
 * @param options - Configuration options
 * @param options.initialView - Initial view type (default: "target")
 * @returns UseStrategyAllocationReturn with allocation data and controls
 *
 * @example
 * ```tsx
 * function StrategyChart() {
 *   const { allocations, view, setView, isLoading, error } = useStrategyAllocation();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <>
 *       <ViewToggle value={view} onChange={setView} />
 *       <AllocationPieChart allocations={allocations} />
 *     </>
 *   );
 * }
 * ```
 */
export function useStrategyAllocation(
  options: UseStrategyAllocationOptions = {}
): UseStrategyAllocationReturn {
  const { initialView = "target" } = options;

  const [view, setViewState] = useState<AllocationView>(initialView);
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
  const [hasAssetClasses, setHasAssetClasses] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocation = useCallback(async (viewType: AllocationView) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/strategy/allocation?view=${viewType}`, {
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
      setHasAssetClasses(result.meta.hasAssetClasses);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set view and trigger fetch
  const setView = useCallback(
    (newView: AllocationView) => {
      setViewState(newView);
      fetchAllocation(newView);
    },
    [fetchAllocation]
  );

  // Refresh with current view
  const refresh = useCallback(async () => {
    await fetchAllocation(view);
  }, [fetchAllocation, view]);

  // Auto-refresh on mount with initial view
  useEffect(() => {
    fetchAllocation(initialView);
  }, [fetchAllocation, initialView]);

  return {
    allocations,
    totalValue,
    unclassified,
    hasAssets,
    hasAssetClasses,
    view,
    isLoading,
    error,
    setView,
    refresh,
  };
}
