/**
 * Integration Tests: Dismissed Opportunity Pairs Cleanup Job
 *
 * Story 7.14: AC-7.14.3, AC-7.14.4
 *
 * Tests the cleanup job that removes dismissed opportunity pairs older than 90 days.
 * Verifies:
 * - Old pairs (>90 days) are deleted
 * - Recent pairs (<90 days) are retained
 * - Empty database handling
 * - Idempotency (safe to run multiple times)
 * - Transaction rollback on error
 *
 * @see src/lib/inngest/functions/cleanup-dismissed-pairs.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { dismissedOpportunityPairs } from "@/lib/db/schema";
import { runCleanupJob, RETENTION_DAYS } from "@/lib/inngest/functions/cleanup-dismissed-pairs";
import { eq } from "drizzle-orm";

describe("Dismissed Pairs Cleanup Job", () => {
  const testUserId = "test-user-cleanup-job";

  beforeEach(async () => {
    // Clean up any existing test data
    await db
      .delete(dismissedOpportunityPairs)
      .where(eq(dismissedOpportunityPairs.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data
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

    // Insert test data: 5 old pairs (should be deleted)
    const oldPairs = [
      {
        userId: testUserId,
        currentAssetId: "old-asset-1",
        betterAssetId: "better-asset-1",
        dismissedAt: daysAgo(100),
        lastScoreDifference: "15.50",
      },
      {
        userId: testUserId,
        currentAssetId: "old-asset-2",
        betterAssetId: "better-asset-2",
        dismissedAt: daysAgo(95),
        lastScoreDifference: "12.30",
      },
      {
        userId: testUserId,
        currentAssetId: "old-asset-3",
        betterAssetId: "better-asset-3",
        dismissedAt: daysAgo(91),
        lastScoreDifference: "20.00",
      },
      {
        userId: testUserId,
        currentAssetId: "old-asset-4",
        betterAssetId: "better-asset-4",
        dismissedAt: daysAgo(100),
        lastScoreDifference: "10.75",
      },
      {
        userId: testUserId,
        currentAssetId: "old-asset-5",
        betterAssetId: "better-asset-5",
        dismissedAt: daysAgo(120),
        lastScoreDifference: "18.25",
      },
    ];

    // Insert test data: 5 recent pairs at 50 days ago (should be kept)
    const recentPairs = [
      {
        userId: testUserId,
        currentAssetId: "recent-asset-1",
        betterAssetId: "better-asset-6",
        dismissedAt: daysAgo(50),
        lastScoreDifference: "11.00",
      },
      {
        userId: testUserId,
        currentAssetId: "recent-asset-2",
        betterAssetId: "better-asset-7",
        dismissedAt: daysAgo(30),
        lastScoreDifference: "14.50",
      },
      {
        userId: testUserId,
        currentAssetId: "recent-asset-3",
        betterAssetId: "better-asset-8",
        dismissedAt: daysAgo(10),
        lastScoreDifference: "16.00",
      },
      {
        userId: testUserId,
        currentAssetId: "recent-asset-4",
        betterAssetId: "better-asset-9",
        dismissedAt: daysAgo(5),
        lastScoreDifference: "13.75",
      },
      {
        userId: testUserId,
        currentAssetId: "recent-asset-5",
        betterAssetId: "better-asset-10",
        dismissedAt: daysAgo(1),
        lastScoreDifference: "19.50",
      },
    ];

    // Insert test data: 5 new pairs from today (should be kept)
    const newPairs = [
      {
        userId: testUserId,
        currentAssetId: "new-asset-1",
        betterAssetId: "better-asset-11",
        dismissedAt: now,
        lastScoreDifference: "12.00",
      },
      {
        userId: testUserId,
        currentAssetId: "new-asset-2",
        betterAssetId: "better-asset-12",
        dismissedAt: now,
        lastScoreDifference: "15.00",
      },
      {
        userId: testUserId,
        currentAssetId: "new-asset-3",
        betterAssetId: "better-asset-13",
        dismissedAt: now,
        lastScoreDifference: "17.25",
      },
      {
        userId: testUserId,
        currentAssetId: "new-asset-4",
        betterAssetId: "better-asset-14",
        dismissedAt: now,
        lastScoreDifference: "11.50",
      },
      {
        userId: testUserId,
        currentAssetId: "new-asset-5",
        betterAssetId: "better-asset-15",
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
      ...recentPairs.map((p) => p.currentAssetId),
      ...newPairs.map((p) => p.currentAssetId),
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
      currentAssetId: "old-asset",
      betterAssetId: "better-asset",
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
    const daysAgo = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    };

    // Insert pairs at different ages relative to boundary
    await db.insert(dismissedOpportunityPairs).values([
      {
        userId: testUserId,
        currentAssetId: "boundary-minus-1",
        betterAssetId: "better-1",
        dismissedAt: daysAgo(RETENTION_DAYS - 1), // 89 days - should keep
        lastScoreDifference: "10.00",
      },
      {
        userId: testUserId,
        currentAssetId: "boundary-exact",
        betterAssetId: "better-2",
        dismissedAt: daysAgo(RETENTION_DAYS), // Exactly 90 days - should keep
        lastScoreDifference: "11.00",
      },
      {
        userId: testUserId,
        currentAssetId: "boundary-plus-1",
        betterAssetId: "better-3",
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
    expect(remaining.map((p) => p.currentAssetId).sort()).toEqual([
      "boundary-exact",
      "boundary-minus-1",
    ]);
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
