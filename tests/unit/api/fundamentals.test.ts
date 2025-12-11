/**
 * Fundamentals API Tests
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.1: Fundamentals Include Required Metrics
 * AC-6.2.2: Data Cached with 7-Day TTL
 * AC-6.2.4: Partial Failures Don't Cascade
 * AC-6.2.5: Source Attribution Recorded
 *
 * Integration tests for GET /api/data/fundamentals endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/data/fundamentals/route";

// Mock dependencies
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth middleware
const mockUserId = "test-user-id";
vi.mock("@/lib/auth/middleware", () => ({
  withAuth:
    (
      handler: (
        request: NextRequest,
        session: { userId: string; email: string },
        context: { params: Promise<Record<string, string>> }
      ) => Promise<Response>
    ) =>
    async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      const mockSession = {
        userId: mockUserId,
        email: "test@example.com",
      };
      return handler(request, mockSession, context ?? { params: Promise.resolve({}) });
    },
}));

// Mock fundamentals repository
vi.mock("@/lib/repositories/fundamentals-repository", () => ({
  fundamentalsRepository: {
    upsertFundamentals: vi.fn().mockResolvedValue({ inserted: 0, updated: 1, errors: [] }),
  },
}));

// Mock fundamentals service
const mockGetFundamentals = vi.fn();
vi.mock("@/lib/providers", () => ({
  getFundamentalsService: () => ({
    getFundamentals: mockGetFundamentals,
  }),
}));

describe("GET /api/data/fundamentals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful requests", () => {
    it("should return fundamentals for valid symbols (AC-6.2.1)", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "PETR4",
            peRatio: "4.52",
            pbRatio: "0.98",
            dividendYield: "12.34",
            marketCap: "450000000000",
            revenue: "500000000000",
            earnings: "100000000000",
            sector: "Energy",
            industry: "Oil & Gas",
            source: "gemini-api",
            fetchedAt: new Date("2025-12-10T12:00:00Z"),
            dataDate: new Date("2025-12-10"),
          },
        ],
        fromCache: false,
        provider: "gemini-api",
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date("2025-12-10T12:00:00Z"),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=PETR4");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.fundamentals).toHaveLength(1);
      expect(body.data.fundamentals[0]).toMatchObject({
        symbol: "PETR4",
        peRatio: "4.52",
        pbRatio: "0.98",
        dividendYield: "12.34",
        marketCap: "450000000000",
        source: "gemini-api",
      });
    });

    it("should include freshness information (AC-6.2.5)", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "VALE3",
            peRatio: "6.50",
            pbRatio: "1.10",
            dividendYield: "8.50",
            marketCap: "300000000000",
            source: "gemini-api",
            fetchedAt: new Date("2025-12-10T12:00:00Z"),
            dataDate: new Date("2025-12-10"),
          },
        ],
        fromCache: false,
        provider: "gemini-api",
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date("2025-12-10T12:00:00Z"),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=VALE3");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.freshness).toMatchObject({
        source: "gemini-api",
        isStale: false,
      });
      expect(body.data.freshness.fetchedAt).toBeDefined();
    });

    it("should handle multiple symbols", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "PETR4",
            peRatio: "4.52",
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
          {
            symbol: "VALE3",
            peRatio: "6.50",
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
          {
            symbol: "ITUB4",
            peRatio: "7.80",
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
        ],
        fromCache: false,
        provider: "gemini-api",
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest(
        "http://localhost:3000/api/data/fundamentals?symbols=PETR4,VALE3,ITUB4"
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.fundamentals).toHaveLength(3);
      expect(body.data.fundamentals.map((f: { symbol: string }) => f.symbol)).toEqual([
        "PETR4",
        "VALE3",
        "ITUB4",
      ]);
    });

    it("should handle optional fields being null", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "BBDC4",
            peRatio: "6.50",
            pbRatio: null,
            dividendYield: null,
            marketCap: "150000000000",
            revenue: null,
            earnings: null,
            sector: null,
            industry: null,
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
        ],
        fromCache: false,
        provider: "gemini-api",
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=BBDC4");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.fundamentals[0].pbRatio).toBeNull();
      expect(body.data.fundamentals[0].dividendYield).toBeNull();
    });
  });

  describe("validation errors", () => {
    it("should return 400 for missing symbols parameter", async () => {
      const request = new NextRequest("http://localhost:3000/api/data/fundamentals");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for empty symbols parameter", async () => {
      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for only whitespace symbols", async () => {
      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=,,,,");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("cache behavior (AC-6.2.2)", () => {
    it("should indicate data came from cache", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "PETR4",
            peRatio: "4.52",
            source: "gemini-api",
            fetchedAt: new Date("2025-12-08T12:00:00Z"), // 2 days ago
            dataDate: new Date("2025-12-08"),
          },
        ],
        fromCache: true,
        provider: "cache",
        freshness: {
          source: "cache",
          fetchedAt: new Date("2025-12-08T12:00:00Z"),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=PETR4");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.freshness.source).toBe("cache");
    });

    it("should indicate stale data when applicable", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "PETR4",
            peRatio: "4.52",
            source: "gemini-api",
            fetchedAt: new Date("2025-12-01T12:00:00Z"), // >7 days ago
            dataDate: new Date("2025-12-01"),
            isStale: true,
          },
        ],
        fromCache: true,
        provider: "cache",
        freshness: {
          source: "cache",
          fetchedAt: new Date("2025-12-01T12:00:00Z"),
          isStale: true,
          staleSince: new Date("2025-12-08T12:00:00Z"),
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=PETR4");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.freshness.isStale).toBe(true);
      expect(body.data.fundamentals[0].isStale).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should return 502 for provider errors", async () => {
      const mockError = new Error("Provider unavailable");
      (mockError as unknown as { code: string }).code = "PROVIDER_FAILED";
      mockGetFundamentals.mockRejectedValueOnce(mockError);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=PETR4");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.code).toBe("EXTERNAL_ERROR");
    });

    it("should return 500 for unexpected errors", async () => {
      mockGetFundamentals.mockRejectedValueOnce(new Error("Unexpected error"));

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=PETR4");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe("DATABASE_ERROR");
    });
  });

  describe("market filtering (AC-6.2.3)", () => {
    it("should normalize symbols to uppercase", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "PETR4",
            peRatio: "4.52",
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
        ],
        fromCache: false,
        provider: "gemini-api",
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest("http://localhost:3000/api/data/fundamentals?symbols=petr4");
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify the service was called with uppercase symbols
      expect(mockGetFundamentals).toHaveBeenCalledWith(["PETR4"]);
    });

    it("should handle symbols with whitespace", async () => {
      const mockFundamentals = {
        fundamentals: [
          {
            symbol: "PETR4",
            peRatio: "4.52",
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
          {
            symbol: "VALE3",
            peRatio: "6.50",
            source: "gemini-api",
            fetchedAt: new Date(),
            dataDate: new Date(),
          },
        ],
        fromCache: false,
        provider: "gemini-api",
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
      };

      mockGetFundamentals.mockResolvedValueOnce(mockFundamentals);

      const request = new NextRequest(
        "http://localhost:3000/api/data/fundamentals?symbols= PETR4 , VALE3 "
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetFundamentals).toHaveBeenCalledWith(["PETR4", "VALE3"]);
    });
  });
});
