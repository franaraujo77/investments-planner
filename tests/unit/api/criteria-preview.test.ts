/**
 * Criteria Preview API Integration Tests
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 *
 * Tests for POST /api/criteria/preview:
 * - AC-5.7.1: Preview button requires valid criteria
 * - AC-5.7.2: Returns top 10 assets with scores
 * - AC-5.7.4: Comparison mode with savedVersionId
 * - Authentication (401 for unauthenticated)
 * - Validation (400 for invalid criteria)
 * - Authorization (404 for saved version not found)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK STATE
// =============================================================================

// Module-level mock state (pattern from criteria-compare.test.ts)
let mockUserId: string | null = "user-123";
let mockSavedCriteria: unknown | null = null;
let mockGetByIdError: Error | null = null;

// Mock preview result
const mockPreviewResult = {
  topAssets: [
    {
      symbol: "BBAS3",
      name: "Banco do Brasil",
      score: "23.00",
      rank: 1,
      breakdown: [
        {
          criterionId: "c1",
          criterionName: "High Dividend",
          metric: "dividend_yield",
          metricLabel: "Dividend Yield",
          operator: "gt",
          operatorLabel: ">",
          targetValue: "5.0",
          actualValue: 7.5,
          pointsAwarded: 10,
          maxPoints: 10,
          passed: true,
        },
      ],
    },
    {
      symbol: "ITUB4",
      name: "Itau Unibanco",
      score: "18.00",
      rank: 2,
      breakdown: [],
    },
    {
      symbol: "BBDC4",
      name: "Bradesco",
      score: "15.00",
      rank: 3,
      breakdown: [],
    },
    {
      symbol: "SANB11",
      name: "Santander",
      score: "12.00",
      rank: 4,
      breakdown: [],
    },
    {
      symbol: "ABCB4",
      name: "ABC Brasil",
      score: "10.00",
      rank: 5,
      breakdown: [],
    },
    {
      symbol: "BRSR6",
      name: "Banrisul",
      score: "8.00",
      rank: 6,
      breakdown: [],
    },
    {
      symbol: "BPAC11",
      name: "BTG Pactual",
      score: "7.00",
      rank: 7,
      breakdown: [],
    },
    {
      symbol: "PSSA3",
      name: "Porto Seguro",
      score: "6.00",
      rank: 8,
      breakdown: [],
    },
    {
      symbol: "CXSE3",
      name: "Caixa Seguridade",
      score: "5.00",
      rank: 9,
      breakdown: [],
    },
    {
      symbol: "TAEE11",
      name: "Taesa",
      score: "4.00",
      rank: 10,
      breakdown: [],
    },
  ],
  comparison: undefined,
  calculatedAt: new Date().toISOString(),
  sampleSize: 20,
};

// Mock result with comparison
const mockPreviewResultWithComparison = {
  ...mockPreviewResult,
  comparison: {
    improved: 5,
    declined: 3,
    unchanged: 12,
    previousAverageScore: "12.50",
    currentAverageScore: "14.75",
  },
};

// Mock saved criteria version
const mockSavedVersion = {
  id: "550e8400-e29b-41d4-a716-446655440099",
  userId: "user-123",
  assetType: "stock",
  targetMarket: "BR_BANKS",
  name: "Saved Criteria",
  criteria: [
    {
      id: "c1",
      name: "High Dividend",
      metric: "dividend_yield",
      operator: "gt",
      value: "5.0",
      value2: null,
      points: 10,
      requiredFundamentals: ["dividend_yield"],
      sortOrder: 0,
    },
  ],
  version: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// MOCKS
// =============================================================================

// Mock auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context?: unknown) => {
      if (!mockUserId) {
        const { NextResponse } = await import("next/server");
        return NextResponse.json(
          { error: "Not authenticated", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
      const session = { userId: mockUserId, email: "test@example.com" };
      return handler(request, session, context);
    };
  }),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock quick-calc service
vi.mock("@/lib/calculations/quick-calc", () => ({
  calculatePreview: vi.fn((criteria, previousCriteria) => {
    if (previousCriteria && previousCriteria.length > 0) {
      return mockPreviewResultWithComparison;
    }
    return mockPreviewResult;
  }),
}));

// Mock criteria service
vi.mock("@/lib/services/criteria-service", () => ({
  getCriteriaById: vi.fn(async (_userId: string, _criteriaId: string) => {
    if (mockGetByIdError) {
      throw mockGetByIdError;
    }
    if (mockSavedCriteria) {
      return mockSavedCriteria;
    }
    return null;
  }),
  CriteriaNotFoundError: class CriteriaNotFoundError extends Error {
    constructor() {
      super("Criteria set not found");
      this.name = "CriteriaNotFoundError";
    }
  },
}));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a NextRequest with JSON body
 */
function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/criteria/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Create valid criteria for testing
 */
function createValidCriteria() {
  return [
    {
      id: "c1",
      name: "High Dividend",
      metric: "dividend_yield",
      operator: "gt",
      value: "5.0",
      value2: null,
      points: 10,
      requiredFundamentals: ["dividend_yield"],
      sortOrder: 0,
    },
  ];
}

// =============================================================================
// TESTS
// =============================================================================

