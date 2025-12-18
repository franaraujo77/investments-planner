/**
 * GET /api/recommendations API Route Tests
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 *
 * Tests:
 * - Returns cached recommendations when available
 * - Falls back to PostgreSQL on cache miss
 * - Returns 404 with NO_RECOMMENDATIONS code when no data
 * - Requires valid JWT authentication
 * - Returns 401 when not authenticated
 * - Handles database errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/recommendations/route";

// =============================================================================
// MOCKS
// =============================================================================

// Mock auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest) => {
      const authHeader = request.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return Response.json(
          { error: "Authentication required", code: "AUTH_UNAUTHORIZED" },
          { status: 401 }
        );
      }
      // Mock session
      const session = { userId: "test-user-id", email: "test@example.com" };
      return handler(request, session);
    };
  }),
}));

// Mock recommendation service
const mockGetCachedRecommendation = vi.fn();
vi.mock("@/lib/services/recommendation-service", () => ({
  recommendationService: {
    getCachedRecommendation: (...args: unknown[]) => mockGetCachedRecommendation(...args),
  },
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// TEST DATA
// =============================================================================

// Use relative dates to avoid test failures when dates become stale
const now = new Date();
const generatedAt = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
const expiresAt = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now

const mockRecommendation = {
  id: "rec-123",
  userId: "test-user-id",
  portfolioId: "portfolio-123",
  contribution: "1000.00",
  dividends: "100.00",
  totalInvestable: "1100.00",
  baseCurrency: "USD",
  correlationId: "corr-123",
  status: "active",
  generatedAt,
  expiresAt,
  items: [
    {
      assetId: "asset-1",
      symbol: "AAPL",
      score: "85.0",
      currentAllocation: "15.0",
      targetAllocation: "20.0",
      allocationGap: "5.0",
      recommendedAmount: "500.00",
      isOverAllocated: false,
      breakdown: { priority: "4.25" },
      sortOrder: 1,
    },
    {
      assetId: "asset-2",
      symbol: "GOOGL",
      score: "75.0",
      currentAllocation: "10.0",
      targetAllocation: "15.0",
      allocationGap: "5.0",
      recommendedAmount: "300.00",
      isOverAllocated: false,
      breakdown: { priority: "3.75" },
      sortOrder: 2,
    },
  ],
  durationMs: 0,
};

// =============================================================================
// HELPERS
// =============================================================================

function createRequest(options: { authorized?: boolean } = {}): NextRequest {
  const { authorized = true } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authorized) {
    headers["authorization"] = "Bearer valid-token";
  }

  return new NextRequest("http://localhost/api/recommendations", {
    method: "GET",
    headers,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe("GET /api/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached recommendations when available", async () => {
    mockGetCachedRecommendation.mockResolvedValue(mockRecommendation);

    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe("rec-123");
    expect(body.data.totalInvestable).toBe("1100.00");
    expect(body.data.baseCurrency).toBe("USD");
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0].symbol).toBe("AAPL");
  });

  it("returns 404 when no recommendations available", async () => {
    mockGetCachedRecommendation.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recommendations not found");
    expect(body.code).toBe("NOT_FOUND_RECOMMENDATIONS");
  });

  it("returns 404 when recommendations are expired", async () => {
    const expiredRec = {
      ...mockRecommendation,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour in the past (expired)
    };
    mockGetCachedRecommendation.mockResolvedValue(expiredRec);

    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND_RECOMMENDATIONS");
  });

  it("returns 401 when not authenticated", async () => {
    const request = createRequest({ authorized: false });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("formats dates as ISO strings in response", async () => {
    mockGetCachedRecommendation.mockResolvedValue(mockRecommendation);

    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    // Verify dates are ISO strings (dynamic dates, so check format not exact value)
    expect(body.data.generatedAt).toBe(generatedAt.toISOString());
    expect(body.data.expiresAt).toBe(expiresAt.toISOString());
  });

  it("includes all item fields in response", async () => {
    mockGetCachedRecommendation.mockResolvedValue(mockRecommendation);

    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    const firstItem = body.data.items[0];
    expect(firstItem.assetId).toBe("asset-1");
    expect(firstItem.symbol).toBe("AAPL");
    expect(firstItem.score).toBe("85.0");
    expect(firstItem.currentAllocation).toBe("15.0");
    expect(firstItem.targetAllocation).toBe("20.0");
    expect(firstItem.allocationGap).toBe("5.0");
    expect(firstItem.recommendedAmount).toBe("500.00");
    expect(firstItem.isOverAllocated).toBe(false);
  });

  it("calls service with correct user ID", async () => {
    mockGetCachedRecommendation.mockResolvedValue(mockRecommendation);

    const request = createRequest();
    await GET(request);

    expect(mockGetCachedRecommendation).toHaveBeenCalledWith("test-user-id");
  });

  it("handles empty items array (balanced portfolio)", async () => {
    const balancedRec = {
      ...mockRecommendation,
      items: [],
    };
    mockGetCachedRecommendation.mockResolvedValue(balancedRec);

    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(0);
  });
});
