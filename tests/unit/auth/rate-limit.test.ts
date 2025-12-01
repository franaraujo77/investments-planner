/**
 * Rate Limiting Tests
 *
 * Tests for Story 1.3 AC5: Failed login attempts are rate-limited (5 per hour per IP)
 *
 * NOTE: These tests require Vitest (Story 1.7) to be installed.
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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
    it("should allow first request from new IP", () => {
      const result = checkRateLimit("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("should allow up to 5 attempts within window", () => {
      const ip = "192.168.1.2";

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(ip);
      }

      // 5th attempt should still be allowed
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("should block after 5 failed attempts", () => {
      const ip = "192.168.1.3";

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(ip);
      }

      // 6th attempt should be blocked
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should return correct retryAfter time", () => {
      const ip = "192.168.1.4";

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(ip);
      }

      const result = checkRateLimit(ip);

      // retryAfter should be close to 1 hour (3600 seconds)
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
      expect(result.retryAfter).toBeGreaterThan(3500);
    });
  });

  describe("recordFailedAttempt", () => {
    it("should increment attempt counter", () => {
      const ip = "192.168.1.5";

      recordFailedAttempt(ip);
      let result = checkRateLimit(ip);
      expect(result.remaining).toBe(4);

      recordFailedAttempt(ip);
      result = checkRateLimit(ip);
      expect(result.remaining).toBe(3);
    });

    it("should track different IPs separately", () => {
      const ip1 = "192.168.1.6";
      const ip2 = "192.168.1.7";

      // Record attempts for ip1
      recordFailedAttempt(ip1);
      recordFailedAttempt(ip1);
      recordFailedAttempt(ip1);

      // ip2 should still have full quota
      const result2 = checkRateLimit(ip2);
      expect(result2.remaining).toBe(5);

      // ip1 should have reduced quota
      const result1 = checkRateLimit(ip1);
      expect(result1.remaining).toBe(2);
    });
  });

  describe("clearRateLimit", () => {
    it("should reset counter on successful login", () => {
      const ip = "192.168.1.8";

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(ip);
      }

      // Verify reduced quota
      let result = checkRateLimit(ip);
      expect(result.remaining).toBe(1);

      // Clear on successful login
      clearRateLimit(ip);

      // Should have full quota again
      result = checkRateLimit(ip);
      expect(result.remaining).toBe(5);
    });
  });

  describe("Window Expiry", () => {
    it("should reset after 1 hour", () => {
      vi.useFakeTimers();
      const ip = "192.168.1.9";

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(ip);
      }

      // Should be blocked
      let result = checkRateLimit(ip);
      expect(result.allowed).toBe(false);

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // Should be allowed again
      result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("should start new window after expiry", () => {
      vi.useFakeTimers();
      const ip = "192.168.1.10";

      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        recordFailedAttempt(ip);
      }

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // Record new attempt (should start fresh window)
      recordFailedAttempt(ip);

      // Should have 4 remaining (5 - 1)
      const result = checkRateLimit(ip);
      expect(result.remaining).toBe(4);
    });
  });
});
