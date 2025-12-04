"use client";

/**
 * Investment React Hooks
 *
 * Story 3.8: Record Investment Amount
 *
 * Provides hooks for investment operations:
 * - useRecordInvestments: Record new investments
 * - useInvestmentHistory: Fetch investment history
 *
 * AC-3.8.4: Portfolio cache invalidation after recording
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Investment } from "@/lib/db/schema";
import type { InvestmentItemInput } from "@/lib/validations/portfolio";

// =============================================================================
// TYPES
// =============================================================================

interface RecordInvestmentsResponse {
  data: Investment[];
  meta: {
    count: number;
    totalAmount: string;
  };
}

interface InvestmentHistoryResponse {
  data: Investment[];
  meta: {
    count: number;
    from?: string;
    to?: string;
  };
}

interface APIError {
  error: string;
  code: string;
  details?: unknown;
}

interface GetInvestmentsOptions {
  from?: Date;
  to?: Date;
  portfolioId?: string;
  assetId?: string;
}

// =============================================================================
// useRecordInvestments HOOK
// =============================================================================

/**
 * Hook for recording investments
 *
 * Story 3.8: Record Investment Amount
 * AC-3.8.1: Investment record creation
 * AC-3.8.2: Portfolio holdings update
 * AC-3.8.3: Success toast with dynamic month
 * AC-3.8.4: Portfolio cache invalidation
 */
export function useRecordInvestments() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordInvestments = useCallback(
    async (investments: InvestmentItemInput[]): Promise<Investment[] | null> => {
      setIsRecording(true);
      setError(null);

      try {
        const response = await fetch("/api/investments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ investments }),
        });

        const result = (await response.json()) as RecordInvestmentsResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);

          // Handle specific error codes
          if (errorResult.code === "ASSET_NOT_FOUND") {
            toast.error("Asset not found or you don't have access");
          } else if (errorResult.code === "PORTFOLIO_NOT_FOUND") {
            toast.error("Portfolio not found or you don't have access");
          } else if (errorResult.code === "VALIDATION_ERROR") {
            toast.error("Please check your input and try again");
          } else {
            toast.error("Failed to record investment");
          }

          return null;
        }

        // Success - show toast with dynamic month name
        // AC-3.8.3: "[Month] investment recorded"
        const monthName = new Date().toLocaleDateString("en-US", {
          month: "long",
        });
        toast.success(`${monthName} investment recorded`);

        // Trigger refresh for portfolio data
        // AC-3.8.4: Portfolio cache invalidation
        router.refresh();

        return (result as RecordInvestmentsResponse).data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to record investment");
        return null;
      } finally {
        setIsRecording(false);
      }
    },
    [router]
  );

  return {
    recordInvestments,
    isRecording,
    error,
  };
}

// =============================================================================
// useInvestmentHistory HOOK
// =============================================================================

/**
 * Hook for fetching investment history
 *
 * Story 3.8: Record Investment Amount
 * Supports filtering by date range, portfolio, and asset
 */
export function useInvestmentHistory() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (options: GetInvestmentsOptions = {}): Promise<Investment[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        if (options.from) {
          params.set("from", options.from.toISOString());
        }
        if (options.to) {
          params.set("to", options.to.toISOString());
        }
        if (options.portfolioId) {
          params.set("portfolioId", options.portfolioId);
        }
        if (options.assetId) {
          params.set("assetId", options.assetId);
        }

        const url = `/api/investments${params.toString() ? `?${params.toString()}` : ""}`;

        const response = await fetch(url);
        const result = (await response.json()) as InvestmentHistoryResponse | APIError;

        if (!response.ok) {
          const errorResult = result as APIError;
          setError(errorResult.error);
          return [];
        }

        const successResult = result as InvestmentHistoryResponse;
        setInvestments(successResult.data);
        return successResult.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch investments";
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    investments,
    isLoading,
    error,
    fetchHistory,
    refresh,
  };
}
