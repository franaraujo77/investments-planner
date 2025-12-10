"use client";

/**
 * useAssetScore Hook
 *
 * Story 5.10: View Asset Score
 *
 * React hook for fetching asset scores from the API.
 * Uses standard fetch pattern (following existing hooks in the codebase).
 *
 * Features:
 * - Fetch score for a single asset
 * - Handle loading, success, and error states
 * - Handle null score (unscored asset) - returns reason
 * - Refetch capability
 * - Caches results in component state
 *
 * AC-5.10.1: Score data for badge display
 * AC-5.10.2: Criteria matched summary
 * AC-5.10.3: Unscored handling with reason
 * AC-5.10.4: Freshness timestamp
 */

import { useState, useCallback, useEffect } from "react";
import type { UnscoredReasonCode, UnscoredReason } from "@/components/fintech/unscored-indicator";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Criterion result from score breakdown
 */
export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  matched: boolean;
  pointsAwarded: number;
  actualValue: string | null;
  skippedReason: string | null;
}

/**
 * Score data returned from API
 */
export interface AssetScoreData {
  assetId: string;
  symbol: string;
  score: string; // Decimal string
  breakdown: CriterionResult[];
  criteriaVersionId: string;
  calculatedAt: Date;
  isFresh: boolean;
}

/**
 * Computed criteria summary for tooltip
 */
export interface CriteriaMatchedSummary {
  matched: number;
  total: number;
}

/**
 * API response types
 */
interface ScoreResponse {
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
  };
}

interface APIError {
  error: string;
  code: string;
}

// =============================================================================
// HOOK: useAssetScore
// =============================================================================

export interface UseAssetScoreOptions {
  /** Whether to fetch immediately on mount */
  enabled?: boolean;
}

export interface UseAssetScoreResult {
  /** Score data (null if unscored or loading) */
  score: AssetScoreData | null;
  /** Computed criteria summary for tooltip */
  criteriaMatched: CriteriaMatchedSummary | null;
  /** Reason if asset is unscored */
  unscoredReason: UnscoredReason | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to manually refetch */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single asset's score
 *
 * @param assetId - Asset ID to fetch score for
 * @param options - Hook options
 * @returns Score data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { score, criteriaMatched, isLoading, error } = useAssetScore(assetId);
 *
 * if (isLoading) return <Skeleton />;
 * if (!score) return <UnscoredIndicator reason={unscoredReason} />;
 * return <ScoreBadge score={score.score} criteriaMatched={criteriaMatched} />;
 * ```
 */
export function useAssetScore(
  assetId: string | null,
  options: UseAssetScoreOptions = {}
): UseAssetScoreResult {
  const { enabled = true } = options;

  const [score, setScore] = useState<AssetScoreData | null>(null);
  const [unscoredReason, setUnscoredReason] = useState<UnscoredReason | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!assetId) {
      setScore(null);
      setUnscoredReason(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setUnscoredReason(null);

    try {
      const response = await fetch(`/api/scores/${assetId}`);
      const result = (await response.json()) as ScoreResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;

        // Handle 404 - asset not scored
        if (response.status === 404 && errorResult.code === "NOT_FOUND") {
          setScore(null);
          setUnscoredReason({
            code: "NOT_CALCULATED" as UnscoredReasonCode,
            message: errorResult.error || "No score found for this asset",
            actionLabel: "Score will be calculated when criteria are configured",
          });
          return;
        }

        // Other errors
        setError(errorResult.error || "Failed to fetch score");
        return;
      }

      // Success - parse response
      const data = result as ScoreResponse;
      const scoreData: AssetScoreData = {
        assetId: data.data.assetId,
        symbol: data.data.symbol,
        score: data.data.score,
        breakdown: data.data.breakdown,
        criteriaVersionId: data.data.criteriaVersionId,
        calculatedAt: new Date(data.data.calculatedAt),
        isFresh: data.data.isFresh,
      };

      setScore(scoreData);
      setUnscoredReason(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch score";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  // Fetch on mount and when assetId changes
  useEffect(() => {
    if (enabled) {
      fetchScore();
    }
  }, [enabled, fetchScore]);

  // Compute criteria summary from breakdown
  const criteriaMatched: CriteriaMatchedSummary | null = score
    ? {
        matched: score.breakdown.filter((c) => c.matched).length,
        total: score.breakdown.length,
      }
    : null;

  return {
    score,
    criteriaMatched,
    unscoredReason,
    isLoading,
    error,
    refetch: fetchScore,
  };
}

// =============================================================================
// HOOK: useAssetScores (Batch)
// =============================================================================

export interface UseAssetScoresResult {
  /** Map of assetId -> score data */
  scores: Map<string, AssetScoreData>;
  /** Map of assetId -> unscored reason */
  unscoredReasons: Map<string, UnscoredReason>;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to manually refetch all */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching multiple assets' scores
 *
 * @param assetIds - Array of asset IDs to fetch scores for
 * @param options - Hook options
 * @returns Map of scores, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { scores, unscoredReasons, isLoading } = useAssetScores(assetIds);
 *
 * assets.map(asset => {
 *   const score = scores.get(asset.id);
 *   if (!score) return <UnscoredIndicator reason={unscoredReasons.get(asset.id)} />;
 *   return <ScoreBadge score={score.score} />;
 * });
 * ```
 */
export function useAssetScores(
  assetIds: string[],
  options: UseAssetScoreOptions = {}
): UseAssetScoresResult {
  const { enabled = true } = options;

  const [scores, setScores] = useState<Map<string, AssetScoreData>>(new Map());
  const [unscoredReasons, setUnscoredReasons] = useState<Map<string, UnscoredReason>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    if (!assetIds.length) {
      setScores(new Map());
      setUnscoredReasons(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all scores in parallel
      const results = await Promise.allSettled(
        assetIds.map(async (assetId) => {
          const response = await fetch(`/api/scores/${assetId}`);
          const result = (await response.json()) as ScoreResponse | APIError;

          if (!response.ok) {
            const errorResult = result as APIError;
            if (response.status === 404) {
              return {
                assetId,
                unscored: true,
                reason: {
                  code: "NOT_CALCULATED" as UnscoredReasonCode,
                  message: errorResult.error || "No score found for this asset",
                } as UnscoredReason,
              };
            }
            throw new Error(errorResult.error || "Failed to fetch score");
          }

          const data = result as ScoreResponse;
          return {
            assetId,
            unscored: false,
            score: {
              assetId: data.data.assetId,
              symbol: data.data.symbol,
              score: data.data.score,
              breakdown: data.data.breakdown,
              criteriaVersionId: data.data.criteriaVersionId,
              calculatedAt: new Date(data.data.calculatedAt),
              isFresh: data.data.isFresh,
            } as AssetScoreData,
          };
        })
      );

      // Process results
      const newScores = new Map<string, AssetScoreData>();
      const newUnscoredReasons = new Map<string, UnscoredReason>();

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const data = result.value;
          if (data.unscored && data.reason) {
            newUnscoredReasons.set(data.assetId, data.reason);
          } else if (data.score) {
            newScores.set(data.assetId, data.score);
          }
        }
      });

      setScores(newScores);
      setUnscoredReasons(newUnscoredReasons);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch scores";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assetIds]);

  // Fetch on mount and when assetIds change
  useEffect(() => {
    if (enabled) {
      fetchScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, JSON.stringify(assetIds)]);

  return {
    scores,
    unscoredReasons,
    isLoading,
    error,
    refetch: fetchScores,
  };
}
