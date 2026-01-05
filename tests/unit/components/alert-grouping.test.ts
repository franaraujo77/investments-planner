/**
 * Alert Grouping Logic Tests
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.5: Collapsible sections grouped by asset class
 *
 * Tests the helper functions for grouping alerts by asset class.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPES (extracted from alerts-list-client.tsx for testing)
// =============================================================================

interface OpportunityAlertMetadata {
  currentAssetId: string;
  currentAssetSymbol: string;
  betterAssetId: string;
  betterAssetSymbol: string;
  assetClassId: string;
  assetClassName: string;
}

interface DriftAlertMetadata {
  assetClassId: string;
  assetClassName: string;
  currentAllocation: string;
  targetMin: string;
  targetMax: string;
  driftAmount: string;
  direction: "over" | "under";
}

type AlertMetadata = OpportunityAlertMetadata | DriftAlertMetadata | Record<string, unknown>;

interface Alert {
  id: string;
  type: "opportunity" | "allocation_drift" | "system";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  metadata: AlertMetadata;
  isRead: boolean;
  isDismissed: boolean;
  snoozedUntil: string | null;
  createdAt: string;
}

interface AlertGroup {
  assetClassName: string;
  assetClassId: string;
  alerts: Alert[];
  totalCount: number;
}

// =============================================================================
// FUNCTIONS UNDER TEST (extracted from alerts-list-client.tsx)
// =============================================================================

function getAssetClassInfo(alert: Alert): { id: string; name: string } {
  const metadata = alert.metadata as OpportunityAlertMetadata | DriftAlertMetadata;

  if ("assetClassName" in metadata && "assetClassId" in metadata) {
    return {
      id: metadata.assetClassId,
      name: metadata.assetClassName,
    };
  }

  // Fallback for alerts without asset class info
  return { id: "other", name: "Other Alerts" };
}

function groupAlertsByAssetClass(alerts: Alert[]): AlertGroup[] {
  const grouped = new Map<string, AlertGroup>();

  for (const alert of alerts) {
    const { id, name } = getAssetClassInfo(alert);

    if (!grouped.has(id)) {
      grouped.set(id, {
        assetClassId: id,
        assetClassName: name,
        alerts: [],
        totalCount: 0,
      });
    }

    const group = grouped.get(id)!;
    group.alerts.push(alert);
    group.totalCount++;
  }

  // Sort groups alphabetically by name, with "Other Alerts" at the end
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.assetClassId === "other") return 1;
    if (b.assetClassId === "other") return -1;
    return a.assetClassName.localeCompare(b.assetClassName);
  });
}

function isAlertSnoozed(alert: Alert): boolean {
  if (!alert.snoozedUntil) return false;
  return new Date(alert.snoozedUntil) > new Date();
}

// =============================================================================
// TESTS
// =============================================================================

describe("Alert Grouping Logic", () => {
  describe("getAssetClassInfo", () => {
    it("should extract asset class info from opportunity alert metadata", () => {
      const alert: Alert = {
        id: "alert-1",
        type: "opportunity",
        title: "Better Asset Found",
        message: "Test message",
        severity: "info",
        metadata: {
          currentAssetId: "asset-1",
          currentAssetSymbol: "ABC",
          betterAssetId: "asset-2",
          betterAssetSymbol: "XYZ",
          assetClassId: "class-stocks",
          assetClassName: "US Stocks",
        },
        isRead: false,
        isDismissed: false,
        snoozedUntil: null,
        createdAt: new Date().toISOString(),
      };

      const result = getAssetClassInfo(alert);

      expect(result.id).toBe("class-stocks");
      expect(result.name).toBe("US Stocks");
    });

    it("should extract asset class info from drift alert metadata", () => {
      const alert: Alert = {
        id: "alert-2",
        type: "allocation_drift",
        title: "Allocation Drift Detected",
        message: "Test message",
        severity: "warning",
        metadata: {
          assetClassId: "class-bonds",
          assetClassName: "Government Bonds",
          currentAllocation: "25.5",
          targetMin: "20",
          targetMax: "30",
          driftAmount: "5.5",
          direction: "over" as const,
        },
        isRead: false,
        isDismissed: false,
        snoozedUntil: null,
        createdAt: new Date().toISOString(),
      };

      const result = getAssetClassInfo(alert);

      expect(result.id).toBe("class-bonds");
      expect(result.name).toBe("Government Bonds");
    });

    it("should return 'Other Alerts' for alerts without asset class info", () => {
      const alert: Alert = {
        id: "alert-3",
        type: "system",
        title: "System Alert",
        message: "Test message",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        snoozedUntil: null,
        createdAt: new Date().toISOString(),
      };

      const result = getAssetClassInfo(alert);

      expect(result.id).toBe("other");
      expect(result.name).toBe("Other Alerts");
    });
  });

  describe("groupAlertsByAssetClass", () => {
    it("should group alerts by asset class", () => {
      const alerts: Alert[] = [
        createOpportunityAlert("alert-1", "class-1", "Stocks"),
        createOpportunityAlert("alert-2", "class-1", "Stocks"),
        createOpportunityAlert("alert-3", "class-2", "Bonds"),
      ];

      const groups = groupAlertsByAssetClass(alerts);

      expect(groups).toHaveLength(2);
      expect(groups[0].assetClassName).toBe("Bonds");
      expect(groups[0].totalCount).toBe(1);
      expect(groups[1].assetClassName).toBe("Stocks");
      expect(groups[1].totalCount).toBe(2);
    });

    it("should sort groups alphabetically with 'Other' at the end", () => {
      const alerts: Alert[] = [
        createOpportunityAlert("alert-1", "class-z", "Zebra Class"),
        createSystemAlert("alert-2"),
        createOpportunityAlert("alert-3", "class-a", "Alpha Class"),
      ];

      const groups = groupAlertsByAssetClass(alerts);

      expect(groups).toHaveLength(3);
      expect(groups[0].assetClassName).toBe("Alpha Class");
      expect(groups[1].assetClassName).toBe("Zebra Class");
      expect(groups[2].assetClassName).toBe("Other Alerts");
    });

    it("should return empty array for empty alerts", () => {
      const groups = groupAlertsByAssetClass([]);

      expect(groups).toHaveLength(0);
    });

    it("should track correct count per group", () => {
      const alerts: Alert[] = [
        createOpportunityAlert("alert-1", "class-1", "Class A"),
        createOpportunityAlert("alert-2", "class-1", "Class A"),
        createOpportunityAlert("alert-3", "class-1", "Class A"),
        createOpportunityAlert("alert-4", "class-2", "Class B"),
      ];

      const groups = groupAlertsByAssetClass(alerts);

      const classAGroup = groups.find((g) => g.assetClassName === "Class A");
      const classBGroup = groups.find((g) => g.assetClassName === "Class B");

      expect(classAGroup?.totalCount).toBe(3);
      expect(classAGroup?.alerts).toHaveLength(3);
      expect(classBGroup?.totalCount).toBe(1);
      expect(classBGroup?.alerts).toHaveLength(1);
    });
  });

  describe("isAlertSnoozed", () => {
    it("should return false when snoozedUntil is null", () => {
      const alert: Alert = {
        id: "alert-1",
        type: "opportunity",
        title: "Test",
        message: "Test",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        snoozedUntil: null,
        createdAt: new Date().toISOString(),
      };

      expect(isAlertSnoozed(alert)).toBe(false);
    });

    it("should return true when snoozedUntil is in the future", () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const alert: Alert = {
        id: "alert-1",
        type: "opportunity",
        title: "Test",
        message: "Test",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        snoozedUntil: futureDate.toISOString(),
        createdAt: new Date().toISOString(),
      };

      expect(isAlertSnoozed(alert)).toBe(true);
    });

    it("should return false when snoozedUntil is in the past", () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const alert: Alert = {
        id: "alert-1",
        type: "opportunity",
        title: "Test",
        message: "Test",
        severity: "info",
        metadata: {},
        isRead: false,
        isDismissed: false,
        snoozedUntil: pastDate.toISOString(),
        createdAt: new Date().toISOString(),
      };

      expect(isAlertSnoozed(alert)).toBe(false);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS FOR TESTS
// =============================================================================

function createOpportunityAlert(id: string, assetClassId: string, assetClassName: string): Alert {
  return {
    id,
    type: "opportunity",
    title: "Better Asset Found",
    message: "A better scoring asset exists in your class",
    severity: "info",
    metadata: {
      currentAssetId: "asset-current",
      currentAssetSymbol: "CURR",
      betterAssetId: "asset-better",
      betterAssetSymbol: "BETT",
      assetClassId,
      assetClassName,
    },
    isRead: false,
    isDismissed: false,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
  };
}

function createSystemAlert(id: string): Alert {
  return {
    id,
    type: "system",
    title: "System Alert",
    message: "System notification",
    severity: "info",
    metadata: {},
    isRead: false,
    isDismissed: false,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
  };
}
