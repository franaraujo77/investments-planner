/**
 * Unit Tests: Dismissed Opportunity Pairs Cleanup Job
 *
 * Story 7.14: AC-7.14.3, AC-7.14.4
 *
 * Tests the cleanup job logic with mocked database to verify:
 * - Transaction rollback on error (AC-7.14.4)
 * - Error handling and logging
 * - Performance telemetry
 *
 * @see src/lib/inngest/functions/cleanup-dismissed-pairs.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the logger BEFORE importing the module
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the database BEFORE importing the module
vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  dismissedOpportunityPairs: {
    id: "id",
    userId: "userId",
    currentAssetId: "currentAssetId",
    betterAssetId: "betterAssetId",
    dismissedAt: "dismissedAt",
    lastScoreDifference: "lastScoreDifference",
  },
}));

// NOW import after mocks are set up
import { runCleanupJob, RETENTION_DAYS } from "@/lib/inngest/functions/cleanup-dismissed-pairs";
import { logger } from "@/lib/telemetry/logger";
import { db } from "@/lib/db";

describe("Cleanup Dismissed Pairs - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * AC-7.14.4: Transaction rollback on error
   *
   * CRITICAL TEST: Verifies that when database transaction fails,
   * the error is caught and NO data is committed (rollback occurs).
   */
  it("should handle transaction error and rollback without committing data", async () => {
    // Mock transaction to throw an error (simulates database failure)
    const transactionError = new Error("Database connection timeout");
    vi.mocked(db.transaction).mockRejectedValue(transactionError);

    // Run cleanup job
    const result = await runCleanupJob();

    // AC-7.14.4: Verify error was caught and returned
    expect(result.error).toBe("Database connection timeout");
    expect(result.deletedCount).toBe(0); // No data deleted due to rollback

    // Verify error was logged with full context
    expect(logger.error).toHaveBeenCalledWith(
      "Dismissed pairs cleanup failed",
      expect.objectContaining({
        errorMessage: "Database connection timeout",
        errorName: "Error",
        retentionDays: RETENTION_DAYS,
        executionTimeMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
      })
    );

    // Verify transaction was attempted (proving rollback boundary exists)
    expect(db.transaction).toHaveBeenCalled();
  });

  /**
   * AC-7.14.4: Successful transaction commits data
   */
  it("should commit transaction on success and log results", async () => {
    // Mock successful transaction with 5 deleted pairs
    const mockDeletedPairs = [
      { id: "pair-1" },
      { id: "pair-2" },
      { id: "pair-3" },
      { id: "pair-4" },
      { id: "pair-5" },
    ];

    vi.mocked(db.transaction).mockImplementation(async (callback) => {
      // Simulate transaction callback execution
      return callback({
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(mockDeletedPairs),
          }),
        }),
      } as never);
    });

    // Run cleanup job
    const result = await runCleanupJob();

    // Verify successful deletion
    expect(result.deletedCount).toBe(5);
    expect(result.error).toBeUndefined();
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0); // Mocked execution may be instant

    // Verify success was logged
    expect(logger.info).toHaveBeenCalledWith(
      "Dismissed pairs cleanup completed",
      expect.objectContaining({
        deletedCount: 5,
        retentionDays: RETENTION_DAYS,
        executionTimeMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
      })
    );
  });

  /**
   * AC-7.14.4: Non-Error exceptions are handled
   */
  it("should handle non-Error exceptions gracefully", async () => {
    // Mock transaction to throw non-Error object (edge case)
    vi.mocked(db.transaction).mockRejectedValue("String error");

    const result = await runCleanupJob();

    // Verify error handling works for non-Error exceptions
    expect(result.error).toBe("Unknown error");
    expect(result.deletedCount).toBe(0);
  });

  /**
   * AC-7.14.3: Verify retention days constant
   */
  it("should use 90-day retention period", () => {
    expect(RETENTION_DAYS).toBe(90);
  });

  /**
   * AC-7.14.4: Telemetry includes execution time
   */
  it("should measure and return execution time", async () => {
    vi.mocked(db.transaction).mockResolvedValue({ deletedCount: 0 });

    const result = await runCleanupJob();

    // Verify telemetry fields
    expect(result.executionTimeMs).toBeDefined();
    expect(typeof result.executionTimeMs).toBe("number");
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    expect(result.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
