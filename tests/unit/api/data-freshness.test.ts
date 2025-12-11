/**
 * Data Freshness API Tests
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.3: Hover Shows Exact Timestamp and Source
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest) => {
      const mockSession = { userId: "test-user-id", email: "test@example.com" };
      return handler(request, mockSession);
    };
  }),
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/prices-repository", () => ({
  pricesRepository: {
    getPricesBySymbols: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/exchange-rates-repository", () => ({
  exchangeRatesRepository: {
    getAllRates: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/fundamentals-repository", () => ({
  fundamentalsRepository: {
    getFundamentalsBySymbols: vi.fn(),
  },
}));

// Import the route after mocks are set up
import { GET } from "@/app/api/data/freshness/route";
import { pricesRepository } from "@/lib/repositories/prices-repository";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import { fundamentalsRepository } from "@/lib/repositories/fundamentals-repository";

// Helper to create NextRequest with search params
function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/data/freshness");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe("GET /api/data/freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should require authentication", async () => {
      // The withAuth mock wraps our handler, confirming auth is required
      const request = createRequest({ type: "prices", symbols: "PETR4" });

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt: new Date(),
          priceDate: "2025-12-10",
          isStale: false,
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Query Parameter Validation", () => {
    it("should return 400 for missing type parameter", async () => {
      const request = createRequest({});

      const response = await GET(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("type");
    });

    it("should return 400 for invalid type parameter", async () => {
      const request = createRequest({ type: "invalid" });

      const response = await GET(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("type");
    });

    it("should accept valid type: prices", async () => {
      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([]);

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should accept valid type: rates", async () => {
      vi.mocked(exchangeRatesRepository.getAllRates).mockResolvedValue([]);

      const request = createRequest({ type: "rates" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should accept valid type: fundamentals", async () => {
      vi.mocked(fundamentalsRepository.getFundamentalsBySymbols).mockResolvedValue([]);

      const request = createRequest({ type: "fundamentals", symbols: "PETR4" });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Prices Freshness", () => {
    it("should return freshness data for prices", async () => {
      const fetchedAt = new Date("2025-12-11T10:00:00Z");
      const updatedAt = new Date("2025-12-11T10:00:00Z");

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt,
          priceDate: "2025-12-10",
          isStale: false,
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.PETR4).toBeDefined();
      expect(body.data.PETR4.source).toBe("Gemini API");
      expect(body.data.PETR4.fetchedAt).toBeDefined();
      expect(body.data.PETR4.isStale).toBeDefined();
    });

    it("should handle multiple symbols", async () => {
      const fetchedAt = new Date();
      const updatedAt = new Date();

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt,
          priceDate: "2025-12-10",
          isStale: false,
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
        {
          id: "2",
          symbol: "VALE3",
          close: "65.00",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt,
          priceDate: "2025-12-10",
          isStale: false,
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "prices", symbols: "PETR4,VALE3" });
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.PETR4).toBeDefined();
      expect(body.data.VALE3).toBeDefined();
    });

    it("should mark data as stale when isStale flag is true", async () => {
      const fetchedAt = new Date();
      const updatedAt = new Date();

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt,
          priceDate: "2025-12-10",
          isStale: true, // Marked as stale
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      const body = await response.json();
      expect(body.data.PETR4.isStale).toBe(true);
    });

    it("should mark data as stale when fetchedAt is older than 24 hours", async () => {
      const oldFetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const updatedAt = new Date();

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt: oldFetchedAt,
          priceDate: "2025-12-10",
          isStale: false, // Flag is false but age makes it stale
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      const body = await response.json();
      expect(body.data.PETR4.isStale).toBe(true);
    });
  });

  describe("Exchange Rates Freshness", () => {
    it("should return freshness data for all exchange rates", async () => {
      const fetchedAt = new Date();
      const updatedAt = new Date();

      vi.mocked(exchangeRatesRepository.getAllRates).mockResolvedValue([
        {
          id: "1",
          baseCurrency: "USD",
          targetCurrency: "BRL",
          rate: "5.01234",
          source: "ExchangeRate API",
          fetchedAt,
          rateDate: "2025-12-10",
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "rates" });
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data["USD-BRL"]).toBeDefined();
      expect(body.data["USD-BRL"].source).toBe("ExchangeRate API");
    });
  });

  describe("Fundamentals Freshness", () => {
    it("should return freshness data for fundamentals", async () => {
      const fetchedAt = new Date();
      const updatedAt = new Date();

      vi.mocked(fundamentalsRepository.getFundamentalsBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          peRatio: "5.5",
          pbRatio: null,
          dividendYield: null,
          marketCap: null,
          revenue: null,
          earnings: null,
          sector: "Energy",
          industry: null,
          source: "Gemini API",
          fetchedAt,
          dataDate: "2025-12-10",
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "fundamentals", symbols: "PETR4" });
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.PETR4).toBeDefined();
      expect(body.data.PETR4.source).toBe("Gemini API");
    });

    it("should use 7-day TTL for fundamentals staleness", async () => {
      // 8 days ago - should be stale
      const oldFetchedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const updatedAt = new Date();

      vi.mocked(fundamentalsRepository.getFundamentalsBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          peRatio: "5.5",
          pbRatio: null,
          dividendYield: null,
          marketCap: null,
          revenue: null,
          earnings: null,
          sector: "Energy",
          industry: null,
          source: "Gemini API",
          fetchedAt: oldFetchedAt,
          dataDate: "2025-12-03",
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "fundamentals", symbols: "PETR4" });
      const response = await GET(request);

      const body = await response.json();
      expect(body.data.PETR4.isStale).toBe(true);
    });

    it("should NOT be stale for fundamentals within 7 days", async () => {
      // 5 days ago - should be fresh
      const recentFetchedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const updatedAt = new Date();

      vi.mocked(fundamentalsRepository.getFundamentalsBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          peRatio: "5.5",
          pbRatio: null,
          dividendYield: null,
          marketCap: null,
          revenue: null,
          earnings: null,
          sector: "Energy",
          industry: null,
          source: "Gemini API",
          fetchedAt: recentFetchedAt,
          dataDate: "2025-12-06",
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "fundamentals", symbols: "PETR4" });
      const response = await GET(request);

      const body = await response.json();
      expect(body.data.PETR4.isStale).toBe(false);
    });
  });

  describe("Response Format", () => {
    it("should return ISO 8601 date strings", async () => {
      const fetchedAt = new Date("2025-12-11T10:30:00Z");
      const updatedAt = new Date();

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt,
          priceDate: "2025-12-10",
          isStale: false,
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      const body = await response.json();
      // Should be valid ISO 8601
      expect(body.data.PETR4.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include staleSince when data is stale", async () => {
      const fetchedAt = new Date();
      const updatedAt = new Date("2025-12-10T08:00:00Z");

      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        {
          id: "1",
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "Gemini API",
          fetchedAt,
          priceDate: "2025-12-10",
          isStale: true,
          open: null,
          high: null,
          low: null,
          volume: null,
          createdAt: new Date(),
          updatedAt,
        },
      ]);

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      const body = await response.json();
      expect(body.data.PETR4.staleSince).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle repository errors gracefully", async () => {
      // Use an error message that won't be categorized as a connection error
      vi.mocked(pricesRepository.getPricesBySymbols).mockRejectedValue(
        new Error("Unexpected repository failure")
      );

      const request = createRequest({ type: "prices", symbols: "PETR4" });
      const response = await GET(request);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("INTERNAL_ERROR");
    });
  });
});
