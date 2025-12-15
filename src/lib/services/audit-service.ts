/**
 * Audit Service
 *
 * Story 8.6: Calculation Audit Trail
 * AC-8.6.4: Users can query calculation history by asset
 *
 * Provides queryable access to calculation history:
 * - Query by asset ID with date range filtering
 * - Join calculation events with scores for complete picture
 * - Transform to user-friendly response format
 * - Enforce tenant isolation (user can only see their own data)
 */

import { db, type Database } from "@/lib/db";
import {
  assetScores,
  criteriaVersions,
  overnightJobRuns,
  calculationEvents,
  type CriterionResult,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte, lt, sql } from "drizzle-orm";
import { EventStore, eventStore, type StoredEvent } from "@/lib/events/event-store";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Individual calculation in history
 * AC-8.6.4: Returns calculation date, score, criteria version, breakdown
 */
export interface CalculationHistoryItem {
  /** Correlation ID linking all events for this calculation */
  correlationId: string;
  /** When the calculation was performed */
  calculatedAt: Date;
  /** Asset score result */
  score: string | null;
  /** Asset symbol */
  symbol: string;
  /** Criteria version used for calculation */
  criteriaVersion: {
    id: string;
    name: string;
    version: number;
  } | null;
  /** Criteria breakdown (points per criterion) */
  breakdown: Array<{
    criterionId: string;
    criterionName: string;
    matched: boolean;
    pointsAwarded: number;
    actualValue?: string | null | undefined;
    skippedReason?: string | null | undefined;
  }>;
  /** Source of the calculation (overnight job or manual) */
  source: "overnight" | "manual";
  /** Job run details if from overnight job */
  jobRun?: {
    id: string;
    jobType: string;
    status: string;
  } | null;
}

/**
 * Calculation history query result
 */
export interface CalculationHistoryResult {
  /** List of calculations */
  calculations: CalculationHistoryItem[];
  /** Total count for pagination */
  totalCount: number;
  /** Query metadata */
  metadata: {
    assetId: string;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    limit: number;
    offset: number;
  };
}

/**
 * Query options for calculation history
 */
export interface CalculationHistoryOptions {
  /** Start date filter (inclusive) */
  startDate?: Date | undefined;
  /** End date filter (inclusive) */
  endDate?: Date | undefined;
  /** Maximum results to return (default: 50, max: 100) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/**
 * Job run history item for listing overnight job executions
 */
export interface JobRunHistoryItem {
  id: string;
  jobType: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  usersProcessed: number;
  usersFailed: number;
  correlationId: string;
  metrics: {
    totalDurationMs?: number;
    fetchRatesMs?: number;
    processUsersMs?: number;
    assetsScored?: number;
    recommendationsGenerated?: number;
    cacheWarmMs?: number;
  } | null;
}

/**
 * Data retention constants
 * AC-8.6.5: Audit data retained for 2 years
 */
export const RETENTION_YEARS = 2;

/**
 * Archival eligibility result
 */
export interface ArchivalEligibilityResult {
  /** Calculation events eligible for archival */
  calculationEventsCount: number;
  /** Asset scores eligible for archival */
  assetScoresCount: number;
  /** Job runs eligible for archival */
  jobRunsCount: number;
  /** Date threshold used (records older than this are eligible) */
  thresholdDate: Date;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Audit Service
 *
 * Provides calculation history queries for the audit trail.
 *
 * @example
 * ```typescript
 * const auditService = new AuditService();
 *
 * // Get calculation history for an asset
 * const history = await auditService.getCalculationHistory(
 *   userId,
 *   assetId,
 *   { startDate: thirtyDaysAgo, limit: 20 }
 * );
 *
 * console.log(`Found ${history.calculations.length} calculations`);
 * ```
 */
export class AuditService {
  constructor(
    private database: Database = db,
    private events: EventStore = eventStore
  ) {}

