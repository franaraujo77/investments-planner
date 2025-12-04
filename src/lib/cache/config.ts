/**
 * Cache Configuration Module
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC3: TTL is set to 24 hours
 *
 * Reads configuration from environment variables and provides
 * typed configuration objects for cache operations.
 *
 * @module @/lib/cache/config
 */

// =============================================================================
// CONFIGURATION INTERFACE
// =============================================================================

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  /** Default TTL in seconds for cache entries */
  defaultTtlSeconds: number;
  /** Whether caching is enabled (KV credentials present) */
  enabled: boolean;
  /** KV REST API URL */
  kvRestApiUrl: string | undefined;
  /** KV REST API token */
  kvRestApiToken: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default TTL: 24 hours in seconds
 *
 * Aligns with overnight processing schedule - cache is refreshed nightly.
 */
export const DEFAULT_TTL_SECONDS = 86400;

/**
 * Cache key prefixes for namespacing
 */
export const CACHE_KEY_PREFIXES = {
  /** Recommendations cache prefix */
  RECOMMENDATIONS: "recs:",
  /** Portfolio cache prefix */
  PORTFOLIO: "portfolio:",
  /** Allocation cache prefix */
  ALLOCATION: "allocation:",
  /** Rate limit by IP prefix */
  RATE_LIMIT_IP: "rate-limit:ip:",
  /** Rate limit by email prefix */
  RATE_LIMIT_EMAIL: "rate-limit:email:",
} as const;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  /** KV REST API URL */
  KV_REST_API_URL: "KV_REST_API_URL",
  /** KV REST API token */
  KV_REST_API_TOKEN: "KV_REST_API_TOKEN",
  /** Cache TTL override */
  CACHE_TTL_SECONDS: "CACHE_TTL_SECONDS",
} as const;

// =============================================================================
// CONFIGURATION GETTER
// =============================================================================

/**
 * Gets the cache configuration from environment variables
 *
 * Configuration is read from:
 * - KV_REST_API_URL: Vercel KV REST API URL (required for caching)
 * - KV_REST_API_TOKEN: Vercel KV REST API token (required for caching)
 * - CACHE_TTL_SECONDS: Override default TTL (optional, default: 86400)
 *
 * If KV credentials are not set, caching is disabled and
 * operations fall back to PostgreSQL per AC4.
 *
 * @returns CacheConfig - The resolved cache configuration
 *
 * @example
 * ```typescript
 * const config = getCacheConfig();
 * if (config.enabled) {
 *   // Use Vercel KV for caching
 * } else {
 *   // Fall back to PostgreSQL
 * }
 * ```
 */
export function getCacheConfig(): CacheConfig {
  const kvRestApiUrl = process.env[ENV_VARS.KV_REST_API_URL];
  const kvRestApiToken = process.env[ENV_VARS.KV_REST_API_TOKEN];
  const ttlOverride = process.env[ENV_VARS.CACHE_TTL_SECONDS];

  // Parse TTL override if provided
  let defaultTtlSeconds = DEFAULT_TTL_SECONDS;
  if (ttlOverride) {
    const parsed = parseInt(ttlOverride, 10);
    if (!isNaN(parsed) && parsed > 0) {
      defaultTtlSeconds = parsed;
    }
  }

  // Caching is enabled only if both KV credentials are present
  const enabled =
    kvRestApiUrl !== undefined &&
    kvRestApiUrl.trim() !== "" &&
    kvRestApiToken !== undefined &&
    kvRestApiToken.trim() !== "";

  return {
    defaultTtlSeconds,
    enabled,
    kvRestApiUrl,
    kvRestApiToken,
  };
}

/**
 * Checks if caching is enabled based on current configuration
 *
 * @returns boolean - true if Vercel KV caching is enabled
 */
export function isCacheEnabled(): boolean {
  return getCacheConfig().enabled;
}
