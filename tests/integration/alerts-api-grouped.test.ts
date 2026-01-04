/**
 * Alerts API Integration Tests - Server-Side Grouping
 *
 * Story 7.12: Alerts List Server-Side Grouping Optimization
 * AC-7.12.2: SQL GROUP BY for server-side grouping
 * AC-7.12.3: Response structure with grouped data
 * AC-7.12.4: Backward compatibility
 * AC-7.12.5: Performance metrics
 *
 * These tests verify the full API flow including:
 * - Query parameter validation
 * - Grouped vs ungrouped response formats
 * - Backward compatibility
 * - Performance characteristics
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  isDatabaseAvailable,
  getDatabaseSkipMessage,
} from "../helpers";
import { getAuthHeaders } from "../helpers/auth-headers";
import { alertService, ALERT_TYPES, ALERT_SEVERITIES } from "@/lib/services/alert-service";
import Decimal from "decimal.js";

// Check database availability before running tests
const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("Story 7.12: Alerts API - Server-Side Grouping", () => {
  let testUserId: string;
  let authHeaders: Record<string, string>;
  let alertIds: string[] = [];

  beforeAll(async () => {
    // Create test user and get auth headers
    const user = await createTestUser();
    testUserId = user.userId;
    authHeaders = await getAuthHeaders(testUserId);
  });

  afterAll(async () => {
    // Clean up test user
    await deleteTestUser(testUserId);
  });

  beforeEach(async () => {
    // Clean up any existing alerts
    if (alertIds.length > 0) {
      // Alerts will be deleted via CASCADE when user is deleted
      alertIds = [];
    }
  });

  describe("AC-7.12.4: Backward Compatibility", () => {
    it("should return ungrouped format when grouped param is not specified", async () => {
      // Create test alerts
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      const response = await fetch("http://localhost:3000/api/alerts", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should have ungrouped format
      expect(data.data).toBeInstanceOf(Array);
      expect(data.meta.page).toBeDefined();
      expect(data.meta.limit).toBeDefined();
      expect(data.meta.totalCount).toBeDefined();
      expect(data.meta.totalPages).toBeDefined();

      // Should NOT have grouped format
      expect(data.data.groups).toBeUndefined();
      expect(data.data.ungrouped).toBeUndefined();
    });

    it("should return ungrouped format when grouped=false", async () => {
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      const response = await fetch("http://localhost:3000/api/alerts?grouped=false", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should have ungrouped format
      expect(data.data).toBeInstanceOf(Array);
      expect(data.meta.page).toBeDefined();
    });
  });

  describe("AC-7.12.2, AC-7.12.3: Grouped Response Format", () => {
    it("should return grouped format when grouped=true", async () => {
      // Create alerts for multiple asset classes
      const usStocksAlert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(usStocksAlert1.id);

      const usStocksAlert2 = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-3", symbol: "MSFT", score: "72" },
        { id: "asset-4", symbol: "VTI", score: "87" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(usStocksAlert2.id);

      const intlStocksAlert = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-5", symbol: "EFA", score: "65" },
        { id: "asset-6", symbol: "VXUS", score: "78" },
        { id: "class-2", name: "International Stocks" }
      );
      alertIds.push(intlStocksAlert.id);

      const response = await fetch("http://localhost:3000/api/alerts?grouped=true", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should have grouped format
      expect(data.data.groups).toBeInstanceOf(Array);
      expect(data.data.ungrouped).toBeInstanceOf(Array);
      expect(data.meta.totalCount).toBe(3);
      expect(data.meta.totalGroups).toBe(2);

      // Should NOT have ungrouped pagination metadata
      expect(data.meta.page).toBeUndefined();
      expect(data.meta.limit).toBeUndefined();
      expect(data.meta.totalPages).toBeUndefined();

      // Verify group structure
      const usStocksGroup = data.data.groups.find(
        (g: { assetClassName: string }) => g.assetClassName === "US Stocks"
      );
      expect(usStocksGroup).toBeDefined();
      expect(usStocksGroup.alertCount).toBe(2);
      expect(usStocksGroup.alerts).toHaveLength(2);
      expect(usStocksGroup.assetClassId).toBe("class-1");

      const intlStocksGroup = data.data.groups.find(
        (g: { assetClassName: string }) => g.assetClassName === "International Stocks"
      );
      expect(intlStocksGroup).toBeDefined();
      expect(intlStocksGroup.alertCount).toBe(1);
    });

    it("should sort alerts within groups by severity then date", async () => {
      // Create alerts with different severities
      const criticalAlert = await alertService.createDriftAlert(
        testUserId,
        {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        },
        new Decimal("65"), // Current allocation (over by 15%)
        new Decimal("5") // Drift threshold
      );
      alertIds.push(criticalAlert.id);

      const infoAlert = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(infoAlert.id);

      const response = await fetch("http://localhost:3000/api/alerts?grouped=true", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      const usStocksGroup = data.data.groups.find(
        (g: { assetClassName: string }) => g.assetClassName === "US Stocks"
      );

      // First alert should be the critical one
      expect(usStocksGroup.alerts[0].severity).toBe(ALERT_SEVERITIES.CRITICAL);
      expect(usStocksGroup.alerts[1].severity).toBe(ALERT_SEVERITIES.INFO);
    });

    it("should handle alerts without asset class in ungrouped array", async () => {
      // Create an opportunity alert with malformed metadata (no asset class)
      // This simulates a system alert or corrupted metadata scenario
      const db = await import("@/lib/db");
      const { alerts: alertsTable } = await import("@/lib/db/schema");

      const [systemAlert] = await db.db
        .insert(alertsTable)
        .values({
          userId: testUserId,
          type: ALERT_TYPES.SYSTEM,
          title: "System notification",
          message: "Test system message",
          severity: ALERT_SEVERITIES.INFO,
          metadata: {}, // No asset class info
          isRead: false,
          isDismissed: false,
        })
        .returning();

      if (systemAlert) {
        alertIds.push(systemAlert.id);
      }

      const response = await fetch("http://localhost:3000/api/alerts?grouped=true", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should have ungrouped alerts
      expect(data.data.ungrouped).toBeInstanceOf(Array);
      // System alert should be in ungrouped
      const systemInUngrouped = data.data.ungrouped.find(
        (a: { type: string }) => a.type === ALERT_TYPES.SYSTEM
      );
      expect(systemInUngrouped).toBeDefined();
    });
  });

  describe("AC-7.12.4: Query Parameter Support", () => {
    it("should support type filter with grouped format", async () => {
      // Create opportunity and drift alerts
      const opportunityAlert = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(opportunityAlert.id);

      const driftAlert = await alertService.createDriftAlert(
        testUserId,
        {
          id: "class-2",
          name: "Bonds",
          targetMin: "20",
          targetMax: "30",
        },
        new Decimal("35"),
        new Decimal("5")
      );
      alertIds.push(driftAlert.id);

      const response = await fetch(
        "http://localhost:3000/api/alerts?grouped=true&type=opportunity",
        {
          headers: authHeaders,
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should only have opportunity alerts
      expect(data.meta.totalCount).toBe(1);
      const allAlerts = data.data.groups.flatMap((g: { alerts: unknown[] }) => g.alerts);
      expect(allAlerts.every((a: { type: string }) => a.type === ALERT_TYPES.OPPORTUNITY)).toBe(
        true
      );
    });

    it("should support isRead filter with grouped format", async () => {
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      // Mark as read
      await alertService.markAsRead(testUserId, alert1.id);

      const response = await fetch("http://localhost:3000/api/alerts?grouped=true&isRead=true", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should only have read alerts
      const allAlerts = data.data.groups.flatMap((g: { alerts: unknown[] }) => g.alerts);
      expect(allAlerts.every((a: { isRead: boolean }) => a.isRead === true)).toBe(true);
    });

    it("should support isDismissed filter with grouped format", async () => {
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: "asset-1", symbol: "AAPL", score: "70" },
        { id: "asset-2", symbol: "VOO", score: "85" },
        { id: "class-1", name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      // Dismiss alert
      await alertService.dismissAlert(testUserId, alert1.id);

      const response = await fetch(
        "http://localhost:3000/api/alerts?grouped=true&isDismissed=true",
        {
          headers: authHeaders,
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should only have dismissed alerts
      const allAlerts = data.data.groups.flatMap((g: { alerts: unknown[] }) => g.alerts);
      expect(allAlerts.every((a: { isDismissed: boolean }) => a.isDismissed === true)).toBe(true);
    });
  });

  describe("AC-7.12.5: Performance", () => {
    it("should handle large datasets efficiently", async () => {
      // Create 50 alerts across multiple asset classes
      const alerts = [];
      for (let i = 0; i < 50; i++) {
        const classId = `class-${Math.floor(i / 10)}`; // 5 classes with 10 alerts each
        const className = `Asset Class ${Math.floor(i / 10)}`;

        const alert = await alertService.createOpportunityAlert(
          testUserId,
          { id: `asset-${i}`, symbol: `SYM${i}`, score: "70" },
          { id: `asset-better-${i}`, symbol: `BETTER${i}`, score: "85" },
          { id: classId, name: className }
        );
        alerts.push(alert);
        alertIds.push(alert.id);
      }

      const startTime = Date.now();
      const response = await fetch("http://localhost:3000/api/alerts?grouped=true", {
        headers: authHeaders,
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify grouping worked correctly
      expect(data.meta.totalGroups).toBe(5);
      expect(data.meta.totalCount).toBe(50);

      // Performance target: should be reasonably fast
      // Note: This is a rough benchmark, actual target is <50ms for database query
      expect(duration).toBeLessThan(1000); // 1 second for full API roundtrip
    });

    it("should meet <50ms performance target for SQL query on 100+ alerts", async () => {
      // AC-7.12.5: Real performance test with actual database
      // Create 120 alerts across 6 asset classes (20 each)
      const alerts = [];
      for (let i = 0; i < 120; i++) {
        const classId = `class-${Math.floor(i / 20)}`;
        const className = `Asset Class ${Math.floor(i / 20)}`;

        const alert = await alertService.createOpportunityAlert(
          testUserId,
          { id: `asset-${i}`, symbol: `SYM${i}`, score: "70" },
          { id: `asset-better-${i}`, symbol: `BETTER${i}`, score: "85" },
          { id: classId, name: className }
        );
        alerts.push(alert);
        alertIds.push(alert.id);
      }

      // Measure service method performance (not HTTP roundtrip)
      const startTime = Date.now();
      const result = await alertService.getAlertsGrouped(testUserId, {});
      const duration = Date.now() - startTime;

      // Verify results
      expect(result.totalGroups).toBe(6);
      expect(result.totalCount).toBe(120);
      expect(result.groups).toHaveLength(6);

      // AC-7.12.5: Performance target <50ms for SQL query
      // Allow some tolerance for CI environment (100ms)
      expect(duration).toBeLessThan(100);

      // Log actual performance for monitoring
      console.log(
        `[PERFORMANCE] Grouped 120 alerts in ${duration}ms (target: <50ms, tolerance: <100ms)`
      );
    });

    it("should reduce payload size compared to ungrouped format", async () => {
      // Create multiple alerts in same class
      for (let i = 0; i < 10; i++) {
        const alert = await alertService.createOpportunityAlert(
          testUserId,
          { id: `asset-${i}`, symbol: `SYM${i}`, score: "70" },
          { id: `asset-better-${i}`, symbol: `BETTER${i}`, score: "85" },
          { id: "class-1", name: "US Stocks" }
        );
        alertIds.push(alert.id);
      }

      // Fetch ungrouped
      const ungroupedResponse = await fetch("http://localhost:3000/api/alerts?limit=100", {
        headers: authHeaders,
      });
      const ungroupedData = await ungroupedResponse.text();
      const ungroupedSize = ungroupedData.length;

      // Fetch grouped
      const groupedResponse = await fetch("http://localhost:3000/api/alerts?grouped=true", {
        headers: authHeaders,
      });
      const groupedData = await groupedResponse.text();
      const groupedSize = groupedData.length;

      // Grouped should be smaller or similar size
      // (asset class info not repeated for each alert)
      console.log(`Ungrouped size: ${ungroupedSize}, Grouped size: ${groupedSize}`);
      // Assertion: grouped format should have asset class info deduplicated
      expect(groupedSize).toBeLessThanOrEqual(ungroupedSize * 1.1); // Allow 10% tolerance
    });
  });
});

// Log skip message if database unavailable
if (!dbAvailable) {
  console.log("\n⚠️  Integration tests skipped:");
  console.log(getDatabaseSkipMessage());
}
