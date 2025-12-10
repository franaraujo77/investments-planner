"use client";

/**
 * useScoreBreakdown Hook
 *
 * Story 5.11: Score Breakdown View
 *
 * React hook for fetching and managing score breakdown data.
 * Uses standard fetch pattern (following existing hooks in the codebase).
 *
 * Features:
 * - Fetch breakdown for a single asset
 * - Handle loading, success, and error states
 * - Refetch capability
 * - Cache-like behavior with staleTime
 *
 * AC-5.11.1-5.11.5: Data fetching for breakdown panel
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { CriterionResult } from "@/hooks/use-asset-score";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended breakdown data with additional metadata
 */
export interface ScoreBreakdownData {
  assetId: string;
  symbol: string;
  score: string;
  breakdown: CriterionResult[];
  criteriaVersionId: string;
  calculatedAt: Date;
  isFresh: boolean;
  /** Criteria version's target market (for edit link navigation) */
  targetMarket?: string | undefined;
}

/**
 * API response type
 */
interface BreakdownResponse {
  data: {
    assetId: string;
    symbol: string;
    score: string;
    breakdown: Array<{
      criterionId: string;
      criterionName: string;
      matched: boolean;
      pointsAwarded: number;
      actualValue: string | null;
      skippedReason: string | null;
    }>;
    criteriaVersionId: string;
    calculatedAt: string;
    isFresh: boolean;
    targetMarket?: string | undefined;
  };
}

interface APIError {
  error: string;
  code: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Stale time in milliseconds (5 minutes) */
const STALE_TIME_MS = 5 * 60 * 1000;

// =============================================================================
// HOOK
// =============================================================================

export interface UseScoreBreakdownOptions {
  /** Whether to fetch immediately when assetId changes */
  enabled?: boolean;
  /** Time in ms before data is considered stale (default: 5 minutes) */
  staleTime?: number;
}

export interface UseScoreBreakdownResult {
  /** Breakdown data (null if loading or not found) */
  breakdown: ScoreBreakdownData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to manually refetch */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching score breakdown for an asset
 *
 * @param assetId - Asset ID to fetch breakdown for (null to skip fetch)
 * @param options - Hook options
 * @returns Breakdown data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { breakdown, isLoading, error, refetch } = useScoreBreakdown(assetId);
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage message={error} />;
 * if (!breakdown) return <NotFound />;
 * return <ScoreBreakdown {...breakdown} />;
 * ```
 */
export function useScoreBreakdown(
  assetId: string | null,
  options: UseScoreBreakdownOptions = {}
): UseScoreBreakdownResult {
  const { enabled = true, staleTime = STALE_TIME_MS } = options;

  const [breakdown, setBreakdown] = useState<ScoreBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last fetch time for cache-like behavior
  const lastFetchTime = useRef<number>(0);
  const lastAssetId = useRef<string | null>(null);

  const fetchBreakdown = useCallback(async () => {
    if (!assetId) {
      setBreakdown(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check if we have fresh data for this asset
    const now = Date.now();
    const isSameAsset = lastAssetId.current === assetId;
    const isStale = now - lastFetchTime.current > staleTime;

    if (isSameAsset && !isStale && breakdown) {
      // Data is still fresh, no need to refetch
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the breakdown endpoint which returns full breakdown data with target market
      const response = await fetch(`/api/scores/${assetId}/breakdown`);
      const result = (await response.json()) as BreakdownResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;

        // Handle 404 - asset not scored
        if (response.status === 404) {
          setBreakdown(null);
          setError(errorResult.error || "No score found for this asset");
          return;
        }

        // Other errors
        setError(errorResult.error || "Failed to fetch breakdown");
        return;
      }

      // Success - parse response
      const data = result as BreakdownResponse;
      const breakdownData: ScoreBreakdownData = {
        assetId: data.data.assetId,
        symbol: data.data.symbol,
        score: data.data.score,
        breakdown: data.data.breakdown,
        criteriaVersionId: data.data.criteriaVersionId,
        calculatedAt: new Date(data.data.calculatedAt),
        isFresh: data.data.isFresh,
        targetMarket: data.data.targetMarket,
      };

      setBreakdown(breakdownData);
      setError(null);
      lastFetchTime.current = now;
      lastAssetId.current = assetId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch breakdown";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assetId, staleTime, breakdown]);

  // Fetch when assetId changes or on mount
  useEffect(() => {
    if (enabled && assetId) {
      // Reset cache tracking when assetId changes
      if (lastAssetId.current !== assetId) {
        lastFetchTime.current = 0;
        lastAssetId.current = null;
      }
      fetchBreakdown();
    } else if (!assetId) {
      // Clear state when assetId is null
      setBreakdown(null);
      setError(null);
      setIsLoading(false);
    }
  }, [enabled, assetId, fetchBreakdown]);

  // Force refetch function (bypasses cache)
  const refetch = useCallback(async () => {
    lastFetchTime.current = 0; // Invalidate cache
    await fetchBreakdown();
  }, [fetchBreakdown]);

  return {
    breakdown,
    isLoading,
    error,
    refetch,
  };
}
