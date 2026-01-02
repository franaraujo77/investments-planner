"use client";

/**
 * useRecommendationDetails Hook
 *
 * Story 6.4: Recommendation Details
 *
 * React hook for fetching combined recommendation details, including:
 * - Extended breakdown (allocation math, score ranking, top criteria)
 * - Full score breakdown for expand/collapse functionality
 *
 * AC-6.4.1: Why This Recommendation Panel
 * AC-6.4.2: Allocation Math Display
 * AC-6.4.3: Score Contribution Display (top 3 criteria + expandable)
 * AC-6.4.4: Full Calculation Details
 *
 * Features:
 * - Combines data from breakdown API and score breakdown API
 * - Handles loading states for both sources
 * - Provides unified error handling
 * - Supports lazy loading (fetch on demand)
 */

import { useCallback, useMemo } from "react";
import { useBreakdown } from "./use-breakdown";
import { useScoreBreakdown, type ScoreBreakdownData } from "./use-score-breakdown";
import type { ExtendedBreakdown } from "@/lib/types/recommendations";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Combined recommendation details data
 *
 * Story 6.4 AC-6.4.3, AC-6.4.4: Combines breakdown + full score criteria
 */
export interface RecommendationDetailsData {
  /** Extended breakdown from recommendations API (AC-6.4.1, 6.4.2) */
  breakdown: ExtendedBreakdown | null;
  /** Full score breakdown for expandable criteria view (AC-6.4.3, 6.4.4) */
  scoreBreakdown: ScoreBreakdownData | null;
}

export interface UseRecommendationDetailsOptions {
  /** Whether to skip fetching (default: false) */
  skip?: boolean;
}

export interface UseRecommendationDetailsReturn {
  /** Combined data from both sources */
  data: RecommendationDetailsData;
  /** Whether any data is loading */
  isLoading: boolean;
  /** Combined error message (if any) */
  error: string | null;
  /** Fetch all data from server */
  fetch: () => Promise<void>;
  /** Reset all state */
  reset: () => void;
  /** Whether breakdown data is specifically loading */
  isBreakdownLoading: boolean;
  /** Whether score breakdown data is specifically loading */
  isScoreBreakdownLoading: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for fetching combined recommendation details
 *
 * Combines data from:
 * 1. `/api/recommendations/:id/breakdown` - Extended breakdown with allocation math, score ranking
 * 2. `/api/scores/:assetId/breakdown` - Full score criteria breakdown
 *
 * @param recommendationId - ID of the recommendation
 * @param itemId - ID of the recommendation item
 * @param assetId - ID of the asset (for score breakdown)
 * @param options - Configuration options
 * @returns Combined details state and functions
 *
 * @example
 * ```tsx
 * function RecommendationDetailsPanel({ recommendationId, itemId, assetId }) {
 *   const { data, isLoading, error, fetch } = useRecommendationDetails(
 *     recommendationId,
 *     itemId,
 *     assetId
 *   );
 *
 *   useEffect(() => {
 *     if (isOpen) fetch();
 *   }, [isOpen, fetch]);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage message={error} />;
 *
 *   return (
 *     <>
 *       <AllocationMath breakdown={data.breakdown} />
 *       <TopCriteria criteria={data.breakdown?.topCriteria} />
 *       <ExpandableScoreBreakdown breakdown={data.scoreBreakdown} />
 *     </>
 *   );
 * }
 * ```
 */
export function useRecommendationDetails(
  recommendationId: string,
  itemId: string,
  assetId: string,
  options: UseRecommendationDetailsOptions = {}
): UseRecommendationDetailsReturn {
  const { skip = false } = options;

  // Fetch breakdown from recommendations API
  const {
    data: breakdownData,
    isLoading: isBreakdownLoading,
    error: breakdownError,
    fetch: fetchBreakdown,
    reset: resetBreakdown,
  } = useBreakdown(recommendationId, itemId, { skip });

  // Fetch score breakdown from scores API
  // Initially disabled - enabled when panel opens
  const {
    breakdown: scoreBreakdown,
    isLoading: isScoreBreakdownLoading,
    error: scoreBreakdownError,
    refetch: refetchScoreBreakdown,
  } = useScoreBreakdown(skip ? null : assetId, { enabled: !skip });

  // Combined data
  const data = useMemo<RecommendationDetailsData>(
    () => ({
      breakdown: breakdownData as ExtendedBreakdown | null,
      scoreBreakdown,
    }),
    [breakdownData, scoreBreakdown]
  );

  // Combined loading state
  const isLoading = isBreakdownLoading || isScoreBreakdownLoading;

  // Combined error (prefer breakdown error if both exist)
  const error = useMemo(() => {
    if (breakdownError) return breakdownError;
    if (scoreBreakdownError) return scoreBreakdownError;
    return null;
  }, [breakdownError, scoreBreakdownError]);

  // Fetch both sources
  const fetch = useCallback(async (): Promise<void> => {
    if (skip) return;

    // Fetch both in parallel
    await Promise.all([fetchBreakdown(), refetchScoreBreakdown()]);
  }, [skip, fetchBreakdown, refetchScoreBreakdown]);

  // Reset all state
  const reset = useCallback((): void => {
    resetBreakdown();
    // Note: useScoreBreakdown doesn't have a reset function,
    // but setting assetId to null (via skip) will clear its state
  }, [resetBreakdown]);

  return {
    data,
    isLoading,
    error,
    fetch,
    reset,
    isBreakdownLoading,
    isScoreBreakdownLoading,
  };
}

/**
 * Clear all recommendation details caches
 *
 * Useful for testing or manual cache invalidation
 */
export { clearBreakdownCache, invalidateBreakdown } from "./use-breakdown";
