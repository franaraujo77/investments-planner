/**
 * Score Service
 *
 * Story 5.8: Score Calculation Engine
 * Story 5.9: Store Historical Scores
 *
 * Service for managing asset scores with database persistence.
 *
 * Task 5: Add Score Query Service (AC: 5.8.5)
 * - Query scores by assetId and userId
 * - Support fetching breakdown for specific asset
 * - Scope all queries by userId for multi-tenant isolation
 * - Return scores with freshness timestamp
 *
 * Story 5.9 Extensions:
 * - storeScoreHistory(): Append entries to history (AC: 5.9.1, 5.9.4)
 * - getScoreHistory(): Date range queries (AC: 5.9.3)
 * - getScoreAtDate(): Point-in-time queries (AC: 5.9.2)
 * - calculateTrend(): Trend analysis (AC: 5.9.3)
 */

import { db } from "@/lib/db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import Decimal from "decimal.js";
import {
  assetScores,
  criteriaVersions,
  scoreHistory,
  type NewAssetScore,
  type NewScoreHistory,
  type CriterionResult,
  type CriterionRule,
} from "@/lib/db/schema";
import { eventStore } from "@/lib/events/event-store";
import {
  calculateScoresWithEvents,
  type AssetScoreResult,
} from "@/lib/calculations/scoring-engine";
import type { AssetWithFundamentals, ScoringEngineConfig } from "@/lib/validations/score-schemas";
import type { CalculationEvent } from "@/lib/events/types";
import { logger } from "@/lib/telemetry/logger";

// Configure decimal.js for deterministic calculations
// AC-5.9.3: precision: 20, rounding: ROUND_HALF_UP
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =============================================================================
// TYPES
// =============================================================================

export interface ScoreQueryResult {
  assetId: string;
  symbol: string;
  score: string;
  breakdown: CriterionResult[];
  criteriaVersionId: string;
  calculatedAt: Date;
  isFresh: boolean; // True if score was calculated recently (within 24h)
}

export interface ScoreCalculationInput {
  userId: string;
  assets: AssetWithFundamentals[];
  criteriaVersionId?: string | undefined;
  targetMarket?: string | undefined;
}

export interface ScoreCalculationOutput {
  jobId: string;
  scores: AssetScoreResult[];
  calculatedAt: Date;
  correlationId: string;
  assetCount: number;
  duration: number;
}

// =============================================================================
// SCORE HISTORY TYPES (Story 5.9)
// =============================================================================

/**
 * Query parameters for score history
 *
 * AC-5.9.2: Point-in-time queries
 * AC-5.9.3: Trend query support
 */
export interface ScoreHistoryQuery {
  userId: string;
  assetId: string;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  days?: 30 | 60 | 90 | undefined;
}

/**
 * Single entry in score history
 *
 * AC-5.9.2: Returns exact score from that date
 */
export interface ScoreHistoryEntry {
  score: string;
  calculatedAt: Date;
  criteriaVersionId: string;
}

/**
 * Trend analysis result
 *
 * AC-5.9.3: Supports calculating trend: "Score increased 20% over 6 months"
 */
export interface TrendAnalysis {
  startScore: string;
  endScore: string;
  changePercent: string;
  direction: "up" | "down" | "stable";
  dataPoints: number;
}

// =============================================================================
// SCORE QUERY SERVICE
// =============================================================================

/**
 * Get the most recent score for an asset
 *
 * AC-5.8.5: Score Storage with Audit Trail
 * - Returns score with breakdown and freshness timestamp
 * - Scoped by userId for multi-tenant isolation
 *
 * @param userId - User ID for isolation
 * @param assetId - Asset ID to get score for
 * @returns Score result or null if not found
 */
export async function getAssetScore(
  userId: string,
  assetId: string
): Promise<ScoreQueryResult | null> {
  const [score] = await db
    .select()
    .from(assetScores)
    .where(and(eq(assetScores.userId, userId), eq(assetScores.assetId, assetId)))
    .orderBy(desc(assetScores.calculatedAt))
    .limit(1);

  if (!score) {
    return null;
  }

  // Check if score is fresh (within 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const isFresh = score.calculatedAt ? score.calculatedAt > twentyFourHoursAgo : false;

  return {
    assetId: score.assetId,
    symbol: score.symbol,
    score: score.score,
    breakdown: score.breakdown as CriterionResult[],
    criteriaVersionId: score.criteriaVersionId,
    calculatedAt: score.calculatedAt!,
    isFresh,
  };
}