  /**
   * Get calculation history for a specific asset
   *
   * AC-8.6.4: Users can query "Show all calculations for asset X"
   * - Returns calculation date, score, criteria version, breakdown
   * - Sorted by date descending
   * - Enforces tenant isolation (always filters by userId)
   *
   * @param userId - User ID for tenant isolation (REQUIRED)
   * @param assetId - Asset ID to get history for
   * @param options - Query options for filtering and pagination
   * @returns Calculation history result
   */
  async getCalculationHistory(
    userId: string,
    assetId: string,
    options?: CalculationHistoryOptions
  ): Promise<CalculationHistoryResult> {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    logger.debug("Querying calculation history", {
      userId,
      assetId,
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      limit,
      offset,
    });

    // Strategy: Query asset_scores table (has latest score per calculation)
    // then join with calculation_events for full breakdown
    const calculations = await this.queryAssetScores(
      userId,
      assetId,
      options?.startDate,
      options?.endDate,
      limit,
      offset
    );

    // Get total count for pagination
    const totalCount = await this.countAssetScores(
      userId,
      assetId,
      options?.startDate,
      options?.endDate
    );

    logger.debug("Calculation history query complete", {
      userId,
      assetId,
      calculationsFound: calculations.length,
      totalCount,
    });

    return {
      calculations,
      totalCount,
      metadata: {
        assetId,
        startDate: options?.startDate,
        endDate: options?.endDate,
        limit,
        offset,
      },
    };
  }

  /**
   * Get calculation events for a correlation ID
   *
   * Returns all events (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
   * linked to a single calculation run.
   *
   * @param userId - User ID for tenant isolation
   * @param correlationId - Correlation ID of the calculation
   * @returns Array of calculation events
   */
  async getCalculationEvents(userId: string, correlationId: string): Promise<StoredEvent[]> {
    const events = await this.events.getByCorrelationId(correlationId);

    // Verify tenant isolation - all events should belong to the user
    const userEvents = events.filter((e) => e.userId === userId);

    if (userEvents.length !== events.length) {
      logger.warn("Tenant isolation violation attempt", {
        userId,
        correlationId,
        requestedEvents: events.length,
        authorizedEvents: userEvents.length,
      });
    }

    return userEvents;
  }

