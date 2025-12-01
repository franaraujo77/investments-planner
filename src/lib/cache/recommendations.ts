/**
 * Recommendations Cache Operations
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC1: Recommendations stored in Vercel KV are retrieved in <100ms
 * AC2: Cache keys are namespaced per user: `recs:${userId}`
 * AC3: TTL is set to 24 hours
 * AC4: Cache miss falls back to PostgreSQL
 *
 * High-level functions for caching and retrieving recommendations.
 *
 * @module @/lib/cache/recommendations
 */

import { cacheService } from "./service";
import { createRecommendationKey } from "./keys";
import { getCacheConfig } from "./config";
import type {
  CachedRecommendations,
  CacheGetResult,
  CachedAssetRecommendation,
  CacheMetadata,
} from "./types";

// =============================================================================
// RECOMMENDATIONS CACHE OPERATIONS
// =============================================================================

/**
 * Gets cached recommendations for a user
 *
 * If cache is enabled and data exists, returns cached data.
 * If cache miss or disabled, returns null (caller should query PostgreSQL).
 *
 * @param userId - User UUID
 * @returns Cached recommendations with metadata, or null if not found
 *
 * @example
 * ```typescript
 * const result = await getRecommendations('user-123');
 * if (result.data) {
 *   displayRecommendations(result.data);
 * } else {
 *   // Cache miss - fetch from database
 *   const dbData = await fetchFromDatabase(userId);
 *   await setRecommendations(userId, dbData);
 * }
 * ```
 */
export async function getRecommendations(
  userId: string
): Promise<CacheGetResult<CachedRecommendations>> {
  const key = createRecommendationKey(userId);
  const cached = await cacheService.get<CachedRecommendations>(key);

  if (cached) {
    // Parse dates from serialized format
    const data: CachedRecommendations = {
      ...cached.data,
      generatedAt: new Date(cached.data.generatedAt),
      metadata: cached.metadata,
    };

    return {
      data,
      fromCache: true,
      timestamp: cached.metadata.cachedAt,
    };
  }

  return {
    data: null,
    fromCache: false,
    timestamp: null,
  };
}

/**
 * Input for setting recommendations (before metadata is added)
 */
export interface SetRecommendationsInput {
  /** List of asset recommendations */
  recommendations: CachedAssetRecommendation[];
  /** When recommendations were generated */
  generatedAt: Date;
  /** Criteria version ID used for calculation */
  criteriaVersionId: string;
  /** User's base currency */
  baseCurrency: string;
  /** Total recommended investment amount */
  totalAmount: string;
}

/**
 * Sets cached recommendations for a user
 *
 * Uses 24-hour TTL per AC3.
 *
 * @param userId - User UUID
 * @param data - Recommendations data to cache
 * @param source - Source of the data (default: 'api')
 *
 * @example
 * ```typescript
 * await setRecommendations('user-123', {
 *   recommendations: [...],
 *   generatedAt: new Date(),
 *   criteriaVersionId: 'v1',
 *   baseCurrency: 'USD',
 *   totalAmount: '2000.00'
 * }, 'overnight-job');
 * ```
 */
export async function setRecommendations(
  userId: string,
  data: SetRecommendationsInput,
  source: string = "api"
): Promise<void> {
  const key = createRecommendationKey(userId);
  const config = getCacheConfig();

  const now = new Date();
  const metadata: CacheMetadata = {
    cachedAt: now,
    expiresAt: new Date(now.getTime() + config.defaultTtlSeconds * 1000),
    ttlSeconds: config.defaultTtlSeconds,
    source,
  };

  const cacheData: CachedRecommendations = {
    ...data,
    metadata,
  };

  await cacheService.set(key, cacheData, config.defaultTtlSeconds, source);
}

/**
 * Invalidates cached recommendations for a user
 *
 * Call this when:
 * - User updates their scoring criteria
 * - User modifies portfolio
 * - New calculation is generated
 *
 * @param userId - User UUID
 */
export async function invalidateRecommendations(userId: string): Promise<void> {
  const key = createRecommendationKey(userId);
  await cacheService.del(key);
}

/**
 * Gets recommendations with fallback to a factory function
 *
 * Combines cache lookup with factory pattern for clean data loading.
 *
 * @param userId - User UUID
 * @param fallback - Function to call on cache miss
 * @returns Recommendations data and cache status
 */
export async function getRecommendationsWithFallback(
  userId: string,
  fallback: () => Promise<SetRecommendationsInput | null>
): Promise<CacheGetResult<CachedRecommendations>> {
  // Try cache first
  const cached = await getRecommendations(userId);
  if (cached.data) {
    return cached;
  }

  // Cache miss - call fallback
  const freshData = await fallback();
  if (!freshData) {
    return {
      data: null,
      fromCache: false,
      timestamp: null,
    };
  }

  // Cache the fresh data
  await setRecommendations(userId, freshData, "fallback");

  // Build result
  const config = getCacheConfig();
  const now = new Date();
  const metadata: CacheMetadata = {
    cachedAt: now,
    expiresAt: new Date(now.getTime() + config.defaultTtlSeconds * 1000),
    ttlSeconds: config.defaultTtlSeconds,
    source: "fallback",
  };

  return {
    data: {
      ...freshData,
      metadata,
    },
    fromCache: false,
    timestamp: freshData.generatedAt,
  };
}
