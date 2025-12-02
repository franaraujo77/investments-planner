/**
 * Cache Invalidation Utilities
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC5: Cache utilities provide get/set/delete operations
 *
 * Provides functions for invalidating cache entries.
 * Invalidation is fire-and-forget - errors are logged but don't block.
 *
 * @module @/lib/cache/invalidation
 */

import { cacheService } from "./service";
import { getAllUserCacheKeys, createRecommendationKey } from "./keys";

// =============================================================================
// USER-LEVEL INVALIDATION
// =============================================================================

/**
 * Invalidates all cache entries for a user
 *
 * Call this when user deletes their account or performs a full reset.
 *
 * @param userId - User UUID
 *
 * @example
 * ```typescript
 * // User deletes account
 * await deleteUserFromDatabase(userId);
 * await invalidateUserCache(userId);
 * ```
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const keys = getAllUserCacheKeys(userId);
  await cacheService.delMultiple(keys);
}

// =============================================================================
// EVENT-BASED INVALIDATION
// =============================================================================

/**
 * Invalidates cache when user criteria changes
 *
 * Call this when:
 * - User adds/removes/updates scoring criteria
 * - User changes criteria weights
 * - User imports new criteria set
 *
 * Invalidates recommendations since they depend on criteria.
 *
 * @param userId - User UUID
 */
export async function invalidateOnCriteriaChange(userId: string): Promise<void> {
  // Criteria changes affect recommendations
  const key = createRecommendationKey(userId);
  await cacheService.del(key);
}

/**
 * Invalidates cache when user portfolio changes
 *
 * Call this when:
 * - User adds/removes assets
 * - User updates holdings
 * - User changes allocations
 *
 * Invalidates all user cache since portfolio affects all calculations.
 *
 * @param userId - User UUID
 */
export async function invalidateOnPortfolioChange(userId: string): Promise<void> {
  // Portfolio changes can affect all cached data
  await invalidateUserCache(userId);
}

/**
 * Invalidates cache when new calculation is completed
 *
 * Call this from overnight job after computing new recommendations.
 * The job should then immediately cache the new data.
 *
 * @param userId - User UUID
 */
export async function invalidateOnNewCalculation(userId: string): Promise<void> {
  const key = createRecommendationKey(userId);
  await cacheService.del(key);
}

// =============================================================================
// BULK INVALIDATION
// =============================================================================

/**
 * Invalidates recommendations for multiple users
 *
 * Useful for admin operations or batch processing.
 *
 * @param userIds - Array of user UUIDs
 */
export async function invalidateRecommendationsForUsers(userIds: string[]): Promise<void> {
  const keys = userIds.map(createRecommendationKey);
  await cacheService.delMultiple(keys);
}

// =============================================================================
// DOCUMENTATION: INVALIDATION TRIGGERS
// =============================================================================

/**
 * Invalidation Trigger Guide
 *
 * This documents when cache should be invalidated:
 *
 * | Event | Function to Call | Reason |
 * |-------|-----------------|--------|
 * | User updates criteria | invalidateOnCriteriaChange | Scores will change |
 * | User modifies portfolio | invalidateOnPortfolioChange | Allocations change |
 * | Overnight job completes | invalidateOnNewCalculation | New data available |
 * | User changes base currency | invalidateUserCache | All values change |
 * | User deletes account | invalidateUserCache | Cleanup |
 * | Admin forces recalculation | invalidateRecommendationsForUsers | Force fresh data |
 *
 * Note: Invalidation is fire-and-forget. Even if deletion fails,
 * the next cache write will overwrite stale data.
 */
