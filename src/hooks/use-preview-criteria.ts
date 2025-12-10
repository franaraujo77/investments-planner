"use client";

/**
 * Preview Criteria Hook
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 * AC-5.7.3: Preview Updates Live as Criteria Modified
 *
 * Provides a hook for previewing criteria impact with:
 * - Loading state management
 * - Error handling
 * - 300ms debouncing for live updates
 * - Caching of previous result while loading
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { PreviewResult } from "@/lib/calculations/quick-calc";
import type { CriterionRule } from "@/lib/db/schema";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Debounce delay for live updates
 * AC-5.7.3: Prevents excessive recalculation
 */
const DEBOUNCE_DELAY_MS = 300;

// =============================================================================
// TYPES
// =============================================================================

interface PreviewResponse {
  data: PreviewResult;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface UsePreviewCriteriaReturn {
  /** Function to preview criteria */
  previewCriteria: (
    criteria: CriterionRule[],
    savedVersionId?: string
  ) => Promise<PreviewResult | null>;
  /** Whether currently loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Preview result */
  result: PreviewResult | null;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// usePreviewCriteria HOOK
// =============================================================================

/**
 * Hook for previewing criteria impact on asset scoring
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 * AC-5.7.3: Preview updates live with 300ms debounce
 *
 * Features:
 * - Debounced API calls to prevent excessive requests
 * - Caches previous result while loading new one
 * - Handles error states with toast notifications
 *
 * @returns Preview functions and state
 */
export function usePreviewCriteria(): UsePreviewCriteriaReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Abort controller for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Internal function to make the API call
   */
  const fetchPreview = useCallback(
    async (
      criteria: CriterionRule[],
      savedVersionId?: string,
      signal?: AbortSignal
    ): Promise<PreviewResult | null> => {
      try {
        const response = await fetch("/api/criteria/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            criteria,
            savedVersionId,
          }),
          signal: signal ?? null,
        });

        const responseData = (await response.json()) as PreviewResponse | APIError;

        if (!response.ok) {
          const errorResult = responseData as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Saved version not found");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Invalid criteria format");
          } else {
            toast.error("Failed to calculate preview");
          }

          return null;
        }

        const successResult = responseData as PreviewResponse;
        setError(null);
        setResult(successResult.data);
        return successResult.data;
      } catch (err) {
        // Don't report abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }

        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to calculate preview");
        return null;
      }
    },
    []
  );

  /**
   * Preview criteria with debouncing
   * Debounces by 300ms to prevent excessive API calls during live editing
   */
  const previewCriteria = useCallback(
    async (criteria: CriterionRule[], savedVersionId?: string): Promise<PreviewResult | null> => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Set loading immediately for responsive UI
      setIsLoading(true);

      return new Promise((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          // Create new abort controller for this request
          abortControllerRef.current = new AbortController();

          const previewResult = await fetchPreview(
            criteria,
            savedVersionId,
            abortControllerRef.current.signal
          );

          setIsLoading(false);
          resolve(previewResult);
        }, DEBOUNCE_DELAY_MS);
      });
    },
    [fetchPreview]
  );

  /**
   * Reset all state
   * Called when closing the preview modal
   */
  const reset = useCallback(() => {
    // Clear timers and abort requests
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setError(null);
    setResult(null);
    setIsLoading(false);
  }, []);

  return {
    previewCriteria,
    isLoading,
    error,
    result,
    reset,
  };
}
