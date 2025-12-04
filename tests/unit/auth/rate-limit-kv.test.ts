/**
 * Rate Limit KV Unit Tests
 *
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 * AC5: Failed login attempts are rate-limited (5 per hour per IP)
 *
 * Tests the Vercel KV-backed rate limiting implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to ensure mockKv is available when mocks are hoisted
const mockKv = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: mockKv,
}));

// Mock cache config
vi.mock("@/lib/cache/config", () => ({
  getCacheConfig: vi.fn(() => ({ enabled: true })),
  CACHE_KEY_PREFIXES: {
    RATE_LIMIT_IP: "rate-limit:ip:",
    RATE_LIMIT_EMAIL: "rate-limit:email:",
  },
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

// Import after mocks
import {
  checkRateLimitKV,
  recordFailedAttemptKV,
  clearRateLimitKV,
  checkEmailRateLimitKV,
  recordEmailResendAttemptKV,
  clearEmailRateLimitKV,
} from "@/lib/auth/rate-limit-kv";

describe("Rate Limit KV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimitKV", () => {
    it("should allow request when no previous attempts exist", async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await checkRateLimitKV("192.168.1.1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(mockKv.get).toHaveBeenCalledWith("rate-limit:ip:192.168.1.1");
    });

    it("should allow request when attempts are under limit", async () => {
      mockKv.get.mockResolvedValue({
        attempts: 3,
        windowStart: Date.now() - 1000, // 1 second ago
      });

      const result = await checkRateLimitKV("192.168.1.1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("should block request when attempts reach limit", async () => {
      const windowStart = Date.now() - 1000; // 1 second ago
      mockKv.get.mockResolvedValue({
        attempts: 5,
        windowStart,
      });

      const result = await checkRateLimitKV("192.168.1.1");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should allow request when window has expired", async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000 - 1000; // 1 hour + 1 second ago
      mockKv.get.mockResolvedValue({
        attempts: 5,
        windowStart: oneHourAgo,
      });

      const result = await checkRateLimitKV("192.168.1.1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("should handle KV errors gracefully", async () => {
      mockKv.get.mockRejectedValue(new Error("KV error"));

      const result = await checkRateLimitKV("192.168.1.1");

      // Should return null which triggers in-memory fallback
      expect(result.allowed).toBe(true);
    });
  });

  describe("recordFailedAttemptKV", () => {
    it("should create new entry on first attempt", async () => {
      mockKv.get.mockResolvedValue(null);
      mockKv.set.mockResolvedValue(undefined);

      await recordFailedAttemptKV("192.168.1.1");

      expect(mockKv.set).toHaveBeenCalledWith(
        "rate-limit:ip:192.168.1.1",
        expect.objectContaining({
          attempts: 1,
          windowStart: expect.any(Number),
        }),
        { ex: 3600 } // 1 hour TTL
      );
    });

    it("should increment attempts in existing window", async () => {
      const windowStart = Date.now() - 1000;
      mockKv.get.mockResolvedValue({
        attempts: 2,
        windowStart,
      });
      mockKv.set.mockResolvedValue(undefined);

      await recordFailedAttemptKV("192.168.1.1");

      expect(mockKv.set).toHaveBeenCalledWith(
        "rate-limit:ip:192.168.1.1",
        expect.objectContaining({
          attempts: 3,
          windowStart,
        }),
        { ex: 3600 }
      );
    });

    it("should start new window when previous window expired", async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000 - 1000;
      mockKv.get.mockResolvedValue({
        attempts: 5,
        windowStart: oneHourAgo,
      });
      mockKv.set.mockResolvedValue(undefined);

      await recordFailedAttemptKV("192.168.1.1");

      expect(mockKv.set).toHaveBeenCalledWith(
        "rate-limit:ip:192.168.1.1",
        expect.objectContaining({
          attempts: 1,
          windowStart: Date.now(),
        }),
        { ex: 3600 }
      );
    });
  });

  describe("clearRateLimitKV", () => {
    it("should delete rate limit entry", async () => {
      mockKv.del.mockResolvedValue(1);

      await clearRateLimitKV("192.168.1.1");

      expect(mockKv.del).toHaveBeenCalledWith("rate-limit:ip:192.168.1.1");
    });

    it("should handle KV errors gracefully", async () => {
      mockKv.del.mockRejectedValue(new Error("KV error"));

      // Should not throw
      await expect(clearRateLimitKV("192.168.1.1")).resolves.not.toThrow();
    });
  });

  describe("Email Rate Limiting", () => {
    describe("checkEmailRateLimitKV", () => {
      it("should allow request when no previous attempts exist", async () => {
        mockKv.get.mockResolvedValue(null);

        const result = await checkEmailRateLimitKV("test@example.com");

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(3);
        expect(mockKv.get).toHaveBeenCalledWith("rate-limit:email:test@example.com");
      });

      it("should normalize email to lowercase", async () => {
        mockKv.get.mockResolvedValue(null);

        await checkEmailRateLimitKV("TEST@EXAMPLE.COM");

        expect(mockKv.get).toHaveBeenCalledWith("rate-limit:email:test@example.com");
      });

      it("should block after 3 attempts", async () => {
        mockKv.get.mockResolvedValue({
          attempts: 3,
          windowStart: Date.now() - 1000,
        });

        const result = await checkEmailRateLimitKV("test@example.com");

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });
    });

    describe("recordEmailResendAttemptKV", () => {
      it("should create new entry on first attempt", async () => {
        mockKv.get.mockResolvedValue(null);
        mockKv.set.mockResolvedValue(undefined);

        await recordEmailResendAttemptKV("test@example.com");

        expect(mockKv.set).toHaveBeenCalledWith(
          "rate-limit:email:test@example.com",
          expect.objectContaining({
            attempts: 1,
          }),
          { ex: 3600 }
        );
      });
    });

    describe("clearEmailRateLimitKV", () => {
      it("should delete email rate limit entry", async () => {
        mockKv.del.mockResolvedValue(1);

        await clearEmailRateLimitKV("test@example.com");

        expect(mockKv.del).toHaveBeenCalledWith("rate-limit:email:test@example.com");
      });
    });
  });
});
