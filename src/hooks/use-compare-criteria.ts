"use client";

/**
 * Compare Criteria Hook
 *
 * Story 5.6: Compare Criteria Sets
 * AC-5.6.1: Select Two Criteria Sets for Comparison
 *
 * Provides a hook for comparing criteria sets with loading state and error handling.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ComparisonResult } from "@/lib/services/criteria-comparison-service";

// =============================================================================
// TYPES
// =============================================================================

interface CompareResponse {
  data: ComparisonResult;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// useCompareCriteria HOOK
// =============================================================================

/**
 * Hook for comparing two criteria sets
 *
 * Story 5.6: Compare Criteria Sets
 * AC-5.6.1: Selection and comparison of criteria sets
 *
 * Returns:
 * - compareCriteria: Function to compare two criteria sets
 * - isComparing: Loading state
 * - error: Error message if any
 * - result: Comparison result when successful
 * - reset: Function to clear result and error
 */
export function useCompareCriteria() {
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const compareCriteria = useCallback(
    async (setAId: string, setBId: string): Promise<ComparisonResult | null> => {
      setIsComparing(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/criteria/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ setAId, setBId }),
        });

        const responseData = (await response.json()) as CompareResponse | APIError;

        if (!response.ok) {
          const errorResult = responseData as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Criteria set not found");
          } else if (errorResult.code === "SAME_SET_ERROR") {
            toast.error("Cannot compare a criteria set with itself");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your selection and try again");
          } else {
            toast.error("Failed to compare criteria sets");
          }

          return null;
        }

        const successResult = responseData as CompareResponse;
        setResult(successResult.data);

        // Success notification with summary
        const { setA, setB, differences, rankingChanges } = successResult.data;
        const modifiedCount = differences.filter((d) => d.differenceType !== "identical").length;
        toast.success(
          `Compared "${setA.name}" vs "${setB.name}": ${modifiedCount} difference${modifiedCount !== 1 ? "s" : ""}, ${rankingChanges.length} ranking change${rankingChanges.length !== 1 ? "s" : ""}`
        );

        return successResult.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to compare criteria sets");
        return null;
      } finally {
        setIsComparing(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    compareCriteria,
    isComparing,
    error,
    result,
    reset,
  };
}
