/**
 * Cache Module Types
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC1: Recommendations stored in Vercel KV are retrieved in <100ms
 * AC2: Cache keys are namespaced per user
 *
 * Defines TypeScript types for cached data structures.
 * Aligns with lib/events types for consistency.
 *
 * @module @/lib/cache/types
 */

import type { CriterionScore } from "@/lib/events/types";

// =============================================================================
// CACHE METADATA
// =============================================================================

/**
 * Metadata attached to all cached items
 */
export interface CacheMetadata {
  /** When the cache entry was created */
  cachedAt: Date;
  /** When the cache entry expires */
  expiresAt: Date;
  /** TTL in seconds that was applied */
  ttlSeconds: number;
  /** Source of the data (e.g., 'overnight-job', 'manual') */
  source: string;
}

// =============================================================================
// CACHED RECOMMENDATION DATA
// =============================================================================

/**
 * Individual asset recommendation for caching
 */
export interface CachedAssetRecommendation {
  /** Asset identifier (UUID) */
  assetId: string;
  /** Asset symbol (e.g., 'VOO', 'VTI') */
  symbol: string;
  /** Calculated score as decimal string */
  score: string;
  /** Recommended investment amount as decimal string */
  amount: string;
  /** Score breakdown by criterion */
  breakdown: CriterionScore[];
}

/**
 * Complete recommendations payload for caching
 *
 * This structure is stored in Vercel KV and retrieved for dashboard display.
 * Aligns with SCORES_COMPUTED event from lib/events/types.
 */
export interface CachedRecommendations {
  /** List of asset recommendations sorted by score descending */
  recommendations: CachedAssetRecommendation[];
  /** When recommendations were generated */
  generatedAt: Date;
  /** Criteria version ID used for calculation */
  criteriaVersionId: string;
  /** User's base currency */
  baseCurrency: string;
  /** Total recommended investment amount */
  totalAmount: string;
  /** Cache metadata */
  metadata: CacheMetadata;
}

// =============================================================================
// CACHED PORTFOLIO DATA
// =============================================================================

/**
 * Cached portfolio allocation for quick dashboard display
 */
export interface CachedPortfolioAllocation {
  /** Asset class (e.g., 'US Stocks', 'Bonds') */
  assetClass: string;
  /** Current allocation percentage */
  currentPercentage: string;
  /** Target allocation percentage */
  targetPercentage: string;
  /** Total value in base currency */
  value: string;
}

/**
 * Cached portfolio summary
 */
export interface CachedPortfolio {
  /** Portfolio ID (UUID) */
  portfolioId: string;
  /** Total portfolio value in base currency */
  totalValue: string;
  /** Base currency for values */
  baseCurrency: string;
  /** Allocation breakdown by asset class */
  allocations: CachedPortfolioAllocation[];
  /** Cache metadata */
  metadata: CacheMetadata;
}

// =============================================================================
// CACHE OPERATION RESULTS
// =============================================================================

/**
 * Result of a cache get operation with fallback info
 */
export interface CacheGetResult<T> {
  /** The data, or null if not found */
  data: T | null;
  /** Whether data came from cache (true) or fallback (false) */
  fromCache: boolean;
  /** When the data was generated (from metadata or fallback source) */
  timestamp: Date | null;
}

/**
 * Result of cache set operation
 */
export interface CacheSetResult {
  /** Whether the set operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

// =============================================================================
// SERIALIZATION TYPES
// =============================================================================

/**
 * Serialized format for storage in KV (dates as ISO strings)
 *
 * @internal Used internally by cache client
 */
export interface SerializedCacheEntry<T> {
  data: T;
  metadata: {
    cachedAt: string;
    expiresAt: string;
    ttlSeconds: number;
    source: string;
  };
}
