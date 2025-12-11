/**
 * Score History API Tests
 *
 * Story 5.9: Store Historical Scores
 *
 * Tests for GET /api/scores/[assetId]/history
 *
 * Task 7: Create Integration Tests for History API (AC: 5.9.2, 5.9.3)
 *
 * Tests:
 * - AC-5.9.2: Point-in-Time Score Query
 * - AC-5.9.3: Trend Query Support
 * - 401 for unauthenticated request
 * - Empty array when no history exists
 * - Trend analysis included when requested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/scores/[assetId]/history/route";

// Mock dependencies
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: (
    handler: (
      request: Request,
      session: { userId: string; email: string },
      ...rest: unknown[]
    ) => Promise<Response>
  ) => {
    return async (request: Request, ...rest: unknown[]) => {
      // Check for authorization header to simulate auth
      const authHeader = request.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Mock session
      const session = { userId: "user-123", email: "test@example.com" };
      return handler(request, session, ...rest);
    };
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock service methods
const mockGetScoreHistory = vi.fn();
const mockCalculateTrend = vi.fn();

vi.mock("@/lib/services/score-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/score-service")>();
  return {
    ...actual,
    getScoreHistory: (query: unknown) => mockGetScoreHistory(query),
    calculateTrend: (history: unknown) => mockCalculateTrend(history),
  };
});

describe("GET /api/scores/[assetId]/history", () => {
  const validAssetId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createRequest(assetId: string, queryParams: Record<string, string> = {}, auth = true) {
    const url = new URL(`http://localhost/api/scores/${assetId}/history`);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      headers["Authorization"] = "Bearer test-token";
    }

    return new NextRequest(url, { headers });
  }

  describe("AC-5.9.3: Trend Query Support - with days param", () => {
    it("should return history with default 90 days", async () => {
      mockGetScoreHistory.mockResolvedValue([
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ]);

      const request = createRequest(validAssetId);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toHaveLength(2);
      expect(mockGetScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          assetId: validAssetId,
          days: 90, // Default
        })
      );
    });

    it("should accept days=30 param", async () => {
      mockGetScoreHistory.mockResolvedValue([]);

      const request = createRequest(validAssetId, { days: "30" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });

      expect(response.status).toBe(200);
      expect(mockGetScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
        })
      );
    });

    it("should accept days=60 param", async () => {
      mockGetScoreHistory.mockResolvedValue([]);

      const request = createRequest(validAssetId, { days: "60" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });

      expect(response.status).toBe(200);
      expect(mockGetScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 60,
        })
      );
    });

    it("should accept days=90 param", async () => {
      mockGetScoreHistory.mockResolvedValue([]);

      const request = createRequest(validAssetId, { days: "90" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });

      expect(response.status).toBe(200);
      expect(mockGetScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 90,
        })
      );
    });

    it("should reject invalid days param", async () => {
      const request = createRequest(validAssetId, { days: "45" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("AC-5.9.3: Trend Query Support - with date range", () => {
    it("should accept startDate and endDate params", async () => {
      mockGetScoreHistory.mockResolvedValue([]);

      const request = createRequest(validAssetId, {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.000Z",
      });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });

      expect(response.status).toBe(200);
      expect(mockGetScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it("should reject invalid date format", async () => {
      const request = createRequest(validAssetId, { startDate: "invalid-date" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("AC-5.9.3: Trend analysis when requested", () => {
    it("should include trend when includeTrend=true and sufficient data", async () => {
      const mockHistory = [
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ];

      const mockTrend = {
        startScore: "50.0000",
        endScore: "75.0000",
        changePercent: "50.00",
        direction: "up" as const,
        dataPoints: 2,
      };

      mockGetScoreHistory.mockResolvedValue(mockHistory);
      mockCalculateTrend.mockReturnValue(mockTrend);

      const request = createRequest(validAssetId, { includeTrend: "true" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.trend).toBeDefined();
      expect(data.data.trend.direction).toBe("up");
      expect(data.data.trend.changePercent).toBe("50.00");
    });

    it("should not include trend when includeTrend is not set", async () => {
      mockGetScoreHistory.mockResolvedValue([
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ]);

      const request = createRequest(validAssetId);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.trend).toBeUndefined();
    });

    it("should not include trend when history has < 2 entries", async () => {
      mockGetScoreHistory.mockResolvedValue([
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
      ]);

      const request = createRequest(validAssetId, { includeTrend: "true" });
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.trend).toBeUndefined();
    });
  });

  describe("Authentication tests", () => {
    it("should return 401 for unauthenticated request", async () => {
      const request = createRequest(validAssetId, {}, false);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Empty history handling", () => {
    it("should return empty array (not 404) when no history exists", async () => {
      mockGetScoreHistory.mockResolvedValue([]);

      const request = createRequest(validAssetId);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toEqual([]);
      expect(data.data.history).toHaveLength(0);
    });
  });

  describe("Validation tests", () => {
    it("should return 400 for invalid assetId format", async () => {
      const request = createRequest("invalid-uuid");
      const response = await GET(request, { params: Promise.resolve({ assetId: "invalid-uuid" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return history in chronological order", async () => {
      const mockHistory = [
        { score: "50.0000", calculatedAt: new Date("2024-01-01"), criteriaVersionId: "v1" },
        { score: "60.0000", calculatedAt: new Date("2024-01-15"), criteriaVersionId: "v1" },
        { score: "75.0000", calculatedAt: new Date("2024-01-30"), criteriaVersionId: "v1" },
      ];

      mockGetScoreHistory.mockResolvedValue(mockHistory);

      const request = createRequest(validAssetId);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toHaveLength(3);

      // Check chronological order
      const dates = data.data.history.map((h: { calculatedAt: string }) =>
        new Date(h.calculatedAt).getTime()
      );
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
    });
  });

  describe("Response format", () => {
    it("should return correctly formatted history entries", async () => {
      const mockDate = new Date("2024-01-15T12:00:00.000Z");
      mockGetScoreHistory.mockResolvedValue([
        { score: "75.0000", calculatedAt: mockDate, criteriaVersionId: "version-abc" },
      ]);

      const request = createRequest(validAssetId);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history[0]).toEqual({
        score: "75.0000",
        calculatedAt: mockDate.toISOString(),
        criteriaVersionId: "version-abc",
      });
    });
  });

  describe("Error handling", () => {
    it("should return 500 on service error", async () => {
      mockGetScoreHistory.mockRejectedValue(new Error("Database error"));

      const request = createRequest(validAssetId);
      const response = await GET(request, { params: Promise.resolve({ assetId: validAssetId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("DATABASE_ERROR");
    });
  });
});
