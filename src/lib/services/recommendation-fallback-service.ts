/**
 * Recommendation Fallback Service
 *
 * Story 5.6: Overnight Pre-Computation
 * AC-5.6.5: Graceful Failure Fallback
 *
 * Provides on-demand calculation fallback when cached recommendations are unavailable
 * due to overnight job failures. Ensures users always see recommendations, even if
 * they need to wait a brief moment for on-demand calculation.
 *
 * Flow:
 * 1. Try cache first (Vercel KV `recs:{userId}`)
 * 2. If cache miss, check if user had recent overnight failure
 * 3. If failed, trigger on-demand calculation
 * 4. Log fallback trigger for investigation
 */

import { db, type Database } from "@/lib/db";
import { overnightJobRuns } from "@/lib/db/schema";
import { desc, and, gte, isNotNull } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import {
  recommendationCacheService,
  type CachedRecommendations,
} from "@/lib/cache/recommendation-cache";
import {
  batchRecommendationService,
  type GeneratedRecommendation,
} from "./batch-recommendation-service";
import { JOB_STATUS, type JobStatus } from "./overnight-job-service";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Source of recommendations
 * Note: "database" is not used by FallbackService - it only does cache → on-demand.
 * DashboardService handles the database fallback layer before calling FallbackService.
 */
export type RecommendationSource = "cache" | "on-demand";

/**
 * Result of getting recommendations with fallback
 * AC-5.6.5: Tracks source and whether fallback was triggered
 */
export interface FallbackResult {
  recommendations: CachedRecommendations | GeneratedRecommendation | null;
  source: RecommendationSource;
  durationMs: number;
  fallbackTriggered: boolean;
  reason?: string;
}

/**
 * Overnight job status for a user
 */
export interface UserOvernightStatus {
  lastJobStatus: JobStatus | null;
  lastJobCompletedAt: Date | null;
  usersFailed: number;
  hasRecentFailure: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Time window to check for recent overnight failures (24 hours)
 * Matches the cache TTL
 */
const FAILURE_CHECK_WINDOW_HOURS = 24;

/**
 * Default exchange rates for on-demand fallback (USD base)
 *
 * NOTE: Empty defaults mean on-demand calculations use whatever rates
 * the batchRecommendationService can fetch from its own cache/database.
 * This is acceptable because:
 * 1. The overnight job already populated the market data cache (Story 5.2)
 * 2. batchRecommendationService falls back to cached data internally
 * 3. Slightly stale rates are better than blocking the user
 */
const DEFAULT_EXCHANGE_RATES: Record<string, string> = {};

/**
 * Default prices map for on-demand fallback
 *
 * NOTE: Empty defaults - batchRecommendationService fetches from cache/DB.
 * See DEFAULT_EXCHANGE_RATES note for rationale.
 */
const DEFAULT_PRICES: Record<
  string,
  { price: string; currency: string; fetchedAt: string; source: string }
> = {};

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Recommendation Fallback Service
 *
 * Provides graceful degradation when overnight processing fails.
 * Tries cache first, then falls back to on-demand calculation if needed.
 *
 * @example
 * ```typescript
 * const result = await recommendationFallbackService.getRecommendationsWithFallback(userId);
 *
 * if (result.fallbackTriggered) {
 *   logger.info('On-demand calculation triggered', { userId, reason: result.reason });
 * }
 *
 * if (result.recommendations) {
 *   // Display recommendations
 * }
 * ```
 */
export class RecommendationFallbackService {
  constructor(private database: Database = db) {}

  /**
   * Get recommendations for a user with fallback support
   *
   * AC-5.6.5: Graceful Failure Fallback
   * - Try cache first (fast path)
   * - If cache miss, check overnight job status
   * - If overnight failed, trigger on-demand calculation
   * - Log fallback for investigation
   *
   * @param userId - User ID to get recommendations for
   * @returns Recommendations with source information
   */
  async getRecommendationsWithFallback(userId: string): Promise<FallbackResult> {
    const startTime = Date.now();

    // Step 1: Try cache first (fast path)
    const cacheResult = await recommendationCacheService.get(userId);

    if (cacheResult.data) {
      logger.debug("Recommendations served from cache", {
        userId,
        generatedAt: cacheResult.data.generatedAt,
      });

      return {
        recommendations: cacheResult.data,
        source: "cache",
        durationMs: Date.now() - startTime,
        fallbackTriggered: false,
      };
    }

    // Step 2: Cache miss - check if user's overnight job failed
    const overnightStatus = await this.getOvernightStatus(userId);

    if (overnightStatus.hasRecentFailure) {
      // Step 3: Overnight job failed - trigger on-demand calculation
      logger.info("On-demand fallback triggered", {
        userId,
        reason: "overnight_failure",
        lastJobStatus: overnightStatus.lastJobStatus,
        lastJobCompletedAt: overnightStatus.lastJobCompletedAt?.toISOString(),
      });

      const onDemandResult = await this.calculateOnDemand(userId);

      return {
        recommendations: onDemandResult.recommendations,
        source: "on-demand",
        durationMs: Date.now() - startTime,
        fallbackTriggered: true,
        reason: `overnight_failure: ${overnightStatus.lastJobStatus}`,
      };
    }

    // Step 4: No recent failure but cache miss - try on-demand anyway
    // This handles edge cases like new users or cache expiry without failure
    logger.info("On-demand fallback triggered", {
      userId,
      reason: "cache_miss_no_failure",
    });

    const onDemandResult = await this.calculateOnDemand(userId);

    return {
      recommendations: onDemandResult.recommendations,
      source: "on-demand",
      durationMs: Date.now() - startTime,
      fallbackTriggered: true,
      reason: "cache_miss_no_recent_overnight_data",
    };
  }

