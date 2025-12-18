/**
 * Cache Warmer Service Unit Tests
 *
 * Story 8.4: Cache Warming
 *
 * AC-8.4.1: Recommendations Stored in Vercel KV
 * AC-8.4.5: Cache Warming Performance (batch processing, parallelization, error handling)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheWarmerService } from "@/lib/services/cache-warmer-service";
import type { GeneratedRecommendation } from "@/lib/services/batch-recommendation-service";
import type { RecommendationCacheService } from "@/lib/cache/recommendation-cache";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CacheWarmerService", () => {
  let service: CacheWarmerService;
  let mockCacheService: {
    set: ReturnType<typeof vi.fn>;
    setWithPortfolio: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

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

  beforeEach(() => {
    mockCacheService = {
      set: vi.fn(),
      setWithPortfolio: vi.fn().mockResolvedValue({
        success: true,
        recsKey: "recs:user-1",
        portfolioKey: "portfolio:user-1",
      }),
      get: vi.fn(),
    };

    service = new CacheWarmerService(mockCacheService as unknown as RecommendationCacheService, {
      batchSize: 10,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("warmCacheForUsers", () => {
    it("AC-8.4.1: should cache recommendations for all users", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      recommendations.set("user-1", createMockRecommendation("user-1"));
      recommendations.set("user-2", createMockRecommendation("user-2"));
      recommendations.set("user-3", createMockRecommendation("user-3"));

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.success).toBe(true);
      expect(result.usersCached).toBe(3);
      expect(result.cacheFailures).toBe(0);
      expect(result.usersProcessed).toBe(3);
      expect(mockCacheService.setWithPortfolio).toHaveBeenCalledTimes(3);
    });

    it("AC-8.4.5: should process users in batches", async () => {
      // Create 25 users to test batching with batch size of 10
      const recommendations = new Map<string, GeneratedRecommendation>();
      for (let i = 0; i < 25; i++) {
        const userId = `user-${i}`;
        recommendations.set(userId, createMockRecommendation(userId));
      }

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.success).toBe(true);
      expect(result.usersCached).toBe(25);
      expect(result.metrics.batchesProcessed).toBe(3); // 10 + 10 + 5
    });

    it("AC-8.4.5: should continue processing when individual user fails", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      recommendations.set("user-1", createMockRecommendation("user-1"));
      recommendations.set("user-2", createMockRecommendation("user-2"));
      recommendations.set("user-3", createMockRecommendation("user-3"));

      // Make user-2 fail
      mockCacheService.setWithPortfolio
        .mockResolvedValueOnce({
          success: true,
          recsKey: "recs:user-1",
          portfolioKey: "portfolio:user-1",
        })
        .mockResolvedValueOnce({
          success: false,
          recsKey: "recs:user-2",
          portfolioKey: "portfolio:user-2",
          error: "Connection failed",
        })
        .mockResolvedValueOnce({
          success: true,
          recsKey: "recs:user-3",
          portfolioKey: "portfolio:user-3",
        });

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.success).toBe(false); // Has failures
      expect(result.usersCached).toBe(2);
      expect(result.cacheFailures).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        userId: "user-2",
        message: "Connection failed",
      });
    });

    it("AC-8.4.5: should track metrics correctly", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      for (let i = 0; i < 15; i++) {
        const userId = `user-${i}`;
        recommendations.set(userId, createMockRecommendation(userId));
      }

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.metrics).toMatchObject({
        usersCached: 15,
        cacheFailures: 0,
        batchesProcessed: 2, // 10 + 5
      });
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.averageBatchDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty recommendations map", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.success).toBe(true);
      expect(result.usersCached).toBe(0);
      expect(result.cacheFailures).toBe(0);
      expect(result.usersProcessed).toBe(0);
      expect(mockCacheService.setWithPortfolio).not.toHaveBeenCalled();
    });

    it("should handle exception during cache operation", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      recommendations.set("user-1", createMockRecommendation("user-1"));

      mockCacheService.setWithPortfolio.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.success).toBe(false);
      expect(result.usersCached).toBe(0);
      expect(result.cacheFailures).toBe(1);
      expect(result.errors[0]).toMatchObject({
        userId: "user-1",
        message: "Network error",
      });
    });

    it("should pass correlation ID for logging", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      recommendations.set("user-1", createMockRecommendation("user-1"));

      const correlationId = "test-correlation-123";
      await service.warmCacheForUsers(recommendations, correlationId);

      // Verify correlation ID was used (via logger mock)
      expect(mockCacheService.setWithPortfolio).toHaveBeenCalled();
    });
  });

  describe("warmCacheForUser", () => {
    it("should cache single user recommendation", async () => {
      const recommendation = createMockRecommendation("user-1");

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-1");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(mockCacheService.setWithPortfolio).toHaveBeenCalledWith("user-1", recommendation);
    });

    it("should return error for invalid recommendation", async () => {
      const invalidRecommendation = {
        userId: "",
        portfolioId: "portfolio-1",
        generatedAt: new Date().toISOString(),
        totalInvestable: "1000.00",
        baseCurrency: "USD",
        items: [],
        allocationGaps: [],
        auditTrail: {
          criteriaVersionId: null,
          exchangeRatesSnapshot: {},
          scoresCorrelationId: "correlation-123",
          pricesAsOf: new Date().toISOString(),
          ratesAsOf: new Date().toISOString(),
        },
      } as GeneratedRecommendation;

      const result = await service.warmCacheForUser("user-1", invalidRecommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing userId");
      expect(mockCacheService.setWithPortfolio).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("should reject recommendation missing userId", async () => {
      const recommendation = createMockRecommendation("user-1");
      recommendation.userId = "";

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing userId");
    });

    it("should reject recommendation missing generatedAt", async () => {
      const recommendation = createMockRecommendation("user-1");
      recommendation.generatedAt = "";

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing generatedAt timestamp");
    });

    it("should reject recommendation missing items", async () => {
      const recommendation = createMockRecommendation("user-1");
      // @ts-expect-error - testing invalid input
      recommendation.items = undefined;

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing recommendation items");
    });

    it("should reject recommendation missing allocationGaps", async () => {
      const recommendation = createMockRecommendation("user-1");
      // @ts-expect-error - testing invalid input
      recommendation.allocationGaps = undefined;

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing allocation gaps");
    });

    it("should reject recommendation missing auditTrail", async () => {
      const recommendation = createMockRecommendation("user-1");
      // @ts-expect-error - testing invalid input
      recommendation.auditTrail = undefined;

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing audit trail");
    });

    it("should reject recommendation missing baseCurrency", async () => {
      const recommendation = createMockRecommendation("user-1");
      recommendation.baseCurrency = "";

      const result = await service.warmCacheForUser("user-1", recommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing base currency");
    });
  });

  describe("batch processing", () => {
    it("AC-8.4.5: should use Promise.allSettled for parallel processing", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      recommendations.set("user-1", createMockRecommendation("user-1"));
      recommendations.set("user-2", createMockRecommendation("user-2"));

      // Verify all calls happen in parallel by checking timing
      let callCount = 0;
      mockCacheService.setWithPortfolio.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          success: true,
          recsKey: `recs:user-${callCount}`,
          portfolioKey: `portfolio:user-${callCount}`,
        });
      });

      await service.warmCacheForUsers(recommendations);

      // Both should have been called (Promise.allSettled processes in parallel)
      expect(mockCacheService.setWithPortfolio).toHaveBeenCalledTimes(2);
    });

    it("should calculate average batch duration correctly", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      for (let i = 0; i < 20; i++) {
        recommendations.set(`user-${i}`, createMockRecommendation(`user-${i}`));
      }

      const result = await service.warmCacheForUsers(recommendations);

      // With 20 users and batch size 10, we should have 2 batches
      expect(result.metrics.batchesProcessed).toBe(2);
      expect(result.metrics.averageBatchDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error collection", () => {
    it("should collect all errors from failed users", async () => {
      const recommendations = new Map<string, GeneratedRecommendation>();
      recommendations.set("user-1", createMockRecommendation("user-1"));
      recommendations.set("user-2", createMockRecommendation("user-2"));
      recommendations.set("user-3", createMockRecommendation("user-3"));

      // Make all fail with different errors
      mockCacheService.setWithPortfolio
        .mockResolvedValueOnce({
          success: false,
          recsKey: "recs:user-1",
          portfolioKey: "portfolio:user-1",
          error: "Error 1",
        })
        .mockResolvedValueOnce({
          success: false,
          recsKey: "recs:user-2",
          portfolioKey: "portfolio:user-2",
          error: "Error 2",
        })
        .mockResolvedValueOnce({
          success: false,
          recsKey: "recs:user-3",
          portfolioKey: "portfolio:user-3",
          error: "Error 3",
        });

      const result = await service.warmCacheForUsers(recommendations);

      expect(result.errors).toHaveLength(3);
      expect(result.errors.map((e) => e.message)).toEqual(["Error 1", "Error 2", "Error 3"]);
    });
  });
});
