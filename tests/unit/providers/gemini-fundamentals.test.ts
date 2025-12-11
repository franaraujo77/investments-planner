/**
 * Gemini Fundamentals Provider Tests
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.1: Fundamentals Include Required Metrics
 * AC-6.2.4: Partial Failures Don't Cascade
 * AC-6.2.5: Source Attribution Recorded
 *
 * Tests for GeminiFundamentalsProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiFundamentalsProvider } from "@/lib/providers/implementations/gemini-provider";
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

describe("GeminiFundamentalsProvider", () => {
  let provider: GeminiFundamentalsProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiFundamentalsProvider({
      baseUrl: "https://api.test.com",
      apiKey: "test-api-key",
      timeoutMs: 5000,
      batchSize: 50,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchFundamentals", () => {
    describe("successful fetch with all fields (AC-6.2.1)", () => {
      it("should fetch fundamentals with all required metrics", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "PETR4",
              pe_ratio: 4.52,
              pb_ratio: 0.98,
              dividend_yield: 12.34,
              market_cap: 450000000000,
              revenue: 500000000000,
              net_income: 100000000000,
              sector: "Energy",
              industry: "Oil & Gas",
              data_date: "2025-12-10",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchFundamentals(["PETR4"]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          symbol: "PETR4",
          peRatio: "4.52",
          pbRatio: "0.98",
          dividendYield: "12.34",
          marketCap: "450000000000",
          revenue: "500000000000",
          earnings: "100000000000", // Mapped from net_income
          sector: "Energy",
          industry: "Oil & Gas",
          source: "gemini-api",
        });
        expect(result[0]!.fetchedAt).toBeInstanceOf(Date);
        expect(result[0]!.dataDate).toBeInstanceOf(Date);
      });

      it("should handle optional fields when not available", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "VALE3",
              pe_ratio: 8.5,
              pb_ratio: 1.2,
              dividend_yield: null,
              market_cap: 300000000000,
              revenue: null,
              net_income: null,
              sector: null,
              industry: null,
              data_date: "2025-12-10",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchFundamentals(["VALE3"]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          symbol: "VALE3",
          peRatio: "8.5",
          pbRatio: "1.2",
          marketCap: "300000000000",
          source: "gemini-api",
        });
        // Optional fields should be undefined when null
        expect(result[0]!.dividendYield).toBeUndefined();
        expect(result[0]!.revenue).toBeUndefined();
        expect(result[0]!.earnings).toBeUndefined();
        expect(result[0]!.sector).toBeUndefined();
        expect(result[0]!.industry).toBeUndefined();
      });

      it("should return empty array for empty symbols input", async () => {
        const result = await provider.fetchFundamentals([]);

        expect(result).toHaveLength(0);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe("source attribution (AC-6.2.5)", () => {
      it("should record source as gemini-api", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "ITUB4",
              pe_ratio: 7.8,
              pb_ratio: 1.1,
              dividend_yield: 8.5,
              market_cap: 200000000000,
              revenue: 100000000000,
              net_income: 25000000000,
              sector: "Financials",
              industry: "Banking",
              data_date: "2025-12-10",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchFundamentals(["ITUB4"]);

        expect(result[0]!.source).toBe("gemini-api");
      });

      it("should record fetchedAt timestamp", async () => {
        const beforeFetch = new Date();

        const mockResponse = {
          data: [
            {
              symbol: "BBDC4",
              pe_ratio: 6.5,
              pb_ratio: 0.9,
              dividend_yield: 9.0,
              market_cap: 150000000000,
              revenue: 80000000000,
              net_income: 20000000000,
              sector: "Financials",
              industry: "Banking",
              data_date: "2025-12-10",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchFundamentals(["BBDC4"]);
        const afterFetch = new Date();

        expect(result[0]!.fetchedAt.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
        expect(result[0]!.fetchedAt.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
      });
    });

    describe("partial failures (AC-6.2.4)", () => {
      it("should handle API response with partial errors", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "PETR4",
              pe_ratio: 4.52,
              pb_ratio: 0.98,
              dividend_yield: 12.34,
              market_cap: 450000000000,
              revenue: 500000000000,
              net_income: 100000000000,
              sector: "Energy",
              industry: "Oil & Gas",
              data_date: "2025-12-10",
            },
          ],
          errors: [
            {
              symbol: "INVALID",
              error: "Symbol not found",
              code: "SYMBOL_NOT_FOUND",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchFundamentals(["PETR4", "INVALID"]);

        // Should return successful result, partial failure logged but not thrown
        expect(result).toHaveLength(1);
        expect(result[0]!.symbol).toBe("PETR4");
      });
    });

    describe("API error handling", () => {
      it("should throw ProviderError on 401 Unauthorized", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: () => Promise.resolve("Invalid API key"),
        });

        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toThrow(ProviderError);
        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toMatchObject({
          code: PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        });
      });

      it("should throw ProviderError on 429 Rate Limit", async () => {
        // Set up mock twice since we call fetchFundamentals twice
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            text: () => Promise.resolve("Rate limit exceeded"),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            text: () => Promise.resolve("Rate limit exceeded"),
          });

        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toThrow(ProviderError);
        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toMatchObject({
          code: PROVIDER_ERROR_CODES.RATE_LIMITED,
        });
      });

      it("should throw ProviderError on 500 Server Error", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: () => Promise.resolve("Server error"),
        });

        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toThrow(ProviderError);
        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toMatchObject({
          code: PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        });
      });

      it("should handle network errors", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toThrow(ProviderError);
        await expect(provider.fetchFundamentals(["PETR4"])).rejects.toMatchObject({
          code: PROVIDER_ERROR_CODES.PROVIDER_FAILED,
        });
      });

      it("should throw when ALL symbols fail", async () => {
        const mockResponse = {
          data: [],
          errors: [
            { symbol: "INVALID1", error: "Not found", code: "NOT_FOUND" },
            { symbol: "INVALID2", error: "Not found", code: "NOT_FOUND" },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await expect(provider.fetchFundamentals(["INVALID1", "INVALID2"])).rejects.toThrow(
          ProviderError
        );
      });
    });

    describe("batch processing", () => {
      it("should send correct request format", async () => {
        const mockResponse = {
          data: [
            {
              symbol: "PETR4",
              pe_ratio: 4.52,
              pb_ratio: 0.98,
              dividend_yield: 12.34,
              market_cap: 450000000000,
              revenue: 500000000000,
              net_income: 100000000000,
              sector: "Energy",
              industry: "Oil & Gas",
              data_date: "2025-12-10",
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await provider.fetchFundamentals(["PETR4"]);

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.test.com/v1/fundamentals/batch",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer test-api-key",
            }),
            body: JSON.stringify({ symbols: ["PETR4"] }),
          })
        );
      });
    });
  });

  describe("healthCheck", () => {
    it("should return true when API is healthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/health",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });

    it("should return false when API is unhealthy", async () => {
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
