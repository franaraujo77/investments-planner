/**
 * Vercel KV Client Wrapper
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC1: Recommendations stored in Vercel KV are retrieved in <100ms
 * AC5: Cache utilities provide get/set/delete operations
 *
 * Provides type-safe wrapper around @vercel/kv with error handling.
 * Handles serialization/deserialization of Date objects.
 *
 * @module @/lib/cache/client
 */

import { kv } from "@vercel/kv";
import { getCacheConfig } from "./config";
import type { CacheMetadata, SerializedCacheEntry } from "./types";

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Wrapper result for cache operations
 */
interface CacheOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// SERIALIZATION HELPERS
// =============================================================================

/**
 * Serializes data for storage, converting Dates to ISO strings
 */
function serialize<T>(
  data: T,
  metadata: CacheMetadata
): SerializedCacheEntry<T> {
  return {
    data,
    metadata: {
      cachedAt: metadata.cachedAt.toISOString(),
      expiresAt: metadata.expiresAt.toISOString(),
      ttlSeconds: metadata.ttlSeconds,
      source: metadata.source,
    },
  };
}

/**
 * Deserializes data from storage, converting ISO strings back to Dates
 */
function deserialize<T>(entry: SerializedCacheEntry<T>): {
  data: T;
  metadata: CacheMetadata;
} {
  return {
    data: entry.data,
    metadata: {
      cachedAt: new Date(entry.metadata.cachedAt),
      expiresAt: new Date(entry.metadata.expiresAt),
      ttlSeconds: entry.metadata.ttlSeconds,
      source: entry.metadata.source,
    },
  };
}

// =============================================================================
// CACHE CLIENT OPERATIONS
// =============================================================================

/**
 * Gets a value from Vercel KV cache
 *
 * Handles errors gracefully - returns null on failure instead of throwing.
 * This ensures cache errors don't break the application per AC4.
 *
 * @param key - Cache key to retrieve
 * @returns The cached value with metadata, or null if not found/error
 *
 * @example
 * ```typescript
 * const result = await cacheGet<CachedRecommendations>('recs:user-123');
 * if (result) {
 *   console.log('Cache hit:', result.data);
 * }
 * ```
 */
export async function cacheGet<T>(
  key: string
): Promise<{ data: T; metadata: CacheMetadata } | null> {
  const config = getCacheConfig();

  if (!config.enabled) {
    // Cache disabled - return null to trigger fallback
    return null;
  }

  try {
    const entry = await kv.get<SerializedCacheEntry<T>>(key);

    if (!entry) {
      return null;
    }

    return deserialize(entry);
  } catch (error) {
    // Log error but don't throw - graceful degradation
    console.warn(`[cache] GET failed for key ${key}:`, error);
    return null;
  }
}

/**
 * Sets a value in Vercel KV cache with TTL
 *
 * Handles errors gracefully - logs and continues instead of throwing.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Optional settings (TTL, source)
 * @returns Operation result
 *
 * @example
 * ```typescript
 * await cacheSet('recs:user-123', recommendations, {
 *   ttlSeconds: 86400,
 *   source: 'overnight-job'
 * });
 * ```
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options?: {
    ttlSeconds?: number;
    source?: string;
  }
): Promise<CacheOperationResult<void>> {
  const config = getCacheConfig();

  if (!config.enabled) {
    // Cache disabled - operation "succeeds" but does nothing
    return { success: true };
  }

  const ttlSeconds = options?.ttlSeconds ?? config.defaultTtlSeconds;
  const source = options?.source ?? "manual";

  const now = new Date();
  const metadata: CacheMetadata = {
    cachedAt: now,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    ttlSeconds,
    source,
  };

  try {
    const entry = serialize(value, metadata);
    await kv.set(key, entry, { ex: ttlSeconds });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[cache] SET failed for key ${key}:`, error);
    return { success: false, error: message };
  }
}

/**
 * Deletes a value from Vercel KV cache
 *
 * Handles errors gracefully.
 *
 * @param key - Cache key to delete
 * @returns Operation result
 */
export async function cacheDel(key: string): Promise<CacheOperationResult<void>> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return { success: true };
  }

  try {
    await kv.del(key);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[cache] DEL failed for key ${key}:`, error);
    return { success: false, error: message };
  }
}

/**
 * Deletes multiple keys from Vercel KV cache
 *
 * @param keys - Array of cache keys to delete
 * @returns Operation result with count of deleted keys
 */
export async function cacheDelMultiple(
  keys: string[]
): Promise<CacheOperationResult<{ deleted: number }>> {
  const config = getCacheConfig();

  if (!config.enabled || keys.length === 0) {
    return { success: true, data: { deleted: 0 } };
  }

  try {
    // Delete keys one by one (Vercel KV doesn't have bulk delete)
    let deleted = 0;
    for (const key of keys) {
      try {
        await kv.del(key);
        deleted++;
      } catch {
        // Continue with other keys even if one fails
      }
    }
    return { success: true, data: { deleted } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[cache] DEL_MULTIPLE failed:`, error);
    return { success: false, error: message };
  }
}

/**
 * Checks if a key exists in cache
 *
 * @param key - Cache key to check
 * @returns true if key exists, false otherwise
 */
export async function cacheExists(key: string): Promise<boolean> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return false;
  }

  try {
    const exists = await kv.exists(key);
    return exists === 1;
  } catch (error) {
    console.warn(`[cache] EXISTS failed for key ${key}:`, error);
    return false;
  }
}