  /**
   * Check if user's last overnight job failed
   *
   * AC-5.6.5: Check overnight job status to determine if fallback is needed
   *
   * @param userId - User ID to check
   * @returns Whether overnight job failed for this user
   */
  async isOvernightFailed(userId: string): Promise<boolean> {
    const status = await this.getOvernightStatus(userId);
    return status.hasRecentFailure;
  }

  /**
   * Get overnight job status for a user
   *
   * Queries overnight_job_runs table to find the most recent job
   * and check if it failed or had user-level failures.
   *
   * DESIGN NOTE: This uses a conservative global-failure approach:
   * - If the overnight job FAILED entirely, all users get fallback
   * - If the overnight job had PARTIAL failures (some users failed),
   *   we trigger fallback for ALL users as a safety measure
   *
   * This is intentionally conservative because:
   * 1. Per-user failure tracking would require additional DB schema
   * 2. False positives (unnecessary fallback) are better than false negatives
   * 3. On-demand calculation is still fast enough for good UX
   *
   * @param userId - User ID for logging context (failure detection is global)
   * @returns Overnight status with failure information
   */
  async getOvernightStatus(userId: string): Promise<UserOvernightStatus> {
    try {
      // Calculate the time window for checking failures
      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - FAILURE_CHECK_WINDOW_HOURS);

      // Query the most recent overnight job within the window
      // Uses global job status - conservative approach for reliability
      const recentJobs = await this.database
        .select({
          status: overnightJobRuns.status,
          completedAt: overnightJobRuns.completedAt,
          usersFailed: overnightJobRuns.usersFailed,
          usersProcessed: overnightJobRuns.usersProcessed,
        })
        .from(overnightJobRuns)
        .where(
          and(gte(overnightJobRuns.startedAt, windowStart), isNotNull(overnightJobRuns.completedAt))
        )
        .orderBy(desc(overnightJobRuns.completedAt))
        .limit(1);

      if (recentJobs.length === 0) {
        // No recent overnight job - no failure status
        logger.debug("No recent overnight job found", {
          userId,
          windowStart: windowStart.toISOString(),
        });
        return {
          lastJobStatus: null,
          lastJobCompletedAt: null,
          usersFailed: 0,
          hasRecentFailure: false,
        };
      }

      const lastJob = recentJobs[0]!;
      const jobStatus = lastJob.status as JobStatus;

      // Check if job failed or had partial failures
      // AC-5.6.5: Consider both FAILED and PARTIAL status as potential failures
      const hasRecentFailure =
        jobStatus === JOB_STATUS.FAILED ||
        (jobStatus === JOB_STATUS.PARTIAL && (lastJob.usersFailed ?? 0) > 0);

      logger.debug("Overnight job status checked", {
        userId,
        lastJobStatus: jobStatus,
        lastJobCompletedAt: lastJob.completedAt?.toISOString(),
        usersFailed: lastJob.usersFailed,
        hasRecentFailure,
      });

      return {
        lastJobStatus: jobStatus,
        lastJobCompletedAt: lastJob.completedAt,
        usersFailed: lastJob.usersFailed ?? 0,
        hasRecentFailure,
      };
    } catch (error) {
      // On query error, assume no failure to avoid blocking users
      logger.warn("Failed to check overnight status", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        lastJobStatus: null,
        lastJobCompletedAt: null,
        usersFailed: 0,
        hasRecentFailure: false,
      };
    }
  }

  /**
   * Calculate recommendations on-demand
   *
   * AC-5.6.5: On-demand calculation when overnight fails
   * Uses the batch recommendation service for a single user.
   * Caches the result to avoid repeated on-demand calculations.
   *
   * @param userId - User ID to calculate for
   * @returns Calculated recommendations
   */
  private async calculateOnDemand(
    userId: string
  ): Promise<{ recommendations: GeneratedRecommendation | null; error?: string }> {
    const correlationId = `fallback:${crypto.randomUUID().slice(0, 8)}`;

    try {
      logger.info("Starting on-demand recommendation calculation", {
        userId,
        correlationId,
      });

      const startTime = Date.now();

      // Generate recommendations using batch service for single user
      const result = await batchRecommendationService.generateRecommendationsForUser(userId, {
        exchangeRates: DEFAULT_EXCHANGE_RATES,
        prices: DEFAULT_PRICES,
        correlationId,
      });

      if (!result.success || !result.recommendations) {
        logger.warn("On-demand calculation failed", {
          userId,
          correlationId,
          error: result.error,
        });

        return {
          recommendations: null,
          error: result.error || "Failed to generate recommendations",
        };
      }

      // Cache the result to avoid repeated fallback calculations
      // This ensures subsequent requests hit the cache
      const cacheResult = await recommendationCacheService.set(userId, result.recommendations);

      if (!cacheResult.success) {
        logger.warn("Failed to cache on-demand recommendations", {
          userId,
          correlationId,
          error: cacheResult.error,
        });
        // Continue - we still have the recommendations, just not cached
      }

      const durationMs = Date.now() - startTime;

      logger.info("On-demand recommendation calculation completed", {
        userId,
        correlationId,
        recommendationsGenerated: result.recommendationsGenerated,
        durationMs,
        cached: cacheResult.success,
      });

      return {
        recommendations: result.recommendations,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("On-demand calculation exception", {
        userId,
        correlationId,
        error: errorMessage,
      });

      return {
        recommendations: null,
        error: errorMessage,
      };
    }
  }
}

/**
 * Default recommendation fallback service instance
 */
export const recommendationFallbackService = new RecommendationFallbackService();
