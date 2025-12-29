/**
 * Dev-Only: Clear Rate Limits API
 *
 * This endpoint clears rate limit stores for E2E testing.
 * Only available in development mode.
 *
 * Clears both:
 * - In-memory rate limit stores (fallback mode)
 * - KV-based rate limits (production mode)
 */

import { NextResponse } from "next/server";
import { _resetRateLimitStore, _resetEmailRateLimitStore } from "@/lib/auth/rate-limit";
import { clearRateLimitKV, clearEmailRateLimitKV } from "@/lib/auth/rate-limit-kv";
import { getCacheConfig } from "@/lib/cache/config";

// Common localhost IPs used in development
const LOCALHOST_IPS = ["127.0.0.1", "::1", "localhost"];

// Test user email - must match fixtures/auth.ts
const TEST_USER_EMAIL = "e2e-test@example.com";

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  // Clear in-memory stores (for fallback mode)
  _resetRateLimitStore();
  _resetEmailRateLimitStore();

  // Also clear KV-based rate limits if KV is enabled
  const config = getCacheConfig();
  if (config.enabled) {
    // Clear IP-based rate limits for localhost
    await Promise.all(LOCALHOST_IPS.map((ip) => clearRateLimitKV(ip)));

    // Clear email-based rate limits for test user
    await clearEmailRateLimitKV(TEST_USER_EMAIL);
  }

  return NextResponse.json({
    message: "Rate limits cleared",
    kvEnabled: config.enabled,
    clearedIps: LOCALHOST_IPS,
    clearedEmails: [TEST_USER_EMAIL],
    timestamp: new Date().toISOString(),
  });
}
