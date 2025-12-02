/**
 * Cache Key Generation Tests
 *
 * Story 1.6: Vercel KV Cache Setup
 * AC2: Cache keys are namespaced per user: `recs:${userId}`
 *
 * Tests for cache key generation and parsing utilities.
 */

import { describe, it, expect } from "vitest";
import {
  createRecommendationKey,
  createPortfolioKey,
  createAllocationKey,
  parseCacheKey,
  getAllUserCacheKeys,
} from "@/lib/cache/keys";
import { CACHE_KEY_PREFIXES } from "@/lib/cache/config";

describe("Cache Key Generation", () => {
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  describe("createRecommendationKey", () => {
    it("should create key with recs: prefix (AC2)", () => {
      const key = createRecommendationKey(testUserId);
      expect(key).toBe(`recs:${testUserId}`);
    });

    it("should include the full userId", () => {
      const key = createRecommendationKey(testUserId);
      expect(key).toContain(testUserId);
    });

    it("should use correct prefix constant", () => {
      const key = createRecommendationKey(testUserId);
      expect(key.startsWith(CACHE_KEY_PREFIXES.RECOMMENDATIONS)).toBe(true);
    });
  });

  describe("createPortfolioKey", () => {
    it("should create key with portfolio: prefix", () => {
      const key = createPortfolioKey(testUserId);
      expect(key).toBe(`portfolio:${testUserId}`);
    });
  });

  describe("createAllocationKey", () => {
    it("should create key with allocation: prefix", () => {
      const key = createAllocationKey(testUserId);
      expect(key).toBe(`allocation:${testUserId}`);
    });
  });

  describe("parseCacheKey", () => {
    it("should parse recommendation key correctly", () => {
      const key = `recs:${testUserId}`;
      const parsed = parseCacheKey(key);

      expect(parsed.prefix).toBe("recs:");
      expect(parsed.userId).toBe(testUserId);
      expect(parsed.type).toBe("recommendations");
    });

    it("should parse portfolio key correctly", () => {
      const key = `portfolio:${testUserId}`;
      const parsed = parseCacheKey(key);

      expect(parsed.prefix).toBe("portfolio:");
      expect(parsed.userId).toBe(testUserId);
      expect(parsed.type).toBe("portfolio");
    });

    it("should parse allocation key correctly", () => {
      const key = `allocation:${testUserId}`;
      const parsed = parseCacheKey(key);

      expect(parsed.prefix).toBe("allocation:");
      expect(parsed.userId).toBe(testUserId);
      expect(parsed.type).toBe("allocation");
    });

    it("should handle unknown key format", () => {
      const key = "unknown:some-value";
      const parsed = parseCacheKey(key);

      expect(parsed.prefix).toBe("");
      expect(parsed.userId).toBe(key);
      expect(parsed.type).toBe("unknown");
    });
  });

  describe("getAllUserCacheKeys", () => {
    it("should return all cache keys for a user", () => {
      const keys = getAllUserCacheKeys(testUserId);

      expect(keys).toHaveLength(3);
      expect(keys).toContain(`recs:${testUserId}`);
      expect(keys).toContain(`portfolio:${testUserId}`);
      expect(keys).toContain(`allocation:${testUserId}`);
    });

    it("should ensure keys never share across users (AC2)", () => {
      const user1Id = "user-1-uuid";
      const user2Id = "user-2-uuid";

      const user1Keys = getAllUserCacheKeys(user1Id);
      const user2Keys = getAllUserCacheKeys(user2Id);

      // No key should appear in both sets
      const overlap = user1Keys.filter((key) => user2Keys.includes(key));
      expect(overlap).toHaveLength(0);
    });
  });
});
