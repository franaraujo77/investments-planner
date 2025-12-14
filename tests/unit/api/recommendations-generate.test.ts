/**
 * Recommendation Generation API Integration Tests
 *
 * Story 7.4: Generate Investment Recommendations
 *
 * Tests the POST /api/recommendations/generate endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCKS - Must be before imports
// =============================================================================

// Mock auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      // Simulate authenticated session
      const session = { userId: "user-1", email: "test@example.com" };
      return handler(request, session, context);
    };
  }),
}));

// Mock recommendation service - use vi.hoisted to create mock before hoisting
const { mockGenerateRecommendations } = vi.hoisted(() => ({
  mockGenerateRecommendations: vi.fn(),
}));

vi.mock("@/lib/services/recommendation-service", () => ({
  recommendationService: {
    generateRecommendations: mockGenerateRecommendations,
    getCachedRecommendation: vi.fn(),
    invalidateCache: vi.fn(),
  },
}));

// Mock portfolio service
vi.mock("@/lib/services/portfolio-service", () => ({
  PortfolioNotFoundError: class PortfolioNotFoundError extends Error {
    constructor() {
      super("Portfolio not found");
      this.name = "PortfolioNotFoundError";
    }
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

// Mock db errors
vi.mock("@/lib/db/errors", () => ({
  extractDbError: vi.fn(() => ({
    message: "Database error",
    code: null,
    category: "unknown",
    isConnectionError: false,
    isTimeout: false,
    constraint: null,
    detail: null,
    originalError: new Error("Test error"),
  })),
  toLogContext: vi.fn(() => ({})),
  getUserFriendlyMessage: vi.fn(() => "Database error"),
  DbErrorCode: {},
}));

// =============================================================================
// IMPORTS - After mocks
// =============================================================================

import { POST } from "@/app/api/recommendations/generate/route";
import { PortfolioNotFoundError } from "@/lib/services/portfolio-service";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/recommendations/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const mockContext = { params: Promise.resolve({}) };

// =============================================================================
// TESTS
// =============================================================================

describe("POST /api/recommendations/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful response
    mockGenerateRecommendations.mockResolvedValue({
      id: "rec-1",
      userId: "user-1",
      portfolioId: "portfolio-1",
      contribution: "1000.0000",
      dividends: "100.0000",
      totalInvestable: "1100.0000",
      baseCurrency: "USD",
      correlationId: "correlation-123",
      status: "active",
      generatedAt: new Date("2024-01-15T10:00:00Z"),
      expiresAt: new Date("2024-01-16T10:00:00Z"),
      items: [
        {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "85.0000",
          currentAllocation: "20.0000",
          targetAllocation: "25.0000",
          allocationGap: "5.0000",
          recommendedAmount: "550.0000",
          isOverAllocated: false,
          breakdown: {
            classId: "class-1",
            className: "Stocks",
            subclassId: null,
            subclassName: null,
            currentValue: "1500.0000",
            targetMidpoint: "25.0000",
            priority: "4.2500",
            redistributedFrom: null,
          },
          sortOrder: 0,
        },
        {
          assetId: "asset-2",
          symbol: "GOOGL",
          score: "80.0000",
          currentAllocation: "15.0000",
          targetAllocation: "25.0000",
          allocationGap: "10.0000",
          recommendedAmount: "550.0000",
          isOverAllocated: false,
          breakdown: {
            classId: "class-1",
            className: "Stocks",
            subclassId: null,
            subclassName: null,
            currentValue: "1000.0000",
            targetMidpoint: "25.0000",
            priority: "8.0000",
            redistributedFrom: null,
          },
          sortOrder: 1,
        },
      ],
      durationMs: 150,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // SUCCESSFUL GENERATION
  // ===========================================================================

  describe("successful generation", () => {
    it("should return 200 with recommendations on success", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        dividends: "100.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe("rec-1");
      expect(data.data.totalInvestable).toBe("1100.0000");
      expect(data.data.items).toHaveLength(2);
    });

    it("should default dividends to 0 if not provided", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      await POST(request, mockContext);

      expect(mockGenerateRecommendations).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          dividends: "0",
        })
      );
    });

    it("should include all required fields in response", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.data).toMatchObject({
        id: expect.any(String),
        contribution: expect.any(String),
        dividends: expect.any(String),
        totalInvestable: expect.any(String),
        baseCurrency: expect.any(String),
        generatedAt: expect.any(String),
        expiresAt: expect.any(String),
        items: expect.any(Array),
      });
    });

    it("should format items correctly", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();
      const item = data.data.items[0];

      expect(item).toMatchObject({
        assetId: expect.any(String),
        symbol: expect.any(String),
        score: expect.any(String),
        currentAllocation: expect.any(String),
        targetAllocation: expect.any(String),
        allocationGap: expect.any(String),
        recommendedAmount: expect.any(String),
        isOverAllocated: expect.any(Boolean),
      });
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================

  describe("validation errors", () => {
    it("should return 400 for missing contribution", async () => {
      const request = createRequest({
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("should return 400 for negative contribution", async () => {
      const request = createRequest({
        contribution: "-100.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should return 400 for zero contribution", async () => {
      const request = createRequest({
        contribution: "0",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should return 400 for negative dividends", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        dividends: "-50.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing portfolioId", async () => {
      const request = createRequest({
        contribution: "1000.0000",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid portfolioId format", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        portfolioId: "not-a-uuid",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should return 400 for non-numeric contribution", async () => {
      const request = createRequest({
        contribution: "abc",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // NOT FOUND ERRORS
  // ===========================================================================

  describe("not found errors", () => {
    it("should return 404 for portfolio not found", async () => {
      mockGenerateRecommendations.mockRejectedValue(new PortfolioNotFoundError());

      const request = createRequest({
        contribution: "1000.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Portfolio not found");
      expect(data.code).toBe("NOT_FOUND_PORTFOLIO");
    });
  });

  // ===========================================================================
  // TOTAL EQUALS INVESTABLE (AC-7.4.3)
  // ===========================================================================

  describe("total recommendations validation", () => {
    it("should have sum of recommendations equal total investable", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        dividends: "100.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      const totalRecommended = data.data.items.reduce(
        (sum: number, item: { recommendedAmount: string }) =>
          sum + parseFloat(item.recommendedAmount),
        0
      );

      expect(totalRecommended).toBeCloseTo(1100, 2);
    });
  });

  // ===========================================================================
  // DATE FORMATTING
  // ===========================================================================

  describe("date formatting", () => {
    it("should return dates as ISO strings", async () => {
      const request = createRequest({
        contribution: "1000.0000",
        portfolioId: "550e8400-e29b-41d4-a716-446655440000",
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(data.data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ===========================================================================
  // EMPTY BODY
  // ===========================================================================

  describe("empty or invalid body", () => {
    it("should return 400 for empty body", async () => {
      const request = new NextRequest("http://localhost:3000/api/recommendations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should return 400 for malformed JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/recommendations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{ invalid json }",
      });

      const response = await POST(request, mockContext);

      expect(response.status).toBe(400);
    });
  });
});
