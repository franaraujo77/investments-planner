/**
 * Yahoo Finance Price Provider Tests
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.3: Yahoo Finance Fallback Used if Gemini Fails
 *
 * Tests for YahooFinancePriceProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { YahooFinancePriceProvider } from "@/lib/providers/implementations/yahoo-price-provider";
import { ProviderError, PROVIDER_ERROR_CODES } from "@/lib/providers/types";

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("YahooFinancePriceProvider", () => {
  let provider: YahooFinancePriceProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new YahooFinancePriceProvider({
      baseUrl: "https://query1.finance.yahoo.com",
      apiKey: "test-api-key",
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchPrices", () => {
    describe("successful fetch (AC-6.3.3)", () => {
      it("should fetch prices with OHLCV data as strings", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [
              {
                symbol: "PETR4.SA",
                regularMarketOpen: 37.5,
                regularMarketDayHigh: 39.0,
                regularMarketDayLow: 37.25,
                regularMarketPrice: 38.45,
                regularMarketVolume: 15000000,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
            ],
            error: null,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["PETR4"]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          symbol: "PETR4", // Normalized - suffix removed
          open: "37.5",
          high: "39",
          low: "37.25",
          close: "38.45",
          volume: "15000000",
          currency: "BRL",
          source: "yahoo-finance",
        });
        expect(result[0]!.fetchedAt).toBeInstanceOf(Date);
        expect(result[0]!.priceDate).toBeInstanceOf(Date);
      });

      it("should record source as yahoo-finance (AC-6.3.3)", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [
              {
                symbol: "VALE3.SA",
                regularMarketPrice: 65.2,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
            ],
            error: null,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["VALE3"]);

        expect(result[0]!.source).toBe("yahoo-finance");
      });

      it("should handle optional fields when not available", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [
              {
                symbol: "ITUB4.SA",
                regularMarketPrice: 32.5,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
            ],
            error: null,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["ITUB4"]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          symbol: "ITUB4",
          close: "32.5",
          currency: "BRL",
          source: "yahoo-finance",
        });
        // Optional fields should be undefined when not provided
        expect(result[0]!.open).toBeUndefined();
        expect(result[0]!.high).toBeUndefined();
        expect(result[0]!.low).toBeUndefined();
        expect(result[0]!.volume).toBeUndefined();
      });

      it("should normalize Yahoo symbol format (remove .SA suffix)", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [
              {
                symbol: "BBDC4.SA",
                regularMarketPrice: 14.8,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
            ],
            error: null,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["BBDC4"]);

        expect(result[0]!.symbol).toBe("BBDC4");
      });

      it("should return empty array for empty symbols input", async () => {
        const result = await provider.fetchPrices([]);

        expect(result).toHaveLength(0);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it("should handle multiple symbols in one request", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [
              {
                symbol: "PETR4.SA",
                regularMarketPrice: 38.45,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
              {
                symbol: "VALE3.SA",
                regularMarketPrice: 65.2,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
            ],
            error: null,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["PETR4", "VALE3"]);

        expect(result).toHaveLength(2);
        expect(result[0]!.symbol).toBe("PETR4");
        expect(result[1]!.symbol).toBe("VALE3");
      });
    });

    describe("error handling", () => {
      it("should throw ProviderError on 401 authentication error", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: () => Promise.resolve("Invalid API key"),
        });

        try {
          await provider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
        }
      });

      it("should throw ProviderError with RATE_LIMITED code on 429", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: () => Promise.resolve("Rate limit exceeded"),
        });

        try {
          await provider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.RATE_LIMITED);
        }
      });

      it("should throw ProviderError on API-level error", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [],
            error: "Invalid request",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        try {
          await provider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
        }
      });

      it("should throw ProviderError when request times out (becomes PROVIDER_FAILED)", async () => {
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        mockFetch.mockRejectedValueOnce(abortError);

        try {
          await provider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          // Note: Timeout errors are caught and converted to PROVIDER_FAILED
          // when all symbols fail, per the error handling design
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
        }
      });

      it("should throw ProviderError on network error", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        try {
          await provider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
        }
      });

      it("should throw if ALL symbols fail", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Complete failure"));

        await expect(provider.fetchPrices(["PETR4", "VALE3"])).rejects.toThrow(ProviderError);
      });

      it("should mark missing symbols as errors in partial response", async () => {
        const mockResponse = {
          quoteResponse: {
            result: [
              {
                symbol: "PETR4.SA",
                regularMarketPrice: 38.45,
                currency: "BRL",
                regularMarketTime: Math.floor(Date.now() / 1000),
              },
              // INVALID not returned
            ],
            error: null,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["PETR4", "INVALID"]);

        // Should return successful result only
        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe("PETR4");
      });
    });
  });

  describe("healthCheck", () => {
    it("should return true when API is responsive", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            quoteResponse: { result: [{ symbol: "AAPL" }], error: null },
          }),
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false when API is not responsive", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("provider name", () => {
    it("should have name 'yahoo-finance'", () => {
      expect(provider.name).toBe("yahoo-finance");
    });
  });
});
