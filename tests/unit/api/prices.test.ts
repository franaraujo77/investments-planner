/**
 * Prices API Tests
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.1: Prices Include OHLCV Data
 * AC-6.3.2: Prices Cached with 24-Hour TTL
 * AC-6.3.3: Yahoo Finance Fallback Used if Gemini Fails
 * AC-6.3.4: Missing Prices Show Last Known Price with Stale Flag
 * AC-6.3.5: Batch Requests Limited to 50 Symbols Per Call
 *
 * Tests for GET /api/data/prices endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Create mock functions with hoisting-compatible pattern
const mockGetPrices = vi.hoisted(() => vi.fn());
const mockUpsertPrices = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/auth/middleware", () => ({
  withAuth: (
    handler: (request: NextRequest, session: { userId: string; email: string }) => Promise<Response>
  ) => {
    return async (request: NextRequest) => {
      const session = { userId: "test-user-id", email: "test@example.com" };
      return handler(request, session);
    };
  },
}));

vi.mock("@/lib/providers", () => ({
  getPriceService: () => ({
    getPrices: mockGetPrices,
  }),
}));

vi.mock("@/lib/repositories/prices-repository", () => ({
  pricesRepository: {
    upsertPrices: mockUpsertPrices,
  },
}));

// Import after mocks
import { GET } from "@/app/api/data/prices/route";

describe("GET /api/data/prices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertPrices.mockResolvedValue({ inserted: 0, updated: 0, errors: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful requests", () => {
    it("should return prices for valid symbols (AC-6.3.1)", async () => {
      const mockPrices = [
        {
          symbol: "PETR4",
          open: "37.5",
          high: "39.0",
          low: "37.25",
          close: "38.45",
          volume: "15000000",
          currency: "BRL",
          source: "gemini-api",
          fetchedAt: new Date(),
          priceDate: new Date(),
        },
      ];

      mockGetPrices.mockResolvedValue({
        prices: mockPrices,
        fromCache: false,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=PETR4");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.prices).toHaveLength(1);
      expect(data.data.prices[0].symbol).toBe("PETR4");
      expect(data.data.prices[0].close).toBe("38.45");
      expect(data.data.prices[0].open).toBe("37.5");
      expect(data.data.prices[0].high).toBe("39.0");
      expect(data.data.prices[0].low).toBe("37.25");
      expect(data.data.prices[0].volume).toBe("15000000");
      expect(data.data.prices[0].currency).toBe("BRL");
    });

    it("should record source attribution in response (AC-6.3.3)", async () => {
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "VALE3",
            close: "65.2",
            currency: "BRL",
            source: "yahoo-finance", // Fallback source
            fetchedAt: new Date(),
            priceDate: new Date(),
          },
        ],
        fromCache: false,
        freshness: {
          source: "yahoo-finance",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "yahoo-finance",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=VALE3");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.prices[0].source).toBe("yahoo-finance");
      expect(data.data.provider).toBe("yahoo-finance");
    });

    it("should return cache status in response (AC-6.3.2)", async () => {
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "ITUB4",
            close: "32.5",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date(),
            priceDate: new Date(),
          },
        ],
        fromCache: true, // From cache
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=ITUB4");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.fromCache).toBe(true);
    });

    it("should indicate stale data in response (AC-6.3.4)", async () => {
      const staleSince = new Date();
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "BBDC4",
            close: "14.8",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date(),
            priceDate: new Date(),
            isStale: true,
          },
        ],
        fromCache: true,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: true,
          staleSince,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=BBDC4");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.freshness.isStale).toBe(true);
      expect(data.data.freshness.staleSince).toBeDefined();
      expect(data.data.prices[0].isStale).toBe(true);
    });

    it("should handle multiple symbols", async () => {
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "PETR4",
            close: "38.45",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date(),
            priceDate: new Date(),
          },
          {
            symbol: "VALE3",
            close: "65.2",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date(),
            priceDate: new Date(),
          },
        ],
        fromCache: false,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=PETR4,VALE3");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.prices).toHaveLength(2);
      expect(mockGetPrices).toHaveBeenCalledWith(["PETR4", "VALE3"]);
    });

    it("should persist prices to database", async () => {
      const mockPrices = [
        {
          symbol: "PETR4",
          close: "38.45",
          currency: "BRL",
          source: "gemini-api",
          fetchedAt: new Date(),
          priceDate: new Date(),
        },
      ];

      mockGetPrices.mockResolvedValue({
        prices: mockPrices,
        fromCache: false,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=PETR4");
      await GET(request);

      expect(mockUpsertPrices).toHaveBeenCalledWith(mockPrices);
    });
  });

  describe("validation errors", () => {
    it("should return 400 for missing symbols parameter", async () => {
      const request = new NextRequest("http://localhost/api/data/prices");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for empty symbols parameter", async () => {
      const request = new NextRequest("http://localhost/api/data/prices?symbols=");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for more than 100 symbols", async () => {
      const symbols = Array.from({ length: 101 }, (_, i) => `SYM${i}`).join(",");
      const request = new NextRequest(`http://localhost/api/data/prices?symbols=${symbols}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should normalize symbols to uppercase", async () => {
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "PETR4",
            close: "38.45",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date(),
            priceDate: new Date(),
          },
        ],
        fromCache: false,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=petr4");
      await GET(request);

      expect(mockGetPrices).toHaveBeenCalledWith(["PETR4"]);
    });
  });

  describe("provider errors", () => {
    it("should return 502 when all providers fail", async () => {
      const providerError = new Error("All providers failed");
      (providerError as Error & { code: string }).code = "PROVIDER_FAILED";
      mockGetPrices.mockRejectedValue(providerError);

      const request = new NextRequest("http://localhost/api/data/prices?symbols=PETR4");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe("PROVIDER_FAILED");
    });

    it("should return 500 for unexpected errors", async () => {
      mockGetPrices.mockRejectedValue(new Error("Unexpected error"));

      const request = new NextRequest("http://localhost/api/data/prices?symbols=PETR4");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("DATABASE_ERROR");
    });
  });

  describe("response format", () => {
    it("should return prices with all OHLCV fields when available", async () => {
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "PETR4",
            open: "37.5",
            high: "39.0",
            low: "37.25",
            close: "38.45",
            volume: "15000000",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date("2025-12-10T04:00:00Z"),
            priceDate: new Date("2025-12-09"),
          },
        ],
        fromCache: false,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date("2025-12-10T04:00:00Z"),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=PETR4");
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.prices[0]).toEqual({
        symbol: "PETR4",
        open: "37.5",
        high: "39.0",
        low: "37.25",
        close: "38.45",
        volume: "15000000",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: "2025-12-10T04:00:00.000Z",
        priceDate: "2025-12-09",
      });
    });

    it("should omit optional fields when not present", async () => {
      mockGetPrices.mockResolvedValue({
        prices: [
          {
            symbol: "VALE3",
            close: "65.2",
            currency: "BRL",
            source: "gemini-api",
            fetchedAt: new Date("2025-12-10T04:00:00Z"),
            priceDate: new Date("2025-12-09"),
          },
        ],
        fromCache: false,
        freshness: {
          source: "gemini-api",
          fetchedAt: new Date("2025-12-10T04:00:00Z"),
          isStale: false,
        },
        provider: "gemini-api",
      });

      const request = new NextRequest("http://localhost/api/data/prices?symbols=VALE3");
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.prices[0].open).toBeUndefined();
      expect(data.data.prices[0].high).toBeUndefined();
      expect(data.data.prices[0].low).toBeUndefined();
      expect(data.data.prices[0].volume).toBeUndefined();
    });
  });
});