/**
 * Get scores for multiple assets
 *
 * @param userId - User ID for isolation
 * @param assetIds - Array of asset IDs
 * @returns Array of score results
 */
export async function getAssetScores(
  userId: string,
  assetIds: string[]
): Promise<ScoreQueryResult[]> {
  const scores = await Promise.all(assetIds.map((assetId) => getAssetScore(userId, assetId)));
  return scores.filter((s): s is ScoreQueryResult => s !== null);
}

/**
 * Get all scores for a user
 *
 * @param userId - User ID for isolation
 * @param limit - Maximum number of scores to return
 * @returns Array of score results
 */
export async function getAllScoresForUser(
  userId: string,
  limit = 100
): Promise<ScoreQueryResult[]> {
  const scores = await db
    .select()
    .from(assetScores)
    .where(eq(assetScores.userId, userId))
    .orderBy(desc(assetScores.calculatedAt))
    .limit(limit);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return scores.map((score) => ({
    assetId: score.assetId,
    symbol: score.symbol,
    score: score.score,
    breakdown: score.breakdown as CriterionResult[],
    criteriaVersionId: score.criteriaVersionId,
    calculatedAt: score.calculatedAt!,
    isFresh: score.calculatedAt ? score.calculatedAt > twentyFourHoursAgo : false,
  }));
}

// =============================================================================
// SCORE CALCULATION SERVICE
// =============================================================================

/**
 * Event emitter adapter for the event store
 */
const eventEmitterAdapter = {
  emit: async (userId: string, event: CalculationEvent): Promise<void> => {
    await eventStore.append(userId, event);
  },
};

/**
 * Get active criteria version for a user
 *
 * @param userId - User ID
 * @param criteriaVersionId - Optional specific version ID
 * @param targetMarket - Optional target market filter
 * @returns Criteria version with rules or null
 */
async function getActiveCriteria(
  userId: string,
  criteriaVersionId?: string,
  targetMarket?: string
): Promise<{ id: string; criteria: CriterionRule[] } | null> {
  let query = db
    .select()
    .from(criteriaVersions)
    .where(and(eq(criteriaVersions.userId, userId), eq(criteriaVersions.isActive, true)));

  if (criteriaVersionId) {
    query = db.select().from(criteriaVersions).where(eq(criteriaVersions.id, criteriaVersionId));
  } else if (targetMarket) {
    query = db
      .select()
      .from(criteriaVersions)
      .where(
        and(
          eq(criteriaVersions.userId, userId),
          eq(criteriaVersions.isActive, true),
          eq(criteriaVersions.targetMarket, targetMarket)
        )
      );
  }

  const [version] = await query.limit(1);

  if (!version) {
    return null;
  }

  return {
    id: version.id,
    criteria: version.criteria as CriterionRule[],
  };
}

/**
 * Calculate and persist scores for assets
 *
 * AC-5.8.1: Criteria-Driven Algorithm
 * AC-5.8.4: Event Emission for Audit Trail
 * AC-5.8.5: Score Storage with Audit Trail
 *
 * @param input - Score calculation input
 * @returns Score calculation output with correlationId
 */
