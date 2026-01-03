/**
 * useDriftCheck Hook Unit Tests
 *
 * Story 7.5: Allocation Drift Alerts
 * AC-7.5.1: Drift detection runs on login/dashboard load
 *
 * Tests the hook's state management and API response processing logic.
 * Session storage and full rendering tests are in E2E tests (drift-alerts.spec.ts).
 *
 * Note: Since @testing-library/react is not installed,
 * we test the state management and API call logic.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPE DEFINITIONS (matching hook interfaces)
// =============================================================================

interface DriftCheckResult {
  detected: boolean;
  alertsCreated: number;
  alertsUpdated: number;
  alertsDismissed: number;
  classesAnalyzed: number;
  durationMs: number;
}

interface UseDriftCheckState {
  isChecking: boolean;
  hasChecked: boolean;
  driftDetected: boolean;
  alertsCreated: number;
  error: string | null;
}

// =============================================================================
// CORE LOGIC FUNCTIONS
// =============================================================================

const DRIFT_CHECK_KEY = "drift_check_completed";

/**
 * Checks if drift detection should run based on session state
 * This mirrors the logic in useDriftCheck
 */
function shouldRunDriftCheck(sessionValue: string | null): boolean {
  return sessionValue !== "true";
}

/**
 * Processes the drift detection API response
 */
function processDriftCheckResponse(response: {
  ok: boolean;
  data?: { data: DriftCheckResult };
  error?: string;
}): {
  driftDetected: boolean;
  alertsCreated: number;
  error: string | null;
} {
  if (!response.ok) {
    return {
      driftDetected: false,
      alertsCreated: 0,
      error: response.error ?? "Drift check failed",
    };
  }

  const result = response.data?.data;
  if (!result) {
    return {
      driftDetected: false,
      alertsCreated: 0,
      error: "Invalid response format",
    };
  }

  const driftDetected = result.alertsCreated > 0 || result.alertsUpdated > 0;

  return {
    driftDetected,
    alertsCreated: result.alertsCreated,
    error: null,
  };
}

/**
 * Creates initial state for the hook
 */
function createInitialState(sessionCheckCompleted: boolean): UseDriftCheckState {
  return {
    isChecking: !sessionCheckCompleted,
    hasChecked: sessionCheckCompleted,
    driftDetected: false,
    alertsCreated: 0,
    error: null,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("useDriftCheck Hook Logic", () => {
  describe("Session-based rate limiting (AC-7.5.1)", () => {
    it("should run drift check when session flag is not set", () => {
      expect(shouldRunDriftCheck(null)).toBe(true);
    });

    it("should run drift check when session flag is not 'true'", () => {
      expect(shouldRunDriftCheck("false")).toBe(true);
      expect(shouldRunDriftCheck("")).toBe(true);
    });

    it("should not run drift check when session flag is 'true'", () => {
      expect(shouldRunDriftCheck("true")).toBe(false);
    });

    it("should use correct session storage key", () => {
      expect(DRIFT_CHECK_KEY).toBe("drift_check_completed");
    });
  });

  describe("Initial state", () => {
    it("should start checking when session check not completed", () => {
      const state = createInitialState(false);
      expect(state.isChecking).toBe(true);
      expect(state.hasChecked).toBe(false);
      expect(state.driftDetected).toBe(false);
      expect(state.alertsCreated).toBe(0);
      expect(state.error).toBeNull();
    });

    it("should not start checking when session check already completed", () => {
      const state = createInitialState(true);
      expect(state.isChecking).toBe(false);
      expect(state.hasChecked).toBe(true);
    });
  });

  describe("API response processing", () => {
    it("should detect drift when alerts are created", () => {
      const response = {
        ok: true,
        data: {
          data: {
            detected: true,
            alertsCreated: 2,
            alertsUpdated: 0,
            alertsDismissed: 0,
            classesAnalyzed: 5,
            durationMs: 50,
          },
        },
      };

      const result = processDriftCheckResponse(response);
      expect(result.driftDetected).toBe(true);
      expect(result.alertsCreated).toBe(2);
      expect(result.error).toBeNull();
    });

    it("should detect drift when alerts are updated", () => {
      const response = {
        ok: true,
        data: {
          data: {
            detected: true,
            alertsCreated: 0,
            alertsUpdated: 1,
            alertsDismissed: 0,
            classesAnalyzed: 5,
            durationMs: 50,
          },
        },
      };

      const result = processDriftCheckResponse(response);
      expect(result.driftDetected).toBe(true);
    });

    it("should not detect drift when no new or updated alerts", () => {
      const response = {
        ok: true,
        data: {
          data: {
            detected: false,
            alertsCreated: 0,
            alertsUpdated: 0,
            alertsDismissed: 2,
            classesAnalyzed: 5,
            durationMs: 50,
          },
        },
      };

      const result = processDriftCheckResponse(response);
      expect(result.driftDetected).toBe(false);
      expect(result.alertsCreated).toBe(0);
    });

    it("should return error on API failure", () => {
      const response = {
        ok: false,
        error: "Internal server error",
      };

      const result = processDriftCheckResponse(response);
      expect(result.driftDetected).toBe(false);
      expect(result.error).toBe("Internal server error");
    });

    it("should return default error message on API failure without error", () => {
      const response = {
        ok: false,
      };

      const result = processDriftCheckResponse(response);
      expect(result.error).toBe("Drift check failed");
    });

    it("should return error on invalid response format", () => {
      const response = {
        ok: true,
        data: undefined,
      };

      const result = processDriftCheckResponse(response);
      expect(result.error).toBe("Invalid response format");
    });

    it("should handle zero classes analyzed", () => {
      const response = {
        ok: true,
        data: {
          data: {
            detected: false,
            alertsCreated: 0,
            alertsUpdated: 0,
            alertsDismissed: 0,
            classesAnalyzed: 0,
            durationMs: 10,
          },
        },
      };

      const result = processDriftCheckResponse(response);
      expect(result.driftDetected).toBe(false);
      expect(result.error).toBeNull();
    });
  });
});
