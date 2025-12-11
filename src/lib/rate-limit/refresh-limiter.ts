/**
 * Refresh Rate Limiter
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.4: Rate Limit of 5 Refreshes Per Hour Per User
 * AC-6.6.5: Rate Limit Exceeded Shows Countdown
 *
 * Implements token bucket rate limiting for data refresh operations.
 * Uses Vercel KV for storage with 1-hour TTL per user.
 *
 * @module @/lib/rate-limit/refresh-limiter
 */

import { cacheService } from "@/lib/cache";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum refreshes allowed per hour per user */
export const MAX_REFRESHES_PER_HOUR = 5;

/** Rate limit window in seconds (1 hour) */
export const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 3600 seconds = 1 hour

/** Cache key prefix for rate limit tracking */
export const RATE_LIMIT_KEY_PREFIX = "refresh-limit";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of refreshes remaining in the current window */
  remaining: number;
  /** When the rate limit window resets */
  resetAt: Date;
}

/**
 * Stored rate limit data in cache
 */
interface RateLimitData {
  /** Number of refreshes used in the current window */
  count: number;
  /** When the window started (ISO string) */
  windowStart: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate cache key for user rate limit
 *
 * @param userId - User ID
 * @returns Cache key
 */
export function generateRateLimitKey(userId: string): string {
  return `${RATE_LIMIT_KEY_PREFIX}:${userId}`;
}

/**
 * Calculate reset time from window start
 *
 * @param windowStart - When the window started
 * @returns Reset time
 */
function calculateResetAt(windowStart: Date, windowSeconds: number): Date {
  return new Date(windowStart.getTime() + windowSeconds * 1000);
}

// =============================================================================
// REFRESH RATE LIMITER CLASS
// =============================================================================

/**
 * RefreshRateLimiter
 *
 * Manages rate limiting for data refresh operations using token bucket algorithm.
 * Each user gets MAX_REFRESHES_PER_HOUR refreshes per rolling hour window.
 *
 * Storage: Vercel KV with automatic TTL expiration
 *
 * @example
 * ```typescript
 * const limiter = new RefreshRateLimiter();
 *
 * // Check if user can refresh
 * const { allowed, remaining, resetAt } = await limiter.checkLimit(userId);
 *
 * if (allowed) {
 *   await limiter.recordRefresh(userId);
 *   // Perform refresh
 * } else {
 *   // Return 429 with countdown to resetAt
 * }
 * ```
 */
export class RefreshRateLimiter {
  private maxRefreshes: number;
  private windowSeconds: number;

  constructor(
    maxRefreshes: number = MAX_REFRESHES_PER_HOUR,
    windowSeconds: number = RATE_LIMIT_WINDOW_SECONDS
  ) {
    this.maxRefreshes = maxRefreshes;
    this.windowSeconds = windowSeconds;
  }

  /**
   * Check if user is within rate limit
   *
   * AC-6.6.4: System tracks refresh count per hour
   * AC-6.6.5: Returns countdown to reset time
   *
   * @param userId - User ID to check
   * @returns Rate limit check result with allowed, remaining, and resetAt
   */
  async checkLimit(userId: string): Promise<RateLimitCheckResult> {
    const key = generateRateLimitKey(userId);

    try {
      const cached = await cacheService.get<RateLimitData>(key);
      const now = new Date();

      // No cached data - first request, user is allowed
      if (!cached) {
        logger.debug("Rate limit check: no existing data", {
          userId,
          allowed: true,
          remaining: this.maxRefreshes,
        });

        return {
          allowed: true,
          remaining: this.maxRefreshes,
          resetAt: calculateResetAt(now, this.windowSeconds),
        };
      }

      const data = cached.data;
      const windowStart = new Date(data.windowStart);
      const resetAt = calculateResetAt(windowStart, this.windowSeconds);

      // Check if window has expired (should not happen with TTL, but handle it)
      if (now >= resetAt) {
        logger.debug("Rate limit check: window expired", {
          userId,
          allowed: true,
          remaining: this.maxRefreshes,
        });

        return {
          allowed: true,
          remaining: this.maxRefreshes,
          resetAt: calculateResetAt(now, this.windowSeconds),
        };
      }

      // Window is active - check count
      const remaining = Math.max(0, this.maxRefreshes - data.count);
      const allowed = remaining > 0;

      logger.debug("Rate limit check", {
        userId,
        count: data.count,
        allowed,
        remaining,
        resetAt: resetAt.toISOString(),
      });

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch (error) {
      // On cache errors, allow the request (fail open)
      // This prevents cache issues from blocking all refresh operations
      logger.warn("Rate limit check failed, allowing request", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        allowed: true,
        remaining: this.maxRefreshes,
        resetAt: calculateResetAt(new Date(), this.windowSeconds),
      };
    }
  }

  /**
   * Record a refresh operation for rate limiting
   *
   * AC-6.6.4: Track refresh count per hour
   *
   * Should be called AFTER the refresh is successful.
   *
   * @param userId - User ID to record refresh for
   */
  async recordRefresh(userId: string): Promise<void> {
    const key = generateRateLimitKey(userId);

    try {
      const cached = await cacheService.get<RateLimitData>(key);
      const now = new Date();

      let newCount: number;
      let windowStart: Date;

      if (cached) {
        const data = cached.data;
        const existingWindowStart = new Date(data.windowStart);
        const resetAt = calculateResetAt(existingWindowStart, this.windowSeconds);

        // Check if window is still active
        if (now < resetAt) {
          // Increment count in existing window
          newCount = data.count + 1;
          windowStart = existingWindowStart;
        } else {
          // Start new window
          newCount = 1;
          windowStart = now;
        }
      } else {
        // First refresh - start new window
        newCount = 1;
        windowStart = now;
      }

      // Calculate remaining TTL for the window
      const resetAt = calculateResetAt(windowStart, this.windowSeconds);
      const remainingTtl = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));

      // Store updated data with TTL
      const newData: RateLimitData = {
        count: newCount,
        windowStart: windowStart.toISOString(),
      };

      await cacheService.set(key, newData, remainingTtl, "refresh-limiter");

      logger.info("Refresh recorded for rate limiting", {
        userId,
        count: newCount,
        remaining: Math.max(0, this.maxRefreshes - newCount),
        resetAt: resetAt.toISOString(),
      });
    } catch (error) {
      // Log but don't throw - recording failure shouldn't block the refresh
      logger.error("Failed to record refresh for rate limiting", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current rate limit status for a user
   *
   * Similar to checkLimit but doesn't affect the count.
   * Useful for displaying remaining refreshes to the user.
   *
   * @param userId - User ID to check
   * @returns Current rate limit status
   */
  async getStatus(userId: string): Promise<RateLimitCheckResult> {
    return this.checkLimit(userId);
  }

  /**
   * Reset rate limit for a user (admin operation)
   *
   * @param userId - User ID to reset
   */
  async reset(userId: string): Promise<void> {
    const key = generateRateLimitKey(userId);

    try {
      await cacheService.del(key);
      logger.info("Rate limit reset for user", { userId });
    } catch (error) {
      logger.error("Failed to reset rate limit", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default refresh rate limiter instance
 *
 * @example
 * ```typescript
 * import { refreshRateLimiter } from '@/lib/rate-limit/refresh-limiter';
 *
 * const { allowed, remaining, resetAt } = await refreshRateLimiter.checkLimit(userId);
 * ```
 */
export const refreshRateLimiter = new RefreshRateLimiter();
