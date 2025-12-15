/**
 * Dashboard Service Unit Tests
 *
 * Story 8.5: Instant Dashboard Load
 *
 * AC-8.5.1: Dashboard API Reads from Cache First
 * AC-8.5.2: Dashboard API Falls Back to PostgreSQL
 * AC-8.5.3: Dashboard Response Includes Cache Indicator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardService, type DashboardData } from "@/lib/services/dashboard-service";
import type {
  CachedRecommendations,
  CachedPortfolioSummary,
} from "@/lib/cache/recommendation-cache";
import type { GenerateRecommendationsResult } from "@/lib/types/recommendations";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      portfolios: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      monthlyInputs: { findFirst: vi.fn() },
    },
  },
}));

describe("DashboardService", () => {
  let service: DashboardService;
  let mockCacheService: {
    get: ReturnType<typeof vi.fn>;
    getPortfolio: ReturnType<typeof vi.fn>;
  };
  let mockRecService: {
    getCachedRecommendation: ReturnType<typeof vi.fn>;
  };

  // Helper to create mock cached recommendations
  const createMockCachedRecommendations = (): CachedRecommendations => ({
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
      allocations: { "US Stocks": "45.0000" },
    },
    dataFreshness: {
      pricesAsOf: new Date().toISOString(),
      ratesAsOf: new Date().toISOString(),
      criteriaVersion: "v1",
    },
    totalInvestable: "1000.00",
    correlationId: "corr-123",
  });

  // Helper to create mock portfolio summary
  const createMockPortfolioSummary = (): CachedPortfolioSummary => ({
    totalValue: "100000.00",
    assetCount: 10,
    allocations: [
      {
        className: "US Stocks",
        currentPercent: "45.0000",
        targetMin: "40",
        targetMax: "60",
      },
    ],
    baseCurrency: "USD",
    cachedAt: new Date().toISOString(),
  });

  // Helper to create mock database recommendation
  const createMockDbRecommendation = (): GenerateRecommendationsResult => ({
    id: "rec-123",
    userId: "user-123",
    portfolioId: "portfolio-123",
    contribution: "800.00",
    dividends: "200.00",
    totalInvestable: "1000.00",
    baseCurrency: "USD",
    correlationId: "corr-123",
    status: "active",
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
          criteriaCount: 5,
          className: "US Stocks",
          priority: 1,
        },
        sortOrder: 1,
      },
    ],
    durationMs: 100,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock services
    mockCacheService = {
      get: vi.fn(),
      getPortfolio: vi.fn(),
    };

    mockRecService = {
      getCachedRecommendation: vi.fn(),
    };

    // Create service with mocks
    service = new DashboardService(mockCacheService as never, mockRecService as never);
  });

  describe("getDashboardData", () => {
    describe("AC-8.5.1: Dashboard API Reads from Cache First", () => {
      it("should return cached data when cache hit", async () => {
        // Arrange
        const cachedRecs = createMockCachedRecommendations();
        const cachedPortfolio = createMockPortfolioSummary();

        mockCacheService.get.mockResolvedValue({
          data: cachedRecs,
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: cachedPortfolio,
          fromCache: true,
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).not.toBeNull();
        expect(result.data?.fromCache).toBe(true);
        expect(mockCacheService.get).toHaveBeenCalledWith("user-123");
      });

      it("should not call database when cache hit", async () => {
        // Arrange
        const cachedRecs = createMockCachedRecommendations();
        mockCacheService.get.mockResolvedValue({
          data: cachedRecs,
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: createMockPortfolioSummary(),
          fromCache: true,
        });

        // Act
        await service.getDashboardData("user-123");

        // Assert
        expect(mockRecService.getCachedRecommendation).not.toHaveBeenCalled();
      });

      it("should transform cached data to DashboardData format", async () => {
        // Arrange
        const cachedRecs = createMockCachedRecommendations();
        mockCacheService.get.mockResolvedValue({
          data: cachedRecs,
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: createMockPortfolioSummary(),
          fromCache: true,
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        const data = result.data as DashboardData;
        expect(data.recommendations).toHaveLength(1);
        expect(data.recommendations[0].symbol).toBe("VOO");
        expect(data.recommendations[0].score).toBe("85.0000");
        expect(data.totalInvestable).toBe("1000.00");
        expect(data.baseCurrency).toBe("USD");
        expect(data.dataFreshness.generatedAt).toBe(cachedRecs.generatedAt);
      });
    });

    describe("AC-8.5.2: Dashboard API Falls Back to PostgreSQL", () => {
      it("should fall back to database when cache miss", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: null,
          fromCache: false,
        });
        mockRecService.getCachedRecommendation.mockResolvedValue(createMockDbRecommendation());

        // Mock db queries (imported from mock)
        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: "portfolio-123",
          userId: "user-123",
        });
        (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          baseCurrency: "USD",
          defaultContribution: "800.00",
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.success).toBe(true);
        expect(mockRecService.getCachedRecommendation).toHaveBeenCalledWith("user-123");
      });

      it("should return fromCache: false for database data", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: null,
          fromCache: false,
        });
        mockRecService.getCachedRecommendation.mockResolvedValue(createMockDbRecommendation());

        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: "portfolio-123",
        });
        (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          baseCurrency: "USD",
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.data?.fromCache).toBe(false);
      });

      it("should return null data when no portfolio found", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: null,
          fromCache: false,
        });

        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it("should return null data when no recommendations found in database", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: null,
          fromCache: false,
        });
        mockRecService.getCachedRecommendation.mockResolvedValue(null);

        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: "portfolio-123",
        });
        (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          baseCurrency: "USD",
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("AC-8.5.3: Dashboard Response Includes Cache Indicator", () => {
      it("should include fromCache: true when data from cache", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: createMockCachedRecommendations(),
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: createMockPortfolioSummary(),
          fromCache: true,
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.data).not.toBeNull();
        expect(result.data?.fromCache).toBe(true);
      });

      it("should include fromCache: false when data from database", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: null,
          fromCache: false,
        });
        mockRecService.getCachedRecommendation.mockResolvedValue(createMockDbRecommendation());

        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: "portfolio-123",
        });
        (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          baseCurrency: "USD",
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.data).not.toBeNull();
        expect(result.data?.fromCache).toBe(false);
      });
    });

    describe("Error Handling", () => {
      it("should handle cache service errors gracefully", async () => {
        // Arrange
        mockCacheService.get.mockRejectedValue(new Error("Cache connection failed"));

        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: "portfolio-123",
        });
        (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          baseCurrency: "USD",
        });
        mockRecService.getCachedRecommendation.mockResolvedValue(createMockDbRecommendation());

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        // Should fall back to database after cache error
        expect(result.success).toBe(true);
        expect(mockRecService.getCachedRecommendation).toHaveBeenCalled();
      });

      it("should return error result when database fails", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: null,
          fromCache: false,
        });

        const { db } = await import("@/lib/db");
        (db.query.portfolios.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error("Database connection failed")
        );

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Data Transformation", () => {
      it("should include all required fields in response", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: createMockCachedRecommendations(),
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: createMockPortfolioSummary(),
          fromCache: true,
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        const data = result.data as DashboardData;
        expect(data).toHaveProperty("recommendations");
        expect(data).toHaveProperty("portfolioSummary");
        expect(data).toHaveProperty("totalInvestable");
        expect(data).toHaveProperty("baseCurrency");
        expect(data).toHaveProperty("dataFreshness");
        expect(data).toHaveProperty("fromCache");
      });

      it("should include data freshness information", async () => {
        // Arrange
        const cachedRecs = createMockCachedRecommendations();
        mockCacheService.get.mockResolvedValue({
          data: cachedRecs,
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: createMockPortfolioSummary(),
          fromCache: true,
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        const data = result.data as DashboardData;
        expect(data.dataFreshness).toHaveProperty("generatedAt");
        expect(data.dataFreshness).toHaveProperty("pricesAsOf");
        expect(data.dataFreshness).toHaveProperty("ratesAsOf");
      });

      it("should include portfolio summary", async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue({
          data: createMockCachedRecommendations(),
          fromCache: true,
        });
        mockCacheService.getPortfolio.mockResolvedValue({
          data: createMockPortfolioSummary(),
          fromCache: true,
        });

        // Act
        const result = await service.getDashboardData("user-123");

        // Assert
        const data = result.data as DashboardData;
        expect(data.portfolioSummary).toHaveProperty("totalValue");
        expect(data.portfolioSummary).toHaveProperty("baseCurrency");
        expect(data.portfolioSummary).toHaveProperty("allocations");
      });
    });
  });
});
