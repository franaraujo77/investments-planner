/**
 * Investment Confirmation API Route Tests
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.3: Confirm Records Investments
 * AC-7.8.5: Validation Prevents Invalid Submissions
 *
 * Tests for POST /api/investments/confirm
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockUserId = "user-123";
const mockRecommendationId = "123e4567-e89b-12d3-a456-426614174000";

// Use vi.hoisted to create mock state before module hoisting
const { mockSession, setMockSession } = vi.hoisted(() => {
  let session: { userId: string; email: string } | null = {
    userId: "user-123",
    email: "test@example.com",
  };
  return {
    mockSession: () => session,
    setMockSession: (newSession: { userId: string; email: string } | null) => {
      session = newSession;
    },
  };
});

// Mock auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      const session = mockSession();
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handler(request, session, context);
    };
  }),
}));

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      recommendations: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock investment service
vi.mock("@/lib/services/investment-service", () => ({
  confirmInvestments: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import { POST } from "@/app/api/investments/confirm/route";
import { db } from "@/lib/db";
import { confirmInvestments } from "@/lib/services/investment-service";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/investments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe("POST /api/investments/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to authenticated state
    setMockSession({ userId: mockUserId, email: "test@example.com" });
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      setMockSession(null);

      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "1000.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(401);
    });
  });

  describe("Request Validation", () => {
    beforeEach(() => {
      // Setup default successful scenario
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue({
        id: mockRecommendationId,
        userId: mockUserId,
        status: "active",
        totalInvestable: "1000.00",
      } as any);
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/investments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid recommendationId", async () => {
      const request = createRequest({
        recommendationId: "invalid-uuid",
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "1000.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("should return 400 for empty investments array", async () => {
      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it("should return 400 for negative amounts", async () => {
      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "-100.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe("Recommendation Validation", () => {
    it("should return 404 if recommendation not found", async () => {
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue(null);

      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "500.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.code).toBe("NOT_FOUND_RECOMMENDATIONS");
    });

    it("should return 409 if recommendation already confirmed", async () => {
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue({
        id: mockRecommendationId,
        userId: mockUserId,
        status: "confirmed",
        totalInvestable: "1000.00",
      } as any);

      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "500.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(409);

      const body = await response.json();
      expect(body.code).toBe("CONFLICT_RESOURCE");
    });

    it("should return 400 if recommendation expired", async () => {
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue({
        id: mockRecommendationId,
        userId: mockUserId,
        status: "expired",
        totalInvestable: "1000.00",
      } as any);

      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "500.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe("Amount Validation", () => {
    beforeEach(() => {
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue({
        id: mockRecommendationId,
        userId: mockUserId,
        status: "active",
        totalInvestable: "1000.00",
      } as any);
    });

    it("should return 400 if total exceeds available capital", async () => {
      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "600.00",
            pricePerUnit: "150.00",
          },
          {
            assetId: "123e4567-e89b-12d3-a456-426614174002",
            ticker: "GOOGL",
            actualAmount: "500.00",
            pricePerUnit: "125.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Total exceeds available capital");
    });
  });

  describe("Successful Confirmation", () => {
    it("should return 200 on successful confirmation", async () => {
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue({
        id: mockRecommendationId,
        userId: mockUserId,
        status: "active",
        totalInvestable: "1000.00",
      } as any);

      vi.mocked(confirmInvestments).mockResolvedValue({
        success: true,
        investmentIds: ["inv-1"],
        summary: {
          totalInvested: "500.0000",
          assetsUpdated: 1,
        },
        allocations: {
          before: { "US Stocks": "45.0%" },
          after: { "US Stocks": "50.0%" },
        },
      });

      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments: [
          {
            assetId: "123e4567-e89b-12d3-a456-426614174001",
            ticker: "AAPL",
            actualAmount: "500.00",
            pricePerUnit: "150.00",
          },
        ],
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.success).toBe(true);
      expect(body.data.investmentIds).toHaveLength(1);
      expect(body.data.summary.totalInvested).toBe("500.0000");
      expect(body.data.allocations.before).toBeDefined();
      expect(body.data.allocations.after).toBeDefined();
    });

    it("should call confirmInvestments with correct parameters", async () => {
      vi.mocked(db.query.recommendations.findFirst).mockResolvedValue({
        id: mockRecommendationId,
        userId: mockUserId,
        status: "active",
        totalInvestable: "1000.00",
      } as any);

      vi.mocked(confirmInvestments).mockResolvedValue({
        success: true,
        investmentIds: ["inv-1"],
        summary: {
          totalInvested: "500.0000",
          assetsUpdated: 1,
        },
        allocations: { before: {}, after: {} },
      });

      const investments = [
        {
          assetId: "123e4567-e89b-12d3-a456-426614174001",
          ticker: "AAPL",
          actualAmount: "500.00",
          pricePerUnit: "150.00",
        },
      ];

      const request = createRequest({
        recommendationId: mockRecommendationId,
        investments,
      });

      await POST(request, { params: Promise.resolve({}) });

      expect(confirmInvestments).toHaveBeenCalledWith(mockUserId, {
        recommendationId: mockRecommendationId,
        investments,
      });
    });
  });
});
