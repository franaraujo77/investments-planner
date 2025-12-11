/**
 * Refresh Rate Limiter Tests
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.4: Rate Limit of 5 Refreshes Per Hour Per User
 * AC-6.6.5: Rate Limit Exceeded Shows Countdown
 *
 * Tests for the RefreshRateLimiter class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RefreshRateLimiter,
  generateRateLimitKey,
  MAX_REFRESHES_PER_HOUR,
  RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMIT_KEY_PREFIX,
} from "@/lib/rate-limit/refresh-limiter";

// Mock the cache service
vi.mock("@/lib/cache", () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { cacheService } from "@/lib/cache";

describe("RefreshRateLimiter", () => {
  let limiter: RefreshRateLimiter;

  beforeEach(() => {
    limiter = new RefreshRateLimiter();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constants", () => {
    it("should have MAX_REFRESHES_PER_HOUR set to 5", () => {
      expect(MAX_REFRESHES_PER_HOUR).toBe(5);
    });

    it("should have RATE_LIMIT_WINDOW_SECONDS set to 1 hour", () => {
      expect(RATE_LIMIT_WINDOW_SECONDS).toBe(3600);
    });

    it("should have RATE_LIMIT_KEY_PREFIX set correctly", () => {
      expect(RATE_LIMIT_KEY_PREFIX).toBe("refresh-limit");
    });
  });

  describe("generateRateLimitKey", () => {
    it("should generate key with correct prefix and userId", () => {
      const key = generateRateLimitKey("user-123");
      expect(key).toBe("refresh-limit:user-123");
    });
  });

  describe("checkLimit", () => {
    it("should allow first request when no cache data exists", async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await limiter.checkLimit("user-123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("should return correct remaining count when under limit", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 2,
          windowStart: "2025-12-10T11:30:00Z",
        },
        metadata: { cachedAt: new Date() },
      });

      const result = await limiter.checkLimit("user-123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 5 - 2 = 3
    });

    it("should allow request at limit (5th request)", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 4,
          windowStart: "2025-12-10T11:30:00Z",
        },
        metadata: { cachedAt: new Date() },
      });

      const result = await limiter.checkLimit("user-123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1); // 5 - 4 = 1
    });

    it("should deny request when over limit (6th request)", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 5,
          windowStart: "2025-12-10T11:30:00Z",
        },
        metadata: { cachedAt: new Date() },
      });

      const result = await limiter.checkLimit("user-123");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should calculate correct resetAt time", async () => {
      const windowStart = "2025-12-10T11:30:00Z";
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 3,
          windowStart,
        },
        metadata: { cachedAt: new Date() },
      });

      const result = await limiter.checkLimit("user-123");

      // Reset should be 1 hour after window start
      const expectedResetAt = new Date(new Date(windowStart).getTime() + 3600 * 1000);
      expect(result.resetAt.getTime()).toBe(expectedResetAt.getTime());
    });

    it("should reset when window has expired", async () => {
      // Window started 2 hours ago (expired)
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 5,
          windowStart: "2025-12-10T10:00:00Z", // 2 hours ago
        },
        metadata: { cachedAt: new Date() },
      });

      const result = await limiter.checkLimit("user-123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5); // Reset to full
    });

    it("should fail open on cache errors", async () => {
      vi.mocked(cacheService.get).mockRejectedValue(new Error("Cache error"));

      const result = await limiter.checkLimit("user-123");

      // Should allow request when cache fails
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe("recordRefresh", () => {
    it("should record first refresh in new window", async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      await limiter.recordRefresh("user-123");

      expect(cacheService.set).toHaveBeenCalledWith(
        "refresh-limit:user-123",
        expect.objectContaining({
          count: 1,
          windowStart: expect.any(String),
        }),
        expect.any(Number),
        "refresh-limiter"
      );
    });

    it("should increment count in existing window", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 2,
          windowStart: "2025-12-10T11:30:00.000Z",
        },
        metadata: { cachedAt: new Date() },
      });
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      await limiter.recordRefresh("user-123");

      expect(cacheService.set).toHaveBeenCalledWith(
        "refresh-limit:user-123",
        expect.objectContaining({
          count: 3,
          windowStart: "2025-12-10T11:30:00.000Z",
        }),
        expect.any(Number),
        "refresh-limiter"
      );
    });

    it("should start new window when previous expired", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 5,
          windowStart: "2025-12-10T10:00:00Z", // 2 hours ago
        },
        metadata: { cachedAt: new Date() },
      });
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      await limiter.recordRefresh("user-123");

      expect(cacheService.set).toHaveBeenCalledWith(
        "refresh-limit:user-123",
        expect.objectContaining({
          count: 1, // Reset to 1
        }),
        expect.any(Number),
        "refresh-limiter"
      );
    });

    it("should use correct TTL", async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      await limiter.recordRefresh("user-123");

      // TTL should be approximately 1 hour (3600 seconds)
      const setCall = vi.mocked(cacheService.set).mock.calls[0];
      const ttl = setCall?.[2] as number;
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it("should not throw on cache errors", async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockRejectedValue(new Error("Cache error"));

      // Should not throw
      await expect(limiter.recordRefresh("user-123")).resolves.toBeUndefined();
    });
  });

  describe("getStatus", () => {
    it("should return same result as checkLimit", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({
        data: {
          count: 3,
          windowStart: "2025-12-10T11:30:00Z",
        },
        metadata: { cachedAt: new Date() },
      });

      const status = await limiter.getStatus("user-123");

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(2);
    });
  });

  describe("reset", () => {
    it("should delete the rate limit key", async () => {
      vi.mocked(cacheService.del).mockResolvedValue(undefined);

      await limiter.reset("user-123");

      expect(cacheService.del).toHaveBeenCalledWith("refresh-limit:user-123");
    });

    it("should not throw on cache errors", async () => {
      vi.mocked(cacheService.del).mockRejectedValue(new Error("Cache error"));

      await expect(limiter.reset("user-123")).resolves.toBeUndefined();
    });
  });

  describe("custom configuration", () => {
    it("should support custom max refreshes", async () => {
      const customLimiter = new RefreshRateLimiter(10, 3600);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await customLimiter.checkLimit("user-123");

      expect(result.remaining).toBe(10);
    });

    it("should support custom window duration", async () => {
      const customLimiter = new RefreshRateLimiter(5, 1800); // 30 minutes
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await customLimiter.checkLimit("user-123");

      // Reset should be 30 minutes from now
      const expectedResetAt = new Date(Date.now() + 1800 * 1000);
      expect(Math.abs(result.resetAt.getTime() - expectedResetAt.getTime())).toBeLessThan(1000);
    });
  });
});
