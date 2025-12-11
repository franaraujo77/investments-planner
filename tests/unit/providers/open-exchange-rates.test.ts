/**
 * Open Exchange Rates Provider Tests
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.3: Open Exchange Rates Fallback if Primary Fails
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 * AC-6.4.5: Supported Currencies Validation
 *
 * Tests for OpenExchangeRatesProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenExchangeRatesProvider,
  createOpenExchangeRatesProvider,
} from "@/lib/providers/implementations/open-exchange-rates-provider";
import { ProviderError, PROVIDER_ERROR_CODES } from "@/lib/providers/types";
import { SUPPORTED_CURRENCIES } from "@/lib/providers/implementations/exchangerate-api-provider";

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

describe("OpenExchangeRatesProvider", () => {
  let provider: OpenExchangeRatesProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenExchangeRatesProvider({
      baseUrl: "https://openexchangerates.org/api",
      appId: "test-app-id",
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchRates with USD base", () => {
    describe("successful fetch (AC-6.4.3)", () => {
      it("should fetch rates for all requested target currencies", async () => {
        const mockResponse = {
          disclaimer: "Usage subject to terms",
          license: "https://openexchangerates.org/license",
          timestamp: 1702166400,
          base: "USD",
          rates: {
            BRL: 5.0123,
            EUR: 0.9234,
            GBP: 0.7845,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchRates("USD", ["BRL", "EUR", "GBP"]);

        expect(result.base).toBe("USD");
        expect(result.rates).toHaveProperty("BRL", "5.0123");
        expect(result.rates).toHaveProperty("EUR", "0.9234");
        expect(result.rates).toHaveProperty("GBP", "0.7845");
      });

      it("should return all 7 non-USD supported currencies when requested (AC-6.4.5)", async () => {
        const mockResponse = {
          base: "USD",
          rates: {
            EUR: 0.92,
            GBP: 0.78,
            BRL: 5.01,
            CAD: 1.35,
            AUD: 1.52,
            JPY: 149.5,
            CHF: 0.88,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const targets = SUPPORTED_CURRENCIES.filter((c) => c !== "USD");
        const result = await provider.fetchRates("USD", targets);

        expect(Object.keys(result.rates)).toHaveLength(7);
      });

      it("should store rates as strings for decimal.js precision (AC-6.4.4)", async () => {
        const mockResponse = {
          base: "USD",
          rates: {
            BRL: 5.012345678,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchRates("USD", ["BRL"]);

        expect(typeof result.rates.BRL).toBe("string");
        expect(result.rates.BRL).toBe("5.012345678");
      });
    });

    describe("source attribution (AC-6.4.4)", () => {
      it("should record source as open-exchange-rates", async () => {
        const mockResponse = {
          base: "USD",
          rates: { BRL: 5.01 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchRates("USD", ["BRL"]);

        expect(result.source).toBe("open-exchange-rates");
      });

      it("should set fetchedAt timestamp", async () => {
        const beforeFetch = new Date();

        const mockResponse = {
          base: "USD",
          rates: { BRL: 5.01 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchRates("USD", ["BRL"]);
        const afterFetch = new Date();

        expect(result.fetchedAt.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
        expect(result.fetchedAt.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
      });

      it("should return previous trading day as rate date", async () => {
        const mockResponse = {
          base: "USD",
          rates: { BRL: 5.01 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchRates("USD", ["BRL"]);

        // Rate date should be before today
        expect(result.rateDate.getTime()).toBeLessThan(Date.now());
      });
    });
  });

  describe("fetchRates with non-USD base (cross-rate conversion)", () => {
    it("should convert rates when base is not USD", async () => {
      // When base is EUR, API returns USD-based rates
      // We need USD/EUR and USD/BRL to calculate EUR/BRL
      const mockResponse = {
        base: "USD",
        rates: {
          EUR: 0.92, // USD/EUR
          BRL: 5.01, // USD/BRL
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.fetchRates("EUR", ["BRL"]);

      expect(result.base).toBe("EUR");
      // EUR/BRL = USD/BRL / USD/EUR = 5.01 / 0.92 ≈ 5.4456...
      expect(parseFloat(result.rates.BRL!)).toBeCloseTo(5.4456, 2);
    });

    it("should return 1 for same currency conversion", async () => {
      const mockResponse = {
        base: "USD",
        rates: {
          EUR: 0.92,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.fetchRates("EUR", ["EUR"]);

      expect(result.rates.EUR).toBe("1");
    });

    it("should include base currency in API request for conversion", async () => {
      const mockResponse = {
        base: "USD",
        rates: {
          GBP: 0.78,
          BRL: 5.01,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.fetchRates("GBP", ["BRL"]);

      // Verify the API was called with both GBP and BRL
      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("symbols=");
      expect(callUrl).toContain("GBP");
      expect(callUrl).toContain("BRL");
    });

    it("should throw when base rate is not available for conversion", async () => {
      const mockResponse = {
        base: "USD",
        rates: {
          BRL: 5.01,
          // EUR is missing - can't convert
        },
      };

      // Need to mock twice since we call fetchRates twice (once for toThrow, once for toMatchObject)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(provider.fetchRates("EUR", ["BRL"])).rejects.toThrow(ProviderError);
      await expect(provider.fetchRates("EUR", ["BRL"])).rejects.toMatchObject({
        code: PROVIDER_ERROR_CODES.INVALID_RESPONSE,
      });
    });
  });

  describe("currency validation (AC-6.4.5)", () => {
    it("should reject unsupported base currency", async () => {
      await expect(provider.fetchRates("XYZ", ["BRL"])).rejects.toThrow(ProviderError);
      await expect(provider.fetchRates("XYZ", ["BRL"])).rejects.toMatchObject({
        code: PROVIDER_ERROR_CODES.INVALID_RESPONSE,
      });
    });

    it("should reject unsupported target currency", async () => {
      await expect(provider.fetchRates("USD", ["XYZ"])).rejects.toThrow(ProviderError);
      await expect(provider.fetchRates("USD", ["XYZ"])).rejects.toMatchObject({
        code: PROVIDER_ERROR_CODES.INVALID_RESPONSE,
      });
    });
  });

  describe("error handling", () => {
    it("should throw ProviderError on 401 authentication error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Invalid App ID"),
      });

      await expect(provider.fetchRates("USD", ["BRL"])).rejects.toThrow(ProviderError);
      await expect(provider.fetchRates("USD", ["BRL"])).rejects.toMatchObject({
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
        await provider.fetchRates("USD", ["BRL"]);
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
        await provider.fetchRates("USD", ["BRL"]);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
      }
    });

    it("should throw ProviderError on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await provider.fetchRates("USD", ["BRL"]);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.PROVIDER_FAILED);
      }
    });

    it("should throw ProviderError on API error response", async () => {
      const mockResponse = {
        error: true,
        status: 401,
        message: "invalid_app_id",
        description: "Invalid App ID provided",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      try {
        await provider.fetchRates("USD", ["BRL"]);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(PROVIDER_ERROR_CODES.INVALID_RESPONSE);
      }
    });

    it("should throw when no App ID is provided", async () => {
      const providerNoKey = new OpenExchangeRatesProvider({
        appId: undefined,
      });

      await expect(providerNoKey.fetchRates("USD", ["BRL"])).rejects.toThrow(ProviderError);
    });
  });

  describe("healthCheck", () => {
    it("should return true when API responds successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            base: "USD",
            rates: { USD: 1 },
          }),
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false when API fails", async () => {
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

    it("should return false when no App ID configured", async () => {
      const providerNoKey = new OpenExchangeRatesProvider({ appId: undefined });

      const result = await providerNoKey.healthCheck();

      expect(result).toBe(false);
    });

    it("should return false when API returns error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: true,
            message: "Invalid App ID",
          }),
      });

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("provider name", () => {
    it("should have name 'open-exchange-rates'", () => {
      expect(provider.name).toBe("open-exchange-rates");
    });
  });
});

describe("createOpenExchangeRatesProvider factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create provider with default config", () => {
    const provider = createOpenExchangeRatesProvider();

    expect(provider).toBeInstanceOf(OpenExchangeRatesProvider);
    expect(provider.name).toBe("open-exchange-rates");
  });

  it("should create provider with custom config", () => {
    const provider = createOpenExchangeRatesProvider({
      appId: "custom-app-id",
      baseUrl: "https://custom.api.com",
      timeoutMs: 15000,
    });

    expect(provider).toBeInstanceOf(OpenExchangeRatesProvider);
  });
});
