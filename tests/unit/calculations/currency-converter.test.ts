/**
 * Currency Converter Service Tests
 *
 * Story 6.5: Currency Conversion Logic
 * AC-6.5.1: All Conversions Use decimal.js (Never Floating Point)
 * AC-6.5.2: Conversion Formula Correctly Applied
 * AC-6.5.3: Rounding Applied Correctly
 * AC-6.5.4: Conversion Logged for Audit Trail
 * AC-6.5.5: Rate Used Is Always Stored Rate (Not Live)
 *
 * Tests for CurrencyConverter implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CurrencyConverter, CurrencyConversionError } from "@/lib/calculations/currency-converter";
import { Decimal } from "@/lib/calculations/decimal-config";
import type { ExchangeRate } from "@/lib/db/schema";

// Mock logger using vi.hoisted to avoid initialization order issues
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: mockLogger,
}));

// Mock repository
const mockRepository = {
  getRate: vi.fn(),
  getRates: vi.fn(),
  upsertRates: vi.fn(),
  deleteOldRates: vi.fn(),
};

// Mock event store
const mockEventStore = {
  append: vi.fn(),
  appendBatch: vi.fn(),
  getByCorrelationId: vi.fn(),
  getByUserId: vi.fn(),
  getByEventType: vi.fn(),
  getCalcStartedEvent: vi.fn(),
};

// Helper to create mock exchange rate record
function createMockRate(
  base: string,
  target: string,
  rate: string,
  hoursAgo: number = 1
): ExchangeRate {
  const fetchedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const rateDate = new Date();
  rateDate.setDate(rateDate.getDate() - 1); // T-1

  return {
    id: crypto.randomUUID(),
    baseCurrency: base,
    targetCurrency: target,
    rate,
    source: "test-provider",
    fetchedAt,
    rateDate: rateDate.toISOString().split("T")[0]!,
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
  };
}

describe("CurrencyConverter", () => {
  let converter: CurrencyConverter;

  beforeEach(() => {
    vi.clearAllMocks();
    converter = new CurrencyConverter({
      repository: mockRepository as never,
      eventStore: mockEventStore as never,
      emitEvents: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // AC-6.5.1: All Conversions Use decimal.js (Never Floating Point)
  // ===========================================================================
  describe("AC-6.5.1: decimal.js precision", () => {
    it("should use decimal.js and avoid floating-point errors (0.1 + 0.2 = 0.3)", () => {
      // This test proves we're using Decimal.js correctly
      const a = new Decimal("0.1");
      const b = new Decimal("0.2");
      const sum = a.plus(b);

      // JavaScript native: 0.1 + 0.2 = 0.30000000000000004
      expect(0.1 + 0.2).not.toBe(0.3); // Native JS fails
      expect(sum.equals("0.3")).toBe(true); // Decimal.js works
    });

    it("should maintain precision for large currency values", async () => {
      const largeValue = "999999999999.9999";
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(largeValue, "BRL", "USD");

      // Expected: 999999999999.9999 * 0.2 = 199999999999.99998
      // Rounded to 4 decimal places with ROUND_HALF_UP = 200000000000.0000
      // (5th decimal is 8, so it rounds up .9999 to 1.0000, carrying over)
      expect(result.value).toBe("200000000000.0000");
    });

    it("should handle very small rates (like JPY conversion)", async () => {
      const value = "10000";
      const jepyToUsdRate = "0.0067"; // 1 JPY = 0.0067 USD

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("JPY", "USD", jepyToUsdRate));

      const result = await converter.convert(value, "JPY", "USD");

      // 10000 * 0.0067 = 67
      expect(result.value).toBe("67.0000");
    });
  });

  // ===========================================================================
  // AC-6.5.2: Conversion Formula Correctly Applied
  // ===========================================================================
  describe("AC-6.5.2: conversion formula", () => {
    it("should apply formula: value_base = value_native × rate", async () => {
      // Convert 1000 BRL to USD with rate 0.2 (1 BRL = 0.2 USD)
      const value = "1000";
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(value, "BRL", "USD");

      // 1000 * 0.2 = 200
      expect(result.value).toBe("200.0000");
      expect(result.rate).toBe(rate);
    });

    it("should convert BRL to USD correctly with rate 5.0", async () => {
      // If USD/BRL = 5.0, then BRL/USD = 0.2
      // 1000 BRL * 0.2 = 200 USD
      const value = "1000";
      const rate = "0.2"; // This is BRL->USD rate

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(value, "BRL", "USD");

      expect(result.value).toBe("200.0000");
    });

    it("should use inverse rate when direct rate not found", async () => {
      // No direct BRL->USD rate, but we have USD->BRL = 5.0
      const value = "1000";

      mockRepository.getRate.mockResolvedValueOnce(null); // No direct rate
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("USD", "BRL", "5.0"));

      const result = await converter.convert(value, "BRL", "USD");

      // Inverse of 5.0 = 0.2, so 1000 * 0.2 = 200
      expect(result.value).toBe("200.0000");
    });

    it("should convert EUR to USD with rate close to 1", async () => {
      const value = "1000";
      const rate = "1.08"; // 1 EUR = 1.08 USD

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("EUR", "USD", rate));

      const result = await converter.convert(value, "EUR", "USD");

      // 1000 * 1.08 = 1080
      expect(result.value).toBe("1080.0000");
    });
  });

  // ===========================================================================
  // AC-6.5.3: Rounding Applied Correctly
  // ===========================================================================
  describe("AC-6.5.3: rounding", () => {
    it("should round to 4 decimal places with ROUND_HALF_UP", async () => {
      const value = "100";
      const rate = "0.0012345"; // Results in 0.12345 -> 0.1235

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(value, "BRL", "USD");

      // 100 * 0.0012345 = 0.12345 -> rounded to 0.1235 (ROUND_HALF_UP)
      expect(result.value).toBe("0.1235");
    });

    it("should round 100.12344 down to 100.1234", async () => {
      const value = "1";
      const rate = "100.12344";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(value, "BRL", "USD");

      // 1 * 100.12344 = 100.12344 -> rounds to 100.1234
      expect(result.value).toBe("100.1234");
    });

    it("should round 100.12345 up to 100.1235 (ROUND_HALF_UP)", async () => {
      const value = "1";
      const rate = "100.12345";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(value, "BRL", "USD");

      // 1 * 100.12345 = 100.12345 -> rounds to 100.1235
      expect(result.value).toBe("100.1235");
    });

    it("should maintain full precision for intermediate calculations", async () => {
      // This tests that we don't prematurely round
      const value = "999.99999999";
      const rate = "0.200000001";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const result = await converter.convert(value, "BRL", "USD");

      // Full precision: 999.99999999 * 0.200000001 = 200.0000009999...
      // Final rounded: 200.0000
      expect(result.value).toBe("200.0000");
    });
  });

  // ===========================================================================
  // AC-6.5.4: Conversion Logged for Audit Trail
  // ===========================================================================
  describe("AC-6.5.4: audit trail logging", () => {
    it("should log conversion event with all required fields", async () => {
      const value = "1000";
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      await converter.convert(value, "BRL", "USD");

      // Should log the conversion
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Currency conversion completed",
        expect.objectContaining({
          event: "CURRENCY_CONVERTED",
          correlationId: expect.any(String),
          from: "1000 BRL",
          to: "200.0000 USD",
          rate: "0.2",
          isStaleRate: false,
        })
      );
    });

    it("should include provided correlationId in event", async () => {
      const value = "1000";
      const rate = "0.2";
      const correlationId = "test-correlation-123";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      await converter.convert(value, "BRL", "USD", { correlationId });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Currency conversion completed",
        expect.objectContaining({
          correlationId,
        })
      );
    });

    it("should not block conversion when emitting events", async () => {
      const value = "1000";
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      const startTime = Date.now();
      await converter.convert(value, "BRL", "USD");
      const duration = Date.now() - startTime;

      // Should complete quickly (fire-and-forget pattern)
      expect(duration).toBeLessThan(100);
    });

    it("should not emit events when emitEvents is false", async () => {
      const silentConverter = new CurrencyConverter({
        repository: mockRepository as never,
        eventStore: mockEventStore as never,
        emitEvents: false,
      });

      const rate = "0.2";
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      await silentConverter.convert("1000", "BRL", "USD");

      // Should not log conversion event
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        "Currency conversion completed",
        expect.anything()
      );
    });
  });

  // ===========================================================================
  // AC-6.5.5: Rate Used Is Always Stored Rate (Not Live)
  // ===========================================================================
  describe("AC-6.5.5: stored rates and staleness", () => {
    it("should use stored rate from repository, not live API", async () => {
      const value = "1000";
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      await converter.convert(value, "BRL", "USD");

      // Should call repository.getRate
      expect(mockRepository.getRate).toHaveBeenCalledWith("BRL", "USD", undefined);
    });

    it("should detect stale rate (>24h old) and set isStaleRate flag", async () => {
      const value = "1000";
      const rate = "0.2";

      // Create rate that's 25 hours old
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate, 25));

      const result = await converter.convert(value, "BRL", "USD");

      expect(result.isStaleRate).toBe(true);
    });

    it("should not flag rate as stale if < 24h old", async () => {
      const value = "1000";
      const rate = "0.2";

      // Create rate that's 1 hour old
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate, 1));

      const result = await converter.convert(value, "BRL", "USD");

      expect(result.isStaleRate).toBe(false);
    });

    it("should log warning when using stale rate", async () => {
      const value = "1000";
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate, 25));

      await converter.convert(value, "BRL", "USD");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Using stale exchange rate",
        expect.objectContaining({
          fromCurrency: "BRL",
          toCurrency: "USD",
        })
      );
    });

    it("should throw error when no rate available", async () => {
      mockRepository.getRate.mockResolvedValue(null);

      await expect(converter.convert("1000", "BRL", "USD")).rejects.toThrow(
        CurrencyConversionError
      );

      await expect(converter.convert("1000", "BRL", "USD")).rejects.toMatchObject({
        code: "RATE_NOT_FOUND",
      });
    });

    it("should use most recent rate when no date specified", async () => {
      const rate = "0.2";

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      await converter.convert("1000", "BRL", "USD");

      // Should call with undefined date
      expect(mockRepository.getRate).toHaveBeenCalledWith("BRL", "USD", undefined);
    });

    it("should use specific date when provided", async () => {
      const rate = "0.2";
      const specificDate = new Date("2025-12-01");

      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", rate));

      await converter.convert("1000", "BRL", "USD", { rateDate: specificDate });

      expect(mockRepository.getRate).toHaveBeenCalledWith("BRL", "USD", specificDate);
    });
  });

  // ===========================================================================
  // Same-currency conversion
  // ===========================================================================
  describe("same-currency conversion", () => {
    it("should return same value for same-currency conversion", async () => {
      const result = await converter.convert("1000.1234", "USD", "USD");

      expect(result.value).toBe("1000.1234");
      expect(result.fromCurrency).toBe("USD");
      expect(result.toCurrency).toBe("USD");
      expect(result.rate).toBe("1");
      expect(result.rateSource).toBe("same-currency");
      expect(result.isStaleRate).toBe(false);
    });

    it("should not query repository for same-currency conversion", async () => {
      await converter.convert("1000", "EUR", "EUR");

      expect(mockRepository.getRate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Batch conversion
  // ===========================================================================
  describe("batch conversion", () => {
    it("should convert multiple values to common target currency", async () => {
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", "0.2"));
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("EUR", "USD", "1.08"));

      const results = await converter.convertBatch(
        [
          { value: "1000", fromCurrency: "BRL" },
          { value: "500", fromCurrency: "EUR" },
        ],
        "USD"
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.value).toBe("200.0000"); // 1000 BRL * 0.2
      expect(results[0]!.fromCurrency).toBe("BRL");
      expect(results[1]!.value).toBe("540.0000"); // 500 EUR * 1.08
      expect(results[1]!.fromCurrency).toBe("EUR");
    });

    it("should handle mixed same-currency and different-currency in batch", async () => {
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", "0.2"));

      const results = await converter.convertBatch(
        [
          { value: "1000", fromCurrency: "BRL" },
          { value: "500", fromCurrency: "USD" }, // Same currency
        ],
        "USD"
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.value).toBe("200.0000");
      expect(results[1]!.value).toBe("500.0000"); // No conversion needed
    });
  });

  // ===========================================================================
  // Input validation
  // ===========================================================================
  describe("input validation", () => {
    it("should reject invalid currency code", async () => {
      await expect(converter.convert("1000", "XXX", "USD")).rejects.toThrow(
        CurrencyConversionError
      );

      await expect(converter.convert("1000", "XXX", "USD")).rejects.toMatchObject({
        code: "INVALID_CURRENCY",
      });
    });

    it("should reject negative value", async () => {
      await expect(converter.convert("-1000", "BRL", "USD")).rejects.toThrow(
        CurrencyConversionError
      );

      await expect(converter.convert("-1000", "BRL", "USD")).rejects.toMatchObject({
        code: "INVALID_VALUE",
      });
    });

    it("should reject invalid decimal string", async () => {
      await expect(converter.convert("abc", "BRL", "USD")).rejects.toThrow(CurrencyConversionError);

      await expect(converter.convert("abc", "BRL", "USD")).rejects.toMatchObject({
        code: "INVALID_VALUE",
      });
    });

    it("should accept zero value", async () => {
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", "0.2"));

      const result = await converter.convert("0", "BRL", "USD");

      expect(result.value).toBe("0.0000");
    });

    it("should normalize currency codes to uppercase", async () => {
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("BRL", "USD", "0.2"));

      const result = await converter.convert("1000", "brl", "usd");

      expect(result.fromCurrency).toBe("BRL");
      expect(result.toCurrency).toBe("USD");
    });
  });

  // ===========================================================================
  // Various currency pairs
  // ===========================================================================
  describe("various currency pairs", () => {
    it("should convert USD to BRL", async () => {
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("USD", "BRL", "5.0"));

      const result = await converter.convert("100", "USD", "BRL");

      expect(result.value).toBe("500.0000");
    });

    it("should convert EUR to JPY", async () => {
      // 1 EUR = ~160 JPY
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("EUR", "JPY", "160.5"));

      const result = await converter.convert("100", "EUR", "JPY");

      expect(result.value).toBe("16050.0000");
    });

    it("should convert GBP to CHF", async () => {
      // 1 GBP = ~1.13 CHF
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("GBP", "CHF", "1.1345"));

      const result = await converter.convert("100", "GBP", "CHF");

      expect(result.value).toBe("113.4500");
    });

    it("should convert AUD to CAD", async () => {
      // 1 AUD = ~0.89 CAD
      mockRepository.getRate.mockResolvedValueOnce(createMockRate("AUD", "CAD", "0.8912"));

      const result = await converter.convert("1000", "AUD", "CAD");

      expect(result.value).toBe("891.2000");
    });
  });
});
