"use client";

/**
 * useDriftCheck Hook
 *
 * Story 7.5: Allocation Drift Alerts
 * AC-7.5.1: Drift detection runs on login/dashboard load
 *
 * Triggers drift detection once per browser session on dashboard load.
 * Uses sessionStorage to prevent repeated API calls during the same session.
 *
 * Features:
 * - Runs automatically on mount (once per session)
 * - Rate-limited via sessionStorage key
 * - Non-blocking - doesn't affect dashboard load time
 * - Returns detection status for optional UI feedback
 */

import { useState, useEffect, useCallback, useRef } from "react";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Session storage key for tracking drift check */
const DRIFT_CHECK_KEY = "drift_check_completed";

// =============================================================================
// TYPES
// =============================================================================

interface DriftCheckResult {
  detected: boolean;
  alertsCreated: number;
  alertsUpdated: number;
  alertsDismissed: number;
  classesAnalyzed: number;
  durationMs: number;
}

interface UseDriftCheckReturn {
  /** Whether drift check is in progress */
  isChecking: boolean;
  /** Whether drift check has completed this session */
  hasChecked: boolean;
  /** Whether new/updated drift alerts were detected */
  driftDetected: boolean;
  /** Number of new alerts created */
  alertsCreated: number;
  /** Error message (if any) */
  error: string | null;
  /** Manually trigger drift check (bypasses session check) */
  forceCheck: () => Promise<void>;
}

// =============================================================================
// API FUNCTION
// =============================================================================

async function triggerDriftDetection(): Promise<DriftCheckResult> {
  const response = await fetch("/api/alerts/detect-drift", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to check for drift alerts");
  }

  const result = await response.json();
  return result.data;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for triggering drift detection on dashboard load
 *
 * Automatically runs once per browser session to ensure drift alerts
 * are up-to-date without waiting for the overnight job.
 *
 * @returns Drift check state and manual trigger function
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const { driftDetected, alertsCreated, isChecking } = useDriftCheck();
 *
 *   // Optionally show feedback when new alerts detected
 *   useEffect(() => {
 *     if (driftDetected && alertsCreated > 0) {
 *       toast.info(`${alertsCreated} allocation drift alert(s) detected`);
 *     }
 *   }, [driftDetected, alertsCreated]);
 *
 *   return <Dashboard />;
 * }
 * ```
 */
export function useDriftCheck(): UseDriftCheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [driftDetected, setDriftDetected] = useState(false);
  const [alertsCreated, setAlertsCreated] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  /**
   * Check if drift detection has already run this session
   */
  const hasCompletedThisSession = useCallback((): boolean => {
    if (typeof window === "undefined") return true; // SSR safety
    return sessionStorage.getItem(DRIFT_CHECK_KEY) === "true";
  }, []);

  /**
   * Mark drift check as completed for this session
   */
  const markCompleted = useCallback((): void => {
    if (typeof window === "undefined") return; // SSR safety
    sessionStorage.setItem(DRIFT_CHECK_KEY, "true");
  }, []);

  /**
   * Perform drift detection with mounted check to prevent stale state updates
   */
  const performCheck = useCallback(async (): Promise<void> => {
    setIsChecking(true);
    setError(null);

    try {
      const result = await triggerDriftDetection();
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setDriftDetected(result.detected);
        setAlertsCreated(result.alertsCreated);
        setHasChecked(true);
        markCompleted();
      }
    } catch (err) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : "Drift check failed";
        setError(message);
        // Still mark as checked to prevent retry loops
        setHasChecked(true);
        markCompleted();
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [markCompleted]);

  /**
   * Force drift check (bypasses session storage)
   */
  const forceCheck = useCallback(async (): Promise<void> => {
    await performCheck();
  }, [performCheck]);

  // Run drift check on mount (once per session)
  useEffect(() => {
    // Reset mounted flag on mount
    isMountedRef.current = true;

    // Skip if already checked this session
    if (hasCompletedThisSession()) {
      setHasChecked(true);
      return;
    }

    // Run drift detection asynchronously (non-blocking)
    performCheck();

    // Cleanup: mark as unmounted to prevent stale state updates
    return () => {
      isMountedRef.current = false;
    };
  }, [hasCompletedThisSession, performCheck]);

  return {
    isChecking,
    hasChecked,
    driftDetected,
    alertsCreated,
    error,
    forceCheck,
  };
}