export async function calculateAndPersistScores(
  input: ScoreCalculationInput
): Promise<ScoreCalculationOutput> {
  const jobId = crypto.randomUUID();

  // Get active criteria for this user
  const criteriaData = await getActiveCriteria(
    input.userId,
    input.criteriaVersionId,
    input.targetMarket
  );

  if (!criteriaData) {
    throw new Error("NO_CRITERIA");
  }

  if (input.assets.length === 0) {
    throw new Error("NO_ASSETS");
  }

  // Build scoring engine config
  const config: ScoringEngineConfig = {
    userId: input.userId,
    criteriaVersionId: criteriaData.id,
    targetMarket: input.targetMarket,
  };

  // Calculate scores with event emission
  const result = await calculateScoresWithEvents(
    config,
    criteriaData.criteria,
    input.assets,
    eventEmitterAdapter
  );

  // Persist scores to database
  const scoreRecords: NewAssetScore[] = result.scores.map((score) => ({
    userId: input.userId,
    assetId: score.assetId,
    symbol: score.symbol,
    criteriaVersionId: score.criteriaVersionId,
    score: score.score,
    breakdown: score.breakdown,
    calculatedAt: score.calculatedAt,
  }));

  // Insert all scores (this will create new records, not update)
  if (scoreRecords.length > 0) {
    await db.insert(assetScores).values(scoreRecords);

    // AC-5.9.1, AC-5.9.4: Also append to score_history for trend analysis
    // This is done in the same operation to ensure consistency
    try {
      await storeScoreHistory(result.scores, input.userId);
      logger.info("Score history stored", {
        userId: input.userId,
        scoreCount: result.scores.length,
        correlationId: result.correlationId,
      });
    } catch (historyError) {
      // Log but don't fail the main calculation
      // History storage is important but shouldn't block scoring
      const errorMessage = historyError instanceof Error ? historyError.message : "Unknown error";
      logger.error("Failed to store score history", {
        userId: input.userId,
        error: errorMessage,
        correlationId: result.correlationId,
      });
    }
  }

  return {
    jobId,
    scores: result.scores,
    calculatedAt: result.scores[0]?.calculatedAt ?? new Date(),
    correlationId: result.correlationId,
    assetCount: result.assetCount,
    duration: result.duration,
  };
}

/**
 * Delete old scores for cleanup
 *
 * @param userId - User ID
 * @param olderThan - Delete scores older than this date
 * @returns Number of deleted scores
 */
export async function deleteOldScores(userId: string, olderThan: Date): Promise<number> {
  // Note: Drizzle doesn't return count for delete, so we'd need a workaround
  // For now, just perform the delete
  await db
    .delete(assetScores)
    .where(and(eq(assetScores.userId, userId), eq(assetScores.calculatedAt, olderThan)));

  return 0; // Placeholder - actual count would require additional query
}

// =============================================================================
// SCORE HISTORY SERVICE (Story 5.9)
// =============================================================================

/**
 * Store score history entries
 *
 * AC-5.9.1: Score History Retention
 * AC-5.9.4: History Append-Only - entries are immutable, never updated
 *
 * @param scores - Array of score results to store
 * @param userId - User ID for isolation
 */
export async function storeScoreHistory(scores: AssetScoreResult[], userId: string): Promise<void> {
  if (scores.length === 0) {
    return;
  }

  const historyRecords: NewScoreHistory[] = scores.map((score) => ({
    userId,
    assetId: score.assetId,
    symbol: score.symbol,
    score: score.score,
    criteriaVersionId: score.criteriaVersionId,
    calculatedAt: score.calculatedAt,
  }));

  // AC-5.9.4: Append to history (insert only, never update)
  await db.insert(scoreHistory).values(historyRecords);
}

/**
 * Get score history for an asset
 *
 * AC-5.9.3: Trend Query Support
 * - Returns array of (date, score) pairs in chronological order
 * - Performance target: < 300ms for 90-day query (uses composite index)
 *
 * @param query - History query parameters
 * @returns Array of history entries in chronological order (oldest first)
 */
