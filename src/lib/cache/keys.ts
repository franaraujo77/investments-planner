/**
 * Cache Key Utilities
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC2: Cache keys are namespaced per user: `recs:${userId}`
 *
 * Provides functions to generate and parse cache keys.
 * All keys are namespaced by userId to ensure multi-tenant isolation.
 *
 * @module @/lib/cache/keys
 */

import { CACHE_KEY_PREFIXES } from "./config";

// =============================================================================
// KEY GENERATION
// =============================================================================

/**
 * Creates a cache key for user recommendations
 *
 * @param userId - User UUID
 * @returns Cache key in format `recs:{userId}`
 *
 * @example
 * ```typescript
 * const key = createRecommendationKey('550e8400-e29b-41d4-a716-446655440000');
 * // Returns: 'recs:550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function createRecommendationKey(userId: string): string {
  return `${CACHE_KEY_PREFIXES.RECOMMENDATIONS}${userId}`;
}

/**
 * Creates a cache key for user portfolio data
 *
 * @param userId - User UUID
 * @returns Cache key in format `portfolio:{userId}`
 */
export function createPortfolioKey(userId: string): string {
  return `${CACHE_KEY_PREFIXES.PORTFOLIO}${userId}`;
}

/**
 * Creates a cache key for user allocation data
 *
 * @param userId - User UUID
 * @returns Cache key in format `allocation:{userId}`
 */
export function createAllocationKey(userId: string): string {
  return `${CACHE_KEY_PREFIXES.ALLOCATION}${userId}`;
}

// =============================================================================
// KEY PARSING
// =============================================================================

/**
 * Parsed cache key components
 */
export interface ParsedCacheKey {
  /** The key prefix (e.g., 'recs:', 'portfolio:') */
  prefix: string;
  /** The user ID extracted from the key */
  userId: string;
  /** The key type based on prefix */
  type: "recommendations" | "portfolio" | "allocation" | "unknown";
}

/**
 * Parses a cache key to extract its components
 *
 * Useful for debugging and logging.
 *
 * @param key - The cache key to parse
 * @returns Parsed key components
 *
 * @example
 * ```typescript
 * const parsed = parseCacheKey('recs:550e8400-e29b-41d4-a716-446655440000');
 * // Returns: { prefix: 'recs:', userId: '550e8400-...', type: 'recommendations' }
 * ```
 */
export function parseCacheKey(key: string): ParsedCacheKey {
  if (key.startsWith(CACHE_KEY_PREFIXES.RECOMMENDATIONS)) {
    return {
      prefix: CACHE_KEY_PREFIXES.RECOMMENDATIONS,
      userId: key.slice(CACHE_KEY_PREFIXES.RECOMMENDATIONS.length),
      type: "recommendations",
    };
  }

  if (key.startsWith(CACHE_KEY_PREFIXES.PORTFOLIO)) {
    return {
      prefix: CACHE_KEY_PREFIXES.PORTFOLIO,
      userId: key.slice(CACHE_KEY_PREFIXES.PORTFOLIO.length),
      type: "portfolio",
    };
  }

  if (key.startsWith(CACHE_KEY_PREFIXES.ALLOCATION)) {
    return {
      prefix: CACHE_KEY_PREFIXES.ALLOCATION,
      userId: key.slice(CACHE_KEY_PREFIXES.ALLOCATION.length),
      type: "allocation",
    };
  }

  return {
    prefix: "",
    userId: key,
    type: "unknown",
  };
}

/**
 * Gets all cache key prefixes for a user
 *
 * Useful for invalidating all user cache data.
 *
 * @param userId - User UUID
 * @returns Array of all cache keys for the user
 */
export function getAllUserCacheKeys(userId: string): string[] {
  return [
    createRecommendationKey(userId),
    createPortfolioKey(userId),
    createAllocationKey(userId),
  ];
}
