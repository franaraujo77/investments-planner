/**
 * Cache Service
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC1: Recommendations stored in Vercel KV are retrieved in <100ms
 * AC4: Cache miss falls back to PostgreSQL
 * AC5: Cache utilities provide get/set/delete operations
 *
 * Main cache service providing unified interface for cache operations.
 * Implements graceful degradation - errors never break the application.
 *
 * @module @/lib/cache/service
 */

import { cacheGet, cacheSet, cacheDel, cacheDelMultiple } from "./client";
import { getCacheConfig, DEFAULT_TTL_SECONDS } from "./config";
import type { CacheMetadata } from "./types";

// =============================================================================
// CACHE SERVICE CLASS
// =============================================================================

/**
 * Cache Service
 *
 * Provides unified interface for cache operations with:
 * - Type-safe get/set/delete operations
 * - Graceful error handling
 * - Configurable TTL
 * - Singleton instance for consistent usage
 */
export class CacheService {
  private defaultTtlSeconds: number;

  constructor(ttlSeconds: number = DEFAULT_TTL_SECONDS) {
    this.defaultTtlSeconds = ttlSeconds;
  }

  /**
   * Checks if caching is currently enabled
   */
  isEnabled(): boolean {
    return getCacheConfig().enabled;
  }

  /**
   * Gets a value from cache
   *
   * @param key - Cache key
   * @returns Cached value with metadata, or null if not found
   */
  async get<T>(key: string): Promise<{ data: T; metadata: CacheMetadata } | null> {
    return cacheGet<T>(key);
  }

  /**
   * Sets a value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Optional TTL override
   * @param source - Optional source identifier
   */
  async set<T>(key: string, value: T, ttlSeconds?: number, source?: string): Promise<void> {
    await cacheSet(key, value, {
      ttlSeconds: ttlSeconds ?? this.defaultTtlSeconds,
      source: source ?? "cache-service",
    });
  }

  /**
   * Deletes a value from cache
   *
   * @param key - Cache key to delete
   */
  async del(key: string): Promise<void> {
    await cacheDel(key);
  }

  /**
   * Deletes multiple keys from cache
   *
   * @param keys - Array of cache keys to delete
   */
  async delMultiple(keys: string[]): Promise<void> {
    await cacheDelMultiple(keys);
  }

  /**
   * Gets or sets a value using a factory function
   *
   * If the value exists in cache, returns it.
   * If not, calls the factory function to get the value,
   * caches it, and returns it.
   *
   * @param key - Cache key
   * @param factory - Function to call on cache miss
   * @param ttlSeconds - Optional TTL override
   * @returns The cached or freshly computed value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = await this.get<T>(key);

    if (cached) {
      return { data: cached.data, fromCache: true };
    }

    const data = await factory();
    await this.set(key, data, ttlSeconds);
    return { data, fromCache: false };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default cache service instance
 *
 * Use this singleton for consistent cache operations throughout the app.
 *
 * @example
 * ```typescript
 * import { cacheService } from '@/lib/cache';
 *
 * const result = await cacheService.get<MyData>('my-key');
 * ```
 */
export const cacheService = new CacheService();
