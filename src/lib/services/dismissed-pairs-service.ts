/**
 * Dismissed Opportunity Pairs Service
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.6: Dismissal Memory - prevents re-alerting for dismissed opportunities
 *
 * Key design:
 * - Tracks dismissed current/better asset pairs per user
 * - Stores score difference at dismissal time
 * - Re-alerts only if score difference increases by >10 points
 * - Pairs older than 90 days are eligible for cleanup
 */

import { db, type Database } from "@/lib/db";
import { dismissedOpportunityPairs } from "@/lib/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import Decimal from "decimal.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Threshold for score difference increase to re-alert
 * AC-7.6.6: Re-alert if score difference increases by >10 points
 */
export const RE_ALERT_THRESHOLD = new Decimal(10);

/**
 * Days after which dismissed pairs can be cleaned up
 */
export const CLEANUP_AGE_DAYS = 90;

// =============================================================================
// TYPES
// =============================================================================

export interface DismissedPairCheck {
  /** Whether to skip creating an alert for this pair */
  shouldSkip: boolean;
  /** Reason for the decision */
  reason: "not_dismissed" | "dismissed_recently" | "score_increased_significantly";
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Dismissed Opportunity Pairs Service
 *
 * Manages the memory of dismissed opportunity alerts to prevent re-alerting.
 */
export class DismissedPairsService {
  constructor(private database: Database = db) {}

  /**
   * Record a dismissed opportunity pair
   *
   * Called when user dismisses an opportunity alert.
   * Upserts to handle re-dismissals.
   *
   * @param userId - User ID (tenant isolation)
   * @param currentAssetId - Current asset in portfolio
   * @param betterAssetId - Better scoring asset that was suggested
   * @param scoreDifference - Score difference at dismissal time
   */
  async recordDismissedPair(
    userId: string,
    currentAssetId: string,
    betterAssetId: string,
    scoreDifference: string | Decimal
  ): Promise<void> {
    const now = new Date();
    const scoreValue =
      typeof scoreDifference === "string" ? scoreDifference : scoreDifference.toString();

    // Upsert: insert or update if exists
    await this.database
      .insert(dismissedOpportunityPairs)
      .values({
        userId,
        currentAssetId,
        betterAssetId,
        lastScoreDifference: scoreValue,
        dismissedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          dismissedOpportunityPairs.userId,
          dismissedOpportunityPairs.currentAssetId,
          dismissedOpportunityPairs.betterAssetId,
        ],
        set: {
          lastScoreDifference: scoreValue,
          dismissedAt: now,
        },
      });

    logger.info("Recorded dismissed opportunity pair", {
      userId,
      currentAssetId,
      betterAssetId,
      scoreDifference: scoreValue,
    });
  }

  /**
   * Check if an opportunity pair should be skipped (already dismissed)
   *
   * AC-7.6.6: Skip alerting if:
   * - Pair was dismissed AND
   * - Current score difference hasn't increased by >10 points
   *
   * @param userId - User ID (tenant isolation)
   * @param currentAssetId - Current asset in portfolio
   * @param betterAssetId - Better scoring asset
   * @param currentScoreDifference - Current score difference
   * @returns Check result with decision and reason
   */
  async shouldSkipAlert(
    userId: string,
    currentAssetId: string,
    betterAssetId: string,
    currentScoreDifference: string | Decimal
  ): Promise<DismissedPairCheck> {
    // Find dismissed pair record
    const [existing] = await this.database
      .select()
      .from(dismissedOpportunityPairs)
      .where(
        and(
          eq(dismissedOpportunityPairs.userId, userId),
          eq(dismissedOpportunityPairs.currentAssetId, currentAssetId),
          eq(dismissedOpportunityPairs.betterAssetId, betterAssetId)
        )
      );

    // Not previously dismissed - allow alert
    if (!existing) {
      return {
        shouldSkip: false,
        reason: "not_dismissed",
      };
    }

    // Check if score difference increased significantly
    const currentDiff = new Decimal(currentScoreDifference.toString());
    const previousDiff = new Decimal(existing.lastScoreDifference);
    const increase = currentDiff.minus(previousDiff);

    if (increase.gt(RE_ALERT_THRESHOLD)) {
      logger.debug("Score difference increased significantly, allowing re-alert", {
        userId,
        currentAssetId,
        betterAssetId,
        previousDiff: previousDiff.toString(),
        currentDiff: currentDiff.toString(),
        increase: increase.toString(),
      });

      return {
        shouldSkip: false,
        reason: "score_increased_significantly",
      };
    }

    // Recently dismissed and no significant increase - skip
    logger.debug("Skipping alert for previously dismissed pair", {
      userId,
      currentAssetId,
      betterAssetId,
      previousDiff: previousDiff.toString(),
      currentDiff: currentDiff.toString(),
    });

    return {
      shouldSkip: true,
      reason: "dismissed_recently",
    };
  }

  /**
   * Clean up old dismissed pairs
   *
   * Removes pairs older than CLEANUP_AGE_DAYS.
   * Should be called from overnight job.
   *
   * @returns Number of pairs deleted
   */
  async cleanupOldPairs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_AGE_DAYS);

    const result = await this.database
      .delete(dismissedOpportunityPairs)
      .where(lt(dismissedOpportunityPairs.dismissedAt, cutoffDate))
      .returning({ id: dismissedOpportunityPairs.id });

    const count = result.length;

    if (count > 0) {
      logger.info("Cleaned up old dismissed opportunity pairs", {
        deletedCount: count,
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    return count;
  }

  /**
   * Get dismissed pair count for a user
   *
   * Useful for debugging and monitoring.
   *
   * @param userId - User ID (tenant isolation)
   * @returns Count of dismissed pairs
   */
  async getDismissedPairCount(userId: string): Promise<number> {
    const result = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(dismissedOpportunityPairs)
      .where(eq(dismissedOpportunityPairs.userId, userId));

    return result[0]?.count ?? 0;
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default dismissed pairs service instance
 */
export const dismissedPairsService = new DismissedPairsService();
