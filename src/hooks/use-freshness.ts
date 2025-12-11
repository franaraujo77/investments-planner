"use client";

/**
 * useFreshness Hook
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.5: Badge Appears on Prices, Exchange Rates, and Scores
 *
 * Hook for fetching data freshness information with caching.
 * Uses React state for data management with auto-refresh capability.
 *
 * @module @/hooks/use-freshness
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { FreshnessInfo } from "@/lib/providers/types";
import type {
  FreshnessDataType,
  FreshnessSuccessResponse,
} from "@/lib/validations/freshness-schemas";

// =============================================================================
// TYPES
// =============================================================================

export interface UseFreshnessOptions {
  /** Type of data to query freshness for */
  type: FreshnessDataType;
  /** Optional array of symbols to filter */
  symbols?: string[];
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
  /** Whether to auto-refetch on window focus (default: true) */
  refetchOnWindowFocus?: boolean;
}

export interface UseFreshnessReturn {
  /** Map of symbol/key to freshness info */
  freshnessData: Record<string, FreshnessInfo>;
  /** Whether the query is loading (initial fetch) */
  isLoading: boolean;
  /** Whether the query is fetching (initial or refetch) */
  isFetching: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Function to manually refetch freshness data */
  refetch: () => Promise<void>;
}

// =============================================================================
// CACHE
// =============================================================================

// Simple in-memory cache for freshness data
const freshnessCache = new Map<
  string,
  {
    data: Record<string, FreshnessInfo>;
    timestamp: number;
  }
>();

/**
 * Build cache key from options
 */
function buildCacheKey(type: FreshnessDataType, symbols?: string[]): string {
  if (symbols && symbols.length > 0) {
    return `freshness:${type}:${symbols.sort().join(",")}`;
  }
  return `freshness:${type}`;
}

// =============================================================================
// FETCH FUNCTION
// =============================================================================

/**
 * Fetch freshness data from API
 */
async function fetchFreshness(
  type: FreshnessDataType,
  symbols?: string[]
): Promise<Record<string, FreshnessInfo>> {
  const params = new URLSearchParams({ type });

  if (symbols && symbols.length > 0) {
    params.set("symbols", symbols.join(","));
  }

  const response = await fetch(`/api/data/freshness?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to fetch freshness: ${response.status}`);
  }

  const result = (await response.json()) as FreshnessSuccessResponse;

  // Convert ISO date strings to Date objects
  const freshnessMap: Record<string, FreshnessInfo> = {};

  for (const [key, value] of Object.entries(result.data)) {
    const item: FreshnessInfo = {
      source: value.source,
      fetchedAt: new Date(value.fetchedAt),
      isStale: value.isStale,
    };

    if (value.staleSince) {
      item.staleSince = new Date(value.staleSince);
    }

    freshnessMap[key] = item;
  }

  return freshnessMap;
}

// =============================================================================
// useFreshness HOOK
// =============================================================================

/**
 * Hook for fetching data freshness information
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: Returns freshness info (source, timestamp, isStale)
 * AC-6.7.5: Supports prices, rates, and fundamentals types
 *
 * @param options - Query options
 * @returns Freshness data, loading state, and utility functions
 *
 * @example
 * ```tsx
 * function AssetPriceWithFreshness({ symbol }: { symbol: string }) {
 *   const { freshnessData, isLoading } = useFreshness({
 *     type: 'prices',
 *     symbols: [symbol],
 *   });
 *
 *   const freshness = freshnessData[symbol];
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       <span>$100.00</span>
 *       {freshness && <DataFreshnessBadge freshnessInfo={freshness} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFreshness(options: UseFreshnessOptions): UseFreshnessReturn {
  const {
    type,
    symbols,
    enabled = true,
    staleTime = 5 * 60 * 1000,
    refetchOnWindowFocus = true,
  } = options;

  const [freshnessData, setFreshnessData] = useState<Record<string, FreshnessInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track if component is mounted
  const isMounted = useRef(true);

  // Build cache key
  const cacheKey = buildCacheKey(type, symbols);

  // Fetch function
  const doFetch = useCallback(
    async (showLoading = true) => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cached = freshnessCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        setFreshnessData(cached.data);
        setIsLoading(false);
        return;
      }

      if (showLoading) {
        setIsFetching(true);
      }
      setError(null);

      try {
        const data = await fetchFreshness(type, symbols);

        if (isMounted.current) {
          // Update cache
          freshnessCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });

          setFreshnessData(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted.current) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [type, symbols, enabled, staleTime, cacheKey]
  );

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    doFetch(true);

    return () => {
      isMounted.current = false;
    };
  }, [doFetch]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) {
      return;
    }

    const handleFocus = () => {
      doFetch(false);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchOnWindowFocus, enabled, doFetch]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    // Clear cache for this key
    freshnessCache.delete(cacheKey);
    await doFetch(true);
  }, [cacheKey, doFetch]);

  return {
    freshnessData,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook for getting freshness info for a single symbol
 *
 * Convenience wrapper around useFreshness for single-symbol queries.
 *
 * @param type - Data type
 * @param symbol - Symbol to query
 * @param enabled - Whether query is enabled
 * @returns Freshness info for the symbol or null
 *
 * @example
 * ```tsx
 * const { freshness, isLoading } = useFreshnessForSymbol('prices', 'PETR4');
 * ```
 */
export function useFreshnessForSymbol(
  type: FreshnessDataType,
  symbol: string,
  enabled = true
): {
  freshness: FreshnessInfo | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
} {
  const { freshnessData, isLoading, isFetching, error } = useFreshness({
    type,
    symbols: [symbol],
    enabled,
  });

  return {
    freshness: freshnessData[symbol.toUpperCase()] ?? null,
    isLoading,
    isFetching,
    error,
  };
}

/**
 * Clear all cached freshness data
 *
 * Call this after a successful data refresh to invalidate freshness cache.
 *
 * @example
 * ```tsx
 * const handleRefresh = async () => {
 *   await refresh();
 *   clearFreshnessCache();
 * };
 * ```
 */
export function clearFreshnessCache(): void {
  freshnessCache.clear();
}

/**
 * Clear freshness cache for a specific type
 *
 * @param type - Data type to clear cache for
 */
export function clearFreshnessCacheForType(type: FreshnessDataType): void {
  for (const key of freshnessCache.keys()) {
    if (key.startsWith(`freshness:${type}`)) {
      freshnessCache.delete(key);
    }
  }
}
