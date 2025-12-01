/**
 * Cache Service Tests
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC1: Recommendations stored in Vercel KV are retrieved in <100ms
 * AC5: Cache utilities provide get/set/delete operations
 *
 * Tests for the CacheService class using mocks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @vercel/kv before importing modules that use it
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
  },
}));

// Mock environment variables
const mockEnv = {
  KV_REST_API_URL: "https://example.kv.vercel.com",
  KV_REST_API_TOKEN: "test-token",
  CACHE_TTL_SECONDS: "86400",
};

describe("CacheService", () => {
  beforeEach(() => {
    vi.resetModules();
    // Set up environment
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up environment
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
  });

  describe("get operation (AC5)", () => {
    it("should return cached data when present", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      const mockData = {
        data: { value: "test" },
        metadata: {
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          ttlSeconds: 86400,
          source: "test",
        },
      };

      vi.mocked(kv.get).mockResolvedValueOnce(mockData);

      const service = new CacheService();
      const result = await service.get<{ value: string }>("test-key");

      expect(result).not.toBeNull();
      expect(result?.data.value).toBe("test");
    });

    it("should return null on cache miss", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      vi.mocked(kv.get).mockResolvedValueOnce(null);

      const service = new CacheService();
      const result = await service.get("nonexistent-key");

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      vi.mocked(kv.get).mockRejectedValueOnce(new Error("Connection failed"));

      const service = new CacheService();
      const result = await service.get("test-key");

      // Should return null instead of throwing
      expect(result).toBeNull();
    });
  });

  describe("set operation (AC5)", () => {
    it("should set data with correct TTL", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      vi.mocked(kv.set).mockResolvedValueOnce("OK");

      const service = new CacheService(86400);
      await service.set("test-key", { value: "test" });

      expect(kv.set).toHaveBeenCalledWith(
        "test-key",
        expect.objectContaining({
          data: { value: "test" },
        }),
        { ex: 86400 }
      );
    });

    it("should allow TTL override", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      vi.mocked(kv.set).mockResolvedValueOnce("OK");

      const service = new CacheService();
      await service.set("test-key", { value: "test" }, 3600);

      expect(kv.set).toHaveBeenCalledWith(
        "test-key",
        expect.anything(),
        { ex: 3600 }
      );
    });
  });

  describe("delete operation (AC5)", () => {
    it("should delete key", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      vi.mocked(kv.del).mockResolvedValueOnce(1);

      const service = new CacheService();
      await service.del("test-key");

      expect(kv.del).toHaveBeenCalledWith("test-key");
    });
  });

  describe("getOrSet operation", () => {
    it("should return cached data without calling factory", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      const mockData = {
        data: { value: "cached" },
        metadata: {
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          ttlSeconds: 86400,
          source: "test",
        },
      };

      vi.mocked(kv.get).mockResolvedValueOnce(mockData);

      const factory = vi.fn().mockResolvedValue({ value: "fresh" });

      const service = new CacheService();
      const result = await service.getOrSet("test-key", factory);

      expect(result.data.value).toBe("cached");
      expect(result.fromCache).toBe(true);
      expect(factory).not.toHaveBeenCalled();
    });

    it("should call factory on cache miss", async () => {
      const { kv } = await import("@vercel/kv");
      const { CacheService } = await import("@/lib/cache/service");

      vi.mocked(kv.get).mockResolvedValueOnce(null);
      vi.mocked(kv.set).mockResolvedValueOnce("OK");

      const factory = vi.fn().mockResolvedValue({ value: "fresh" });

      const service = new CacheService();
      const result = await service.getOrSet("test-key", factory);

      expect(result.data.value).toBe("fresh");
      expect(result.fromCache).toBe(false);
      expect(factory).toHaveBeenCalled();
    });
  });

  describe("isEnabled", () => {
    it("should return true when credentials are set", async () => {
      const { CacheService } = await import("@/lib/cache/service");
      const service = new CacheService();
      expect(service.isEnabled()).toBe(true);
    });

    it("should return false when credentials are missing", async () => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      vi.resetModules();
      const { CacheService } = await import("@/lib/cache/service");

      const service = new CacheService();
      expect(service.isEnabled()).toBe(false);
    });
  });
});
