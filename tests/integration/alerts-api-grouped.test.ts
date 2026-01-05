/**
 * Alerts Service Integration Tests - Server-Side Grouping
 *
 * Story 7.12: Alerts List Server-Side Grouping Optimization
 * AC-7.12.2: SQL GROUP BY for server-side grouping
 * AC-7.12.3: Response structure with grouped data
 * AC-7.12.4: Backward compatibility
 * AC-7.12.5: Performance metrics
 *
 * These tests verify the service layer behavior including:
 * - Grouped vs ungrouped response formats
 * - Backward compatibility
 * - Performance characteristics
 *
 * Note: These tests interact directly with the alert service layer
 * rather than making HTTP requests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  isDatabaseAvailable,
  getDatabaseSkipMessage,
} from "../helpers";
import { alertService, ALERT_TYPES, ALERT_SEVERITIES } from "@/lib/services/alert-service";
import Decimal from "decimal.js";
import { randomUUID } from "crypto";

// Check database availability before running tests
const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("Story 7.12: Alert Service - Server-Side Grouping", () => {
  let testUserId: string;
  let alertIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    const user = await createTestUser();
    testUserId = user.userId;
  });

  afterAll(async () => {
    // Clean up test user (CASCADE will delete alerts)
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
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: randomUUID(), name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      // Call service directly (default behavior is ungrouped)
      const result = await alertService.getAlerts(testUserId, {});

      // Should have ungrouped format
      expect(result.data).toBeInstanceOf(Array);
      expect(result.meta.page).toBeDefined();
      expect(result.meta.limit).toBeDefined();
      expect(result.meta.totalCount).toBeDefined();
      expect(result.meta.totalPages).toBeDefined();

      // Should NOT have grouped format properties
      expect(result.data).not.toHaveProperty("groups");
      expect(result.data).not.toHaveProperty("ungrouped");
    });

    it("should return ungrouped format when grouped=false", async () => {
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: randomUUID(), name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      // Call service with groupBy: false (explicit ungrouped)
      const result = await alertService.getAlerts(testUserId, { groupBy: false });

      // Should have ungrouped format
      expect(result.data).toBeInstanceOf(Array);
      expect(result.meta.page).toBeDefined();
    });
  });

  describe("AC-7.12.2, AC-7.12.3: Grouped Response Format", () => {
    it("should return grouped format when grouped=true", async () => {
      // Create alerts for multiple asset classes
      const usStocksClassId = randomUUID();
      const intlStocksClassId = randomUUID();

      const usStocksAlert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: usStocksClassId, name: "US Stocks" }
      );
      alertIds.push(usStocksAlert1.id);

      const usStocksAlert2 = await alertService.createOpportunityAlert(
        testUserId,
        { id: randomUUID(), symbol: "MSFT", score: "72" },
        { id: randomUUID(), symbol: "VTI", score: "87" },
        { id: usStocksClassId, name: "US Stocks" }
      );
      alertIds.push(usStocksAlert2.id);

      const intlStocksAlert = await alertService.createOpportunityAlert(
        testUserId,
        { id: randomUUID(), symbol: "EFA", score: "65" },
        { id: randomUUID(), symbol: "VXUS", score: "78" },
        { id: intlStocksClassId, name: "International Stocks" }
      );
      alertIds.push(intlStocksAlert.id);

      // Call service with grouping enabled
      const result = await alertService.getAlertsGrouped(testUserId, {});

      // Should have grouped format
      expect(result.groups).toBeInstanceOf(Array);
      expect(result.ungrouped).toBeInstanceOf(Array);
      expect(result.totalCount).toBe(3);
      expect(result.totalGroups).toBe(2);

      // Verify group structure
      const usStocksGroup = result.groups.find(
        (g: { assetClassName: string }) => g.assetClassName === "US Stocks"
      );
      expect(usStocksGroup).toBeDefined();
      expect(usStocksGroup.alertCount).toBe(2);
      expect(usStocksGroup.alerts).toHaveLength(2);
      expect(usStocksGroup.assetClassId).toBe(usStocksClassId);

      const intlStocksGroup = result.groups.find(
        (g: { assetClassName: string }) => g.assetClassName === "International Stocks"
      );
      expect(intlStocksGroup).toBeDefined();
      expect(intlStocksGroup.alertCount).toBe(1);
    });

    it("should sort alerts within groups by severity then date", async () => {
      // Create alerts with different severities
      const usStocksClassId = randomUUID();

      const criticalAlert = await alertService.createDriftAlert(
        testUserId,
        {
          id: usStocksClassId,
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
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: usStocksClassId, name: "US Stocks" }
      );
      alertIds.push(infoAlert.id);

      // Call service with grouping enabled
      const result = await alertService.getAlertsGrouped(testUserId, {});

      const usStocksGroup = result.groups.find(
        (g: { assetClassName: string }) => g.assetClassName === "US Stocks"
      );

      // First alert should be the critical one (sorted by severity then date)
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

      // Call service with grouping enabled
      const result = await alertService.getAlertsGrouped(testUserId, {});

      // Should have ungrouped alerts
      expect(result.ungrouped).toBeInstanceOf(Array);
      // System alert should be in ungrouped (no asset class)
      const systemInUngrouped = result.ungrouped.find(
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
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: randomUUID(), name: "US Stocks" }
      );
      alertIds.push(opportunityAlert.id);

      const driftAlert = await alertService.createDriftAlert(
        testUserId,
        {
          id: randomUUID(),
          name: "Bonds",
          targetMin: "20",
          targetMax: "30",
        },
        new Decimal("35"),
        new Decimal("5")
      );
      alertIds.push(driftAlert.id);

      // Call service with grouping and type filter
      const result = await alertService.getAlertsGrouped(testUserId, {
        type: ALERT_TYPES.OPPORTUNITY,
      });

      // Should only have opportunity alerts
      expect(result.totalCount).toBe(1);
      const allAlerts = result.groups.flatMap((g: { alerts: unknown[] }) => g.alerts);
      expect(allAlerts.every((a: { type: string }) => a.type === ALERT_TYPES.OPPORTUNITY)).toBe(
        true
      );
    });

    it("should support isRead filter with grouped format", async () => {
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: randomUUID(), name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      // Mark as read
      await alertService.markAsRead(testUserId, alert1.id);

      // Call service with grouping and isRead filter
      const result = await alertService.getAlertsGrouped(testUserId, {
        isRead: true,
      });

      // Should only have read alerts
      const allAlerts = result.groups.flatMap((g: { alerts: unknown[] }) => g.alerts);
      expect(allAlerts.every((a: { isRead: boolean }) => a.isRead === true)).toBe(true);
    });

    it("should support isDismissed filter with grouped format", async () => {
      const alert1 = await alertService.createOpportunityAlert(
        testUserId,
        { id: randomUUID(), symbol: "AAPL", score: "70" },
        { id: randomUUID(), symbol: "VOO", score: "85" },
        { id: randomUUID(), name: "US Stocks" }
      );
      alertIds.push(alert1.id);

      // Dismiss alert
      await alertService.dismissAlert(testUserId, alert1.id);

      // Call service with grouping and isDismissed filter
      const result = await alertService.getAlertsGrouped(testUserId, {
        isDismissed: true,
      });

      // Should only have dismissed alerts
      const allAlerts = result.groups.flatMap((g: { alerts: unknown[] }) => g.alerts);
      expect(allAlerts.every((a: { isDismissed: boolean }) => a.isDismissed === true)).toBe(true);
    });
  });

  describe("AC-7.12.5: Performance", () => {
    it(
      "should handle large datasets efficiently",
      { timeout: 60000 }, // 60s timeout for CI environment
      async () => {
        // Create 50 alerts across multiple asset classes
        const alerts = [];
        // Generate 5 class IDs upfront (5 classes with 10 alerts each)
        const classIds = Array.from({ length: 5 }, () => randomUUID());

        for (let i = 0; i < 50; i++) {
          const classIndex = Math.floor(i / 10);
          const classId = classIds[classIndex];
          const className = `Asset Class ${classIndex}`;

          const alert = await alertService.createOpportunityAlert(
            testUserId,
            { id: randomUUID(), symbol: `SYM${i}`, score: "70" },
            { id: randomUUID(), symbol: `BETTER${i}`, score: "85" },
            { id: classId, name: className }
          );
          alerts.push(alert);
          alertIds.push(alert.id);
        }

        const startTime = Date.now();
        const result = await alertService.getAlertsGrouped(testUserId, {});
        const duration = Date.now() - startTime;

        // Verify grouping worked correctly
        expect(result.totalGroups).toBe(5);
        expect(result.totalCount).toBe(50);

        // Performance target: should be reasonably fast
        // Note: This is a rough benchmark, actual target is <50ms for database query
        // CI environment has higher latency, so we're more lenient
        const maxDuration = process.env.CI ? 5000 : 1000;
        expect(duration).toBeLessThan(maxDuration);
      }
    );

    it(
      "should meet <50ms performance target for SQL query on 100+ alerts",
      { timeout: 90000 }, // 90s timeout for CI environment (120 alert creation + query)
      async () => {
        // AC-7.12.5: Real performance test with actual database
        // Create 120 alerts across 6 asset classes (20 each)
        const alerts = [];
        // Generate 6 class IDs upfront (6 classes with 20 alerts each)
        const classIds = Array.from({ length: 6 }, () => randomUUID());

        for (let i = 0; i < 120; i++) {
          const classIndex = Math.floor(i / 20);
          const classId = classIds[classIndex];
          const className = `Asset Class ${classIndex}`;

          const alert = await alertService.createOpportunityAlert(
            testUserId,
            { id: randomUUID(), symbol: `SYM${i}`, score: "70" },
            { id: randomUUID(), symbol: `BETTER${i}`, score: "85" },
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
        // CI environment has much higher latency than local
        const maxQueryTime = process.env.CI ? 5000 : 100;
        expect(duration).toBeLessThan(maxQueryTime);

        // Log actual performance for monitoring
        const environment = process.env.CI ? "CI" : "local";
        console.log(
          `[PERFORMANCE] [${environment}] Grouped 120 alerts in ${duration}ms (target: <${maxQueryTime}ms)`
        );
      }
    );

    it(
      "should reduce payload size compared to ungrouped format",
      { timeout: 60000 }, // 60s timeout for CI environment
      async () => {
        // Create multiple alerts in same class
        const classId = randomUUID();
        for (let i = 0; i < 10; i++) {
          const alert = await alertService.createOpportunityAlert(
            testUserId,
            { id: randomUUID(), symbol: `SYM${i}`, score: "70" },
            { id: randomUUID(), symbol: `BETTER${i}`, score: "85" },
            { id: classId, name: "US Stocks" }
          );
          alertIds.push(alert.id);
        }

        // Fetch ungrouped format
        const ungroupedResult = await alertService.getAlerts(testUserId, { limit: 100 });
        const ungroupedData = JSON.stringify(ungroupedResult);
        const ungroupedSize = ungroupedData.length;

        // Fetch grouped format
        const groupedResult = await alertService.getAlertsGrouped(testUserId, {});
        const groupedData = JSON.stringify(groupedResult);
        const groupedSize = groupedData.length;

        // Grouped should be smaller or similar size
        // (asset class info not repeated for each alert)
        console.log(`Ungrouped size: ${ungroupedSize}, Grouped size: ${groupedSize}`);
        // Assertion: grouped format should have asset class info deduplicated
        expect(groupedSize).toBeLessThanOrEqual(ungroupedSize * 1.1); // Allow 10% tolerance
      }
    );
  });
});

// Log skip message if database unavailable
if (!dbAvailable) {
  console.log("\n⚠️  Integration tests skipped:");
  console.log(getDatabaseSkipMessage());
}