describe("POST /api/criteria/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "user-123";
    mockSavedCriteria = null;
    mockGetByIdError = null;
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      mockUserId = null;

      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation (AC-5.7.1)", () => {
    it("should return 400 when criteria is missing", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({});

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when criteria is empty array", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [],
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when criterion has invalid metric", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "Bad Criterion",
            metric: "invalid_metric",
            operator: "gt",
            value: "5.0",
            points: 10,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when criterion has invalid operator", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "Bad Criterion",
            metric: "dividend_yield",
            operator: "invalid_op",
            value: "5.0",
            points: 10,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when criterion name is empty", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "",
            metric: "dividend_yield",
            operator: "gt",
            value: "5.0",
            points: 10,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when points is out of range", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "Bad Points",
            metric: "dividend_yield",
            operator: "gt",
            value: "5.0",
            points: 150, // Max is 100
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when savedVersionId is not a valid UUID", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "not-a-uuid",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Success - Basic Preview (AC-5.7.2)", () => {
    it("should return 200 with preview result on success", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty("topAssets");
      expect(data.data).toHaveProperty("calculatedAt");
      expect(data.data).toHaveProperty("sampleSize");
    });

    it("should return exactly 10 or fewer top assets", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.topAssets.length).toBeLessThanOrEqual(10);
    });

    it("should include asset details in response", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(data.data.topAssets[0]).toHaveProperty("symbol");
      expect(data.data.topAssets[0]).toHaveProperty("name");
      expect(data.data.topAssets[0]).toHaveProperty("score");
      expect(data.data.topAssets[0]).toHaveProperty("rank");
      expect(data.data.topAssets[0]).toHaveProperty("breakdown");
    });

    it("should include sample size in response", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(typeof data.data.sampleSize).toBe("number");
      expect(data.data.sampleSize).toBe(20);
    });

    it("should not include comparison when savedVersionId is not provided", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(data.data.comparison).toBeUndefined();
    });
  });

  describe("Success - Comparison Mode (AC-5.7.4)", () => {
    beforeEach(() => {
      mockSavedCriteria = mockSavedVersion;
    });

    it("should return comparison when savedVersionId is provided", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.comparison).toBeDefined();
    });

    it("should include improved/declined/unchanged counts in comparison", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(data.data.comparison).toHaveProperty("improved");
      expect(data.data.comparison).toHaveProperty("declined");
      expect(data.data.comparison).toHaveProperty("unchanged");
      expect(typeof data.data.comparison.improved).toBe("number");
      expect(typeof data.data.comparison.declined).toBe("number");
      expect(typeof data.data.comparison.unchanged).toBe("number");
    });

    it("should include average scores in comparison", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(data.data.comparison).toHaveProperty("previousAverageScore");
      expect(data.data.comparison).toHaveProperty("currentAverageScore");
    });
  });

  describe("Authorization - Saved Version Not Found", () => {
    it("should return 404 when savedVersionId references non-existent criteria", async () => {
      // mockSavedCriteria is null, so getCriteriaById returns null
      mockSavedCriteria = null;

      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 404 when saved version belongs to another user", async () => {
      // The service returns null when userId doesn't match (simulated by mockSavedCriteria = null)
      mockSavedCriteria = null;

      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const response = await POST(request, {});
      const data = await response.json();

      // Should appear as 404 (not 403) to avoid leaking info
      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 on unexpected errors", async () => {
      // Use an error message that won't be categorized as a connection error
      mockGetByIdError = new Error("Unexpected processing failure");
      mockSavedCriteria = null; // Force getCriteriaById to be called

      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("DATABASE_ERROR");
    });

    it("should log errors on failure", async () => {
      mockGetByIdError = new Error("Test error");

      const { logger } = await import("@/lib/telemetry/logger");
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: createValidCriteria(),
        savedVersionId: "550e8400-e29b-41d4-a716-446655440099",
      });

      await POST(request, {});

      expect(logger.error).toHaveBeenCalledWith(
        "Database error: preview criteria",
        expect.objectContaining({
          dbErrorMessage: "Test error",
          userId: mockUserId,
        })
      );
    });
  });

  describe("Multiple Criteria", () => {
    it("should handle multiple criteria in request", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "High Dividend",
            metric: "dividend_yield",
            operator: "gt",
            value: "5.0",
            points: 10,
            requiredFundamentals: ["dividend_yield"],
            sortOrder: 0,
          },
          {
            id: "c2",
            name: "Low PE",
            metric: "pe_ratio",
            operator: "lt",
            value: "10.0",
            points: 5,
            requiredFundamentals: ["pe_ratio"],
            sortOrder: 1,
          },
          {
            id: "c3",
            name: "Strong ROE",
            metric: "roe",
            operator: "gte",
            value: "15.0",
            points: 8,
            requiredFundamentals: ["roe"],
            sortOrder: 2,
          },
        ],
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.topAssets).toBeDefined();
    });

    it("should handle criteria with 'between' operator", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "Moderate PE",
            metric: "pe_ratio",
            operator: "between",
            value: "6.0",
            value2: "12.0",
            points: 10,
            requiredFundamentals: ["pe_ratio"],
            sortOrder: 0,
          },
        ],
      });

      const response = await POST(request, {});
      await response.json(); // Consume response body

      expect(response.status).toBe(200);
    });

    it("should handle criteria with 'exists' operator", async () => {
      const { POST } = await import("@/app/api/criteria/preview/route");
      const request = createRequest({
        criteria: [
          {
            id: "c1",
            name: "Has Dividend",
            metric: "dividend_yield",
            operator: "exists",
            value: "",
            points: 5,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      const response = await POST(request, {});
      await response.json(); // Consume response body

      expect(response.status).toBe(200);
    });
  });
});
