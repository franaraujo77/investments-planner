/**
 * Audit Calculations API Tests
 *
 * Story 8.6: Calculation Audit Trail
 * AC-8.6.4: Users can query calculation history by asset
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Hoist mocks to top level
const { mockSession, mockGetCalculationHistory } = vi.hoisted(() => ({
  mockSession: { userId: "user-123", email: "test@example.com" },
  mockGetCalculationHistory: vi.fn(),
}));

// Mock auth middleware
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, context: unknown) => {
      return handler(request, mockSession, context);
    };
  }),
}));

// Mock audit service
vi.mock("@/lib/services/audit-service", () => ({
  auditService: {
    getCalculationHistory: mockGetCalculationHistory,
  },
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

// Import after mocks
import { GET } from "@/app/api/audit/calculations/route";

describe("GET /api/audit/calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Validation", () => {
    it("should return 400 for missing assetId", async () => {
      const request = new NextRequest("http://localhost/api/audit/calculations");

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("should return 400 for invalid UUID assetId", async () => {
      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=invalid-uuid"
      );

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
      expect(body.details).toContainEqual(
        expect.objectContaining({
          path: "assetId",
          message: expect.stringContaining("UUID"),
        })
      );
    });

    it("should return 400 for invalid startDate format", async () => {
      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000&startDate=invalid-date"
      );

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("should return 400 for invalid endDate format", async () => {
      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000&endDate=not-a-date"
      );

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });
  });

  describe("Successful Queries", () => {
    it("should return calculation history for valid assetId", async () => {
      const mockResult = {
        calculations: [
          {
            correlationId: "corr-1",
            calculatedAt: new Date("2024-01-15"),
            score: "85.50",
            symbol: "AAPL",
            criteriaVersion: { id: "cv-1", name: "Default", version: 1 },
            breakdown: [],
            source: "overnight",
            jobRun: { id: "job-1", jobType: "scoring", status: "completed" },
          },
        ],
        totalCount: 1,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 50,
          offset: 0,
        },
      };

      mockGetCalculationHistory.mockResolvedValue(mockResult);

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000"
      );

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.calculations).toHaveLength(1);
      expect(body.data.totalCount).toBe(1);
    });

    it("should pass date range filters to service", async () => {
      mockGetCalculationHistory.mockResolvedValue({
        calculations: [],
        totalCount: 0,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          startDate: new Date("2024-01-01T00:00:00.000Z"),
          endDate: new Date("2024-12-31T00:00:00.000Z"),
          limit: 50,
          offset: 0,
        },
      });

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T00:00:00.000Z"
      );

      await GET(request, { params: Promise.resolve({}) });

      expect(mockGetCalculationHistory).toHaveBeenCalledWith(
        mockSession.userId,
        "550e8400-e29b-41d4-a716-446655440000",
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it("should pass pagination params to service", async () => {
      mockGetCalculationHistory.mockResolvedValue({
        calculations: [],
        totalCount: 0,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 10,
          offset: 20,
        },
      });

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000&limit=10&offset=20"
      );

      await GET(request, { params: Promise.resolve({}) });

      expect(mockGetCalculationHistory).toHaveBeenCalledWith(
        mockSession.userId,
        "550e8400-e29b-41d4-a716-446655440000",
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });

    it("should enforce max limit of 100", async () => {
      mockGetCalculationHistory.mockResolvedValue({
        calculations: [],
        totalCount: 0,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 100, // Should be capped
          offset: 0,
        },
      });

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000&limit=200"
      );

      await GET(request, { params: Promise.resolve({}) });

      expect(mockGetCalculationHistory).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          limit: 100, // Should be capped at 100
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when service throws error", async () => {
      mockGetCalculationHistory.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000"
      );

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Failed to retrieve calculation history");
    });
  });

  describe("Response Structure", () => {
    it("should include calculations array in response", async () => {
      mockGetCalculationHistory.mockResolvedValue({
        calculations: [],
        totalCount: 0,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 50,
          offset: 0,
        },
      });

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000"
      );

      const response = await GET(request, { params: Promise.resolve({}) });
      const body = await response.json();

      expect(body.data).toHaveProperty("calculations");
      expect(body.data).toHaveProperty("totalCount");
      expect(body.data).toHaveProperty("metadata");
    });

    it("should include metadata with query parameters", async () => {
      mockGetCalculationHistory.mockResolvedValue({
        calculations: [],
        totalCount: 0,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 50,
          offset: 0,
        },
      });

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000"
      );

      const response = await GET(request, { params: Promise.resolve({}) });
      const body = await response.json();

      expect(body.data.metadata).toHaveProperty("assetId");
      expect(body.data.metadata).toHaveProperty("limit");
      expect(body.data.metadata).toHaveProperty("offset");
    });
  });

  describe("Tenant Isolation", () => {
    it("should pass authenticated user ID to service", async () => {
      mockGetCalculationHistory.mockResolvedValue({
        calculations: [],
        totalCount: 0,
        metadata: {
          assetId: "550e8400-e29b-41d4-a716-446655440000",
          limit: 50,
          offset: 0,
        },
      });

      const request = new NextRequest(
        "http://localhost/api/audit/calculations?assetId=550e8400-e29b-41d4-a716-446655440000"
      );

      await GET(request, { params: Promise.resolve({}) });

      expect(mockGetCalculationHistory).toHaveBeenCalledWith(
        mockSession.userId,
        expect.any(String),
        expect.any(Object)
      );
    });
  });
});