  /**
   * Get job run history for monitoring/audit
   *
   * AC-8.6.1: overnight_job_runs tracks all job executions
   * AC-8.6.3: Job metrics are recorded and queryable
   *
   * @param options - Query options for filtering and pagination
   * @returns List of job run history items
   */
  async getJobRunHistory(options?: {
    jobType?: "scoring" | "recommendations" | "cache-warm";
    status?: "started" | "completed" | "failed" | "partial";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<JobRunHistoryItem[]> {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (options?.jobType) {
      conditions.push(eq(overnightJobRuns.jobType, options.jobType));
    }

    if (options?.status) {
      conditions.push(eq(overnightJobRuns.status, options.status));
    }

    if (options?.startDate) {
      conditions.push(gte(overnightJobRuns.startedAt, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(overnightJobRuns.startedAt, options.endDate));
    }

    const results = await this.database
      .select()
      .from(overnightJobRuns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(overnightJobRuns.startedAt))
      .limit(limit)
      .offset(offset);

    return results.map((row) => ({
      id: row.id,
      jobType: row.jobType,
      status: row.status,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      usersProcessed: row.usersProcessed ?? 0,
      usersFailed: row.usersFailed ?? 0,
      correlationId: row.correlationId,
      metrics: row.metrics as JobRunHistoryItem["metrics"],
    }));
  }

  // ===========================================================================
  // DATA RETENTION METHODS (AC-8.6.5)
  // ===========================================================================

  /**
   * Get records eligible for archival
   *
   * AC-8.6.5: Audit data retained for 2 years
   * Records older than 2 years are eligible for archival.
   * Note: Actual archival implementation is deferred - this just identifies records.
   *
   * @param olderThan - Optional custom date (defaults to 2 years ago)
   * @returns Count of records eligible for archival
   */
  async getRecordsForArchival(olderThan?: Date): Promise<ArchivalEligibilityResult> {
    // Calculate threshold date (default: 2 years ago)
    const thresholdDate = olderThan ?? this.getRetentionThresholdDate();

    logger.debug("Checking records for archival eligibility", {
      thresholdDate: thresholdDate.toISOString(),
      retentionYears: RETENTION_YEARS,
    });

    // Count calculation events eligible for archival
    const eventsResult = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(calculationEvents)
      .where(lt(calculationEvents.createdAt, thresholdDate));

    // Count asset scores eligible for archival
    const scoresResult = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(assetScores)
      .where(lt(assetScores.calculatedAt, thresholdDate));

    // Count job runs eligible for archival
    const jobRunsResult = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(overnightJobRuns)
      .where(lt(overnightJobRuns.startedAt, thresholdDate));

    const result: ArchivalEligibilityResult = {
      calculationEventsCount: eventsResult[0]?.count ?? 0,
      assetScoresCount: scoresResult[0]?.count ?? 0,
      jobRunsCount: jobRunsResult[0]?.count ?? 0,
      thresholdDate,
    };

    logger.info("Archival eligibility check complete", {
      ...result,
      thresholdDate: result.thresholdDate.toISOString(),
    });

    return result;
  }

  /**
   * Check if data is within retention period
   *
   * Helper method to verify a date is within the 2-year retention window.
   *
   * @param date - Date to check
   * @returns true if within retention period, false if eligible for archival
   */
  isWithinRetentionPeriod(date: Date): boolean {
    const thresholdDate = this.getRetentionThresholdDate();
    return date >= thresholdDate;
  }

  /**
   * Calculate retention expiry date for a record
   *
   * @param createdAt - When the record was created
   * @returns Date when the record becomes eligible for archival
   */
  getRetentionExpiryDate(createdAt: Date): Date {
    const expiryDate = new Date(createdAt);
    expiryDate.setFullYear(expiryDate.getFullYear() + RETENTION_YEARS);
    return expiryDate;
  }

  /**
   * Get the threshold date for retention (2 years ago from now)
   */
  private getRetentionThresholdDate(): Date {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setFullYear(now.getFullYear() - RETENTION_YEARS);
    return threshold;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Query asset_scores table for calculation history
   */
  private async queryAssetScores(
    userId: string,
    assetId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50,
    offset = 0
  ): Promise<CalculationHistoryItem[]> {
    // Build conditions
    const conditions = [eq(assetScores.userId, userId), eq(assetScores.assetId, assetId)];

    if (startDate) {
      conditions.push(gte(assetScores.calculatedAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(assetScores.calculatedAt, endDate));
    }

    // Query asset scores with criteria version join
    const results = await this.database
      .select({
        score: assetScores,
        criteria: {
          id: criteriaVersions.id,
          name: criteriaVersions.name,
          version: criteriaVersions.version,
        },
      })
      .from(assetScores)
      .leftJoin(criteriaVersions, eq(assetScores.criteriaVersionId, criteriaVersions.id))
      .where(and(...conditions))
      .orderBy(desc(assetScores.calculatedAt))
      .limit(limit)
      .offset(offset);

    // Transform to CalculationHistoryItem
    const items: CalculationHistoryItem[] = [];

    for (const row of results) {
      // Try to find correlation ID from events
      // Asset scores don't store correlation directly, so we need to look it up
      let correlationId = "";
      let jobRun: CalculationHistoryItem["jobRun"] = null;
      let source: "overnight" | "manual" = "manual";

      // Try to find events for this score calculation
      // This is an approximation - we look for events within a small time window
      const scoreTime = row.score.calculatedAt;
      if (scoreTime) {
        const events = await this.events.getByAssetId(userId, assetId, {
          startDate: new Date(scoreTime.getTime() - 60000), // 1 minute before
          endDate: new Date(scoreTime.getTime() + 60000), // 1 minute after
          limit: 10,
        });

        const firstEvent = events[0];
        if (firstEvent) {
          correlationId = firstEvent.correlationId;

          // Check if this was from an overnight job
          const jobRunResult = await this.database
            .select()
            .from(overnightJobRuns)
            .where(eq(overnightJobRuns.correlationId, correlationId))
            .limit(1);

          const firstJobRun = jobRunResult[0];
          if (firstJobRun) {
            source = "overnight";
            jobRun = {
              id: firstJobRun.id,
              jobType: firstJobRun.jobType,
              status: firstJobRun.status,
            };
          }
        }
      }

      // Parse breakdown from JSONB - the breakdown is typed as CriterionResult[]
      const breakdown = Array.isArray(row.score.breakdown)
        ? row.score.breakdown.map((b: CriterionResult) => ({
            criterionId: b.criterionId ?? "",
            criterionName: b.criterionName ?? "",
            matched: b.matched ?? false,
            pointsAwarded: b.pointsAwarded ?? 0,
            actualValue: b.actualValue,
            skippedReason: b.skippedReason,
          }))
        : [];

      items.push({
        correlationId,
        calculatedAt: row.score.calculatedAt ?? new Date(),
        score: row.score.score,
        symbol: row.score.symbol,
        criteriaVersion: row.criteria
          ? {
              id: row.criteria.id,
              name: row.criteria.name,
              version: row.criteria.version,
            }
          : null,
        breakdown,
        source,
        jobRun,
      });
    }

    return items;
  }

  /**
   * Count total asset scores for pagination
   */
  private async countAssetScores(
    userId: string,
    assetId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    // Build conditions
    const conditions = [eq(assetScores.userId, userId), eq(assetScores.assetId, assetId)];

    if (startDate) {
      conditions.push(gte(assetScores.calculatedAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(assetScores.calculatedAt, endDate));
    }

    const result = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(assetScores)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default audit service instance
 */
export const auditService = new AuditService();