export async function getScoreHistory(query: ScoreHistoryQuery): Promise<ScoreHistoryEntry[]> {
  // Determine date range
  let startDate = query.startDate;
  const endDate = query.endDate ?? new Date();

  // If days specified, calculate start date from end date
  if (query.days && !startDate) {
    startDate = new Date(endDate.getTime() - query.days * 24 * 60 * 60 * 1000);
  }

  // Build query conditions
  const conditions = [
    eq(scoreHistory.userId, query.userId),
    eq(scoreHistory.assetId, query.assetId),
  ];

  if (startDate) {
    conditions.push(gte(scoreHistory.calculatedAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(scoreHistory.calculatedAt, endDate));
  }

  // AC-5.9.5: Query uses index efficiently via composite index on (userId, assetId, calculatedAt)
  const results = await db
    .select({
      score: scoreHistory.score,
      calculatedAt: scoreHistory.calculatedAt,
      criteriaVersionId: scoreHistory.criteriaVersionId,
    })
    .from(scoreHistory)
    .where(and(...conditions))
    .orderBy(asc(scoreHistory.calculatedAt)); // Chronological order

  return results.map((r) => ({
    score: r.score,
    calculatedAt: r.calculatedAt,
    criteriaVersionId: r.criteriaVersionId,
  }));
}

/**
 * Get score at a specific date
 *
 * AC-5.9.2: Point-in-Time Score Query
 * - Returns exact score from that date
 * - If no score exists for that date, null is returned (not nearest)
 * - Query scoped by user_id for multi-tenant isolation
 *
 * @param userId - User ID for isolation
 * @param assetId - Asset ID
 * @param date - Date to query
 * @returns Score entry for that exact date or null
 */
export async function getScoreAtDate(
  userId: string,
  assetId: string,
  date: Date
): Promise<ScoreHistoryEntry | null> {
  // Calculate start and end of the day for the query
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // AC-5.9.2: Return exact date match or null
  const [result] = await db
    .select({
      score: scoreHistory.score,
      calculatedAt: scoreHistory.calculatedAt,
      criteriaVersionId: scoreHistory.criteriaVersionId,
    })
    .from(scoreHistory)
    .where(
      and(
        eq(scoreHistory.userId, userId),
        eq(scoreHistory.assetId, assetId),
        gte(scoreHistory.calculatedAt, startOfDay),
        lte(scoreHistory.calculatedAt, endOfDay)
      )
    )
    .orderBy(desc(scoreHistory.calculatedAt))
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    score: result.score,
    calculatedAt: result.calculatedAt,
    criteriaVersionId: result.criteriaVersionId,
  };
}

/**
 * Calculate trend analysis from score history
 *
 * AC-5.9.3: Trend Query Support
 * - Calculates percentage change between first and last scores
 * - Determines direction: up, down, or stable
 * - Uses decimal.js for precise percentage calculations
 *
 * @param history - Array of score history entries (must be chronological)
 * @returns Trend analysis or null if insufficient data
 */
export function calculateTrend(history: ScoreHistoryEntry[]): TrendAnalysis | null {
  // Need at least 2 data points for trend
  if (history.length < 2) {
    return null;
  }

  // Safe to use non-null assertion since we checked length >= 2
  const firstEntry = history[0]!;
  const lastEntry = history[history.length - 1]!;

  const startScore = new Decimal(firstEntry.score);
  const endScore = new Decimal(lastEntry.score);

  // Handle zero starting score (edge case)
  let changePercent: string;
  let direction: "up" | "down" | "stable";

  if (startScore.isZero()) {
    // If starting from zero, any positive end score is infinite increase
    // We'll represent this as 100% (or could be "∞")
    if (endScore.isZero()) {
      changePercent = "0.00";
      direction = "stable";
    } else if (endScore.isPositive()) {
      changePercent = "100.00"; // Represents increase from 0
      direction = "up";
    } else {
      changePercent = "-100.00"; // Represents decrease to negative
      direction = "down";
    }
  } else {
    // Normal percentage calculation
    // AC-5.9.3: Uses decimal.js for trend percentage calculations
    const change = endScore.minus(startScore);
    const percentChange = change.dividedBy(startScore.abs()).times(100);

    changePercent = percentChange.toFixed(2);

    // Determine direction with small threshold for "stable"
    const threshold = new Decimal("0.01"); // 0.01% threshold for stable
    if (percentChange.abs().lessThan(threshold)) {
      direction = "stable";
    } else if (percentChange.isPositive()) {
      direction = "up";
    } else {
      direction = "down";
    }
  }

  return {
    startScore: startScore.toFixed(4),
    endScore: endScore.toFixed(4),
    changePercent,
    direction,
    dataPoints: history.length,
  };
}
