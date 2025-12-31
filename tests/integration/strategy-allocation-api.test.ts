/**
 * Strategy Allocation API Integration Tests
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Auto-refresh on mount
 * AC-3.6.2: Calculate actual allocation by asset class
 * AC-3.6.4: Empty state when portfolio has no assets
 *
 * Tests for the /api/strategy/allocation endpoint.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock session for authenticated requests
let mockSession: { userId: string; email: string } | null = null;

// Mock allocation state
let mockHasAssets = false;
let mockHasAssetClasses = false;
let mockAllocations: Array<{
  classId: string;
  className: string;
  targetMin: string | null;
  targetMax: string | null;
  currentValue: string;
  currentPercentage: string;
  assetCount: number;
  status: string;
}> = [];
let mockTotalValue = "0";
let mockUnclassified = {
  value: "0",
  percentage: "0",
  assetCount: 0,
};

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, ...args: unknown[]) => {
      if (!mockSession) {
        return new Response(
          JSON.stringify({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return handler(request, mockSession, ...args);
    };
  }),
}));

// Mock the strategy allocation service
vi.mock("@/lib/services/strategy-allocation-service", () => ({
  getStrategyAllocation: vi.fn(() =>
    Promise.resolve({
      allocations: mockAllocations,
      totalPortfolioValue: mockTotalValue,
      unclassifiedValue: mockUnclassified.value,
      unclassifiedPercentage: mockUnclassified.percentage,
      unclassifiedAssetCount: mockUnclassified.assetCount,
    })
  ),
  getTargetAllocation: vi.fn(() =>
    Promise.resolve({
      allocations: mockAllocations,
      totalPortfolioValue: mockTotalValue,
      unclassifiedValue: mockUnclassified.value,
      unclassifiedPercentage: mockUnclassified.percentage,
      unclassifiedAssetCount: mockUnclassified.assetCount,
    })
  ),
  hasPortfolioAssets: vi.fn(() => Promise.resolve(mockHasAssets)),
  hasAssetClasses: vi.fn(() => Promise.resolve(mockHasAssetClasses)),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create test request helper
function createRequest(method: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/strategy/allocation", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("Strategy Allocation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state
    mockSession = null;
    mockHasAssets = false;
    mockHasAssetClasses = false;
    mockAllocations = [];
    mockTotalValue = "0";
    mockUnclassified = { value: "0", percentage: "0", assetCount: 0 };
  });

  describe("GET /api/strategy/allocation", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const { GET } = await import("@/app/api/strategy/allocation/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Authentication required");
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return allocation data when authenticated", async () => {
      mockSession = { userId: "user-123", email: "test@example.com" };
      mockHasAssets = true;
      mockHasAssetClasses = true;
      mockAllocations = [
        {
          classId: "class-1",
          className: "Stocks",
          targetMin: "40",
          targetMax: "60",
          currentValue: "5000.0000",
          currentPercentage: "50.0000",
          assetCount: 3,
          status: "on-target",
        },
        {
          classId: "class-2",
          className: "Bonds",
          targetMin: "30",
          targetMax: "40",
          currentValue: "5000.0000",
          currentPercentage: "50.0000",
          assetCount: 2,
          status: "over",
        },
      ];
      mockTotalValue = "10000.0000";

      const { GET } = await import("@/app/api/strategy/allocation/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.allocations).toHaveLength(2);
      expect(body.data.totalPortfolioValue).toBe("10000.0000");
      expect(body.meta.hasAssets).toBe(true);
    });

    it("should return empty data when no assets", async () => {
      mockSession = { userId: "user-123", email: "test@example.com" };
      mockHasAssets = false;
      mockAllocations = [];
      mockTotalValue = "0";

      const { GET } = await import("@/app/api/strategy/allocation/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.allocations).toHaveLength(0);
      expect(body.data.totalPortfolioValue).toBe("0");
      expect(body.meta.hasAssets).toBe(false);
    });

    it("should include unclassified assets in response", async () => {
      mockSession = { userId: "user-123", email: "test@example.com" };
      mockHasAssets = true;
      mockHasAssetClasses = true;
      mockAllocations = [
        {
          classId: "class-1",
          className: "Stocks",
          targetMin: "50",
          targetMax: "70",
          currentValue: "7000.0000",
          currentPercentage: "70.0000",
          assetCount: 3,
          status: "on-target",
        },
      ];
      mockTotalValue = "10000.0000";
      mockUnclassified = { value: "3000.0000", percentage: "30.0000", assetCount: 2 };

      const { GET } = await import("@/app/api/strategy/allocation/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.unclassifiedValue).toBe("3000.0000");
      expect(body.data.unclassifiedPercentage).toBe("30.0000");
      expect(body.data.unclassifiedAssetCount).toBe(2);
    });

    it("should include all allocation status types", async () => {
      mockSession = { userId: "user-123", email: "test@example.com" };
      mockHasAssets = true;
      mockHasAssetClasses = true;
      mockAllocations = [
        {
          classId: "class-1",
          className: "Under Class",
          targetMin: "30",
          targetMax: "40",
          currentValue: "2000.0000",
          currentPercentage: "20.0000",
          assetCount: 1,
          status: "under",
        },
        {
          classId: "class-2",
          className: "On Target Class",
          targetMin: "30",
          targetMax: "40",
          currentValue: "3500.0000",
          currentPercentage: "35.0000",
          assetCount: 2,
          status: "on-target",
        },
        {
          classId: "class-3",
          className: "Over Class",
          targetMin: "10",
          targetMax: "20",
          currentValue: "3000.0000",
          currentPercentage: "30.0000",
          assetCount: 1,
          status: "over",
        },
        {
          classId: "class-4",
          className: "No Target Class",
          targetMin: null,
          targetMax: null,
          currentValue: "1500.0000",
          currentPercentage: "15.0000",
          assetCount: 1,
          status: "no-target",
        },
      ];
      mockTotalValue = "10000.0000";

      const { GET } = await import("@/app/api/strategy/allocation/route");
      const request = createRequest("GET");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.allocations).toHaveLength(4);

      const statuses = body.data.allocations.map((a: { status: string }) => a.status);
      expect(statuses).toContain("under");
      expect(statuses).toContain("on-target");
      expect(statuses).toContain("over");
      expect(statuses).toContain("no-target");
    });
  });
});
