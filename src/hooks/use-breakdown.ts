"use client";

/**
 * useBreakdown Hook
 *
 * Story 7.7: View Recommendation Breakdown
 *
 * AC-7.7.1: Click Opens Detail Panel with Allocation Gap
 * AC-7.7.3: Formula Display
 * AC-7.7.4: Audit Trail Information
 *
 * Fetches detailed breakdown for a recommendation item from the API.
 *
 * Features:
 * - Handles loading, error, and success states
 * - Caches response in memory
 * - Provides refetch capability
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { DetailedBreakdown, BreakdownResponse } from "@/lib/types/recommendations";

// =============================================================================
// TYPES
// =============================================================================

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface UseBreakdownOptions {
  /** Whether to fetch on mount (default: false) */
  fetchOnMount?: boolean;
  /** Whether to skip fetching even when enabled (default: false) */
  skip?: boolean;
}

interface UseBreakdownReturn {
  /** Breakdown data (null if not loaded) */
  data: DetailedBreakdown | null;
  /** Whether breakdown is loading */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Fetch breakdown from server */
  fetch: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// CACHE
// =============================================================================

/** In-memory cache for breakdown data */
const breakdownCache = new Map<string, DetailedBreakdown>();

/**
 * Generate cache key from recommendation and item IDs
 */
function getCacheKey(recommendationId: string, itemId: string): string {
  return `${recommendationId}:${itemId}`;
}

// =============================================================================
// API FUNCTION
// =============================================================================

/**
 * Fetch breakdown from API
 */
async function fetchBreakdown(
  recommendationId: string,
  itemId: string
): Promise<DetailedBreakdown> {
  const response = await fetch(
    `/api/recommendations/${recommendationId}/breakdown?itemId=${itemId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.error || "Failed to fetch breakdown");
  }

  const result: BreakdownResponse = await response.json();
  return result.data;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for fetching recommendation breakdown details
 *
 * @param recommendationId - ID of the recommendation
 * @param itemId - ID of the recommendation item
 * @param options - Configuration options
 * @returns Breakdown state and functions
 *
 * @example
 * ```tsx
 * function BreakdownPanel({ recommendationId, itemId }) {
 *   const { data, isLoading, error, fetch } = useBreakdown(
 *     recommendationId,
 *     itemId
 *   );
 *
 *   useEffect(() => {
 *     if (isOpen) fetch();
 *   }, [isOpen, fetch]);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage message={error} />;
 *   if (!data) return null;
 *
 *   return <BreakdownDisplay data={data} />;
 * }
 * ```
 */
export function useBreakdown(
  recommendationId: string,
  itemId: string,
  options: UseBreakdownOptions = {}
): UseBreakdownReturn {
  const { fetchOnMount = false, skip = false } = options;

  // State
  const [data, setData] = useState<DetailedBreakdown | null>(() => {
    // Check cache on initial render
    const cacheKey = getCacheKey(recommendationId, itemId);
    return breakdownCache.get(cacheKey) ?? null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch breakdown
  const fetch = useCallback(async (): Promise<void> => {
    if (skip) return;

    const cacheKey = getCacheKey(recommendationId, itemId);

    // Return cached data if available
    const cached = breakdownCache.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await fetchBreakdown(recommendationId, itemId);

      // Only update state if still mounted
      if (isMountedRef.current) {
        // Cache the result
        breakdownCache.set(cacheKey, result);
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : "Failed to fetch breakdown";
        setError(message);
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [recommendationId, itemId, skip]);

  // Reset state
  const reset = useCallback((): void => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount && !skip) {
      fetch();
    }
  }, [fetchOnMount, skip, fetch]);

  // Update data from cache when IDs change
  useEffect(() => {
    const cacheKey = getCacheKey(recommendationId, itemId);
    const cached = breakdownCache.get(cacheKey);
    if (cached) {
      setData(cached);
    } else {
      setData(null);
    }
  }, [recommendationId, itemId]);

  return {
    data,
    isLoading,
    error,
    fetch,
    reset,
  };
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Clear breakdown cache (for testing or manual invalidation)
 */
export function clearBreakdownCache(): void {
  breakdownCache.clear();
}

/**
 * Invalidate a specific breakdown from cache
 */
export function invalidateBreakdown(recommendationId: string, itemId: string): void {
  const cacheKey = getCacheKey(recommendationId, itemId);
  breakdownCache.delete(cacheKey);
}
