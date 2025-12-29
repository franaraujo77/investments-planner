/**
 * Rate Limiting Tests
 *
 * Tests for Story 1.3 AC5: Failed login attempts are rate-limited (5 per hour per IP)
 *
 * NOTE: These tests require Vitest (Story 1.7) to be installed.
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock cache config to use in-memory fallback
vi.mock("@/lib/cache/config", () => ({
  getCacheConfig: vi.fn(() => ({ enabled: false })),
}));

// Mock logger to prevent console output in tests
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  _resetRateLimitStore,
} from "@/lib/auth/rate-limit";

describe("Rate Limiting (AC: 5)", () => {
  beforeEach(() => {
    // Reset rate limit store before each test
    _resetRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow first request from new IP", async () => {
      const result = await checkRateLimit("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("should allow up to 5 attempts within window", async () => {
      const ip = "192.168.1.2";

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await recordFailedAttempt(ip);
      }

      // 5th attempt should still be allowed
      const result = await checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("should block after 5 failed attempts", async () => {
      const ip = "192.168.1.3";

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ip);
      }

      // 6th attempt should be blocked
      const result = await checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should return correct retryAfter time (AC-1.2.5: 15min lockout)", async () => {
      const ip = "192.168.1.4";

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ip);
      }

      const result = await checkRateLimit(ip);

      // retryAfter should be close to 15 minutes (900 seconds) per AC-1.2.5
      expect(result.retryAfter).toBeLessThanOrEqual(900);
      expect(result.retryAfter).toBeGreaterThan(850);
    });
  });

  describe("recordFailedAttempt", () => {
    it("should increment attempt counter", async () => {
      const ip = "192.168.1.5";

      await recordFailedAttempt(ip);
      let result = await checkRateLimit(ip);
      expect(result.remaining).toBe(4);

      await recordFailedAttempt(ip);
      result = await checkRateLimit(ip);
      expect(result.remaining).toBe(3);
    });

    it("should track different IPs separately", async () => {
      const ip1 = "192.168.1.6";
      const ip2 = "192.168.1.7";

      // Record attempts for ip1
      await recordFailedAttempt(ip1);
      await recordFailedAttempt(ip1);
      await recordFailedAttempt(ip1);

      // ip2 should still have full quota
      const result2 = await checkRateLimit(ip2);
      expect(result2.remaining).toBe(5);

      // ip1 should have reduced quota
      const result1 = await checkRateLimit(ip1);
      expect(result1.remaining).toBe(2);
    });
  });

  describe("clearRateLimit", () => {
    it("should reset counter on successful login", async () => {
      const ip = "192.168.1.8";

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await recordFailedAttempt(ip);
      }

      // Verify reduced quota
      let result = await checkRateLimit(ip);
      expect(result.remaining).toBe(1);

      // Clear on successful login
      await clearRateLimit(ip);

      // Should have full quota again
      result = await checkRateLimit(ip);
      expect(result.remaining).toBe(5);
    });
  });

  describe("Window Expiry", () => {
    it("should reset after 1 hour", async () => {
      vi.useFakeTimers();
      const ip = "192.168.1.9";

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ip);
      }

      // Should be blocked
      let result = await checkRateLimit(ip);
      expect(result.allowed).toBe(false);

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // Should be allowed again
      result = await checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("should start new window after expiry", async () => {
      vi.useFakeTimers();
      const ip = "192.168.1.10";

      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await recordFailedAttempt(ip);
      }

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // Record new attempt (should start fresh window)
      await recordFailedAttempt(ip);

      // Should have 4 remaining (5 - 1)
      const result = await checkRateLimit(ip);
      expect(result.remaining).toBe(4);
    });
  });
});

// =============================================================================
// EMAIL-BASED RATE LIMITING TESTS
// Story 1.3: Password Reset Flow - Rate limit forgot-password by email
// =============================================================================

import {
  checkEmailRateLimit,
  recordEmailResendAttempt,
  _resetEmailRateLimitStore,
} from "@/lib/auth/rate-limit";

describe("Email-Based Rate Limiting (Story 1.3: Password Reset)", () => {
  beforeEach(() => {
    // Reset email rate limit store before each test
    _resetEmailRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkEmailRateLimit", () => {
    it("should allow first request for new email", async () => {
      const result = await checkEmailRateLimit("test@example.com");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it("should normalize email to lowercase", async () => {
      await recordEmailResendAttempt("TEST@EXAMPLE.COM");

      // Check with different case - should see the attempt
      const result = await checkEmailRateLimit("test@example.com");
      expect(result.remaining).toBe(2);
    });

    it("should allow up to 3 attempts within window", async () => {
      const email = "user@example.com";

      // Record 2 attempts
      await recordEmailResendAttempt(email);
      await recordEmailResendAttempt(email);

      // 3rd attempt should still be allowed
      const result = await checkEmailRateLimit(email);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("should block after 3 attempts", async () => {
      const email = "blocked@example.com";

      // Record 3 attempts
      for (let i = 0; i < 3; i++) {
        await recordEmailResendAttempt(email);
      }

      // 4th attempt should be blocked
      const result = await checkEmailRateLimit(email);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should return correct retryAfter time (close to 1 hour)", async () => {
      const email = "timing@example.com";

      // Record 3 attempts
      for (let i = 0; i < 3; i++) {
        await recordEmailResendAttempt(email);
      }

      const result = await checkEmailRateLimit(email);

      // retryAfter should be close to 1 hour (3600 seconds)
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
      expect(result.retryAfter).toBeGreaterThan(3550);
    });
  });

  describe("recordEmailResendAttempt", () => {
    it("should increment attempt counter", async () => {
      const email = "counter@example.com";

      await recordEmailResendAttempt(email);
      let result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(2);

      await recordEmailResendAttempt(email);
      result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(1);
    });

    it("should track different emails separately", async () => {
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";

      // Record attempts for email1
      await recordEmailResendAttempt(email1);
      await recordEmailResendAttempt(email1);

      // email2 should still have full quota
      const result2 = await checkEmailRateLimit(email2);
      expect(result2.remaining).toBe(3);

      // email1 should have reduced quota
      const result1 = await checkEmailRateLimit(email1);
      expect(result1.remaining).toBe(1);
    });

    it("should trim whitespace from email", async () => {
      await recordEmailResendAttempt("  spaced@example.com  ");

      const result = await checkEmailRateLimit("spaced@example.com");
      expect(result.remaining).toBe(2);
    });
  });

  describe("Email Rate Limit Window Expiry", () => {
    it("should reset after 1 hour", async () => {
      vi.useFakeTimers();
      const email = "expiry@example.com";

      // Record 3 attempts (max)
      for (let i = 0; i < 3; i++) {
        await recordEmailResendAttempt(email);
      }

      // Should be blocked
      let result = await checkEmailRateLimit(email);
      expect(result.allowed).toBe(false);

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // Should be allowed again
      result = await checkEmailRateLimit(email);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it("should start new window after expiry", async () => {
      vi.useFakeTimers();
      const email = "newwindow@example.com";

      // Record 2 attempts
      await recordEmailResendAttempt(email);
      await recordEmailResendAttempt(email);

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // Record new attempt (should start fresh window)
      await recordEmailResendAttempt(email);

      // Should have 2 remaining (3 - 1)
      const result = await checkEmailRateLimit(email);
      expect(result.remaining).toBe(2);
    });
  });
});
