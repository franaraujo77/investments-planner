/**
 * Gemini Price Provider Tests
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.1: Prices Include OHLCV Data
 * AC-6.3.5: Batch Requests Limited to 50 Symbols Per Call
 *
 * Tests for GeminiPriceProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiPriceProvider } from "@/lib/providers/implementations/gemini-price-provider";
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

describe("GeminiPriceProvider", () => {
  let provider: GeminiPriceProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiPriceProvider({
      baseUrl: "https://api.test.com",
      apiKey: "test-api-key",
      timeoutMs: 5000,
      batchSize: 50,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchPrices", () => {
    describe("successful fetch with all OHLCV fields (AC-6.3.1)", () => {
      it("should fetch prices with all OHLCV data as strings", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "PETR4",
              open: 37.5,
              high: 39.0,
              low: 37.25,
              close: 38.45,
              volume: 15000000,
              currency: "BRL",
              price_date: "2025-12-09",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["PETR4"]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          symbol: "PETR4",
          open: "37.5",
          high: "39",
          low: "37.25",
          close: "38.45",
          volume: "15000000",
          currency: "BRL",
          source: "gemini-api",
        });
        expect(result[0]!.fetchedAt).toBeInstanceOf(Date);
        expect(result[0]!.priceDate).toBeInstanceOf(Date);
      });

      it("should record currency with each price (AC-6.3.1)", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "AAPL",
              close: 185.5,
              currency: "USD",
              price_date: "2025-12-09",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["AAPL"]);

        expect(result[0]).toMatchObject({
          symbol: "AAPL",
          close: "185.5",
          currency: "USD",
        });
      });

      it("should handle optional OHLCV fields when not available", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "VALE3",
              close: 65.2,
              currency: "BRL",
              price_date: "2025-12-09",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["VALE3"]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          symbol: "VALE3",
          close: "65.2",
          currency: "BRL",
          source: "gemini-api",
        });
        // Optional fields should be undefined when not provided
        expect(result[0]!.open).toBeUndefined();
        expect(result[0]!.high).toBeUndefined();
        expect(result[0]!.low).toBeUndefined();
        expect(result[0]!.volume).toBeUndefined();
      });

      it("should return empty array for empty symbols input", async () => {
        const result = await provider.fetchPrices([]);

        expect(result).toHaveLength(0);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe("source attribution", () => {
      it("should record source as gemini-api", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "ITUB4",
              close: 32.5,
              currency: "BRL",
              price_date: "2025-12-09",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["ITUB4"]);

        expect(result[0]!.source).toBe("gemini-api");
      });

      it("should set fetchedAt timestamp", async () => {
        const beforeFetch = new Date();

        const mockResponse = {
          data: [
            {
              symbol: "BBDC4",
              close: 14.8,
              currency: "BRL",
              price_date: "2025-12-09",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["BBDC4"]);
        const afterFetch = new Date();

        expect(result[0]!.fetchedAt.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
        expect(result[0]!.fetchedAt.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
      });
    });

    describe("batch processing (AC-6.3.5)", () => {
      it("should process symbols in batches of 50 or fewer", async () => {
        // Create 75 symbols to test batching
        const symbols = Array.from({ length: 75 }, (_, i) => `SYM${i}`);

        const createBatchResponse = (syms: string[]) => ({
          data: syms.map((s) => ({
            symbol: s,
            close: 100,
            currency: "BRL",
            price_date: "2025-12-09",
          })),
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createBatchResponse(symbols.slice(0, 50))),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createBatchResponse(symbols.slice(50))),
          });

        const result = await provider.fetchPrices(symbols);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(75);
      });

      it("should respect batch size limit of 50", async () => {
        const symbols = Array.from({ length: 60 }, (_, i) => `SYM${i}`);

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                data: symbols.slice(0, 50).map((s) => ({
                  symbol: s,
                  close: 100,
                  currency: "BRL",
                  price_date: "2025-12-09",
                })),
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                data: symbols.slice(50).map((s) => ({
                  symbol: s,
                  close: 100,
                  currency: "BRL",
                  price_date: "2025-12-09",
                })),
              }),
          });

        await provider.fetchPrices(symbols);

        // Verify first batch has exactly 50 symbols
        const firstCallBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
        expect(firstCallBody.symbols).toHaveLength(50);

        // Verify second batch has remaining 10 symbols
        const secondCallBody = JSON.parse(mockFetch.mock.calls[1]![1].body);
        expect(secondCallBody.symbols).toHaveLength(10);
      });

      it("should continue processing remaining batches when one batch fails (AC-6.3.5)", async () => {
        const symbols = Array.from({ length: 75 }, (_, i) => `SYM${i}`);

        // First batch fails
        mockFetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: symbols.slice(50).map((s) => ({
                symbol: s,
                close: 100,
                currency: "BRL",
                price_date: "2025-12-09",
              })),
            }),
        });

        const result = await provider.fetchPrices(symbols);

        // Second batch should still succeed
        expect(result).toHaveLength(25); // Only second batch (25 symbols)
        expect(mockFetch).toHaveBeenCalledTimes(2);
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

        await expect(provider.fetchPrices(["PETR4"])).rejects.toThrow(ProviderError);
        await expect(provider.fetchPrices(["PETR4"])).rejects.toMatchObject({
          code: PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        });
      });

      it("should throw ProviderError with RATE_LIMITED code on 429", async () => {
        mockFetch.mockResolvedValue({
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

      it("should throw ProviderError on 500 server error", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: () => Promise.resolve("Server error"),
        });

        try {
          await provider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
        }
      });

      it("should throw ProviderError when request times out (batch error becomes PROVIDER_FAILED)", async () => {
        // Create a provider with very short timeout
        const shortTimeoutProvider = new GeminiPriceProvider({
          baseUrl: "https://api.test.com",
          apiKey: "test-api-key",
          timeoutMs: 1,
        });

        // Mock fetch to simulate abort
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        mockFetch.mockRejectedValueOnce(abortError);

        try {
          await shortTimeoutProvider.fetchPrices(["PETR4"]);
          expect.fail("Should have thrown");
        } catch (error) {
          // Note: Individual batch timeout errors are caught and converted to
          // PROVIDER_FAILED when all symbols fail, per the batch error handling design
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

      it("should handle partial failures from API response", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "PETR4",
              close: 38.45,
              currency: "BRL",
              price_date: "2025-12-09",
            },
          ],
          errors: [
            {
              symbol: "INVALID",
              error: "Symbol not found",
              code: "NOT_FOUND",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchPrices(["PETR4", "INVALID"]);

        // Should return successful result, ignoring the error
        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe("PETR4");
      });
    });
  });

  describe("healthCheck", () => {
    it("should return true when health endpoint is healthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "healthy" }),
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false when health endpoint fails", async () => {
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
    it("should have name 'gemini-api'", () => {
      expect(provider.name).toBe("gemini-api");
    });
  });
});
