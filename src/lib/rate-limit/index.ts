/**
 * Rate Limit Module
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.4: Rate Limit of 5 Refreshes Per Hour Per User
 *
 * @module @/lib/rate-limit
 */

export {
  RefreshRateLimiter,
  refreshRateLimiter,
  generateRateLimitKey,
  MAX_REFRESHES_PER_HOUR,
  RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMIT_KEY_PREFIX,
  type RateLimitCheckResult,
} from "./refresh-limiter";
