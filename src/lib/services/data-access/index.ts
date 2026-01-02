/**
 * Data Access Module
 *
 * Story 5.2: Two-Tier Refresh Architecture
 *
 * Provides cache-first data access services for market data.
 * Implements the two-tier caching pattern:
 * 1. Vercel KV (hot cache, ephemeral)
 * 2. PostgreSQL (durable store, persistent)
 *
 * @module @/lib/services/data-access
 */

export {
  MarketDataCacheService,
  marketDataCacheService,
  type CacheFirstResult,
  type BatchCacheFirstResult,
  type CacheWriteResult,
} from "./market-data-cache-service";
