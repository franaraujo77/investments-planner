/**
 * Cache Module - Vercel KV Caching Infrastructure
 *
 * Story 1.6: Vercel KV Cache Setup
 * Implements AC1-5 for recommendation caching with PostgreSQL fallback.
 *
 * This module provides:
 * - Cache service for generic key-value operations
 * - Recommendation-specific cache functions
 * - Cache key generation utilities
 * - Invalidation utilities
 * - Type definitions
 *
 * Cache is optional - if KV_REST_API_URL is not set, all operations
 * gracefully fall back to PostgreSQL.
 *
 * @module @/lib/cache
 */

// =============================================================================
// CACHE SERVICE
// =============================================================================

export { CacheService, cacheService } from "./service";

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

export {
  getRecommendations,
  setRecommendations,
  invalidateRecommendations,
  getRecommendationsWithFallback,
  type SetRecommendationsInput,
} from "./recommendations";

// =============================================================================
// INVALIDATION
// =============================================================================

export {
  invalidateUserCache,
  invalidateOnCriteriaChange,
  invalidateOnPortfolioChange,
  invalidateOnNewCalculation,
  invalidateRecommendationsForUsers,
} from "./invalidation";

// =============================================================================
// KEY UTILITIES
// =============================================================================

export {
  createRecommendationKey,
  createPortfolioKey,
  createAllocationKey,
  parseCacheKey,
  getAllUserCacheKeys,
  type ParsedCacheKey,
} from "./keys";

// =============================================================================
// CONFIGURATION
// =============================================================================

export {
  getCacheConfig,
  isCacheEnabled,
  DEFAULT_TTL_SECONDS,
  CACHE_KEY_PREFIXES,
  ENV_VARS,
  type CacheConfig,
} from "./config";

// =============================================================================
// TYPES
// =============================================================================

export type {
  CacheMetadata,
  CachedRecommendations,
  CachedAssetRecommendation,
  CachedPortfolio,
  CachedPortfolioAllocation,
  CacheGetResult,
  CacheSetResult,
} from "./types";

// =============================================================================
// NOTE: Internal client functions are NOT exported
// =============================================================================
// cacheGet, cacheSet, cacheDel are internal implementation details.
// Use CacheService or high-level functions (getRecommendations, etc.) instead.
//
// If you need direct cache access:
//   import { cacheService } from '@/lib/cache';
//   await cacheService.get<MyType>('my-key');
// =============================================================================
