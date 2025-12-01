/**
 * Cache Fallback Behavior Tests
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC4: Cache miss falls back to PostgreSQL
 *
 * Tests that verify graceful fallback behavior when cache is
 * unavailable or returns errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @vercel/kv
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
  },
}));

describe("Cache Fallback Behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up environment
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  describe("when cache is disabled (AC4)", () => {
    beforeEach(() => {
      // No KV credentials
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it("should return null from getRecommendations", async () => {
      const { getRecommendations } = await import("@/lib/cache/recommendations");

      const result = await getRecommendations("user-123");

      expect(result.data).toBeNull();
      expect(result.fromCache).toBe(false);
    });

    it("should not throw from setRecommendations", async () => {
      const { setRecommendations } = await import("@/lib/cache/recommendations");

      // Should complete without error
      await expect(
        setRecommendations("user-123", {
          recommendations: [],
          generatedAt: new Date(),
          criteriaVersionId: "v1",
          baseCurrency: "USD",
          totalAmount: "0",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("when KV returns errors (AC4)", () => {
    beforeEach(() => {
      process.env.KV_REST_API_URL = "https://example.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";
    });

    it("should not crash application on get error", async () => {
      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockRejectedValueOnce(new Error("Connection refused"));

      const { getRecommendations } = await import("@/lib/cache/recommendations");

      // Should return null instead of crashing
      const result = await getRecommendations("user-123");
      expect(result.data).toBeNull();
      expect(result.fromCache).toBe(false);
    });

    it("should not crash application on set error", async () => {
      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.set).mockRejectedValueOnce(new Error("Timeout"));

      const { setRecommendations } = await import("@/lib/cache/recommendations");

      // Should complete without throwing
      await expect(
        setRecommendations("user-123", {
          recommendations: [],
          generatedAt: new Date(),
          criteriaVersionId: "v1",
          baseCurrency: "USD",
          totalAmount: "0",
        })
      ).resolves.not.toThrow();
    });

    it("should not crash application on delete error", async () => {
      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.del).mockRejectedValueOnce(new Error("Network error"));

      const { invalidateRecommendations } = await import(
        "@/lib/cache/recommendations"
      );

      // Should complete without throwing
      await expect(invalidateRecommendations("user-123")).resolves.not.toThrow();
    });
  });

  describe("getRecommendationsWithFallback (AC4)", () => {
    beforeEach(() => {
      process.env.KV_REST_API_URL = "https://example.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";
    });

    it("should call fallback function on cache miss", async () => {
      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValueOnce(null);
      vi.mocked(kv.set).mockResolvedValueOnce("OK");

      const { getRecommendationsWithFallback } = await import(
        "@/lib/cache/recommendations"
      );

      const mockFallbackData = {
        recommendations: [
          {
            assetId: "asset-1",
            symbol: "VOO",
            score: "85.5",
            amount: "1000.00",
            breakdown: [],
          },
        ],
        generatedAt: new Date(),
        criteriaVersionId: "v1",
        baseCurrency: "USD",
        totalAmount: "1000.00",
      };

      const fallback = vi.fn().mockResolvedValue(mockFallbackData);

      const result = await getRecommendationsWithFallback("user-123", fallback);

      expect(fallback).toHaveBeenCalled();
      expect(result.fromCache).toBe(false);
      expect(result.data?.recommendations).toHaveLength(1);
    });

    it("should return cached data without calling fallback", async () => {
      const { kv } = await import("@vercel/kv");

      const cachedData = {
        data: {
          recommendations: [
            {
              assetId: "asset-1",
              symbol: "VTI",
              score: "90.0",
              amount: "500.00",
              breakdown: [],
            },
          ],
          generatedAt: new Date().toISOString(),
          criteriaVersionId: "v1",
          baseCurrency: "USD",
          totalAmount: "500.00",
          metadata: {
            cachedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            ttlSeconds: 86400,
            source: "test",
          },
        },
        metadata: {
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          ttlSeconds: 86400,
          source: "test",
        },
      };

      vi.mocked(kv.get).mockResolvedValueOnce(cachedData);

      const { getRecommendationsWithFallback } = await import(
        "@/lib/cache/recommendations"
      );

      const fallback = vi.fn();

      const result = await getRecommendationsWithFallback("user-123", fallback);

      expect(fallback).not.toHaveBeenCalled();
      expect(result.fromCache).toBe(true);
    });

    it("should handle fallback returning null", async () => {
      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValueOnce(null);

      const { getRecommendationsWithFallback } = await import(
        "@/lib/cache/recommendations"
      );

      const fallback = vi.fn().mockResolvedValue(null);

      const result = await getRecommendationsWithFallback("user-123", fallback);

      expect(result.data).toBeNull();
      expect(result.fromCache).toBe(false);
    });
  });

  describe("stale cache behavior", () => {
    beforeEach(() => {
      process.env.KV_REST_API_URL = "https://example.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";
    });

    it("should return data with timestamp for freshness check", async () => {
      const { kv } = await import("@vercel/kv");

      const cachedAt = new Date(Date.now() - 3600000); // 1 hour ago

      const cachedData = {
        data: {
          recommendations: [],
          generatedAt: cachedAt.toISOString(),
          criteriaVersionId: "v1",
          baseCurrency: "USD",
          totalAmount: "0",
          metadata: {
            cachedAt: cachedAt.toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            ttlSeconds: 86400,
            source: "test",
          },
        },
        metadata: {
          cachedAt: cachedAt.toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          ttlSeconds: 86400,
          source: "test",
        },
      };

      vi.mocked(kv.get).mockResolvedValueOnce(cachedData);

      const { getRecommendations } = await import("@/lib/cache/recommendations");

      const result = await getRecommendations("user-123");

      expect(result.timestamp).not.toBeNull();
      // UI can use timestamp to show DataFreshnessBadge
    });
  });
});
