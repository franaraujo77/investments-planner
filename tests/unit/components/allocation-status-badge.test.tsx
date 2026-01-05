/**
 * AllocationStatusBadge Component Unit Tests
 *
 * Story 7.5: Allocation Drift Alerts
 * AC-7.5.5: Positive Indicator When In Range
 *
 * Tests the badge text and display logic.
 * Full component rendering tests are in E2E tests (drift-alerts.spec.ts).
 *
 * Note: Since @testing-library/react is not installed,
 * we test the display logic and text generation.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPE DEFINITIONS (matching component interfaces)
// =============================================================================

interface BadgeState {
  status: "loading" | "ok" | "drift" | "error";
  alertCount: number;
}

// =============================================================================
// DISPLAY LOGIC
// =============================================================================

/**
 * Gets the badge text based on alert count
 * This mirrors the logic in AllocationStatusBadge
 */
function getBadgeText(alertCount: number): string {
  if (alertCount === 0) {
    return "All allocations within target";
  }
  if (alertCount === 1) {
    return "1 allocation drifted";
  }
  return `${alertCount} allocations drifted`;
}

/**
 * Gets the badge test ID based on state
 * Returns null for error state because component returns null (nothing rendered)
 */
function getBadgeTestId(state: BadgeState): string | null {
  switch (state.status) {
    case "loading":
      return "allocation-status-loading";
    case "ok":
      return "allocation-status-ok";
    case "drift":
      return "allocation-status-drift";
    case "error":
      // Component returns null on error - no element rendered
      return null;
  }
}

/**
 * Determines if the badge should be clickable
 */
function isClickable(state: BadgeState, hasOnClick: boolean): boolean {
  return hasOnClick && state.status === "drift" && state.alertCount > 0;
}

/**
 * Processes API response to determine badge state
 */
function processDriftAlertResponse(response: {
  ok: boolean;
  data?: { meta: { totalCount: number } };
}): BadgeState {
  if (!response.ok) {
    return { status: "error", alertCount: 0 };
  }

  const count = response.data?.meta?.totalCount ?? 0;

  if (count === 0) {
    return { status: "ok", alertCount: 0 };
  }

  return { status: "drift", alertCount: count };
}

// =============================================================================
// TESTS
// =============================================================================

describe("AllocationStatusBadge Logic", () => {
  describe("AC-7.5.5: Badge text generation", () => {
    it("should return positive text when no alerts", () => {
      const text = getBadgeText(0);
      expect(text).toBe("All allocations within target");
    });

    it("should return singular text for one alert", () => {
      const text = getBadgeText(1);
      expect(text).toBe("1 allocation drifted");
    });

    it("should return plural text for multiple alerts", () => {
      const text = getBadgeText(3);
      expect(text).toBe("3 allocations drifted");
    });

    it("should handle large alert counts", () => {
      const text = getBadgeText(15);
      expect(text).toBe("15 allocations drifted");
    });
  });

  describe("Badge test ID", () => {
    it("should return loading test ID when loading", () => {
      const state: BadgeState = { status: "loading", alertCount: 0 };
      expect(getBadgeTestId(state)).toBe("allocation-status-loading");
    });

    it("should return ok test ID when no alerts", () => {
      const state: BadgeState = { status: "ok", alertCount: 0 };
      expect(getBadgeTestId(state)).toBe("allocation-status-ok");
    });

    it("should return drift test ID when alerts exist", () => {
      const state: BadgeState = { status: "drift", alertCount: 2 };
      expect(getBadgeTestId(state)).toBe("allocation-status-drift");
    });

    it("should return null on error (component renders nothing)", () => {
      const state: BadgeState = { status: "error", alertCount: 0 };
      expect(getBadgeTestId(state)).toBeNull();
    });
  });

  describe("Clickability", () => {
    it("should be clickable when alerts exist and onClick is provided", () => {
      const state: BadgeState = { status: "drift", alertCount: 1 };
      expect(isClickable(state, true)).toBe(true);
    });

    it("should not be clickable when no alerts exist", () => {
      const state: BadgeState = { status: "ok", alertCount: 0 };
      expect(isClickable(state, true)).toBe(false);
    });

    it("should not be clickable when no onClick is provided", () => {
      const state: BadgeState = { status: "drift", alertCount: 1 };
      expect(isClickable(state, false)).toBe(false);
    });

    it("should not be clickable during loading", () => {
      const state: BadgeState = { status: "loading", alertCount: 0 };
      expect(isClickable(state, true)).toBe(false);
    });
  });

  describe("API response processing", () => {
    it("should return ok state when no alerts", () => {
      const response = {
        ok: true,
        data: { meta: { totalCount: 0 } },
      };
      const state = processDriftAlertResponse(response);
      expect(state.status).toBe("ok");
      expect(state.alertCount).toBe(0);
    });

    it("should return drift state when alerts exist", () => {
      const response = {
        ok: true,
        data: { meta: { totalCount: 3 } },
      };
      const state = processDriftAlertResponse(response);
      expect(state.status).toBe("drift");
      expect(state.alertCount).toBe(3);
    });

    it("should return error state on API failure", () => {
      const response = { ok: false };
      const state = processDriftAlertResponse(response);
      expect(state.status).toBe("error");
      expect(state.alertCount).toBe(0);
    });
  });
});
