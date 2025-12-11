/**
 * Exchange Rates API Tests
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.1: Rates Fetched for All Currencies in User Portfolios
 * AC-6.4.2: Rates Are Previous Trading Day Close (T-1)
 * AC-6.4.3: Open Exchange Rates Fallback if Primary Fails
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 * AC-6.4.5: Supported Currencies (USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF)
 *
 * Tests for GET /api/data/exchange-rates endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Create mock functions with hoisting-compatible pattern
const mockGetRates = vi.hoisted(() => vi.fn());
const mockUpsertRates = vi.hoisted(() => vi.fn());

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  withAuth: (handler: Function) => {
    return async (request: NextRequest) => {
      const session = { userId: "test-user-id", email: "test@example.com" };
      return handler(request, session);
    };
  },
}));

vi.mock("@/lib/providers", () => ({
  getExchangeRateService: () => ({
    getRates: mockGetRates,
  }),
}));

vi.mock("@/lib/repositories/exchange-rates-repository", () => ({
  exchangeRatesRepository: {
    upsertRates: mockUpsertRates,
  },
}));

// Import after mocks
import { GET } from "@/app/api/data/exchange-rates/route";

describe("GET /api/data/exchange-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertRates.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful requests", () => {
    it("should return rates for valid base and targets (AC-6.4.1)", async () => {
      const mockRates = {
        base: "USD",
        rates: {
          BRL: "5.0123",
          EUR: "0.9234",
          GBP: "0.7845",
        },
        source: "exchangerate-api",
        fetchedAt: new Date("2025-12-10T04:00:00Z"),
        rateDate: new Date("2025-12-09"),
      };

      mockGetRates.mockResolvedValue({
        rates: mockRates,
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-10T04:00:00Z"),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL,EUR,GBP"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.exchangeRates.base).toBe("USD");
      expect(data.data.exchangeRates.rates.BRL).toBe("5.0123");
      expect(data.data.exchangeRates.rates.EUR).toBe("0.9234");
      expect(data.data.exchangeRates.rates.GBP).toBe("0.7845");
    });

    it("should include rate date in response (AC-6.4.2)", async () => {
      const mockRates = {
        base: "USD",
        rates: { BRL: "5.0123" },
        source: "exchangerate-api",
        fetchedAt: new Date("2025-12-10T04:00:00Z"),
        rateDate: new Date("2025-12-09"),
      };

      mockGetRates.mockResolvedValue({
        rates: mockRates,
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-10T04:00:00Z"),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.exchangeRates.rateDate).toBe("2025-12-09");
    });

    it("should record source attribution in response (AC-6.4.3, AC-6.4.4)", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: { BRL: "5.0123" },
          source: "open-exchange-rates", // Fallback source
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        fromCache: false,
        freshness: {
          source: "open-exchange-rates",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "open-exchange-rates",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.exchangeRates.source).toBe("open-exchange-rates");
      expect(data.data.provider).toBe("open-exchange-rates");
    });

    it("should return cache status in response", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: { EUR: "0.92" },
          source: "exchangerate-api",
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        fromCache: true,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=EUR"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.fromCache).toBe(true);
    });

    it("should indicate stale data in response", async () => {
      const staleSince = new Date("2025-12-09T04:00:00Z");
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: { BRL: "5.01" },
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-09T04:00:00Z"),
          rateDate: new Date("2025-12-08"),
          isStale: true,
        },
        fromCache: true,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-09T04:00:00Z"),
          isStale: true,
          staleSince,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.freshness.isStale).toBe(true);
      expect(data.data.freshness.staleSince).toBeDefined();
      expect(data.data.exchangeRates.isStale).toBe(true);
    });

    it("should return all supported currencies when targets not specified (AC-6.4.5)", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: {
            EUR: "0.92",
            GBP: "0.78",
            BRL: "5.01",
            CAD: "1.35",
            AUD: "1.52",
            JPY: "149.5",
            CHF: "0.88",
          },
          source: "exchangerate-api",
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest("http://localhost/api/data/exchange-rates?base=USD");
      const response = await GET(request);
      const _data = await response.json();

      expect(response.status).toBe(200);
      // Service should be called with all non-base currencies
      expect(mockGetRates).toHaveBeenCalledWith(
        "USD",
        expect.arrayContaining(["EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"])
      );
    });

    it("should persist rates to database", async () => {
      const mockRates = {
        base: "USD",
        rates: { BRL: "5.01" },
        source: "exchangerate-api",
        fetchedAt: new Date(),
        rateDate: new Date(),
      };

      mockGetRates.mockResolvedValue({
        rates: mockRates,
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      await GET(request);

      expect(mockUpsertRates).toHaveBeenCalledWith(mockRates);
    });
  });

  describe("validation errors (AC-6.4.5)", () => {
    it("should return 400 for missing base parameter", async () => {
      const request = new NextRequest("http://localhost/api/data/exchange-rates");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for empty base parameter", async () => {
      const request = new NextRequest("http://localhost/api/data/exchange-rates?base=");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for unsupported base currency", async () => {
      const request = new NextRequest("http://localhost/api/data/exchange-rates?base=XYZ");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for unsupported target currency", async () => {
      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL,XYZ"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should normalize currency codes to uppercase", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: { BRL: "5.01" },
          source: "exchangerate-api",
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=usd&targets=brl"
      );
      await GET(request);

      expect(mockGetRates).toHaveBeenCalledWith("USD", ["BRL"]);
    });

    it("should accept all 8 supported currencies (AC-6.4.5)", async () => {
      // Test that USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF are all valid
      const supportedCurrencies = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"];

      for (const base of supportedCurrencies) {
        mockGetRates.mockResolvedValue({
          rates: {
            base,
            rates: { USD: "1.0" },
            source: "exchangerate-api",
            fetchedAt: new Date(),
            rateDate: new Date(),
          },
          fromCache: false,
          freshness: {
            source: "exchangerate-api",
            fetchedAt: new Date(),
            isStale: false,
          },
          provider: "exchangerate-api",
        });

        const request = new NextRequest(
          `http://localhost/api/data/exchange-rates?base=${base}&targets=USD`
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
      }
    });
  });

  describe("provider errors", () => {
    it("should return 502 when all providers fail", async () => {
      const providerError = new Error("All providers failed");
      (providerError as Error & { code: string }).code = "ALL_PROVIDERS_FAILED";
      mockGetRates.mockRejectedValue(providerError);

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe("ALL_PROVIDERS_FAILED");
    });

    it("should return 502 when provider fails with specific error code", async () => {
      const providerError = new Error("Provider failed");
      (providerError as Error & { code: string }).code = "PROVIDER_FAILED";
      mockGetRates.mockRejectedValue(providerError);

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe("PROVIDER_FAILED");
    });

    it("should return 500 for unexpected errors", async () => {
      mockGetRates.mockRejectedValue(new Error("Unexpected error"));

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("response format", () => {
    it("should return rates with all expected fields (AC-6.4.4)", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: {
            BRL: "5.0123",
            EUR: "0.9234",
          },
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-10T04:00:00Z"),
          rateDate: new Date("2025-12-09"),
        },
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-10T04:00:00Z"),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL,EUR"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.exchangeRates).toEqual({
        base: "USD",
        rates: {
          BRL: "5.0123",
          EUR: "0.9234",
        },
        source: "exchangerate-api",
        fetchedAt: "2025-12-10T04:00:00.000Z",
        rateDate: "2025-12-09",
      });
      expect(data.data.fromCache).toBe(false);
      expect(data.data.freshness.source).toBe("exchangerate-api");
      expect(data.data.freshness.isStale).toBe(false);
      expect(data.data.provider).toBe("exchangerate-api");
    });

    it("should include isStale in exchangeRates when present", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: { BRL: "5.01" },
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-09T04:00:00Z"),
          rateDate: new Date("2025-12-08"),
          isStale: true,
        },
        fromCache: true,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date("2025-12-09T04:00:00Z"),
          isStale: true,
          staleSince: new Date("2025-12-09T04:00:00Z"),
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.exchangeRates.isStale).toBe(true);
    });

    it("should not include isStale when data is fresh", async () => {
      mockGetRates.mockResolvedValue({
        rates: {
          base: "USD",
          rates: { BRL: "5.01" },
          source: "exchangerate-api",
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        fromCache: false,
        freshness: {
          source: "exchangerate-api",
          fetchedAt: new Date(),
          isStale: false,
        },
        provider: "exchangerate-api",
      });

      const request = new NextRequest(
        "http://localhost/api/data/exchange-rates?base=USD&targets=BRL"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.exchangeRates.isStale).toBeUndefined();
    });
  });
});
