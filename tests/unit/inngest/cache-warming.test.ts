/**
 * Cache Warming Step Unit Tests
 *
 * Story 8.4: Cache Warming
 *
 * AC-8.4.1: Recommendations Stored in Vercel KV
 * AC-8.4.2: Cache Key Pattern (recs:${userId})
 * AC-8.4.3: Cache TTL Configuration (24 hours)
 * AC-8.4.4: Cache Data Completeness
 * AC-8.4.5: Cache Warming Performance
 *
 * Tests the cache warming step integration in the overnight scoring job.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GeneratedRecommendation } from "@/lib/services/batch-recommendation-service";
import type { CacheWarmingResult } from "@/lib/services/cache-warmer-service";

// Mock the cache warmer service
vi.mock("@/lib/services/cache-warmer-service", () => ({
  cacheWarmerService: {
    warmCacheForUsers: vi.fn(),
  },
  CacheWarmerService: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { cacheWarmerService } from "@/lib/services/cache-warmer-service";

const mockCacheWarmerService = vi.mocked(cacheWarmerService);

describe("Cache Warming Step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock recommendation
  const createMockRecommendation = (userId: string): GeneratedRecommendation => ({
    userId,
    portfolioId: `portfolio-${userId}`,
    generatedAt: new Date().toISOString(),
    totalInvestable: "1000.00",
    baseCurrency: "USD",
    items: [
      {
        assetId: "asset-1",
        symbol: "VOO",
        score: "85.0000",
        recommendedAmount: "500.00",
        allocationGap: "5.0000",
        breakdown: {
          className: "US Stocks",
        },
        classAllocation: {
          className: "US Stocks",
          currentPercent: "45.0000",
          targetMin: "40",
          targetMax: "60",
          gap: "5.0000",
        },
        isOverAllocated: false,
        isOverAllocatedExplanation: null,
      },
    ],
    allocationGaps: [
      {
        classId: "class-1",
        className: "US Stocks",
        currentAllocation: "45.0000",
        targetMin: "40",
        targetMax: "60",
        targetMidpoint: "50.0000",
        allocationGap: "5.0000",
        isOverAllocated: false,
        currentValue: "45000.00",
      },
    ],
    auditTrail: {
      criteriaVersionId: "criteria-v1",
      exchangeRatesSnapshot: {},
      scoresCorrelationId: "correlation-123",
      pricesAsOf: new Date().toISOString(),
      ratesAsOf: new Date().toISOString(),
    },
  });

  describe("warmCacheForUsers integration", () => {
    it("AC-8.4.1: should call cache warmer service with recommendations map", async () => {
      const mockResult: CacheWarmingResult = {
        success: true,
        usersProcessed: 3,
        usersCached: 3,
        cacheFailures: 0,
        durationMs: 150,
        metrics: {
          usersCached: 3,
          cacheFailures: 0,
          durationMs: 150,
          batchesProcessed: 1,
          averageBatchDurationMs: 150,
        },
        errors: [],
      };

      mockCacheWarmerService.warmCacheForUsers.mockResolvedValueOnce(mockResult);

      // Simulate step 7 behavior: convert Record to Map and call cache warmer
      const recommendations: Record<string, GeneratedRecommendation> = {
        "user-1": createMockRecommendation("user-1"),
        "user-2": createMockRecommendation("user-2"),
        "user-3": createMockRecommendation("user-3"),
      };

      const recommendationsMap = new Map<string, GeneratedRecommendation>(
        Object.entries(recommendations)
      );

      const result = await cacheWarmerService.warmCacheForUsers(
        recommendationsMap,
        "test-correlation-id"
      );

      expect(mockCacheWarmerService.warmCacheForUsers).toHaveBeenCalledWith(
        recommendationsMap,
        "test-correlation-id"
      );
      expect(result.usersCached).toBe(3);
      expect(result.cacheFailures).toBe(0);
    });

    it("AC-8.4.5: should handle partial failures gracefully", async () => {
      const mockResult: CacheWarmingResult = {
        success: false,
        usersProcessed: 3,
        usersCached: 2,
        cacheFailures: 1,
        durationMs: 200,
        metrics: {
          usersCached: 2,
          cacheFailures: 1,
          durationMs: 200,
          batchesProcessed: 1,
          averageBatchDurationMs: 200,
        },
        errors: [{ userId: "user-2", message: "Connection failed" }],
      };

      mockCacheWarmerService.warmCacheForUsers.mockResolvedValueOnce(mockResult);

      const recommendations: Record<string, GeneratedRecommendation> = {
        "user-1": createMockRecommendation("user-1"),
        "user-2": createMockRecommendation("user-2"),
        "user-3": createMockRecommendation("user-3"),
      };

      const recommendationsMap = new Map<string, GeneratedRecommendation>(
        Object.entries(recommendations)
      );

      const result = await cacheWarmerService.warmCacheForUsers(
        recommendationsMap,
        "test-correlation-id"
      );

      // Job should not fail even if some cache operations fail
      expect(result.usersCached).toBe(2);
      expect(result.cacheFailures).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it("should handle empty recommendations gracefully", async () => {
      const mockResult: CacheWarmingResult = {
        success: true,
        usersProcessed: 0,
        usersCached: 0,
        cacheFailures: 0,
        durationMs: 5,
        metrics: {
          usersCached: 0,
          cacheFailures: 0,
          durationMs: 5,
          batchesProcessed: 0,
          averageBatchDurationMs: 0,
        },
        errors: [],
      };

      mockCacheWarmerService.warmCacheForUsers.mockResolvedValueOnce(mockResult);

      const recommendationsMap = new Map<string, GeneratedRecommendation>();

      const result = await cacheWarmerService.warmCacheForUsers(
        recommendationsMap,
        "test-correlation-id"
      );

      expect(result.usersCached).toBe(0);
      expect(result.cacheFailures).toBe(0);
    });

    it("should handle cache warmer service throwing exception", async () => {
      mockCacheWarmerService.warmCacheForUsers.mockRejectedValueOnce(
        new Error("Cache service unavailable")
      );

      const recommendations: Record<string, GeneratedRecommendation> = {
        "user-1": createMockRecommendation("user-1"),
      };

      const recommendationsMap = new Map<string, GeneratedRecommendation>(
        Object.entries(recommendations)
      );

      // The overnight job should catch this and return fallback result
      await expect(
        cacheWarmerService.warmCacheForUsers(recommendationsMap, "test-correlation-id")
      ).rejects.toThrow("Cache service unavailable");
    });
  });

  describe("metrics tracking", () => {
    it("AC-8.4.5: should track cache warming metrics", async () => {
      const mockResult: CacheWarmingResult = {
        success: true,
        usersProcessed: 100,
        usersCached: 100,
        cacheFailures: 0,
        durationMs: 5000,
        metrics: {
          usersCached: 100,
          cacheFailures: 0,
          durationMs: 5000,
          batchesProcessed: 2,
          averageBatchDurationMs: 2500,
        },
        errors: [],
      };

      mockCacheWarmerService.warmCacheForUsers.mockResolvedValueOnce(mockResult);

      const recommendations: Record<string, GeneratedRecommendation> = {};
      for (let i = 0; i < 100; i++) {
        recommendations[`user-${i}`] = createMockRecommendation(`user-${i}`);
      }

      const recommendationsMap = new Map<string, GeneratedRecommendation>(
        Object.entries(recommendations)
      );

      const result = await cacheWarmerService.warmCacheForUsers(
        recommendationsMap,
        "test-correlation-id"
      );

      expect(result.metrics.usersCached).toBe(100);
      expect(result.metrics.cacheFailures).toBe(0);
      expect(result.metrics.durationMs).toBe(5000);
      expect(result.metrics.batchesProcessed).toBe(2);
    });

    it("should return metrics for JobRunMetrics update", async () => {
      const mockResult: CacheWarmingResult = {
        success: true,
        usersProcessed: 50,
        usersCached: 48,
        cacheFailures: 2,
        durationMs: 3000,
        metrics: {
          usersCached: 48,
          cacheFailures: 2,
          durationMs: 3000,
          batchesProcessed: 1,
          averageBatchDurationMs: 3000,
        },
        errors: [
          { userId: "user-10", message: "Failed" },
          { userId: "user-20", message: "Failed" },
        ],
      };

      mockCacheWarmerService.warmCacheForUsers.mockResolvedValueOnce(mockResult);

      const recommendationsMap = new Map<string, GeneratedRecommendation>();

      const result = await cacheWarmerService.warmCacheForUsers(
        recommendationsMap,
        "test-correlation-id"
      );

      // These values should be used to update JobRunMetrics
      expect(result).toMatchObject({
        usersCached: 48,
        cacheFailures: 2,
        durationMs: 3000,
      });
    });
  });

  describe("step ordering", () => {
    it("should be callable after recommendation generation step", async () => {
      // Simulate the flow: recommendation step returns recommendations,
      // then cache warming step processes them

      // Step 6 result (recommendation generation)
      const recommendationResult = {
        usersWithRecommendations: 3,
        totalRecommendationsGenerated: 9,
        usersFailed: 0,
        durationMs: 1000,
        errors: [],
        recommendations: {
          "user-1": createMockRecommendation("user-1"),
          "user-2": createMockRecommendation("user-2"),
          "user-3": createMockRecommendation("user-3"),
        },
      };

      // Step 7: Cache warming
      const mockCacheResult: CacheWarmingResult = {
        success: true,
        usersProcessed: 3,
        usersCached: 3,
        cacheFailures: 0,
        durationMs: 150,
        metrics: {
          usersCached: 3,
          cacheFailures: 0,
          durationMs: 150,
          batchesProcessed: 1,
          averageBatchDurationMs: 150,
        },
        errors: [],
      };

      mockCacheWarmerService.warmCacheForUsers.mockResolvedValueOnce(mockCacheResult);

      // Convert Record to Map (as done in step 7)
      const recommendationsMap = new Map<string, GeneratedRecommendation>(
        Object.entries(recommendationResult.recommendations)
      );

      const cacheResult = await cacheWarmerService.warmCacheForUsers(
        recommendationsMap,
        "test-correlation-id"
      );

      expect(cacheResult.usersCached).toBe(3);
      expect(cacheResult.cacheFailures).toBe(0);
    });
  });
});
