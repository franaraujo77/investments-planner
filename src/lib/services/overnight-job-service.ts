/**
 * Overnight Job Service
 *
 * Story 8.2: Overnight Scoring Job
 * Story 8.3: Recommendation Pre-Generation
 * AC-8.2.5: Graceful Error Handling (track job metrics)
 * AC-8.2.6: Performance Target (record timing)
 * AC-8.3.1: Track recommendation generation metrics
 *
 * Helper functions for overnight_job_runs CRUD operations.
 */

import { db, type Database } from "@/lib/db";
import { overnightJobRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { OvernightJobRun, NewOvernightJobRun } from "@/lib/db/schema";

/**
 * Job run status values
 */
export const JOB_STATUS = {
  STARTED: "started",
  COMPLETED: "completed",
  FAILED: "failed",
  PARTIAL: "partial",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

/**
 * Job type values
 */
export const JOB_TYPE = {
  SCORING: "scoring",
  RECOMMENDATIONS: "recommendations",
  CACHE_WARM: "cache-warm",
} as const;

export type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

/**
 * Job run metrics structure
 */
export interface JobRunMetrics {
  fetchRatesMs?: number;
  processUsersMs?: number;
  totalDurationMs?: number;
  assetsScored?: number;
  usersTotal?: number;
  // Story 8.3: Recommendation metrics
  recommendationsGenerated?: number;
  usersWithRecommendations?: number;
  recommendationDurationMs?: number;
  // Story 8.4: Cache warming metrics
  usersCached?: number;
  cacheFailures?: number;
  cacheWarmMs?: number; // AC-8.6.3: renamed from cacheWarmingDurationMs
  // Story 9.1: Alert detection metrics
  alertsCreated?: number;
  alertsUpdated?: number;
  alertDetectionMs?: number;
  // Story 9.2: Drift alert detection metrics
  driftAlertsCreated?: number;
  driftAlertsUpdated?: number;
  driftAlertsDismissed?: number;
  driftAlertDetectionMs?: number;
}

/**
 * Error details for job failures
 */
export interface JobErrorDetails {
  errors: Array<{
    userId?: string;
    message: string;
    stage?: string;
  }>;
}

/**
 * Overnight Job Service
 *
 * Provides CRUD operations for overnight_job_runs table.
 *
 * @example
 * ```typescript
 * const service = new OvernightJobService();
 *
 * // Start a job
 * const jobRun = await service.createJobRun({
 *   jobType: 'scoring',
 *   correlationId: crypto.randomUUID(),
 * });
 *
 * // Complete successfully
 * await service.completeJobRun(jobRun.id, {
 *   usersProcessed: 100,
 *   metrics: { totalDurationMs: 5000 }
 * });
 * ```
 */
export class OvernightJobService {
  constructor(private database: Database = db) {}

  /**
   * Create a new job run record (status: started)
   */
  async createJobRun(params: {
    jobType: JobType;
    correlationId: string;
  }): Promise<OvernightJobRun> {
    const newRun: NewOvernightJobRun = {
      jobType: params.jobType,
      status: JOB_STATUS.STARTED,
      correlationId: params.correlationId,
      startedAt: new Date(),
      usersProcessed: 0,
      usersFailed: 0,
    };

    const [result] = await this.database.insert(overnightJobRuns).values(newRun).returning();

    if (!result) {
      throw new Error("Failed to create overnight job run");
    }

    return result;
  }

  /**
   * Mark job as completed successfully
   */
  async completeJobRun(
    jobRunId: string,
    params: {
      usersProcessed: number;
      usersFailed?: number;
      metrics?: JobRunMetrics;
    }
  ): Promise<OvernightJobRun> {
    const status =
      params.usersFailed && params.usersFailed > 0 ? JOB_STATUS.PARTIAL : JOB_STATUS.COMPLETED;

    const [result] = await this.database
      .update(overnightJobRuns)
      .set({
        status,
        completedAt: new Date(),
        usersProcessed: params.usersProcessed,
        usersFailed: params.usersFailed ?? 0,
        metrics: params.metrics ?? null,
      })
      .where(eq(overnightJobRuns.id, jobRunId))
      .returning();

    if (!result) {
      throw new Error(`Failed to complete job run: ${jobRunId}`);
    }

    return result;
  }

  /**
   * Mark job as failed
   */
  async failJobRun(
    jobRunId: string,
    params: {
      errorDetails: JobErrorDetails;
      usersProcessed?: number;
      usersFailed?: number;
      metrics?: JobRunMetrics;
    }
  ): Promise<OvernightJobRun> {
    const [result] = await this.database
      .update(overnightJobRuns)
      .set({
        status: JOB_STATUS.FAILED,
        completedAt: new Date(),
        usersProcessed: params.usersProcessed ?? 0,
        usersFailed: params.usersFailed ?? 0,
        errorDetails: params.errorDetails,
        metrics: params.metrics ?? null,
      })
      .where(eq(overnightJobRuns.id, jobRunId))
      .returning();

    if (!result) {
      throw new Error(`Failed to update job run as failed: ${jobRunId}`);
    }

    return result;
  }

  /**
   * Get job run by ID
   */
  async getJobRun(jobRunId: string): Promise<OvernightJobRun | null> {
    const [result] = await this.database
      .select()
      .from(overnightJobRuns)
      .where(eq(overnightJobRuns.id, jobRunId));

    return result ?? null;
  }

  /**
   * Get job run by correlation ID
   */
  async getJobRunByCorrelationId(correlationId: string): Promise<OvernightJobRun | null> {
    const [result] = await this.database
      .select()
      .from(overnightJobRuns)
      .where(eq(overnightJobRuns.correlationId, correlationId));

    return result ?? null;
  }

  /**
   * Update job run metrics during processing
   */
  async updateMetrics(jobRunId: string, metrics: Partial<JobRunMetrics>): Promise<void> {
    const existing = await this.getJobRun(jobRunId);
    if (!existing) {
      throw new Error(`Job run not found: ${jobRunId}`);
    }

    const existingMetrics = (existing.metrics as JobRunMetrics) ?? {};
    const updatedMetrics: JobRunMetrics = {
      ...existingMetrics,
      ...metrics,
    };

    await this.database
      .update(overnightJobRuns)
      .set({ metrics: updatedMetrics })
      .where(eq(overnightJobRuns.id, jobRunId));
  }

  /**
   * Increment user counts during processing
   */
  async incrementUserCounts(
    jobRunId: string,
    counts: { processed?: number; failed?: number }
  ): Promise<void> {
    const existing = await this.getJobRun(jobRunId);
    if (!existing) {
      throw new Error(`Job run not found: ${jobRunId}`);
    }

    await this.database
      .update(overnightJobRuns)
      .set({
        usersProcessed: (existing.usersProcessed ?? 0) + (counts.processed ?? 0),
        usersFailed: (existing.usersFailed ?? 0) + (counts.failed ?? 0),
      })
      .where(eq(overnightJobRuns.id, jobRunId));
  }
}

/**
 * Default overnight job service instance
 */
export const overnightJobService = new OvernightJobService();
