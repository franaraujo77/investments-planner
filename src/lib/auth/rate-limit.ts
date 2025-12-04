/**
 * Rate Limiting
 *
 * Unified rate limiter with KV (production) and in-memory (fallback) support.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC5: Failed login attempts are rate-limited (5 per hour per IP)
 *
 * Production: Uses Vercel KV for persistence across serverless instances
 * Development/Fallback: Uses in-memory Map when KV is unavailable
 */

import { AUTH_CONSTANTS } from "./constants";
import type { RateLimitResult } from "./types";
import { getCacheConfig } from "@/lib/cache/config";
import { logger } from "@/lib/telemetry/logger";
import {
  checkRateLimitKV,
  recordFailedAttemptKV,
  clearRateLimitKV,
  checkEmailRateLimitKV,
  recordEmailResendAttemptKV,
} from "./rate-limit-kv";

/**
 * Rate limit entry for a single IP
 */
interface RateLimitEntry {
  /** Number of failed attempts */
  attempts: number;
  /** Timestamp of first attempt in window */
  windowStart: number;
}

/**
 * In-memory store for rate limit data
 * Key: IP address, Value: Rate limit entry
 *
 * NOTE: This will reset on server restart and doesn't share
 * state between serverless function instances.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleans up expired rate limit entries
 *
 * Called periodically to prevent memory leaks.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart >= AUTH_CONSTANTS.RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 10 * 60 * 1000);
}

/**
 * Checks if an IP is rate limited (in-memory implementation)
 *
 * @internal Used as fallback when KV is unavailable
 */
function checkRateLimitInMemory(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    return {
      allowed: true,
      remaining: AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS,
    };
  }

  const windowExpired = now - entry.windowStart >= AUTH_CONSTANTS.RATE_LIMIT_WINDOW_MS;

  if (windowExpired) {
    rateLimitStore.delete(ip);
    return {
      allowed: true,
      remaining: AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS,
    };
  }

  if (entry.attempts >= AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil(
      (entry.windowStart + AUTH_CONSTANTS.RATE_LIMIT_WINDOW_MS - now) / 1000
    );
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: AUTH_CONSTANTS.RATE_LIMIT_MAX_ATTEMPTS - entry.attempts,
  };
}

/**
 * Checks if an IP is rate limited
 *
 * Rate limit: 5 failed attempts per hour per IP.
 * Uses Vercel KV in production, in-memory fallback in development.
 *
 * @param ip - IP address to check
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const config = getCacheConfig();

  if (config.enabled) {
    return checkRateLimitKV(ip);
  }

  return checkRateLimitInMemory(ip);
}

/**
 * Records a failed login attempt (in-memory implementation)
 *
 * @internal Used as fallback when KV is unavailable
 */
function recordFailedAttemptInMemory(ip: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    rateLimitStore.set(ip, {
      attempts: 1,
      windowStart: now,
    });
    return;
  }

  const windowExpired = now - entry.windowStart >= AUTH_CONSTANTS.RATE_LIMIT_WINDOW_MS;

  if (windowExpired) {
    rateLimitStore.set(ip, {
      attempts: 1,
      windowStart: now,
    });
  } else {
    entry.attempts += 1;
  }
}

/**
 * Records a failed login attempt for an IP
 *
 * Increments the failure counter. If this is the first attempt
 * in a new window, starts a new window.
 * Uses Vercel KV in production, in-memory fallback in development.
 *
 * @param ip - IP address to record attempt for
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
  const config = getCacheConfig();

  if (config.enabled) {
    return recordFailedAttemptKV(ip);
  }

  recordFailedAttemptInMemory(ip);
}

/**
 * Clears rate limit for an IP (in-memory implementation)
 *
 * @internal Used as fallback when KV is unavailable
 */
