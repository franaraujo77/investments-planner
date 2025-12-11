/**
 * ExchangeRate-API Provider Tests
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.1: Rates Fetched for All Currencies in User Portfolios
 * AC-6.4.2: Rates Are Previous Trading Day Close (T-1)
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 * AC-6.4.5: Supported Currencies Validation
 *
 * Tests for ExchangeRateAPIProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ExchangeRateAPIProvider,
  getPreviousTradingDay,
  validateCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/providers/implementations/exchangerate-api-provider";
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

describe("ExchangeRateAPIProvider", () => {
  let provider: ExchangeRateAPIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ExchangeRateAPIProvider({
      baseUrl: "https://v6.exchangerate-api.com/v6",
      apiKey: "test-api-key",
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchRates", () => {
    describe("successful fetch (AC-6.4.1)", () => {
      it("should fetch rates for all requested target currencies", async () => {
        const mockResponse = {
          result: "success",
          base_code: "USD",
          conversion_rates: {
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

      it("should return all 8 supported currencies when requested (AC-6.4.5)", async () => {
        const mockResponse = {
          result: "success",
          base_code: "USD",
          conversion_rates: {
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
          result: "success",
          base_code: "USD",
          conversion_rates: {
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

    describe("T-1 date calculation (AC-6.4.2)", () => {
      it("should return previous trading day as rate date", async () => {
        const mockResponse = {
          result: "success",
          base_code: "USD",
          conversion_rates: { BRL: 5.01 },
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

    describe("source attribution (AC-6.4.4)", () => {
      it("should record source as exchangerate-api", async () => {
        const mockResponse = {
          result: "success",
          base_code: "USD",
          conversion_rates: { BRL: 5.01 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await provider.fetchRates("USD", ["BRL"]);

        expect(result.source).toBe("exchangerate-api");
      });

      it("should set fetchedAt timestamp", async () => {
        const beforeFetch = new Date();

        const mockResponse = {
          result: "success",
          base_code: "USD",
          conversion_rates: { BRL: 5.01 },
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

      it("should accept all 8 supported currencies", async () => {
        for (const currency of SUPPORTED_CURRENCIES) {
          expect(validateCurrency(currency)).toBe(true);
        }
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
          result: "error",
          "error-type": "invalid-key",
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

      it("should throw when no API key is provided", async () => {
        const providerNoKey = new ExchangeRateAPIProvider({
          apiKey: undefined,
        });

        await expect(providerNoKey.fetchRates("USD", ["BRL"])).rejects.toThrow(ProviderError);
      });
    });
  });

  describe("healthCheck", () => {
    it("should return true when API responds successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: "success",
            base_code: "USD",
            conversion_rates: { EUR: 0.92 },
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

    it("should return false when no API key configured", async () => {
      const providerNoKey = new ExchangeRateAPIProvider({ apiKey: undefined });

      const result = await providerNoKey.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("provider name", () => {
    it("should have name 'exchangerate-api'", () => {
      expect(provider.name).toBe("exchangerate-api");
    });
  });
});

describe("getPreviousTradingDay", () => {
  it("should return Friday for Saturday", () => {
    // Create a Saturday (Dec 13, 2025)
    const saturday = new Date(2025, 11, 13); // Month is 0-indexed
    const result = getPreviousTradingDay(saturday);

    expect(result.getDay()).toBe(5); // Friday
    expect(result.getDate()).toBe(12); // Dec 12
  });

  it("should return Friday for Sunday", () => {
    // Create a Sunday (Dec 14, 2025)
    const sunday = new Date(2025, 11, 14);
    const result = getPreviousTradingDay(sunday);

    expect(result.getDay()).toBe(5); // Friday
    expect(result.getDate()).toBe(12); // Dec 12
  });

  it("should return Friday for Monday", () => {
    // Create a Monday (Dec 15, 2025)
    const monday = new Date(2025, 11, 15);
    const result = getPreviousTradingDay(monday);

    expect(result.getDay()).toBe(5); // Friday
    expect(result.getDate()).toBe(12); // Dec 12
  });

  it("should return previous day for Tuesday-Friday", () => {
    // Create a Wednesday (Dec 17, 2025)
    const wednesday = new Date(2025, 11, 17);
    const result = getPreviousTradingDay(wednesday);

    expect(result.getDay()).toBe(2); // Tuesday
    expect(result.getDate()).toBe(16); // Dec 16
  });

  it("should normalize time to start of day", () => {
    const date = new Date(2025, 11, 17, 14, 30, 45);
    const result = getPreviousTradingDay(date);

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe("validateCurrency", () => {
  it("should return true for all supported currencies", () => {
    expect(validateCurrency("USD")).toBe(true);
    expect(validateCurrency("EUR")).toBe(true);
    expect(validateCurrency("GBP")).toBe(true);
    expect(validateCurrency("BRL")).toBe(true);
    expect(validateCurrency("CAD")).toBe(true);
    expect(validateCurrency("AUD")).toBe(true);
    expect(validateCurrency("JPY")).toBe(true);
    expect(validateCurrency("CHF")).toBe(true);
  });

  it("should return false for unsupported currencies", () => {
    expect(validateCurrency("XYZ")).toBe(false);
    expect(validateCurrency("CNY")).toBe(false);
    expect(validateCurrency("INR")).toBe(false);
    expect(validateCurrency("")).toBe(false);
  });
});
