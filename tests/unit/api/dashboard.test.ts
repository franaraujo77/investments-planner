/**
 * Dashboard API Route Unit Tests
 *
 * Story 8.5: Instant Dashboard Load
 *
 * AC-8.5.1: Dashboard API Reads from Cache First
 * AC-8.5.2: Dashboard API Falls Back to PostgreSQL
 * AC-8.5.3: Dashboard Response Includes Cache Indicator
 * AC-8.5.4: Dashboard Loads in Under 2 Seconds
 * AC-8.5.5: DataFreshnessBadge Shows Generation Time
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: <T>(handler: (req: NextRequest, session: { userId: string }) => Promise<T>) => {
    return (req: NextRequest) => {
      // Simulate authenticated user
      return handler(req, { userId: "test-user-123" });
    };
  },
}));

// Mock the dashboard service
const mockGetDashboardData = vi.fn();
vi.mock("@/lib/services/dashboard-service", () => ({
  dashboardService: {
    getDashboardData: () => mockGetDashboardData(),
  },
}));

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Dashboard API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockDashboardData = (fromCache: boolean) => ({
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
      },
    ],
    portfolioSummary: {
      totalValue: "100000.00",
      baseCurrency: "USD",
      allocations: { "US Stocks": "45.0000" },
    },
    totalInvestable: "1000.00",
    baseCurrency: "USD",
    dataFreshness: {
      generatedAt: new Date().toISOString(),
      pricesAsOf: new Date().toISOString(),
      ratesAsOf: new Date().toISOString(),
    },
    fromCache,
  });

  describe("GET /api/dashboard", () => {
    describe("AC-8.5.1: Dashboard API Reads from Cache First", () => {
      it("should return 200 with cached data when cache hit", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        // Dynamic import to get the mocked module
        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(json.data.fromCache).toBe(true);
      });
    });

    describe("AC-8.5.2: Dashboard API Falls Back to PostgreSQL", () => {
      it("should return 200 with database data when cache miss", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(false),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(json.data.fromCache).toBe(false);
      });
    });

    describe("AC-8.5.3: Dashboard Response Includes Cache Indicator", () => {
      it("should include fromCache field in response when cache hit", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(json.data).toHaveProperty("fromCache");
        expect(typeof json.data.fromCache).toBe("boolean");
      });

      it("should include fromCache field in response when cache miss", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(false),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(json.data).toHaveProperty("fromCache");
        expect(json.data.fromCache).toBe(false);
      });
    });

    describe("AC-8.5.5: DataFreshnessBadge Shows Generation Time", () => {
      it("should include dataFreshness in response", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(json.data).toHaveProperty("dataFreshness");
        expect(json.data.dataFreshness).toHaveProperty("generatedAt");
        expect(json.data.dataFreshness).toHaveProperty("pricesAsOf");
        expect(json.data.dataFreshness).toHaveProperty("ratesAsOf");
      });
    });

    describe("Response Format", () => {
      it("should include recommendations array", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(json.data).toHaveProperty("recommendations");
        expect(Array.isArray(json.data.recommendations)).toBe(true);
      });

      it("should include portfolioSummary", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(json.data).toHaveProperty("portfolioSummary");
        expect(json.data.portfolioSummary).toHaveProperty("totalValue");
        expect(json.data.portfolioSummary).toHaveProperty("baseCurrency");
      });

      it("should include totalInvestable and baseCurrency", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(json.data).toHaveProperty("totalInvestable");
        expect(json.data).toHaveProperty("baseCurrency");
      });
    });

    describe("Error Handling", () => {
      it("should return 404 when no recommendations found", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: null,
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(json).toHaveProperty("error");
        expect(json).toHaveProperty("code");
      });

      it("should return 500 when dashboard service fails", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: false,
          data: null,
          error: "Service error",
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(json).toHaveProperty("error");
      });

      it("should return 500 when unexpected exception occurs", async () => {
        // Arrange
        mockGetDashboardData.mockRejectedValue(new Error("Unexpected error"));

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(json).toHaveProperty("error");
      });
    });

    describe("Recommendation Item Structure", () => {
      it("should include all required fields in recommendation items", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        const item = json.data.recommendations[0];
        expect(item).toHaveProperty("assetId");
        expect(item).toHaveProperty("symbol");
        expect(item).toHaveProperty("score");
        expect(item).toHaveProperty("amount");
        expect(item).toHaveProperty("currency");
        expect(item).toHaveProperty("allocationGap");
        expect(item).toHaveProperty("breakdown");
      });

      it("should include breakdown details", async () => {
        // Arrange
        mockGetDashboardData.mockResolvedValue({
          success: true,
          data: createMockDashboardData(true),
        });

        const { GET } = await import("@/app/api/dashboard/route");
        const req = new NextRequest("http://localhost:3000/api/dashboard");

        // Act
        const response = await GET(req);
        const json = await response.json();

        // Assert
        const breakdown = json.data.recommendations[0].breakdown;
        expect(breakdown).toHaveProperty("criteriaCount");
        expect(breakdown).toHaveProperty("topContributor");
      });
    });
  });
});
