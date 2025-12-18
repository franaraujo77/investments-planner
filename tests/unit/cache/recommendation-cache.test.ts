/**
 * Recommendation Cache Service Unit Tests
 *
 * Story 8.3: Recommendation Pre-Generation
 * Story 8.4: Cache Warming (data structure validation)
 *
 * AC-8.4.1: Data stored in Vercel KV after recommendations generated
 * AC-8.4.2: Cache key follows pattern recs:${userId}
 * AC-8.4.3: Cache TTL is 24 hours
 * AC-8.4.4: Cache includes portfolio summary and data freshness timestamps
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RecommendationCacheService,
  type CachedRecommendations,
} from "@/lib/cache/recommendation-cache";
import type { GeneratedRecommendation } from "@/lib/services/batch-recommendation-service";

// Mock @vercel/kv - using factory function to avoid hoisting issues
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
    exists: vi.fn(),
    ttl: vi.fn(),
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

// Import the mocked kv after vi.mock
import { kv } from "@vercel/kv";
const mockKv = vi.mocked(kv);

describe("RecommendationCacheService", () => {
  let service: RecommendationCacheService;

  beforeEach(() => {
    service = new RecommendationCacheService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("should return cached data when present (cache hit)", async () => {
      const cachedData: CachedRecommendations = {
        userId: "user-123",
        generatedAt: new Date().toISOString(),
        recommendations: [
          {
            assetId: "asset-1",
            symbol: "VOO",
            score: "85.0000",
            amount: "500.00",
            currency: "USD",
            allocationGap: "5.0000",
            breakdown: {
              criteriaCount: 5,
              topContributor: "US Stocks",
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
        portfolioSummary: {
          totalValue: "100000.00",
          baseCurrency: "USD",
          allocations: {
            "US Stocks": "45.0000",
          },
        },
        dataFreshness: {
          pricesAsOf: new Date().toISOString(),
          ratesAsOf: new Date().toISOString(),
          criteriaVersion: "criteria-v1",
        },
        totalInvestable: "1000.00",
        correlationId: "correlation-123",
      };

      mockKv.get.mockResolvedValue(cachedData);

      const result = await service.get("user-123");

      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(result.error).toBeUndefined();
      expect(mockKv.get).toHaveBeenCalledWith("recs:user-123");
    });

    it("should return null when cache miss (AC-8.4.2)", async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await service.get("user-not-found");

      expect(result.fromCache).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();
      // Verify correct key pattern
      expect(mockKv.get).toHaveBeenCalledWith("recs:user-not-found");
    });

    it("should handle errors gracefully", async () => {
      mockKv.get.mockRejectedValue(new Error("KV connection failed"));

      const result = await service.get("user-123");

      expect(result.fromCache).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe("KV connection failed");
    });

    it("should use correct key pattern (AC-8.4.2)", async () => {
      mockKv.get.mockResolvedValue(null);

      await service.get("abc-123-xyz");

      expect(mockKv.get).toHaveBeenCalledWith("recs:abc-123-xyz");
    });
  });

  describe("set", () => {
    const mockRecommendation: GeneratedRecommendation = {
      userId: "user-123",
      portfolioId: "portfolio-456",
      generatedAt: new Date().toISOString(),
      totalInvestable: "1000.00",
      baseCurrency: "USD",
      items: [
        {
          assetId: "asset-1",
          symbol: "VOO",
          score: "85.0000",
          currentAllocation: "45.0000",
          targetAllocation: "50.0000",
          allocationGap: "5.0000",
          recommendedAmount: "500.00",
          isOverAllocated: false,
          breakdown: {
            classId: "class-1",
            className: "US Stocks",
            subclassId: null,
            subclassName: null,
            currentValue: "45000.00",
            targetMidpoint: "50.0000",
            priority: "4.25",
            redistributedFrom: null,
          },
          sortOrder: 1,
          classAllocation: {
            className: "US Stocks",
            currentPercent: "45.0000",
            targetMin: "40",
            targetMax: "60",
            gap: "5.0000",
          },
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
        exchangeRatesSnapshot: { USD_BRL: "5.0" },
        scoresCorrelationId: "scores-correlation-123",
        pricesAsOf: new Date().toISOString(),
        ratesAsOf: new Date().toISOString(),
      },
    };

    it("should store recommendations with 24h TTL (AC-8.4.3)", async () => {
      mockKv.set.mockResolvedValue("OK");

      const result = await service.set("user-123", mockRecommendation);

      expect(result.success).toBe(true);
      expect(result.key).toBe("recs:user-123");
      expect(mockKv.set).toHaveBeenCalledWith(
        "recs:user-123",
        expect.any(Object),
        { ex: 86400 } // 24 hours in seconds
      );
    });

    it("should transform recommendation to cache format (AC-8.4.4)", async () => {
      mockKv.set.mockResolvedValue("OK");

      await service.set("user-123", mockRecommendation);

      const setCall = mockKv.set.mock.calls[0];
      const cachedData = setCall?.[1] as CachedRecommendations;

      // AC-8.4.4: Verify portfolio summary included
      expect(cachedData.portfolioSummary).toBeDefined();
      expect(cachedData.portfolioSummary.baseCurrency).toBe("USD");

      // AC-8.4.4: Verify data freshness timestamps included
      expect(cachedData.dataFreshness).toBeDefined();
      expect(cachedData.dataFreshness.pricesAsOf).toBeDefined();
      expect(cachedData.dataFreshness.ratesAsOf).toBeDefined();
      expect(cachedData.dataFreshness.criteriaVersion).toBe("criteria-v1");

      // Verify recommendations structure
      expect(cachedData.recommendations).toHaveLength(1);
      expect(cachedData.recommendations[0]?.symbol).toBe("VOO");
    });

    it("should handle errors gracefully", async () => {
      mockKv.set.mockRejectedValue(new Error("KV write failed"));

      const result = await service.set("user-123", mockRecommendation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("KV write failed");
    });

    it("should use correct key pattern (AC-8.4.2)", async () => {
      mockKv.set.mockResolvedValue("OK");

      await service.set("user-abc-123", mockRecommendation);

      expect(mockKv.set).toHaveBeenCalledWith(
        "recs:user-abc-123",
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe("invalidate", () => {
    it("should delete cached data for user", async () => {
      mockKv.del.mockResolvedValue(1);

      const result = await service.invalidate("user-123");

      expect(result.success).toBe(true);
      expect(result.key).toBe("recs:user-123");
      expect(mockKv.del).toHaveBeenCalledWith("recs:user-123");
    });

    it("should handle errors gracefully", async () => {
      mockKv.del.mockRejectedValue(new Error("KV delete failed"));

      const result = await service.invalidate("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("KV delete failed");
    });
  });

  describe("invalidateAll", () => {
    it("should scan and delete all recommendation keys", async () => {
      // Mock scan returning some keys, then empty (cursor 0)
      mockKv.scan
        .mockResolvedValueOnce(["50", ["recs:user-1", "recs:user-2"]])
        .mockResolvedValueOnce(["0", ["recs:user-3"]]);
      mockKv.del.mockResolvedValue(3);

      const result = await service.invalidateAll();

      expect(result.success).toBe(true);
      expect(result.keysDeleted).toBe(3);
      expect(mockKv.scan).toHaveBeenCalledWith(0, {
        match: "recs:*",
        count: 100,
      });
      expect(mockKv.del).toHaveBeenCalledWith("recs:user-1", "recs:user-2", "recs:user-3");
    });

    it("should handle no keys found", async () => {
      mockKv.scan.mockResolvedValue(["0", []]);

      const result = await service.invalidateAll();

      expect(result.success).toBe(true);
      expect(result.keysDeleted).toBe(0);
      expect(mockKv.del).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockKv.scan.mockRejectedValue(new Error("KV scan failed"));

      const result = await service.invalidateAll();

      expect(result.success).toBe(false);
      expect(result.keysDeleted).toBe(0);
    });
  });

  describe("exists", () => {
    it("should return true when key exists", async () => {
      mockKv.exists.mockResolvedValue(1);

      const result = await service.exists("user-123");

      expect(result).toBe(true);
      expect(mockKv.exists).toHaveBeenCalledWith("recs:user-123");
    });

    it("should return false when key does not exist", async () => {
      mockKv.exists.mockResolvedValue(0);

      const result = await service.exists("user-not-found");

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      mockKv.exists.mockRejectedValue(new Error("KV error"));

      const result = await service.exists("user-123");

      expect(result).toBe(false);
    });
  });

  describe("getTTL", () => {
    it("should return TTL in seconds", async () => {
      mockKv.ttl.mockResolvedValue(43200); // 12 hours remaining

      const result = await service.getTTL("user-123");

      expect(result).toBe(43200);
      expect(mockKv.ttl).toHaveBeenCalledWith("recs:user-123");
    });

    it("should return -2 when key does not exist", async () => {
      mockKv.ttl.mockResolvedValue(-2);

      const result = await service.getTTL("user-not-found");

      expect(result).toBe(-2);
    });

    it("should return -1 when key has no TTL", async () => {
      mockKv.ttl.mockResolvedValue(-1);

      const result = await service.getTTL("user-123");

      expect(result).toBe(-1);
    });

    it("should handle errors gracefully", async () => {
      mockKv.ttl.mockRejectedValue(new Error("KV error"));

      const result = await service.getTTL("user-123");

      expect(result).toBe(-2);
    });
  });
});

describe("CachedRecommendations type", () => {
  it("should include all required fields (AC-8.4.4)", () => {
    const cached: CachedRecommendations = {
      userId: "user-123",
      generatedAt: new Date().toISOString(),
      recommendations: [],
      portfolioSummary: {
        totalValue: "100000.00",
        baseCurrency: "USD",
        allocations: {},
      },
      dataFreshness: {
        pricesAsOf: new Date().toISOString(),
        ratesAsOf: new Date().toISOString(),
        criteriaVersion: "v1",
      },
      totalInvestable: "1000.00",
      correlationId: "correlation-123",
    };

    // AC-8.4.4: Portfolio summary
    expect(cached.portfolioSummary).toBeDefined();
    expect(cached.portfolioSummary.totalValue).toBeDefined();
    expect(cached.portfolioSummary.baseCurrency).toBeDefined();
    expect(cached.portfolioSummary.allocations).toBeDefined();

    // AC-8.4.4: Data freshness timestamps
    expect(cached.dataFreshness).toBeDefined();
    expect(cached.dataFreshness.pricesAsOf).toBeDefined();
    expect(cached.dataFreshness.ratesAsOf).toBeDefined();

    // AC-8.3.3: Criteria version for audit
    expect(cached.dataFreshness.criteriaVersion).toBeDefined();
  });

  it("should support allocation gap in recommendations", () => {
    const cached: CachedRecommendations = {
      userId: "user-123",
      generatedAt: new Date().toISOString(),
      recommendations: [
        {
          assetId: "asset-1",
          symbol: "VOO",
          score: "85.0000",
          amount: "500.00",
          currency: "USD",
          allocationGap: "5.0000", // AC-8.3.4
          breakdown: {
            criteriaCount: 5,
            topContributor: "US Stocks",
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
      portfolioSummary: {
        totalValue: "100000.00",
        baseCurrency: "USD",
        allocations: {},
      },
      dataFreshness: {
        pricesAsOf: new Date().toISOString(),
        ratesAsOf: new Date().toISOString(),
        criteriaVersion: "v1",
      },
      totalInvestable: "1000.00",
      correlationId: "correlation-123",
    };

    // AC-8.3.4: Allocation gap included
    expect(cached.recommendations[0]?.allocationGap).toBe("5.0000");
    expect(cached.recommendations[0]?.classAllocation).toBeDefined();
    expect(cached.recommendations[0]?.classAllocation.gap).toBe("5.0000");
  });
});
