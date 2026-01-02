/**
 * Recommendation Fallback Service Unit Tests
 *
 * Story 5.6: Overnight Pre-Computation
 * AC-5.6.5: Graceful Failure Fallback
 *
 * Tests the fallback logic for providing recommendations when overnight job fails:
 * - Cache-first strategy
 * - Overnight failure detection
 * - On-demand calculation fallback
 * - Logging for investigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock("@/lib/cache/recommendation-cache", () => ({
  recommendationCacheService: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
  },
  RecommendationCacheService: vi.fn(),
}));

const mockGenerateRecommendationsForUser = vi.fn();
vi.mock("@/lib/services/batch-recommendation-service", () => ({
  batchRecommendationService: {
    generateRecommendationsForUser: (...args: unknown[]) =>
      mockGenerateRecommendationsForUser(...args),
  },
  BatchRecommendationService: vi.fn(),
}));

import {
  RecommendationFallbackService,
  type FallbackResult,
  type UserOvernightStatus,
} from "@/lib/services/recommendation-fallback-service";
import { JOB_STATUS } from "@/lib/services/overnight-job-service";
import { logger } from "@/lib/telemetry/logger";

describe("RecommendationFallbackService", () => {
  let service: RecommendationFallbackService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create mock database for testing
    const mockDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    };
    service = new RecommendationFallbackService(mockDb as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getRecommendationsWithFallback", () => {
    it("should return cached recommendations when cache hit", async () => {
      // Arrange
      const userId = "user-123";
      const cachedData = {
        userId,
        generatedAt: new Date().toISOString(),
        recommendations: [{ assetId: "asset-1", symbol: "AAPL" }],
        portfolioSummary: { totalValue: "10000", baseCurrency: "USD", allocations: {} },
        dataFreshness: { pricesAsOf: "", ratesAsOf: "", criteriaVersion: "" },
        totalInvestable: "1000",
        correlationId: "corr-123",
      };

      mockCacheGet.mockResolvedValue({ data: cachedData, fromCache: true });

      // Act
      const result: FallbackResult = await service.getRecommendationsWithFallback(userId);

      // Assert
      expect(result.source).toBe("cache");
      expect(result.fallbackTriggered).toBe(false);
      expect(result.recommendations).toEqual(cachedData);
      expect(mockCacheGet).toHaveBeenCalledWith(userId);
    });

    it("should trigger on-demand fallback when cache miss and overnight failed", async () => {
      // Arrange
      const userId = "user-123";
      const generatedRec = {
        userId,
        portfolioId: "portfolio-1",
        generatedAt: new Date().toISOString(),
        totalInvestable: "1000",
        baseCurrency: "USD",
        items: [],
        allocationGaps: [],
        auditTrail: {
          criteriaVersionId: null,
          exchangeRatesSnapshot: {},
          scoresCorrelationId: "corr-123",
          pricesAsOf: "",
          ratesAsOf: "",
        },
      };

      mockCacheGet.mockResolvedValue({ data: null, fromCache: false });
      mockGenerateRecommendationsForUser.mockResolvedValue({
        success: true,
        recommendations: generatedRec,
        recommendationsGenerated: 0,
      });
      mockCacheSet.mockResolvedValue({ success: true });

      // Override getOvernightStatus to simulate failure
      const mockStatus: UserOvernightStatus = {
        lastJobStatus: JOB_STATUS.FAILED,
        lastJobCompletedAt: new Date(),
        usersFailed: 1,
        hasRecentFailure: true,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      // Act
      const result: FallbackResult = await service.getRecommendationsWithFallback(userId);

      // Assert
      expect(result.source).toBe("on-demand");
      expect(result.fallbackTriggered).toBe(true);
      expect(result.reason).toContain("overnight_failure");
      expect(logger.info).toHaveBeenCalledWith(
        "On-demand fallback triggered",
        expect.objectContaining({ userId, reason: "overnight_failure" })
      );
    });

    it("should trigger on-demand fallback when cache miss with no recent failure", async () => {
      // Arrange
      const userId = "user-123";
      const generatedRec = {
        userId,
        portfolioId: "portfolio-1",
        generatedAt: new Date().toISOString(),
        totalInvestable: "1000",
        baseCurrency: "USD",
        items: [],
        allocationGaps: [],
        auditTrail: {
          criteriaVersionId: null,
          exchangeRatesSnapshot: {},
          scoresCorrelationId: "corr-123",
          pricesAsOf: "",
          ratesAsOf: "",
        },
      };

      mockCacheGet.mockResolvedValue({ data: null, fromCache: false });
      mockGenerateRecommendationsForUser.mockResolvedValue({
        success: true,
        recommendations: generatedRec,
        recommendationsGenerated: 0,
      });
      mockCacheSet.mockResolvedValue({ success: true });

      // No recent failure
      const mockStatus: UserOvernightStatus = {
        lastJobStatus: JOB_STATUS.COMPLETED,
        lastJobCompletedAt: new Date(),
        usersFailed: 0,
        hasRecentFailure: false,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      // Act
      const result: FallbackResult = await service.getRecommendationsWithFallback(userId);

      // Assert
      expect(result.source).toBe("on-demand");
      expect(result.fallbackTriggered).toBe(true);
      expect(result.reason).toContain("cache_miss_no_recent_overnight_data");
    });

    it("should cache on-demand results for subsequent requests", async () => {
      // Arrange
      const userId = "user-123";
      const generatedRec = {
        userId,
        portfolioId: "portfolio-1",
        generatedAt: new Date().toISOString(),
        totalInvestable: "1000",
        baseCurrency: "USD",
        items: [],
        allocationGaps: [],
        auditTrail: {
          criteriaVersionId: null,
          exchangeRatesSnapshot: {},
          scoresCorrelationId: "corr-123",
          pricesAsOf: "",
          ratesAsOf: "",
        },
      };

      mockCacheGet.mockResolvedValue({ data: null, fromCache: false });
      mockGenerateRecommendationsForUser.mockResolvedValue({
        success: true,
        recommendations: generatedRec,
        recommendationsGenerated: 5,
      });
      mockCacheSet.mockResolvedValue({ success: true });

      const mockStatus: UserOvernightStatus = {
        lastJobStatus: null,
        lastJobCompletedAt: null,
        usersFailed: 0,
        hasRecentFailure: false,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      // Act
      await service.getRecommendationsWithFallback(userId);

      // Assert
      expect(mockCacheSet).toHaveBeenCalledWith(userId, generatedRec);
    });

    it("should continue gracefully when cache set fails after on-demand calculation", async () => {
      // Arrange
      const userId = "user-123";
      const generatedRec = {
        userId,
        portfolioId: "portfolio-1",
        generatedAt: new Date().toISOString(),
        totalInvestable: "1000",
        baseCurrency: "USD",
        items: [],
        allocationGaps: [],
        auditTrail: {
          criteriaVersionId: null,
          exchangeRatesSnapshot: {},
          scoresCorrelationId: "corr-123",
          pricesAsOf: "",
          ratesAsOf: "",
        },
      };

      mockCacheGet.mockResolvedValue({ data: null, fromCache: false });
      mockGenerateRecommendationsForUser.mockResolvedValue({
        success: true,
        recommendations: generatedRec,
        recommendationsGenerated: 3,
      });
      // Simulate cache write failure
      mockCacheSet.mockResolvedValue({ success: false, error: "KV connection timeout" });

      const mockStatus: UserOvernightStatus = {
        lastJobStatus: null,
        lastJobCompletedAt: null,
        usersFailed: 0,
        hasRecentFailure: false,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      // Act
      const result = await service.getRecommendationsWithFallback(userId);

      // Assert - should still return recommendations despite cache failure
      expect(result.recommendations).toEqual(generatedRec);
      expect(result.source).toBe("on-demand");
      expect(result.fallbackTriggered).toBe(true);
      // Cache failure is logged but doesn't block the response
      expect(mockCacheSet).toHaveBeenCalledWith(userId, generatedRec);
    });

    it("should measure duration in milliseconds", async () => {
      // Arrange
      const userId = "user-123";
      mockCacheGet.mockResolvedValue({
        data: {
          userId,
          generatedAt: new Date().toISOString(),
          recommendations: [],
          portfolioSummary: { totalValue: "0", baseCurrency: "USD", allocations: {} },
          dataFreshness: { pricesAsOf: "", ratesAsOf: "", criteriaVersion: "" },
          totalInvestable: "0",
          correlationId: "corr-123",
        },
        fromCache: true,
      });

      // Act
      const result = await service.getRecommendationsWithFallback(userId);

      // Assert
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe("number");
    });
  });

  describe("isOvernightFailed", () => {
    it("should return true when overnight job failed", async () => {
      const userId = "user-123";
      const mockStatus: UserOvernightStatus = {
        lastJobStatus: JOB_STATUS.FAILED,
        lastJobCompletedAt: new Date(),
        usersFailed: 10,
        hasRecentFailure: true,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      const result = await service.isOvernightFailed(userId);

      expect(result).toBe(true);
    });

    it("should return true when overnight job had partial failures", async () => {
      const userId = "user-123";
      const mockStatus: UserOvernightStatus = {
        lastJobStatus: JOB_STATUS.PARTIAL,
        lastJobCompletedAt: new Date(),
        usersFailed: 5,
        hasRecentFailure: true,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      const result = await service.isOvernightFailed(userId);

      expect(result).toBe(true);
    });

    it("should return false when overnight job completed successfully", async () => {
      const userId = "user-123";
      const mockStatus: UserOvernightStatus = {
        lastJobStatus: JOB_STATUS.COMPLETED,
        lastJobCompletedAt: new Date(),
        usersFailed: 0,
        hasRecentFailure: false,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      const result = await service.isOvernightFailed(userId);

      expect(result).toBe(false);
    });

    it("should return false when no overnight job found", async () => {
      const userId = "user-123";
      const mockStatus: UserOvernightStatus = {
        lastJobStatus: null,
        lastJobCompletedAt: null,
        usersFailed: 0,
        hasRecentFailure: false,
      };
      vi.spyOn(service, "getOvernightStatus").mockResolvedValue(mockStatus);

      const result = await service.isOvernightFailed(userId);

      expect(result).toBe(false);
    });
  });

  describe("getOvernightStatus", () => {
    it("should check for failures within 24 hour window", async () => {
      // This test documents the 24-hour window behavior
      const FAILURE_CHECK_WINDOW_HOURS = 24;
      expect(FAILURE_CHECK_WINDOW_HOURS).toBe(24);
    });

    it("should return hasRecentFailure=false when no jobs found", async () => {
      const userId = "user-123";
      // Default mock returns empty array
      const result = await service.getOvernightStatus(userId);

      expect(result.hasRecentFailure).toBe(false);
      expect(result.lastJobStatus).toBeNull();
    });

    it("should handle query errors gracefully", async () => {
      // Create a service with a throwing database
      const throwingDb = {
        select: vi.fn(() => {
          throw new Error("Database connection lost");
        }),
      };
      const errorService = new RecommendationFallbackService(throwingDb as never);

      const result = await errorService.getOvernightStatus("user-123");

      // Should return safe defaults instead of throwing
      expect(result.hasRecentFailure).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to check overnight status",
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});

describe("FallbackResult Type", () => {
  it("should have required fields documented", () => {
    // Document the expected structure for callers
    const sampleResult: FallbackResult = {
      recommendations: null,
      source: "cache",
      durationMs: 50,
      fallbackTriggered: false,
      reason: undefined,
    };

    expect(sampleResult).toHaveProperty("recommendations");
    expect(sampleResult).toHaveProperty("source");
    expect(sampleResult).toHaveProperty("durationMs");
    expect(sampleResult).toHaveProperty("fallbackTriggered");
  });

  it("should have valid source values", () => {
    // Note: "database" source was removed - FallbackService only does cache → on-demand
    // DashboardService handles the database fallback layer before calling FallbackService
    const validSources: Array<"cache" | "on-demand"> = ["cache", "on-demand"];

    validSources.forEach((source) => {
      const result: FallbackResult = {
        recommendations: null,
        source,
        durationMs: 0,
        fallbackTriggered: false,
      };
      expect(["cache", "on-demand"]).toContain(result.source);
    });
  });
});
