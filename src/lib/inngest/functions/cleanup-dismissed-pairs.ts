/**
 * Dismissed Opportunity Pairs Cleanup Job
 *
 * Story 7.14: AC-7.14.3, AC-7.14.4 - Cleanup job for dismissed opportunity pairs
 *
 * This function removes dismissed opportunity pairs older than 90 days.
 * Runs daily to prevent the table from growing indefinitely.
 *
 * AC-7.14.3: Delete pairs older than 90 days, retain recent pairs
 * AC-7.14.4: Transaction rollback on error, idempotent execution
 *
 * 90-Day Retention Rationale:
 * - Dismissals expire after 90 days to account for changing market conditions
 * - Opportunity alerts may re-appear if asset scoring diverges again
 * - Balances dismissal memory with data freshness requirements
 *
 * Execution Pattern:
 * - Runs daily at 5 AM UTC (1 hour after overnight scoring completes)
 * - Uses database transaction for atomicity
 * - Idempotent: safe to run multiple times
 * - Logs deleted count for monitoring
 *
 * @see src/lib/db/schema.ts - dismissed_opportunity_pairs table
 */

import { inngest } from "../client";
import { logger } from "@/lib/telemetry/logger";
import { db } from "@/lib/db";
import { dismissedOpportunityPairs } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * Default cron schedule for cleanup job
 * Runs at 5 AM UTC daily (1 hour after overnight scoring at 4 AM UTC)
 * Can be overridden via DISMISSED_PAIRS_CLEANUP_CRON environment variable
 */
const DEFAULT_CRON = "0 5 * * *";

/**
 * Retention period in days for dismissed pairs
 * AC-7.14.3: Pairs older than 90 days are deleted
 */
export const RETENTION_DAYS = 90;

/**
 * Cleanup result structure
 */
export interface CleanupResult {
  /** Number of pairs deleted */
  deletedCount: number;
  /** Timestamp when cleanup started */
  startedAt: string;
  /** Timestamp when cleanup completed */
  completedAt: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Error message if cleanup failed */
  error?: string;
}

/**
 * Execute cleanup of old dismissed opportunity pairs
 *
 * AC-7.14.3: Delete pairs older than 90 days
 * AC-7.14.4: Transaction rollback on error
 *
 * @returns Cleanup result with deleted count
 */
export async function runCleanupJob(): Promise<CleanupResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();

  try {
    // AC-7.14.4: Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // AC-7.14.3: Delete pairs older than 90 days using SQL interval
      const deleted = await tx
        .delete(dismissedOpportunityPairs)
        .where(
          sql`${dismissedOpportunityPairs.dismissedAt} < NOW() - INTERVAL '${sql.raw(RETENTION_DAYS.toString())} days'`
        )
        .returning({ id: dismissedOpportunityPairs.id });

      return { deletedCount: deleted.length };
    });

    const completedAt = new Date().toISOString();
    const executionTimeMs = Math.round(performance.now() - startTime);

    // Log successful cleanup
    logger.info("Dismissed pairs cleanup completed", {
      deletedCount: result.deletedCount,
      retentionDays: RETENTION_DAYS,
      executionTimeMs,
      startedAt,
      completedAt,
    });

    return {
      deletedCount: result.deletedCount,
      startedAt,
      completedAt,
      executionTimeMs,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const executionTimeMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // AC-7.14.4: Log error with full context
    logger.error("Dismissed pairs cleanup failed", {
      errorMessage,
      errorName: error instanceof Error ? error.name : "Error",
      retentionDays: RETENTION_DAYS,
      executionTimeMs,
      startedAt,
      completedAt,
    });

    return {
      deletedCount: 0,
      startedAt,
      completedAt,
      executionTimeMs,
      error: errorMessage,
    };
  }
}

/**
 * Inngest function definition for dismissed pairs cleanup
 *
 * Story 7.14: AC-7.14.3, AC-7.14.4
 */
export const cleanupDismissedPairsFunction = inngest.createFunction(
  {
    id: "cleanup-dismissed-pairs",
    name: "Cleanup Dismissed Opportunity Pairs",
    retries: 3, // Retry on transient failures
  },
  {
    // AC-7.14.3: Daily cron schedule
    cron: process.env.DISMISSED_PAIRS_CLEANUP_CRON ?? DEFAULT_CRON,
  },
  async ({ step }) => {
    // AC-7.14.3, AC-7.14.4: Execute cleanup with transaction
    const result = await step.run("cleanup-old-dismissed-pairs", async () => {
      return await runCleanupJob();
    });

    // Log final result for Inngest dashboard visibility
    if (result.error) {
      throw new Error(`Cleanup failed: ${result.error}`);
    }

    return {
      message: "Dismissed pairs cleanup completed successfully",
      deletedCount: result.deletedCount,
      executionTimeMs: result.executionTimeMs,
    };
  }
);
