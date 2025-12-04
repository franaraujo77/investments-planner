/**
 * Investments API Integration Tests
 *
 * Story 3.8: Record Investment Amount
 *
 * Tests for investments API endpoints:
 * - POST /api/investments: Record new investments
 * - GET /api/investments: Get investment history
 *
 * AC-3.8.1: Investment record creation
 * AC-3.8.2: Portfolio holdings update
 * AC-3.8.5: Validation errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock investment records
let mockInvestments: unknown[] = [];
let mockRecordResult: unknown[] = [];
let mockSession: { userId: string } | null = null;

// Mock the investment service
vi.mock("@/lib/services/investment-service", () => ({
  recordInvestments: vi.fn(() => Promise.resolve(mockRecordResult)),
  getInvestmentHistory: vi.fn(() => Promise.resolve(mockInvestments)),
  InvestmentAssetNotFoundError: class InvestmentAssetNotFoundError extends Error {
    assetId: string;
    constructor(assetId: string) {
      super(`Asset ${assetId} not found`);
      this.name = "InvestmentAssetNotFoundError";
      this.assetId = assetId;
    }
  },
  InvestmentPortfolioNotFoundError: class InvestmentPortfolioNotFoundError extends Error {
    portfolioId: string;
    constructor(portfolioId: string) {
      super(`Portfolio ${portfolioId} not found`);
      this.name = "InvestmentPortfolioNotFoundError";
      this.portfolioId = portfolioId;
    }
  },
}));

// Mock the auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest) => {
      if (!mockSession) {
        return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handler(request, mockSession);
    };
  }),
}));

// Mock validation schemas
vi.mock("@/lib/validations/portfolio", () => ({
  recordInvestmentsSchema: {
    safeParse: vi.fn((data) => {
      // Basic validation simulation
      if (!data.investments || data.investments.length === 0) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { investments: ["At least one investment is required"] },
            }),
          },
        };
      }

      for (const inv of data.investments) {
        if (!inv.quantity || parseFloat(inv.quantity) <= 0) {
          return {
            success: false,
            error: {
              flatten: () => ({
                fieldErrors: { quantity: ["Quantity must be positive"] },
              }),
            },
          };
        }
        if (!inv.pricePerUnit || parseFloat(inv.pricePerUnit) <= 0) {
          return {
            success: false,
            error: {
              flatten: () => ({
                fieldErrors: { pricePerUnit: ["Price per unit must be positive"] },
              }),
            },
          };
        }
      }

      return { success: true, data };
    }),
  },
  getInvestmentsQuerySchema: {
    safeParse: vi.fn((data) => {
      return { success: true, data };
    }),
  },
}));

// Import route handlers after mocks
import { GET, POST } from "@/app/api/investments/route";

describe("Investments API", () => {
  const mockUserId = "user-123";
  const mockPortfolioId = "portfolio-456";
  const mockAssetId = "asset-789";

  const validInvestmentPayload = {
    investments: [
      {
        portfolioId: mockPortfolioId,
        assetId: mockAssetId,
        symbol: "AAPL",
        quantity: "5",
        pricePerUnit: "155.50",
        currency: "USD",
        recommendedAmount: null,
      },
    ],
  };

  const mockInvestmentRecord = {
    id: "investment-001",
    userId: mockUserId,
    portfolioId: mockPortfolioId,
    assetId: mockAssetId,
    symbol: "AAPL",
    quantity: "5",
    pricePerUnit: "155.50",
    totalAmount: "777.5000",
    currency: "USD",
    recommendedAmount: null,
    investedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvestments = [];
    mockRecordResult = [];
    mockSession = { userId: mockUserId };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // POST /api/investments TESTS
  // ==========================================================================

  describe("POST /api/investments", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(validInvestmentPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for validation errors (AC-3.8.5)", async () => {
      const invalidPayload = {
        investments: [
          {
            portfolioId: mockPortfolioId,
            assetId: mockAssetId,
            symbol: "AAPL",
            quantity: "-5", // Invalid: negative
            pricePerUnit: "155.50",
            currency: "USD",
          },
        ],
      };

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(invalidPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for empty investments array", async () => {
      const emptyPayload = {
        investments: [],
      };

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(emptyPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 201 with created investments for valid request (AC-3.8.1)", async () => {
      mockRecordResult = [mockInvestmentRecord];

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(validInvestmentPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].symbol).toBe("AAPL");
      expect(data.meta.count).toBe(1);
    });

    it("should return 404 for asset not found error", async () => {
      // Mock service to throw asset not found error
      const { recordInvestments } = await import("@/lib/services/investment-service");
      const { InvestmentAssetNotFoundError } = await import("@/lib/services/investment-service");

      vi.mocked(recordInvestments).mockRejectedValueOnce(
        new InvestmentAssetNotFoundError("invalid-asset")
      );

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(validInvestmentPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("ASSET_NOT_FOUND");
    });

    it("should return 404 for portfolio not found error", async () => {
      const { recordInvestments } = await import("@/lib/services/investment-service");
      const { InvestmentPortfolioNotFoundError } =
        await import("@/lib/services/investment-service");

      vi.mocked(recordInvestments).mockRejectedValueOnce(
        new InvestmentPortfolioNotFoundError("invalid-portfolio")
      );

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(validInvestmentPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("PORTFOLIO_NOT_FOUND");
    });

    it("should include total amount in response meta", async () => {
      mockRecordResult = [mockInvestmentRecord];

      const request = new NextRequest("http://localhost/api/investments", {
        method: "POST",
        body: JSON.stringify(validInvestmentPayload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.meta.totalAmount).toBeDefined();
    });
  });

  // ==========================================================================
  // GET /api/investments TESTS
  // ==========================================================================

  describe("GET /api/investments", () => {
    it("should return 401 when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/investments");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return empty array when no investments exist", async () => {
      mockInvestments = [];

      const request = new NextRequest("http://localhost/api/investments");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.count).toBe(0);
    });

    it("should return investments for authenticated user", async () => {
      mockInvestments = [mockInvestmentRecord];

      const request = new NextRequest("http://localhost/api/investments");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].symbol).toBe("AAPL");
      expect(data.meta.count).toBe(1);
    });

    it("should support date range filtering", async () => {
      mockInvestments = [mockInvestmentRecord];

      const request = new NextRequest(
        "http://localhost/api/investments?from=2024-01-01T00:00:00.000Z&to=2024-12-31T23:59:59.999Z"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.from).toBe("2024-01-01T00:00:00.000Z");
      expect(data.meta.to).toBe("2024-12-31T23:59:59.999Z");
    });

    it("should support portfolioId filtering", async () => {
      mockInvestments = [mockInvestmentRecord];

      const request = new NextRequest(
        `http://localhost/api/investments?portfolioId=${mockPortfolioId}`
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should support assetId filtering", async () => {
      mockInvestments = [mockInvestmentRecord];

      const request = new NextRequest(`http://localhost/api/investments?assetId=${mockAssetId}`);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});
