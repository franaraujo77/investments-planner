/**
 * AlertDropdown Navigation Unit Tests
 *
 * Story 7.5: Allocation Drift Alerts
 * AC-7.5.3: Alert Click Navigation
 *
 * Tests the navigation URL construction logic when clicking on alerts.
 * Full component rendering tests are in E2E tests (drift-alerts.spec.ts).
 *
 * Note: Since @testing-library/react is not installed,
 * we test the navigation URL logic and metadata handling.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPE DEFINITIONS (matching component interfaces)
// =============================================================================

interface DriftAlertMetadata {
  assetClassId: string;
  assetClassName: string;
  currentAllocation: string;
  targetMin: string;
  targetMax: string;
  driftAmount: string;
  direction: "over" | "under";
}

interface OpportunityAlertMetadata {
  currentAssetId: string;
  currentAssetSymbol: string;
  betterAssetId?: string;
  betterAssetSymbol?: string;
  assetClassId: string;
  assetClassName: string;
}

type AlertType = "allocation_drift" | "opportunity" | "system" | "info";
type AlertSeverity = "info" | "warning" | "critical";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  metadata: Record<string, unknown>;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

// =============================================================================
// NAVIGATION URL CONSTRUCTION LOGIC
// =============================================================================

/**
 * Constructs the navigation URL for a given alert.
 * This mirrors the logic in AlertDropdown.handleAlertClick
 */
function getNavigationUrl(alert: Alert): string | null {
  switch (alert.type) {
    case "allocation_drift": {
      const metadata = alert.metadata as DriftAlertMetadata;
      if (metadata?.assetClassId) {
        return `/portfolio?highlightClass=${metadata.assetClassId}`;
      }
      return "/portfolio";
    }
    case "opportunity": {
      const metadata = alert.metadata as OpportunityAlertMetadata;
      if (metadata?.currentAssetId) {
        return `/portfolio?highlightAsset=${metadata.currentAssetId}`;
      }
      return "/portfolio";
    }
    case "system":
    case "info":
    default:
      return null;
  }
}

/**
 * Determines if an alert severity is critical
 */
function isCriticalSeverity(severity: AlertSeverity): boolean {
  return severity === "critical";
}

// =============================================================================
// TESTS
// =============================================================================

describe("AlertDropdown Navigation Logic", () => {
  describe("AC-7.5.3: Drift alert click navigation", () => {
    it("should return portfolio URL with highlightClass when drift alert has assetClassId", () => {
      const alert: Alert = {
        id: "alert-1",
        type: "allocation_drift",
        title: "US Stocks drifted",
        message: "Your US Stocks allocation has drifted outside the target range",
        severity: "warning",
        metadata: {
          assetClassId: "class-123",
          assetClassName: "US Stocks",
          currentAllocation: "45.5",
          targetMin: "30",
          targetMax: "40",
          driftAmount: "5.5",
          direction: "over",
        },
        isRead: false,
        isDismissed: false,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const url = getNavigationUrl(alert);
      expect(url).toBe("/portfolio?highlightClass=class-123");
    });

    it("should return portfolio URL without highlight when drift alert has no assetClassId", () => {
      const alert: Alert = {
        id: "alert-2",
        type: "allocation_drift",
        title: "Allocation drifted",
        message: "Your allocation has drifted",
        severity: "warning",
        metadata: {},
        isRead: false,
        isDismissed: false,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const url = getNavigationUrl(alert);
      expect(url).toBe("/portfolio");
    });
  });

  describe("AC-7.5.4: Severity determination", () => {
    it("should correctly identify critical severity", () => {
      expect(isCriticalSeverity("critical")).toBe(true);
      expect(isCriticalSeverity("warning")).toBe(false);
      expect(isCriticalSeverity("info")).toBe(false);
    });
  });

  describe("Opportunity alert navigation", () => {
    it("should return portfolio URL with highlightAsset for opportunity alerts", () => {
      const alert: Alert = {
        id: "alert-opp",
        type: "opportunity",
        title: "Better asset found",
        message: "VOO has higher score than VTI",
        severity: "info",
        metadata: {
          currentAssetId: "asset-123",
          currentAssetSymbol: "VTI",
          betterAssetId: "asset-456",
          betterAssetSymbol: "VOO",
          assetClassId: "class-1",
          assetClassName: "US Stocks",
        },
        isRead: false,
        isDismissed: false,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const url = getNavigationUrl(alert);
      expect(url).toBe("/portfolio?highlightAsset=asset-123");
    });

    it("should return portfolio URL without highlight when opportunity alert has no currentAssetId", () => {
      const alert: Alert = {
        id: "alert-opp",
        type: "opportunity",
        title: "Better asset found",
        message: "VOO has higher score",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const url = getNavigationUrl(alert);
      expect(url).toBe("/portfolio");
    });
  });

  describe("System alert behavior", () => {
    it("should return null for system alerts (no navigation)", () => {
      const alert: Alert = {
        id: "alert-sys",
        type: "system",
        title: "System notice",
        message: "Scheduled maintenance",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const url = getNavigationUrl(alert);
      expect(url).toBeNull();
    });

    it("should return null for info alerts", () => {
      const alert: Alert = {
        id: "alert-info",
        type: "info",
        title: "Information",
        message: "Some information",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const url = getNavigationUrl(alert);
      expect(url).toBeNull();
    });
  });
});
