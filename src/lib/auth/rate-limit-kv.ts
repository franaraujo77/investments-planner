/**
 * Rate Limiting with Vercel KV
 *
 * Production-ready rate limiter using Vercel KV for persistence.
 * Replaces in-memory implementation for serverless environments.
 *
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 * AC5: Failed login attempts are rate-limited (5 per hour per IP)
 *
 * Story 2.2: Email Verification - Rate limit resend requests by email
 */

import { kv } from "@vercel/kv";
import { AUTH_CONSTANTS } from "./constants";
import type { RateLimitResult } from "./types";
import { createRateLimitIpKey, createRateLimitEmailKey } from "@/lib/cache/keys";
import { getCacheConfig } from "@/lib/cache/config";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rate limit entry stored in KV
 */
interface RateLimitEntry {
  /** Number of failed attempts */
  attempts: number;
  /** Timestamp of first attempt in window (ms since epoch) */
  windowStart: number;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /** Maximum attempts allowed in window */
  maxAttempts: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Default rate limit config for login attempts (IP-based)
 */
const IP_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: AUTH_CONSTANTS.RATE_LIMIT_WINDOW_MS,
};

/**
 * Rate limit config for email resend attempts
 */
const EMAIL_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// =============================================================================
// CORE KV OPERATIONS
// =============================================================================

/**
 * Gets a rate limit entry from KV
 *
 * @param key - KV key
 * @returns Rate limit entry or null if not found
 */
async function getRateLimitEntry(key: string): Promise<RateLimitEntry | null> {
  try {
    return await kv.get<RateLimitEntry>(key);
  } catch (error) {
    // Log but don't throw - graceful degradation
    logger.warn("Rate limit KV GET failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Sets a rate limit entry in KV with TTL
 *
 * @param key - KV key
 * @param entry - Rate limit entry
 * @param ttlSeconds - TTL in seconds
 */
async function setRateLimitEntry(
  key: string,
  entry: RateLimitEntry,
  ttlSeconds: number
): Promise<void> {
  try {
    await kv.set(key, entry, { ex: ttlSeconds });
  } catch (error) {
    // Log but don't throw - graceful degradation
    logger.warn("Rate limit KV SET failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Deletes a rate limit entry from KV
 *
 * @param key - KV key
 */
async function deleteRateLimitEntry(key: string): Promise<void> {
  try {
    await kv.del(key);
  } catch (error) {
    // Log but don't throw - graceful degradation
    logger.warn("Rate limit KV DEL failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// =============================================================================
// GENERIC RATE LIMIT FUNCTIONS
// =============================================================================

/**
 * Checks if a key is rate limited
 *
 * @param key - KV key
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and retry info
 */
async function checkRateLimitByKey(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const entry = await getRateLimitEntry(key);

  // No entry means no previous attempts
  if (!entry) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
    };
  }

  // Check if window has expired
  const windowExpired = now - entry.windowStart >= config.windowMs;

  if (windowExpired) {
    // Window expired, allow request (entry will auto-expire via TTL)
    return {
      allowed: true,
      remaining: config.maxAttempts,
    };
  }

  // Window still active, check attempts
  if (entry.attempts >= config.maxAttempts) {
    // Rate limited
    const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Under limit
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.attempts,
  };
}

/**
 * Records a failed attempt for a key
 *
 * @param key - KV key
 * @param config - Rate limit configuration
 */
async function recordFailedAttemptByKey(key: string, config: RateLimitConfig): Promise<void> {
  const now = Date.now();
  const entry = await getRateLimitEntry(key);
  const ttlSeconds = Math.ceil(config.windowMs / 1000);

  if (!entry) {
    // First attempt, start new window
    await setRateLimitEntry(key, { attempts: 1, windowStart: now }, ttlSeconds);
    return;
  }

  // Check if window has expired
  const windowExpired = now - entry.windowStart >= config.windowMs;

  if (windowExpired) {
    // Start new window
    await setRateLimitEntry(key, { attempts: 1, windowStart: now }, ttlSeconds);
  } else {
    // Increment in existing window
    await setRateLimitEntry(
      key,
      { attempts: entry.attempts + 1, windowStart: entry.windowStart },
      ttlSeconds
    );
  }
}

/**
 * Clears rate limit for a key
 *
 * @param key - KV key
 */
async function clearRateLimitByKey(key: string): Promise<void> {
  await deleteRateLimitEntry(key);
}

// =============================================================================
// IP-BASED RATE LIMITING (Login attempts)
// =============================================================================

/**
 * Checks if an IP is rate limited for login attempts
 *
 * Rate limit: 5 failed attempts per hour per IP.
 *
 * @param ip - IP address to check
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkRateLimitKV(ip: string): Promise<RateLimitResult> {
  const config = getCacheConfig();

  // If KV is not enabled, allow all requests (fallback handled by caller)
  if (!config.enabled) {
    return {
      allowed: true,
      remaining: IP_RATE_LIMIT_CONFIG.maxAttempts,
    };
  }

  const key = createRateLimitIpKey(ip);
  return checkRateLimitByKey(key, IP_RATE_LIMIT_CONFIG);
}

/**
 * Records a failed login attempt for an IP
 *
 * @param ip - IP address to record attempt for
 */
export async function recordFailedAttemptKV(ip: string): Promise<void> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return;
  }

  const key = createRateLimitIpKey(ip);
  await recordFailedAttemptByKey(key, IP_RATE_LIMIT_CONFIG);
}

/**
 * Clears rate limit for an IP
 *
 * Called on successful login to reset the failure counter.
 *
 * @param ip - IP address to clear
 */
export async function clearRateLimitKV(ip: string): Promise<void> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return;
  }

  const key = createRateLimitIpKey(ip);
  await clearRateLimitByKey(key);
}

// =============================================================================
// EMAIL-BASED RATE LIMITING (Resend verification)
// =============================================================================

/**
 * Checks if an email is rate limited for resend requests
 *
 * Rate limit: 3 resend attempts per hour per email.
 *
 * @param email - Email address to check
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkEmailRateLimitKV(email: string): Promise<RateLimitResult> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return {
      allowed: true,
      remaining: EMAIL_RATE_LIMIT_CONFIG.maxAttempts,
    };
  }

  const key = createRateLimitEmailKey(email);
  return checkRateLimitByKey(key, EMAIL_RATE_LIMIT_CONFIG);
}

/**
 * Records a resend attempt for an email
 *
 * @param email - Email address to record attempt for
 */
export async function recordEmailResendAttemptKV(email: string): Promise<void> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return;
  }

  const key = createRateLimitEmailKey(email);
  await recordFailedAttemptByKey(key, EMAIL_RATE_LIMIT_CONFIG);
}

/**
 * Clears rate limit for an email
 *
 * @param email - Email address to clear
 */
export async function clearEmailRateLimitKV(email: string): Promise<void> {
  const config = getCacheConfig();

  if (!config.enabled) {
    return;
  }

  const key = createRateLimitEmailKey(email);
  await clearRateLimitByKey(key);
}
