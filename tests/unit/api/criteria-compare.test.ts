/**
 * Criteria Compare API Integration Tests
 *
 * Story 5.6: Compare Criteria Sets
 *
 * Tests for POST /api/criteria/compare:
 * - AC-5.6.1: Validation errors (same set, invalid UUIDs)
 * - AC-5.6.2, AC-5.6.3, AC-5.6.4: Successful comparison
 * - Authentication (401 for unauthenticated)
 * - Authorization (404 for criteria not owned by user)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK STATE
// =============================================================================

// Module-level mock state (pattern from criteria-copy.test.ts)
let mockUserId: string | null = "user-123";
let mockCompareResult: unknown | null = null;
let mockCompareError: Error | null = null;

// Mock comparison result
const mockSuccessResult = {
  setA: {
    id: "set-a-id",
    name: "Test Set A",
    market: "BR_BANKS",
    criteriaCount: 3,
    averageScore: "15.50",
  },
  setB: {
    id: "set-b-id",
    name: "Test Set B",
    market: "BR_BANKS",
    criteriaCount: 3,
    averageScore: "18.25",
  },
  differences: [
    {
      criterionName: "High Dividend",
      inSetA: {
        id: "1",
        name: "High Dividend",
        metric: "dividend_yield",
        metricLabel: "Dividend Yield",
        operator: "gt",
        operatorLabel: ">",
        value: "5.0",
        points: 10,
      },
      inSetB: {
        id: "2",
        name: "High Dividend",
        metric: "dividend_yield",
        metricLabel: "Dividend Yield",
        operator: "gt",
        operatorLabel: ">",
        value: "6.0",
        points: 12,
      },
      differenceType: "modified",
    },
  ],
  rankingChanges: [
    {
      assetSymbol: "ITUB4",
      assetName: "Itau Unibanco",
      rankA: 1,
      rankB: 2,
      scoreA: "25.00",
      scoreB: "23.00",
      change: "declined",
      positionChange: 1,
    },
  ],
  sampleSize: 20,
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

// Mock comparison service
vi.mock("@/lib/services/criteria-comparison-service", () => ({
  compareCriteriaSets: vi.fn(async () => {
    if (mockCompareError) {
      throw mockCompareError;
    }
    return mockCompareResult;
  }),
}));

// Mock CriteriaNotFoundError
vi.mock("@/lib/services/criteria-service", () => ({
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
  return new NextRequest("http://localhost:3000/api/criteria/compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe("POST /api/criteria/compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "user-123";
    mockCompareResult = mockSuccessResult;
    mockCompareError = null;
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      mockUserId = null;

      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation (AC-5.6.1)", () => {
    it("should return 400 when setAId is missing", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when setBId is missing", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when setAId is not a valid UUID", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "not-a-uuid",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when setBId is not a valid UUID", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "invalid",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when setAId equals setBId (same set)", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const sameId = "550e8400-e29b-41d4-a716-446655440001";
      const request = createRequest({
        setAId: sameId,
        setBId: sameId,
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      // Zod refinement error is returned as SAME_SET_ERROR with custom message
      expect(data.code).toBe("SAME_SET_ERROR");
      expect(data.error).toBe("Cannot compare a criteria set with itself");
    });
  });

  describe("Authorization", () => {
    it("should return 404 when criteria set is not found", async () => {
      const { CriteriaNotFoundError } = await import("@/lib/services/criteria-service");
      mockCompareError = new CriteriaNotFoundError();

      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 404 when criteria set belongs to another user", async () => {
      // The service throws CriteriaNotFoundError for user isolation
      const { CriteriaNotFoundError } = await import("@/lib/services/criteria-service");
      mockCompareError = new CriteriaNotFoundError();

      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      // Should appear as 404 (not 403) to avoid leaking info about other users' criteria
      expect(response.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  describe("Success (AC-5.6.2, AC-5.6.3, AC-5.6.4)", () => {
    it("should return 200 with comparison result on success", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockSuccessResult);
    });

    it("should include setA summary in response", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(data.data.setA).toHaveProperty("id");
      expect(data.data.setA).toHaveProperty("name");
      expect(data.data.setA).toHaveProperty("market");
      expect(data.data.setA).toHaveProperty("criteriaCount");
      expect(data.data.setA).toHaveProperty("averageScore");
    });

    it("should include setB summary in response", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(data.data.setB).toHaveProperty("id");
      expect(data.data.setB).toHaveProperty("name");
      expect(data.data.setB).toHaveProperty("market");
      expect(data.data.setB).toHaveProperty("criteriaCount");
      expect(data.data.setB).toHaveProperty("averageScore");
    });

    it("should include differences array in response", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(Array.isArray(data.data.differences)).toBe(true);
      expect(data.data.differences[0]).toHaveProperty("criterionName");
      expect(data.data.differences[0]).toHaveProperty("differenceType");
    });

    it("should include rankingChanges array in response", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(Array.isArray(data.data.rankingChanges)).toBe(true);
      expect(data.data.rankingChanges[0]).toHaveProperty("assetSymbol");
      expect(data.data.rankingChanges[0]).toHaveProperty("change");
      expect(data.data.rankingChanges[0]).toHaveProperty("positionChange");
    });

    it("should include sampleSize in response", async () => {
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(typeof data.data.sampleSize).toBe("number");
      expect(data.data.sampleSize).toBe(20);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 on unexpected errors", async () => {
      mockCompareError = new Error("Database connection failed");

      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should log errors on failure", async () => {
      mockCompareError = new Error("Test error");

      const { logger } = await import("@/lib/telemetry/logger");
      const { POST } = await import("@/app/api/criteria/compare/route");
      const request = createRequest({
        setAId: "550e8400-e29b-41d4-a716-446655440001",
        setBId: "550e8400-e29b-41d4-a716-446655440002",
      });

      await POST(request, {});

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to compare criteria sets",
        expect.objectContaining({
          errorMessage: "Test error",
          userId: mockUserId,
        })
      );
    });
  });
});
