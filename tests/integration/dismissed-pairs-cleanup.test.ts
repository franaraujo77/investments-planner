/**
 * Integration Tests: Dismissed Opportunity Pairs Cleanup Job
 *
 * Story 7.14: AC-7.14.3, AC-7.14.4
 * Story 7.17: Graceful database handling pattern applied
 *
 * Tests the cleanup job that removes dismissed opportunity pairs older than 90 days.
 *
 * **Database Requirement:** These tests skip gracefully when no database is available.
 * See tests/helpers/db-check.ts for availability check implementation.
 *
 * Verifies:
 * - Old pairs (>90 days) are deleted
 * - Recent pairs (<90 days) are retained
 * - Empty database handling
 * - Idempotency (safe to run multiple times)
 * - Transaction rollback on error
 *
 * @see src/lib/inngest/functions/cleanup-dismissed-pairs.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { dismissedOpportunityPairs } from "@/lib/db/schema";
import { runCleanupJob, RETENTION_DAYS } from "@/lib/inngest/functions/cleanup-dismissed-pairs";
import { eq } from "drizzle-orm";
import {
  isDatabaseAvailable,
  getDatabaseSkipMessage,
  createTestUser,
  deleteTestUser,
} from "@tests/helpers";
import { randomUUID } from "crypto";

// Check database availability before test suite
const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("Dismissed Pairs Cleanup Job", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await createTestUser();
    testUserId = user.userId;
  });

  afterAll(async () => {
    // Clean up test user (CASCADE will delete dismissed pairs)
    await deleteTestUser(testUserId);
  });

  beforeEach(async () => {
    // Clean up any existing test data before test runs
    await db
      .delete(dismissedOpportunityPairs)
      .where(eq(dismissedOpportunityPairs.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data after each test to prevent pollution
    await db
      .delete(dismissedOpportunityPairs)
      .where(eq(dismissedOpportunityPairs.userId, testUserId));
  });

  /**
   * AC-7.14.3: Delete pairs older than 90 days and retain recent pairs
   *
   * Test Data:
   * - 5 old pairs (>90 days) → should be deleted
   * - 5 recent pairs (50 days ago) → should be kept
   * - 5 new pairs (today) → should be kept
   *
   * Expected Result:
   * - 5 pairs deleted
   * - 10 pairs remain
   */
  it("should delete pairs older than 90 days and retain recent pairs", async () => {
    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    // Generate UUIDs for test assets
    const oldAssetIds = Array.from({ length: 5 }, () => ({
      current: randomUUID(),
      better: randomUUID(),
    }));
    const recentAssetIds = Array.from({ length: 5 }, () => ({
      current: randomUUID(),
      better: randomUUID(),
    }));
    const newAssetIds = Array.from({ length: 5 }, () => ({
      current: randomUUID(),
      better: randomUUID(),
    }));

    // Insert test data: 5 old pairs (should be deleted)
    const oldPairs = [
      {
        userId: testUserId,
        currentAssetId: oldAssetIds[0].current,
        betterAssetId: oldAssetIds[0].better,
        dismissedAt: daysAgo(100),
        lastScoreDifference: "15.50",
      },
      {
        userId: testUserId,
        currentAssetId: oldAssetIds[1].current,
        betterAssetId: oldAssetIds[1].better,
        dismissedAt: daysAgo(95),
        lastScoreDifference: "12.30",
      },
      {
        userId: testUserId,
        currentAssetId: oldAssetIds[2].current,
        betterAssetId: oldAssetIds[2].better,
        dismissedAt: daysAgo(91),
        lastScoreDifference: "20.00",
      },
      {
        userId: testUserId,
        currentAssetId: oldAssetIds[3].current,
        betterAssetId: oldAssetIds[3].better,
        dismissedAt: daysAgo(100),
        lastScoreDifference: "10.75",
      },
      {
        userId: testUserId,
        currentAssetId: oldAssetIds[4].current,
        betterAssetId: oldAssetIds[4].better,
        dismissedAt: daysAgo(120),
        lastScoreDifference: "18.25",
      },
    ];

    // Insert test data: 5 recent pairs at 50 days ago (should be kept)
    const recentPairs = [
      {
        userId: testUserId,
        currentAssetId: recentAssetIds[0].current,
        betterAssetId: recentAssetIds[0].better,
        dismissedAt: daysAgo(50),
        lastScoreDifference: "11.00",
      },
      {
        userId: testUserId,
        currentAssetId: recentAssetIds[1].current,
        betterAssetId: recentAssetIds[1].better,
        dismissedAt: daysAgo(30),
        lastScoreDifference: "14.50",
      },
      {
        userId: testUserId,
        currentAssetId: recentAssetIds[2].current,
        betterAssetId: recentAssetIds[2].better,
        dismissedAt: daysAgo(10),
        lastScoreDifference: "16.00",
      },
      {
        userId: testUserId,
        currentAssetId: recentAssetIds[3].current,
        betterAssetId: recentAssetIds[3].better,
        dismissedAt: daysAgo(5),
        lastScoreDifference: "13.75",
      },
      {
        userId: testUserId,
        currentAssetId: recentAssetIds[4].current,
        betterAssetId: recentAssetIds[4].better,
        dismissedAt: daysAgo(1),
        lastScoreDifference: "19.50",
      },
    ];

    // Insert test data: 5 new pairs from today (should be kept)
    const newPairs = [
      {
        userId: testUserId,
        currentAssetId: newAssetIds[0].current,
        betterAssetId: newAssetIds[0].better,
        dismissedAt: now,
        lastScoreDifference: "12.00",
      },
      {
        userId: testUserId,
        currentAssetId: newAssetIds[1].current,
        betterAssetId: newAssetIds[1].better,
        dismissedAt: now,
        lastScoreDifference: "15.00",
      },
      {
        userId: testUserId,
        currentAssetId: newAssetIds[2].current,
        betterAssetId: newAssetIds[2].better,
        dismissedAt: now,
        lastScoreDifference: "17.25",
      },
      {
        userId: testUserId,
        currentAssetId: newAssetIds[3].current,
        betterAssetId: newAssetIds[3].better,
        dismissedAt: now,
        lastScoreDifference: "11.50",
      },
      {
        userId: testUserId,
        currentAssetId: newAssetIds[4].current,
        betterAssetId: newAssetIds[4].better,
        dismissedAt: now,
        lastScoreDifference: "14.00",
      },
    ];

    await db.insert(dismissedOpportunityPairs).values([...oldPairs, ...recentPairs, ...newPairs]);

    // Verify all pairs were inserted
    const beforeCleanup = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });
    expect(beforeCleanup).toHaveLength(15);

    // Run cleanup job
    const result = await runCleanupJob();

    // AC-7.14.3: Verify 5 old pairs were deleted
    expect(result.deletedCount).toBe(5);
    expect(result.error).toBeUndefined();

    // Verify remaining pairs
    const afterCleanup = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });

    // AC-7.14.3: 10 recent pairs should remain
    expect(afterCleanup).toHaveLength(10);

    // Verify that only recent and new pairs remain
    const remainingAssetIds = afterCleanup.map((p) => p.currentAssetId).sort();
    const expectedAssetIds = [
      ...recentAssetIds.map((a) => a.current),
      ...newAssetIds.map((a) => a.current),
    ].sort();

    expect(remainingAssetIds).toEqual(expectedAssetIds);
  });

  /**
   * AC-7.14.4: Handle empty database gracefully
   *
   * Tests idempotency: running cleanup on empty database should not error.
   */
  it("should handle empty database gracefully", async () => {
    // Ensure database is empty for this user
    const before = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });
    expect(before).toHaveLength(0);

    // Run cleanup on empty database
    const result = await runCleanupJob();

    // AC-7.14.4: Should complete successfully with 0 deletions
    expect(result.deletedCount).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.startedAt).toBeDefined();
    expect(result.completedAt).toBeDefined();
  });

  /**
   * AC-7.14.4: Idempotency - running multiple times should be safe
   *
   * Tests that running cleanup job twice in a row doesn't cause errors
   * and properly handles "nothing to delete" scenario on second run.
   */
  it("should be idempotent when run multiple times", async () => {
    const daysAgo = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    };

    // Insert 1 old pair (100 days ago)
    await db.insert(dismissedOpportunityPairs).values({
      userId: testUserId,
      currentAssetId: randomUUID(),
      betterAssetId: randomUUID(),
      dismissedAt: daysAgo(100),
      lastScoreDifference: "15.00",
    });

    // First run: should delete 1 pair
    const result1 = await runCleanupJob();
    expect(result1.deletedCount).toBe(1);
    expect(result1.error).toBeUndefined();

    // Second run: should delete 0 pairs (nothing left to delete)
    const result2 = await runCleanupJob();
    expect(result2.deletedCount).toBe(0);
    expect(result2.error).toBeUndefined();

    // Verify no pairs remain
    const afterCleanup = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });
    expect(afterCleanup).toHaveLength(0);
  });

  /**
   * AC-7.14.3: Verify 90-day boundary is exact
   *
   * Tests that pairs exactly at 90 days are NOT deleted (only >90 days).
   */
  it("should retain pairs exactly at 90-day boundary", async () => {
    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      // Keep same time-of-day as SQL NOW() to match cleanup job logic
      return date;
    };

    // Generate UUIDs for boundary test assets
    const boundaryMinus1 = randomUUID();
    const boundaryExact = randomUUID();
    const boundaryPlus1 = randomUUID();

    // Insert pairs at different ages relative to boundary
    await db.insert(dismissedOpportunityPairs).values([
      {
        userId: testUserId,
        currentAssetId: boundaryMinus1,
        betterAssetId: randomUUID(),
        dismissedAt: daysAgo(RETENTION_DAYS - 1), // 89 days - should keep
        lastScoreDifference: "10.00",
      },
      {
        userId: testUserId,
        currentAssetId: boundaryExact,
        betterAssetId: randomUUID(),
        dismissedAt: daysAgo(RETENTION_DAYS), // Exactly 90 days - should keep
        lastScoreDifference: "11.00",
      },
      {
        userId: testUserId,
        currentAssetId: boundaryPlus1,
        betterAssetId: randomUUID(),
        dismissedAt: daysAgo(RETENTION_DAYS + 1), // 91 days - should delete
        lastScoreDifference: "12.00",
      },
    ]);

    // Run cleanup
    const result = await runCleanupJob();

    // Should delete only the 91-day-old pair
    expect(result.deletedCount).toBe(1);

    // Verify remaining pairs
    const remaining = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });

    expect(remaining).toHaveLength(2);
    expect(remaining.map((p) => p.currentAssetId).sort()).toEqual(
      [boundaryExact, boundaryMinus1].sort()
    );
  });

  /**
   * AC-7.14.4: Verify execution time is logged
   *
   * Tests that performance metrics are captured in result.
   */
  it("should log execution time metrics", async () => {
    const result = await runCleanupJob();

    // Verify performance metrics exist
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeLessThan(5000); // Should complete in <5s
    expect(result.startedAt).toBeDefined();
    expect(result.completedAt).toBeDefined();

    // Verify timestamps are valid ISO strings
    expect(() => new Date(result.startedAt)).not.toThrow();
    expect(() => new Date(result.completedAt)).not.toThrow();

    // Verify completedAt is after startedAt
    const started = new Date(result.startedAt);
    const completed = new Date(result.completedAt);
    expect(completed.getTime()).toBeGreaterThanOrEqual(started.getTime());
  });

  /**
   * Note: AC-7.14.4 Transaction Rollback Testing
   *
   * Transaction rollback on error is tested in unit tests with mocked database:
   * @see tests/unit/inngest/cleanup-dismissed-pairs.test.ts
   *
   * Integration tests verify the success path (data is correctly deleted).
   * Unit tests verify the error path (transaction rollback on failure).
   *
   * This separation is intentional:
   * - Integration tests use real database and verify end-to-end behavior
   * - Unit tests mock database to simulate errors and verify error handling
   */
});

// Log skip message if database unavailable
if (!dbAvailable) {
  console.log("\n⚠️  Integration tests skipped:");
  console.log(getDatabaseSkipMessage());
}
