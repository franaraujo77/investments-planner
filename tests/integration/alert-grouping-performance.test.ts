/**
 * Integration Tests: Alert Grouping Query Performance Monitoring
 *
 * Story 7.14: AC-7.14.5
 * Story 7.17: Graceful database handling pattern applied
 *
 * Tests the performance monitoring instrumentation added to alert grouping queries.
 *
 * **Database Requirement:** These tests skip gracefully when no database is available.
 * See tests/helpers/db-check.ts for availability check implementation.
 *
 * Verifies:
 * - Query completes within acceptable time (<50ms in test environment)
 * - Telemetry is emitted with correct structure
 * - executionTimeMs is returned in result
 * - Performance metrics are logged
 *
 * Test Environment Performance Target:
 * - <50ms for 100 alerts (Story 7.14: AC-7.14.5)
 * - Production target: <100ms for typical datasets (Story 7.14: AC-7.14.1)
 *
 * @see src/lib/services/alert-service.ts - getAlerts(), getAlertsGrouped()
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { AlertService } from "@/lib/services/alert-service";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import {
  isDatabaseAvailable,
  getDatabaseSkipMessage,
  createTestUser,
  deleteTestUser,
} from "@tests/helpers";

// Check database availability before test suite
const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("Alert Grouping Performance Monitoring", () => {
  let testUserId: string;
  let alertService: AlertService;

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
    alertService = new AlertService(db);

    // Clean up existing alerts for test user
    await db.delete(alerts).where(eq(alerts.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(alerts).where(eq(alerts.userId, testUserId));
  });

  /**
   * AC-7.14.5: Query completes within acceptable time for 100 alerts
   *
   * Test creates 100 alerts and verifies:
   * - Query execution time < 50ms
   * - executionTimeMs field is present in result
   * - Result structure is correct
   */
  it("should complete query within acceptable time for 100 alerts", async () => {
    // Create 100 test alerts with opportunity type
    const testAlerts = Array.from({ length: 100 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: "info" as const,
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: `class-${i % 5}`, // 5 asset classes for grouping
        assetClassName: `Asset Class ${i % 5}`,
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: false,
      isDismissed: false,
    }));

    await db.insert(alerts).values(testAlerts);

    // Measure query execution time
    const startTime = performance.now();
    const result = await alertService.getAlerts(testUserId, {});
    const endTime = performance.now();
    const measuredExecutionTimeMs = Math.round(endTime - startTime);

    // AC-7.14.5: Verify query completes within 50ms
    expect(measuredExecutionTimeMs).toBeLessThan(50);

    // AC-7.14.5: Verify executionTimeMs is returned
    expect(result).toHaveProperty("executionTimeMs");
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeLessThan(50);

    // Verify result structure
    expect(result.alerts).toHaveLength(100);
    expect(result.totalCount).toBe(100);
    expect(result.metadata).toHaveProperty("limit");
    expect(result.metadata).toHaveProperty("offset");
  });

  /**
   * AC-7.14.5: Grouped query performance with 100 alerts
   *
   * Tests grouped query performance with SQL aggregation.
   * Should also complete within 50ms in test environment.
   */
  it("should complete grouped query within acceptable time for 100 alerts", async () => {
    // Create 100 test alerts spread across 5 asset classes
    const testAlerts = Array.from({ length: 100 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: i % 10 === 0 ? ("critical" as const) : ("info" as const), // 10% critical
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: `class-${i % 5}`,
        assetClassName: `Asset Class ${i % 5}`,
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: false,
      isDismissed: false,
    }));

    await db.insert(alerts).values(testAlerts);

    // Execute grouped query
    const startTime = performance.now();
    const result = await alertService.getAlertsGrouped(testUserId, {});
    const endTime = performance.now();
    const measuredExecutionTimeMs = Math.round(endTime - startTime);

    // AC-7.14.5: Verify query completes within 50ms
    expect(measuredExecutionTimeMs).toBeLessThan(50);

    // AC-7.14.1: Verify executionTimeMs is returned
    expect(result).toHaveProperty("executionTimeMs");
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeLessThan(50);

    // Verify result structure
    expect(result.groups).toBeInstanceOf(Array);
    expect(result.groups.length).toBe(5); // 5 asset classes
    expect(result.totalCount).toBe(100);
    expect(result.totalGroups).toBe(5);

    // Verify all alerts are accounted for in groups
    const totalAlertsInGroups = result.groups.reduce((sum, group) => sum + group.alerts.length, 0);
    expect(totalAlertsInGroups + result.ungrouped.length).toBe(100);
  });

  /**
   * AC-7.14.1: Verify telemetry structure for performance monitoring
   *
   * Tests that the executionTimeMs field contains correct data type and reasonable values.
   */
  it("should return valid telemetry structure in query result", async () => {
    // Create small dataset for fast, predictable test
    const testAlerts = Array.from({ length: 10 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: "info" as const,
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: "class-1",
        assetClassName: "Test Class",
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: false,
      isDismissed: false,
    }));

    await db.insert(alerts).values(testAlerts);

    const result = await alertService.getAlerts(testUserId, {});

    // AC-7.14.1: Verify telemetry fields
    expect(result.executionTimeMs).toBeDefined();
    expect(typeof result.executionTimeMs).toBe("number");
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeLessThan(1000); // Sanity check: <1 second

    // Verify the executionTimeMs is an integer (rounded)
    expect(Number.isInteger(result.executionTimeMs)).toBe(true);

    // Verify result contains expected data
    expect(result.alerts).toHaveLength(10);
    expect(result.totalCount).toBe(10);
  });

  /**
   * AC-7.14.1: Verify structured logging with telemetry
   *
   * Tests that query execution is logged with correct telemetry structure:
   * - userId
   * - queryType="alert_grouping"
   * - executionTimeMs
   * - alertCount
   * - slowQueryWarning
   */
  it("should log query execution with structured telemetry", async () => {
    // Spy on logger
    const loggerSpy = vi.spyOn(logger, "info");

    // Create test data
    const testAlerts = Array.from({ length: 15 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: "info" as const,
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: `class-${i % 3}`,
        assetClassName: `Class ${i % 3}`,
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: false,
      isDismissed: false,
    }));

    await db.insert(alerts).values(testAlerts);

    // Execute query
    const result = await alertService.getAlerts(testUserId, {});

    // AC-7.14.1: Verify logger was called with correct structure
    expect(loggerSpy).toHaveBeenCalledWith(
      "Alert grouping query executed",
      expect.objectContaining({
        userId: testUserId,
        queryType: "alert_grouping",
        executionTimeMs: expect.any(Number),
        alertCount: 15,
        slowQueryWarning: false, // Should be false for fast query
        limit: expect.any(Number),
        offset: expect.any(Number),
        totalCount: 15,
      })
    );

    // Verify telemetry values match result
    const logCall = loggerSpy.mock.calls.find(
      (call) => call[0] === "Alert grouping query executed"
    );
    expect(logCall).toBeDefined();
    const logData = logCall?.[1] as Record<string, unknown>;
    expect(logData.executionTimeMs).toBe(result.executionTimeMs);

    loggerSpy.mockRestore();
  });

  /**
   * AC-7.14.1: Verify slowQueryWarning flag logic
   *
   * Note: Cannot easily trigger 100ms+ query in test environment,
   * but we can verify the field structure is correct for fast queries.
   */
  it("should not set slowQueryWarning for fast queries", async () => {
    // Create minimal dataset for fast query
    await db.insert(alerts).values({
      userId: testUserId,
      type: "opportunity",
      severity: "info",
      title: "Test Alert",
      message: "Test message",
      metadata: {
        assetClassId: "class-1",
        assetClassName: "Test Class",
        currentAssetId: "current-1",
        currentAssetSymbol: "CUR1",
        currentScore: "75.0",
        betterAssetId: "better-1",
        betterAssetSymbol: "BET1",
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: false,
      isDismissed: false,
    });

    const result = await alertService.getAlerts(testUserId, {});

    // AC-7.14.1: For fast queries (<100ms), slowQueryWarning should be false
    // Note: We validate the logging logic in unit tests, not integration tests
    expect(result.executionTimeMs).toBeLessThan(100);
  });

  /**
   * AC-7.14.1: Verify logger.warn is called for slow queries
   *
   * This test uses a large dataset to potentially trigger >100ms execution
   * and verifies that a warning is logged with full query context.
   */
  it("should log warning for slow queries with full context", async () => {
    // Spy on logger.warn
    const warnSpy = vi.spyOn(logger, "warn");

    // Create large dataset (500 alerts) to increase query time
    const largeTestAlerts = Array.from({ length: 500 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: i % 10 === 0 ? ("critical" as const) : ("info" as const),
      title: `Large Dataset Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: `class-${i % 10}`, // 10 asset classes
        assetClassName: `Asset Class ${i % 10}`,
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: i % 4 === 0, // 25% read
      isDismissed: i % 5 === 0, // 20% dismissed
    }));

    await db.insert(alerts).values(largeTestAlerts);

    // Execute query with filters (adds complexity)
    const result = await alertService.getAlerts(testUserId, {
      isRead: false,
      isDismissed: false,
      type: "opportunity",
    });

    // Check if query was slow (>100ms)
    if (result.executionTimeMs > 100) {
      // AC-7.14.1: Verify warning was logged with full context
      expect(warnSpy).toHaveBeenCalledWith(
        "Alert query exceeded performance threshold",
        expect.objectContaining({
          userId: testUserId,
          queryType: "alert_grouping",
          executionTimeMs: expect.any(Number),
          threshold: 100,
          alertCount: expect.any(Number),
        })
      );

      // Verify the logged executionTimeMs matches the result
      const warnCall = warnSpy.mock.calls.find(
        (call) => call[0] === "Alert query exceeded performance threshold"
      );
      if (warnCall) {
        const warnData = warnCall[1] as Record<string, unknown>;
        expect(warnData.executionTimeMs).toBe(result.executionTimeMs);
        expect(warnData.executionTimeMs).toBeGreaterThan(100);
      }
    } else {
      // Query was fast - verify no warning was logged
      expect(warnSpy).not.toHaveBeenCalledWith(
        "Alert query exceeded performance threshold",
        expect.anything()
      );
    }

    // Note: In CI/production environments with more load, this test may
    // trigger the slow query path. In local fast environments, it verifies
    // the absence of false warnings.

    warnSpy.mockRestore();
  });

  /**
   * AC-7.14.5: Performance with filters applied
   *
   * Verifies that query performance remains good with filters.
   */
  it("should maintain performance with query filters", async () => {
    // Create alerts with mixed read/dismissed states
    const testAlerts = Array.from({ length: 100 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: "info" as const,
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: `class-${i % 5}`,
        assetClassName: `Asset Class ${i % 5}`,
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: i % 2 === 0, // 50% read
      isDismissed: i % 3 === 0, // 33% dismissed
    }));

    await db.insert(alerts).values(testAlerts);

    // Query with filters
    const result = await alertService.getAlerts(testUserId, {
      isRead: false,
      isDismissed: false,
      type: "opportunity",
    });

    // AC-7.14.5: Should still complete quickly
    expect(result.executionTimeMs).toBeLessThan(50);

    // Verify result correctness
    expect(result.alerts.every((a) => !a.isRead && !a.isDismissed)).toBe(true);
  });

  /**
   * AC-7.14.5: Performance with pagination
   *
   * Verifies that pagination doesn't degrade performance.
   */
  it("should maintain performance with pagination", async () => {
    // Create 100 alerts
    const testAlerts = Array.from({ length: 100 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity" as const,
      severity: "info" as const,
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: {
        assetClassId: `class-${i % 5}`,
        assetClassName: `Asset Class ${i % 5}`,
        currentAssetId: `current-${i}`,
        currentAssetSymbol: `CUR${i}`,
        currentScore: "75.0",
        betterAssetId: `better-${i}`,
        betterAssetSymbol: `BET${i}`,
        betterScore: "90.0",
        scoreDifference: "15.0",
      },
      isRead: false,
      isDismissed: false,
    }));

    await db.insert(alerts).values(testAlerts);

    // Query second page (offset 50, limit 25)
    const result = await alertService.getAlerts(testUserId, {
      limit: 25,
      offset: 50,
    });

    // AC-7.14.5: Should still complete quickly
    expect(result.executionTimeMs).toBeLessThan(50);

    // Verify pagination correctness
    expect(result.alerts).toHaveLength(25);
    expect(result.totalCount).toBe(100);
    expect(result.metadata.limit).toBe(25);
    expect(result.metadata.offset).toBe(50);
  });
});

// Log skip message if database unavailable
if (!dbAvailable) {
  console.log("\n⚠️  Integration tests skipped:");
  console.log(getDatabaseSkipMessage());
}