function clearRateLimitInMemory(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Clears rate limit for an IP
 *
 * Called on successful login to reset the failure counter.
 * Uses Vercel KV in production, in-memory fallback in development.
 *
 * @param ip - IP address to clear
 */
export async function clearRateLimit(ip: string): Promise<void> {
  const config = getCacheConfig();

  if (config.enabled) {
    return clearRateLimitKV(ip);
  }

  clearRateLimitInMemory(ip);
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 *
 * @param ip - String to validate
 * @returns true if valid IP address
 */
function isValidIp(ip: string): boolean {
  // IPv4 pattern: 0-255 for each octet
  const ipv4Pattern =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 pattern: simplified check for valid hex groups
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  // IPv6 compressed pattern (with ::)
  const ipv6CompressedPattern = /^(?:[0-9a-fA-F]{1,4}:)*(?::[0-9a-fA-F]{1,4})*$/;

  return (
    ipv4Pattern.test(ip) ||
    ipv6Pattern.test(ip) ||
    (ipv6CompressedPattern.test(ip) && ip.includes("::"))
  );
}

/**
 * Sanitizes and validates an IP address from a header value
 *
 * @param ip - Raw IP string from header
 * @returns Validated IP or null if invalid
 */
function validateAndSanitizeIp(ip: string | null): string | null {
  if (!ip) return null;

  // Trim whitespace
  const trimmed = ip.trim();

  // Reject if empty after trim
  if (!trimmed) return null;

  // Reject if contains suspicious characters (potential injection)
  if (/[<>"'`;\\]/.test(trimmed)) {
    logger.warn("Suspicious IP address rejected", { rawIp: trimmed.slice(0, 50) });
    return null;
  }

  // Validate IP format
  if (!isValidIp(trimmed)) {
    logger.debug("Invalid IP format rejected", { rawIp: trimmed.slice(0, 50) });
    return null;
  }

  return trimmed;
}

/**
 * Gets IP address from Next.js request
 *
 * Checks common headers for proxy/load balancer scenarios.
 * Validates IP format to prevent header spoofing attacks.
 *
 * Trusted Headers (in order of priority):
 * 1. X-Forwarded-For - Standard proxy header (first IP in chain)
 * 2. X-Real-IP - nginx proxy header
 * 3. CF-Connecting-IP - Cloudflare header
 *
 * Note: On Vercel, X-Forwarded-For is populated by Vercel's edge network
 * and can be trusted. For other deployments, ensure your load balancer
 * is configured to set these headers correctly.
 *
 * @param request - Next.js request object
 * @returns Validated IP address string
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (common with proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the list (client IP)
    const firstIp = forwardedFor.split(",")[0];
    const validatedIp = validateAndSanitizeIp(firstIp ?? null);
    if (validatedIp) {
      return validatedIp;
    }
  }

  // Check X-Real-IP header (nginx)
  const realIp = request.headers.get("x-real-ip");
  const validatedRealIp = validateAndSanitizeIp(realIp);
  if (validatedRealIp) {
    return validatedRealIp;
  }

  // Check CF-Connecting-IP header (Cloudflare)
  const cfIp = request.headers.get("cf-connecting-ip");
  const validatedCfIp = validateAndSanitizeIp(cfIp);
  if (validatedCfIp) {
    return validatedCfIp;
  }

  // Fallback to localhost for development
  return "127.0.0.1";
}

/**
 * Resets the rate limit store (for testing)
 *
 * @internal
 */
export function _resetRateLimitStore(): void {
  rateLimitStore.clear();
}

// =============================================================================
// EMAIL-BASED RATE LIMITING
// Story 2.2: Email Verification - Rate limit resend requests by email
// =============================================================================

/**
 * Email-based rate limit configuration
 */
const EMAIL_RATE_LIMIT = {
  /** Maximum resend attempts per hour per email */
  MAX_RESEND_ATTEMPTS: 3,
  /** Rate limit window: 1 hour in milliseconds */
  WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * In-memory store for email rate limit data
 * Key: Email address (lowercase), Value: Rate limit entry
 */
const emailRateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleans up expired email rate limit entries
 */
function cleanupExpiredEmailEntries(): void {
  const now = Date.now();

  for (const [email, entry] of emailRateLimitStore.entries()) {
    if (now - entry.windowStart >= EMAIL_RATE_LIMIT.WINDOW_MS) {
      emailRateLimitStore.delete(email);
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEmailEntries, 10 * 60 * 1000);
}

/**
 * Checks if an email is rate limited (in-memory implementation)
 *
 * @internal Used as fallback when KV is unavailable
 */
function checkEmailRateLimitInMemory(email: string): RateLimitResult {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const entry = emailRateLimitStore.get(normalizedEmail);

  if (!entry) {
    return {
      allowed: true,
      remaining: EMAIL_RATE_LIMIT.MAX_RESEND_ATTEMPTS,
    };
  }

  const windowExpired = now - entry.windowStart >= EMAIL_RATE_LIMIT.WINDOW_MS;

  if (windowExpired) {
    emailRateLimitStore.delete(normalizedEmail);
    return {
      allowed: true,
      remaining: EMAIL_RATE_LIMIT.MAX_RESEND_ATTEMPTS,
    };
  }

  if (entry.attempts >= EMAIL_RATE_LIMIT.MAX_RESEND_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.windowStart + EMAIL_RATE_LIMIT.WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: EMAIL_RATE_LIMIT.MAX_RESEND_ATTEMPTS - entry.attempts,
  };
}

/**
 * Checks if an email is rate limited for resend requests
 *
 * Rate limit: 3 resend attempts per hour per email.
 * Uses Vercel KV in production, in-memory fallback in development.
 *
 * @param email - Email address to check
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkEmailRateLimit(email: string): Promise<RateLimitResult> {
  const config = getCacheConfig();

  if (config.enabled) {
    return checkEmailRateLimitKV(email);
  }

  return checkEmailRateLimitInMemory(email);
}

/**
 * Records a resend attempt (in-memory implementation)
 *
 * @internal Used as fallback when KV is unavailable
 */
function recordEmailResendAttemptInMemory(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const entry = emailRateLimitStore.get(normalizedEmail);

  if (!entry) {
    emailRateLimitStore.set(normalizedEmail, {
      attempts: 1,
      windowStart: now,
    });
    return;
  }

  const windowExpired = now - entry.windowStart >= EMAIL_RATE_LIMIT.WINDOW_MS;

  if (windowExpired) {
    emailRateLimitStore.set(normalizedEmail, {
      attempts: 1,
      windowStart: now,
    });
  } else {
    entry.attempts += 1;
  }
}

/**
 * Records a resend attempt for an email
 *
 * Uses Vercel KV in production, in-memory fallback in development.
 *
 * @param email - Email address to record attempt for
 */
export async function recordEmailResendAttempt(email: string): Promise<void> {
  const config = getCacheConfig();

  if (config.enabled) {
    return recordEmailResendAttemptKV(email);
  }

  recordEmailResendAttemptInMemory(email);
}

/**
 * Resets the email rate limit store (for testing)
 *
 * @internal
 */
export function _resetEmailRateLimitStore(): void {
  emailRateLimitStore.clear();
}
