"use client";

/**
 * Copy Criteria Hook
 *
 * Story 5.5: Copy Criteria Set
 * AC-5.5.4: Copy Confirmation
 *
 * Provides a hook for copying criteria sets with loading state and error handling.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CriteriaVersion } from "@/lib/db/schema";
import type { CopyCriteriaInput } from "@/lib/validations/criteria-schemas";

// =============================================================================
// TYPES
// =============================================================================

interface CopyResponse {
  data: {
    criteriaVersion: CriteriaVersion;
    copiedCount: number;
  };
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

export interface CopyCriteriaOptions extends CopyCriteriaInput {
  /** Custom name for the copied set */
  name?: string;
  /** Target market (defaults to source market) */
  targetMarket?: string;
}

// =============================================================================
// useCopyCriteria HOOK
// =============================================================================

/**
 * Hook for copying criteria sets
 *
 * Story 5.5: Copy Criteria Set
 * AC-5.5.4: Copy confirmation with success message
 *
 * Returns:
 * - copyCriteria: Function to copy a criteria set
 * - isCopying: Loading state
 * - error: Error message if any
 */
export function useCopyCriteria() {
  const router = useRouter();
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyCriteria = useCallback(
    async (
      sourceId: string,
      options: CopyCriteriaOptions = {}
    ): Promise<{ criteriaVersion: CriteriaVersion; copiedCount: number } | null> => {
      setIsCopying(true);
      setError(null);

      try {
        const response = await fetch(`/api/criteria/${sourceId}/copy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(options),
        });

        const result = (await response.json()) as CopyResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          if (errorResult.code === "NOT_FOUND") {
            toast.error("Source criteria set not found");
          } else if (errorResult.code === "LIMIT_EXCEEDED") {
            toast.error("Maximum criteria sets reached");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to copy criteria set");
          }

          return null;
        }

        const successResult = result as CopyResponse;
        const { criteriaVersion, copiedCount } = successResult.data;

        // AC-5.5.4: Success confirmation showing criteria count and target market
        toast.success(`Copied ${copiedCount} criteria to ${criteriaVersion.targetMarket}`);

        router.refresh();

        return successResult.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to copy criteria set");
        return null;
      } finally {
        setIsCopying(false);
      }
    },
    [router]
  );

  return {
    copyCriteria,
    isCopying,
    error,
  };
}
