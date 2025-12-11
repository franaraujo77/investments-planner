"use client";

/**
 * useCalculationBreakdown Hook
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.1: View All Input Values Used
 * AC-6.9.2: View Each Criterion Evaluation Result
 *
 * React hook for fetching the full calculation breakdown from the
 * /api/scores/[assetId]/inputs endpoint.
 *
 * Features:
 * - Fetch complete calculation breakdown including evaluations
 * - Handle loading, success, and error states
 * - Provides criteria version info
 * - Provides correlation ID for replay
 * - Caches results in component state
 *
 * @module @/hooks/use-calculation-breakdown
 */

import { useState, useCallback, useEffect } from "react";
import type {
  CriterionEvaluation,
  CriteriaVersionInfo,
  CriterionOperator,
  CriterionThreshold,
} from "@/lib/types/calculation-breakdown";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Price input from API response
 */
interface PriceInput {
  value: string;
  currency: string;
  source: string;
  fetchedAt: string;
}

/**
 * Exchange rate input from API response
 */
interface ExchangeRateInput {
  from: string;
  to: string;
  value: string;
  source: string;
  fetchedAt: string;
}

/**
 * Fundamentals input from API response
 */
interface FundamentalsInput {
  source: string;
  fetchedAt: string;
  metrics: Record<string, string | null>;
}

/**
 * Criteria version info from API response
 */
interface CriteriaVersionResponse {
  id: string;
  version: number;
  name: string;
  createdAt: string;
}

/**
 * Criterion evaluation from API response
 */
interface CriterionEvaluationResponse {
  criterionId: string;
  name: string;
  description?: string;
  category?: string;
  operator: CriterionOperator;
  threshold: CriterionThreshold;
  actualValue: string | null;
  passed: boolean;
  pointsAwarded: number;
  maxPoints: number;
  skippedReason: string | null;
}

/**
 * Full calculation breakdown data
 */
export interface CalculationBreakdownData {
  assetId: string;
  symbol: string;
  calculatedAt: Date;
  correlationId: string | null;
  inputs: {
    price: PriceInput | null;
    exchangeRate: ExchangeRateInput | null;
    fundamentals: FundamentalsInput | null;
    criteriaVersion: string;
  };
  criteriaVersionInfo: CriteriaVersionInfo | null;
  evaluations: CriterionEvaluation[];
  score: {
    final: string;
    maxPossible: string;
    percentage: string;
  };
}

/**
 * API response format
 */
interface APIResponse {
  data: {
    assetId: string;
    symbol: string;
    calculatedAt: string;
    correlationId: string | null;
    inputs: {
      price: PriceInput | null;
      exchangeRate: ExchangeRateInput | null;
      fundamentals: FundamentalsInput | null;
      criteriaVersion: string;
    };
    criteriaVersionInfo: CriteriaVersionResponse | null;
    evaluations: CriterionEvaluationResponse[];
    score: {
      final: string;
      maxPossible: string;
      percentage: string;
    };
  };
}

interface APIError {
  error: string;
  code: string;
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseCalculationBreakdownOptions {
  /** Whether to fetch immediately on mount (default: true) */
  enabled?: boolean;
}

export interface UseCalculationBreakdownResult {
  /** Full calculation breakdown data */
  data: CalculationBreakdownData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to manually refetch */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching the full calculation breakdown for an asset
 *
 * AC-6.9.1: View all input values used
 * AC-6.9.2: View each criterion evaluation result
 *
 * @param assetId - Asset ID to fetch breakdown for
 * @param options - Hook options
 * @returns Breakdown data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useCalculationBreakdown(assetId);
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error} />;
 *
 * return (
 *   <div>
 *     <h2>Score: {data.score.final}</h2>
 *     <p>Calculated: {data.calculatedAt.toLocaleString()}</p>
 *     <p>Criteria Version: {data.criteriaVersionInfo?.name}</p>
 *     {data.evaluations.map(e => (
 *       <div key={e.criterionId}>
 *         {e.name}: {e.passed ? 'Pass' : 'Fail'}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useCalculationBreakdown(
  assetId: string | null,
  options: UseCalculationBreakdownOptions = {}
): UseCalculationBreakdownResult {
  const { enabled = true } = options;

  const [data, setData] = useState<CalculationBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBreakdown = useCallback(async () => {
    if (!assetId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scores/${assetId}/inputs`);
      const result = (await response.json()) as APIResponse | APIError;

      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error || "Failed to fetch calculation breakdown");
        return;
      }

      // Transform API response to hook data format
      const apiData = (result as APIResponse).data;

      const breakdownData: CalculationBreakdownData = {
        assetId: apiData.assetId,
        symbol: apiData.symbol,
        calculatedAt: new Date(apiData.calculatedAt),
        correlationId: apiData.correlationId,
        inputs: apiData.inputs,
        criteriaVersionInfo: apiData.criteriaVersionInfo
          ? {
              id: apiData.criteriaVersionInfo.id,
              version: String(apiData.criteriaVersionInfo.version),
              createdAt: new Date(apiData.criteriaVersionInfo.createdAt),
              name: apiData.criteriaVersionInfo.name,
            }
          : null,
        evaluations: apiData.evaluations.map((e) => ({
          criterionId: e.criterionId,
          name: e.name,
          ...(e.description ? { description: e.description } : {}),
          ...(e.category ? { category: e.category } : {}),
          operator: e.operator,
          threshold: e.threshold,
          actualValue: e.actualValue,
          passed: e.passed,
          pointsAwarded: e.pointsAwarded,
          maxPoints: e.maxPoints,
          skippedReason: e.skippedReason,
        })) as CriterionEvaluation[],
        score: apiData.score,
      };

      setData(breakdownData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch breakdown";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  // Fetch on mount and when assetId changes
  useEffect(() => {
    if (enabled) {
      fetchBreakdown();
    }
  }, [enabled, fetchBreakdown]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBreakdown,
  };
}
