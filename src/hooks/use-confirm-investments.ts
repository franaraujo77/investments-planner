"use client";

/**
 * useConfirmInvestments Hook
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.3: Confirm Records Investments
 * AC-7.8.4: Success Toast Notification
 *
 * Features:
 * - Manages confirmation modal state
 * - Handles API call to confirm investments
 * - Provides success/error state for toast notifications
 * - Refreshes recommendations after confirmation
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ConfirmInvestmentResult } from "@/lib/types/recommendations";

// =============================================================================
// TYPES
// =============================================================================

interface InvestmentInput {
  assetId: string;
  ticker: string;
  actualAmount: string;
  pricePerUnit: string;
}

interface APIResponse {
  data: ConfirmInvestmentResult;
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface UseConfirmInvestmentsOptions {
  /** Called after successful confirmation (for refetch) */
  onSuccess?: (result: ConfirmInvestmentResult) => void;
}

interface UseConfirmInvestmentsReturn {
  /** Whether confirmation is in progress */
  isConfirming: boolean;
  /** Error message (null if no error) */
  error: string | null;
  /** Last successful result */
  result: ConfirmInvestmentResult | null;
  /** Confirm investments */
  confirmInvestments: (
    recommendationId: string,
    investments: InvestmentInput[]
  ) => Promise<ConfirmInvestmentResult | null>;
  /** Reset error state */
  resetError: () => void;
}

// =============================================================================
// API FUNCTION
// =============================================================================

async function postConfirmInvestments(
  recommendationId: string,
  investments: InvestmentInput[]
): Promise<ConfirmInvestmentResult> {
  const response = await fetch("/api/investments/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      recommendationId,
      investments,
    }),
  });

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.error || "Failed to confirm investments");
  }

  const result: APIResponse = await response.json();
  return result.data;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for confirming investment recommendations
 *
 * @param options - Configuration options
 * @returns Confirmation state and functions
 *
 * @example
 * ```tsx
 * function ConfirmButton({ recommendationId, items }) {
 *   const {
 *     isConfirming,
 *     error,
 *     confirmInvestments,
 *   } = useConfirmInvestments({
 *     onSuccess: () => refetchRecommendations(),
 *   });
 *
 *   const handleConfirm = async (investments) => {
 *     await confirmInvestments(recommendationId, investments);
 *   };
 *
 *   return (
 *     <ConfirmationModal
 *       onConfirm={handleConfirm}
 *       isSubmitting={isConfirming}
 *       submitError={error}
 *     />
 *   );
 * }
 * ```
 */
export function useConfirmInvestments(
  options: UseConfirmInvestmentsOptions = {}
): UseConfirmInvestmentsReturn {
  const { onSuccess } = options;

  // State
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmInvestmentResult | null>(null);

  // Confirm investments
  const confirmInvestments = useCallback(
    async (
      recommendationId: string,
      investments: InvestmentInput[]
    ): Promise<ConfirmInvestmentResult | null> => {
      try {
        setIsConfirming(true);
        setError(null);

        const confirmResult = await postConfirmInvestments(recommendationId, investments);

        setResult(confirmResult);

        // AC-6.5.4: Success toast with "{Month} investments recorded" format
        // Use undefined locale to respect user's browser/system locale preference
        const monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date());
        const assetCount = confirmResult.summary.assetsUpdated;
        toast.success(`${monthName} investments recorded`, {
          description: `${assetCount} asset${assetCount !== 1 ? "s" : ""} updated.`,
        });

        // Call success callback (for refetch)
        onSuccess?.(confirmResult);

        return confirmResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to confirm investments";
        setError(message);

        // Error toast
        toast.error("Failed to confirm investments", {
          description: message,
        });

        return null;
      } finally {
        setIsConfirming(false);
      }
    },
    [onSuccess]
  );

  // Reset error
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConfirming,
    error,
    result,
    confirmInvestments,
    resetError,
  };
}

// Note: formatAmount helper removed - AC-6.5.4 changed toast format to not use currency
