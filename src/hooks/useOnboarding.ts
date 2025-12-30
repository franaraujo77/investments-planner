"use client";

/**
 * Onboarding Hook
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Contextual Onboarding Tips Display
 * AC-3.5.3: Tip Dismissal Persistence
 *
 * Provides a hook for managing onboarding tips with:
 * - Fetching dismissed tips from API
 * - Optimistic updates for dismissals
 * - LocalStorage caching for faster initial render
 * - Page-filtered tip display
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ONBOARDING_TIPS,
  getTipsForPage,
  type OnboardingTip,
} from "@/lib/constants/onboarding-tips";

// =============================================================================
// CONSTANTS
// =============================================================================

const LOCALSTORAGE_KEY = "investments-planner-dismissed-tips";

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingAPIResponse {
  data: {
    tipsDismissed: string[];
    completedAt: string | null;
    totalTips: number;
  };
}

interface DismissTipAPIResponse {
  data: {
    success: boolean;
    tipId: string;
    tipsDismissed: string[];
  };
}

export interface UseOnboardingReturn {
  /** All onboarding tips (regardless of page) */
  allTips: OnboardingTip[];
  /** Tips for the current page only */
  tips: OnboardingTip[];
  /** Array of dismissed tip IDs */
  dismissedTips: string[];
  /** Whether the hook is loading initial data */
  isLoading: boolean;
  /** Dismiss a tip by ID */
  dismissTip: (tipId: string) => Promise<void>;
  /** Check if a specific tip should be shown */
  shouldShowTip: (tipId: string) => boolean;
  /** Reset all tips (clears dismissals) */
  resetAllTips: () => Promise<void>;
  /** Any error that occurred */
  error: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get dismissed tips from localStorage
 */
function getLocalDismissedTips(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Save dismissed tips to localStorage
 */
function setLocalDismissedTips(tips: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(tips));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear localStorage dismissed tips
 */
function clearLocalDismissedTips(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCALSTORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// useOnboarding HOOK
// =============================================================================

/**
 * Hook for managing onboarding tips
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.1: Returns tips filtered by page
 * AC-3.5.3: Persists dismissals to API and localStorage
 *
 * @param page - Current page path for filtering tips (e.g., "/portfolio/123")
 * @returns Onboarding state and actions
 *
 * @example
 * ```tsx
 * function PortfolioPage({ portfolioId }) {
 *   const { tips, dismissTip, shouldShowTip } = useOnboarding(
 *     `/portfolio/${portfolioId}`
 *   );
 *
 *   return (
 *     <div>
 *       {shouldShowTip("pie-chart-interaction") && (
 *         <OnboardingTip
 *           tip={tips.find(t => t.id === "pie-chart-interaction")!}
 *           onDismiss={() => dismissTip("pie-chart-interaction")}
 *         />
 *       )}
 *       <AllocationPieChart data={holdings} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnboarding(page: string): UseOnboardingReturn {
  // State
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => getLocalDismissedTips());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dismissed tips from API on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchDismissedTips() {
      try {
        const response = await fetch("/api/user/onboarding");

        if (!response.ok) {
          // Non-authenticated users - use localStorage only
          if (response.status === 401) {
            setIsLoading(false);
            return;
          }
          throw new Error("Failed to fetch onboarding status");
        }

        const result = (await response.json()) as OnboardingAPIResponse;

        if (isMounted) {
          const serverTips = result.data.tipsDismissed;
          setDismissedTips(serverTips);
          setLocalDismissedTips(serverTips);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch onboarding status");
          setIsLoading(false);
        }
      }
    }

    fetchDismissedTips();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get tips for current page
  const tips = useMemo(() => getTipsForPage(page), [page]);

  // Check if a tip should be shown
  const shouldShowTip = useCallback(
    (tipId: string): boolean => {
      return !dismissedTips.includes(tipId);
    },
    [dismissedTips]
  );

  // Dismiss a tip
  const dismissTip = useCallback(async (tipId: string): Promise<void> => {
    // Optimistic update
    setDismissedTips((prev) => {
      if (prev.includes(tipId)) return prev;
      const updated = [...prev, tipId];
      setLocalDismissedTips(updated);
      return updated;
    });

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipId }),
      });

      if (!response.ok) {
        // Non-authenticated users - localStorage update is sufficient
        if (response.status === 401) {
          return;
        }
        throw new Error("Failed to dismiss tip");
      }

      const result = (await response.json()) as DismissTipAPIResponse;

      // Sync with server state
      setDismissedTips(result.data.tipsDismissed);
      setLocalDismissedTips(result.data.tipsDismissed);
    } catch (err) {
      // Don't revert optimistic update - localStorage has the dismissal
      setError(err instanceof Error ? err.message : "Failed to dismiss tip");
    }
  }, []);

  // Reset all tips
  const resetAllTips = useCallback(async (): Promise<void> => {
    // Optimistic update
    setDismissedTips([]);
    clearLocalDismissedTips();

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("Failed to reset tips");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset tips");
    }
  }, []);

  return {
    allTips: ONBOARDING_TIPS,
    tips,
    dismissedTips,
    isLoading,
    dismissTip,
    shouldShowTip,
    resetAllTips,
    error,
  };
}
