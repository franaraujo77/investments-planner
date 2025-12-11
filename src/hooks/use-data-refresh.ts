"use client";

/**
 * Data Refresh Hook
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Refresh Button Available on Dashboard and Portfolio
 * AC-6.6.2: Loading Spinner Shown During Refresh
 * AC-6.6.3: Success Toast with Timestamp
 * AC-6.6.5: Rate Limit Exceeded Shows Countdown
 *
 * Provides a hook for force refreshing market data with:
 * - Loading state management
 * - Error handling with toast notifications
 * - Rate limit status tracking
 * - Cache invalidation
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  RefreshType,
  RefreshSuccessResponse,
  RateLimitErrorResponse,
} from "@/lib/validations/refresh-schemas";

// =============================================================================
// TYPES
// =============================================================================

interface RefreshResponse {
  refreshedAt: Date;
  remaining: number;
  resetAt: Date;
  refreshedTypes: RefreshType[];
  providers: {
    prices?: string | undefined;
    rates?: string | undefined;
    fundamentals?: string | undefined;
  };
}

interface RateLimitStatus {
  /** Number of refreshes remaining in the current window */
  remaining: number;
  /** When the rate limit resets */
  resetAt: Date | null;
  /** Whether the user is currently rate limited */
  isLimited: boolean;
  /** Countdown in minutes until rate limit resets */
  countdownMinutes: number | null;
}

interface APIError {
  error: string;
  code: string;
  details?: {
    remaining?: number;
    resetAt?: string;
    retryAfter?: number;
  };
}

export interface UseDataRefreshOptions {
  /** Type of data to refresh */
  type?: RefreshType | undefined;
  /** Specific symbols to refresh */
  symbols?: string[] | undefined;
  /** Whether to refresh on mount */
  refreshOnMount?: boolean | undefined;
}

export interface UseDataRefreshReturn {
  /** Trigger a data refresh */
  refresh: () => Promise<RefreshResponse | null>;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Last refresh timestamp */
  lastRefreshedAt: Date | null;
  /** Rate limit status */
  rateLimitStatus: RateLimitStatus;
  /** Error message if any */
  error: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate countdown minutes from resetAt
 */
function calculateCountdownMinutes(resetAt: Date): number {
  const now = new Date();
  const diffMs = resetAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (60 * 1000)));
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// useDataRefresh HOOK
// =============================================================================

/**
 * Hook for force refreshing market data
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Provides refresh functionality
 * AC-6.6.2: Tracks loading state
 * AC-6.6.3: Shows success toast with timestamp
 * AC-6.6.5: Tracks and displays rate limit status
 *
 * @param options - Configuration options
 * @returns Refresh function, loading state, and rate limit status
 *
 * @example
 * ```tsx
 * function RefreshButton() {
 *   const { refresh, isRefreshing, rateLimitStatus } = useDataRefresh({
 *     type: 'all',
 *     symbols: ['PETR4', 'VALE3'],
 *   });
 *
 *   return (
 *     <button onClick={refresh} disabled={isRefreshing || rateLimitStatus.isLimited}>
 *       {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
 *       {rateLimitStatus.isLimited && ` (${rateLimitStatus.countdownMinutes}m)`}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDataRefresh(options: UseDataRefreshOptions = {}): UseDataRefreshReturn {
  const { type = "all", symbols } = options;
  const router = useRouter();

  // State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    remaining: 5,
    resetAt: null,
    isLimited: false,
    countdownMinutes: null,
  });

  // Update countdown every minute when rate limited
  useEffect(() => {
    if (!rateLimitStatus.isLimited || !rateLimitStatus.resetAt) {
      return;
    }

    const updateCountdown = () => {
      const countdown = calculateCountdownMinutes(rateLimitStatus.resetAt!);

      if (countdown <= 0) {
        // Rate limit has reset
        setRateLimitStatus((prev) => ({
          ...prev,
          isLimited: false,
          countdownMinutes: null,
          remaining: 5,
        }));
      } else {
        setRateLimitStatus((prev) => ({
          ...prev,
          countdownMinutes: countdown,
        }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60 * 1000); // Update every minute

    return () => clearInterval(interval);
  }, [rateLimitStatus.isLimited, rateLimitStatus.resetAt]);

  // Refresh function
  const refresh = useCallback(async (): Promise<RefreshResponse | null> => {
    // Don't allow refresh if rate limited
    if (rateLimitStatus.isLimited) {
      toast.error(`Rate limited. Try again in ${rateLimitStatus.countdownMinutes} minutes.`);
      return null;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/data/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, symbols }),
      });

      const result = (await response.json()) as
        | RefreshSuccessResponse
        | RateLimitErrorResponse
        | APIError;

      // Handle rate limit response (429)
      if (response.status === 429) {
        const rateLimitResult = result as RateLimitErrorResponse;
        const resetAt = new Date(rateLimitResult.details.resetAt);
        const countdown = calculateCountdownMinutes(resetAt);

        setRateLimitStatus({
          remaining: 0,
          resetAt,
          isLimited: true,
          countdownMinutes: countdown,
        });

        // AC-6.6.5: Show countdown in error message
        toast.error(`Refresh limit exceeded. Try again in ${countdown} minutes.`);
        return null;
      }

      // Handle other errors
      if (!response.ok) {
        const errorResult = result as APIError;
        setError(errorResult.error);
        toast.error(errorResult.error || "Failed to refresh data");
        return null;
      }

      // Handle success
      const successResult = result as RefreshSuccessResponse;
      const refreshedAt = new Date(successResult.data.refreshedAt);
      const resetAt = new Date(successResult.data.nextRefreshAvailable);

      setLastRefreshedAt(refreshedAt);
      setRateLimitStatus({
        remaining: successResult.data.remaining,
        resetAt,
        isLimited: false,
        countdownMinutes: null,
      });

      // AC-6.6.3: Success toast with timestamp
      toast.success(`Data refreshed as of ${formatTimestamp(refreshedAt)}`);

      // Refresh the page to show updated data
      router.refresh();

      return {
        refreshedAt,
        remaining: successResult.data.remaining,
        resetAt,
        refreshedTypes: successResult.data.refreshedTypes,
        providers: successResult.data.providers,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Failed to refresh data. Please try again.");
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [type, symbols, rateLimitStatus.isLimited, rateLimitStatus.countdownMinutes, router]);

  return {
    refresh,
    isRefreshing,
    lastRefreshedAt,
    rateLimitStatus,
    error,
  };
}
