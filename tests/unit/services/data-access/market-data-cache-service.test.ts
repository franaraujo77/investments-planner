/**
 * Market Data Cache Service Tests
 *
 * Story 5.2: Two-Tier Refresh Architecture
 * AC-5.2.3: Cache-First Fetch Semantics
 * AC-5.2.4: PostgreSQL Fallback
 *
 * Tests for the MarketDataCacheService class.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PriceResult, ExchangeRateResult, FundamentalsResult } from "@/lib/providers/types";

// =============================================================================
// MOCKS - Must be defined BEFORE vi.mock calls
// =============================================================================

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock prices cache
vi.mock("@/lib/providers/prices-cache", () => ({
  pricesCache: {
    get: vi.fn(),
    set: vi.fn(),
    getMultiple: vi.fn(),
    setMultiple: vi.fn(),
  },
  generatePricesCacheKey: vi.fn((symbol: string, date?: Date) => {
    const dateStr = (date ?? new Date()).toISOString().split("T")[0];
    return `prices:${symbol}:${dateStr}`;
  }),
}));

// Mock exchange rates cache
vi.mock("@/lib/providers/exchange-rates-cache", () => ({
  exchangeRatesCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
  generateExchangeRatesCacheKey: vi.fn((base: string, date?: Date) => {
    const dateStr = (date ?? new Date()).toISOString().split("T")[0];
    return `rates:${base}:${dateStr}`;
  }),
}));

// Mock fundamentals cache
vi.mock("@/lib/providers/fundamentals-cache", () => ({
  fundamentalsCache: {
    get: vi.fn(),
    set: vi.fn(),
    getMultiple: vi.fn(),
    setMultiple: vi.fn(),
  },
  generateFundamentalsCacheKey: vi.fn((symbol: string) => `fundamentals:${symbol}`),
}));

// Mock prices repository
vi.mock("@/lib/repositories/prices-repository", () => ({
  pricesRepository: {
    getPriceBySymbol: vi.fn(),
    getPricesBySymbols: vi.fn(),
    upsertPrices: vi.fn(),
  },
  PricesRepository: {
    toPriceResult: vi.fn((record: unknown) => record),
  },
}));

// Mock exchange rates repository
vi.mock("@/lib/repositories/exchange-rates-repository", () => ({
  exchangeRatesRepository: {
    getRate: vi.fn(),
    getRates: vi.fn(),
    upsertRates: vi.fn(),
  },
  ExchangeRatesRepository: {
    toExchangeRateResult: vi.fn((records: unknown) => records),
  },
}));

// Mock fundamentals repository
vi.mock("@/lib/repositories/fundamentals-repository", () => ({
  fundamentalsRepository: {
    getFundamentalsBySymbol: vi.fn(),
    getFundamentalsBySymbols: vi.fn(),
    upsertFundamentals: vi.fn(),
  },
  FundamentalsRepository: {
    toFundamentalsResult: vi.fn((record: unknown) => record),
  },
}));

// Now import the service and mocked modules
import { MarketDataCacheService } from "@/lib/services/data-access/market-data-cache-service";
import { pricesCache } from "@/lib/providers/prices-cache";
import { exchangeRatesCache } from "@/lib/providers/exchange-rates-cache";
import { fundamentalsCache } from "@/lib/providers/fundamentals-cache";
import { pricesRepository } from "@/lib/repositories/prices-repository";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import { fundamentalsRepository } from "@/lib/repositories/fundamentals-repository";

// =============================================================================
// TEST DATA
// =============================================================================

const mockPriceResult: PriceResult = {
  symbol: "PETR4",
  close: "35.50",
  currency: "BRL",
  source: "gemini-api",
  fetchedAt: new Date("2026-01-01T10:00:00Z"),
  priceDate: new Date("2026-01-01"),
};

const mockExchangeRateResult: ExchangeRateResult = {
  base: "USD",
  rates: { BRL: "5.50", EUR: "0.92" },
  source: "exchangerate-api",
  fetchedAt: new Date("2026-01-01T10:00:00Z"),
  rateDate: new Date("2026-01-01"),
};

const mockFundamentalsResult: FundamentalsResult = {
  symbol: "PETR4",
  source: "gemini-api",
  fetchedAt: new Date("2026-01-01T10:00:00Z"),
  dataDate: new Date("2026-01-01"),
  peRatio: "8.5",
  dividendYield: "12.5",
  marketCap: "500000000000",
};

// =============================================================================
// TESTS
// =============================================================================

describe("MarketDataCacheService", () => {
  let service: MarketDataCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarketDataCacheService();
  });

  // ===========================================================================
  // PRICE OPERATIONS
  // ===========================================================================

  describe("getPrice", () => {
    it("should return KV cache hit when available", async () => {
      // Arrange - KV cache has data
      vi.mocked(pricesCache.get).mockResolvedValue(mockPriceResult);

      // Act
      const result = await service.getPrice("PETR4");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("kv");
      expect(result.data).toEqual(mockPriceResult);
      expect(pricesRepository.getPriceBySymbol).not.toHaveBeenCalled();
    });

    it("should fall back to PostgreSQL on KV miss and repopulate KV", async () => {
      // Arrange - KV miss, PostgreSQL has data
      vi.mocked(pricesCache.get).mockResolvedValue(null);
      vi.mocked(pricesRepository.getPriceBySymbol).mockResolvedValue(mockPriceResult);
      vi.mocked(pricesCache.set).mockResolvedValue(undefined);

      // Act
      const result = await service.getPrice("PETR4");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("pg");
      expect(result.kvRepopulationTriggered).toBe(true);
      expect(pricesRepository.getPriceBySymbol).toHaveBeenCalledWith("PETR4", expect.any(Date));
    });

    it("should return miss when data not found in either tier", async () => {
      // Arrange - both miss
      vi.mocked(pricesCache.get).mockResolvedValue(null);
      vi.mocked(pricesRepository.getPriceBySymbol).mockResolvedValue(null);

      // Act
      const result = await service.getPrice("UNKNOWN");

      // Assert
      expect(result.found).toBe(false);
      expect(result.source).toBe("miss");
    });

    it("should handle KV error gracefully and fall back to PostgreSQL", async () => {
      // Arrange - KV throws error, PostgreSQL has data
      vi.mocked(pricesCache.get).mockRejectedValue(new Error("KV connection failed"));
      vi.mocked(pricesRepository.getPriceBySymbol).mockResolvedValue(mockPriceResult);

      // Act
      const result = await service.getPrice("PETR4");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("pg");
    });
  });

  describe("getPrices", () => {
    it("should batch fetch from KV and PostgreSQL", async () => {
      // Arrange
      const symbols = ["PETR4", "VALE3", "ITUB4"];
      vi.mocked(pricesCache.getMultiple).mockResolvedValue(
        new Map([
          ["PETR4", mockPriceResult],
          // VALE3 and ITUB4 are misses
        ])
      );
      vi.mocked(pricesRepository.getPricesBySymbols).mockResolvedValue([
        { ...mockPriceResult, symbol: "VALE3" },
        // ITUB4 not found in PostgreSQL either
      ]);

      // Act
      const result = await service.getPrices(symbols);

      // Assert
      expect(result.kvHits).toBe(1);
      expect(result.pgHits).toBe(1);
      expect(result.misses).toBe(1);
      expect(result.results.get("PETR4")?.source).toBe("kv");
      expect(result.results.get("VALE3")?.source).toBe("pg");
      expect(result.results.get("ITUB4")?.found).toBe(false);
    });
  });

  describe("writePrice", () => {
    it("should write to both PostgreSQL and KV", async () => {
      // Arrange
      vi.mocked(pricesRepository.upsertPrices).mockResolvedValue({
        inserted: 1,
        updated: 0,
        errors: [],
      });
      vi.mocked(pricesCache.set).mockResolvedValue(undefined);

      // Act
      const result = await service.writePrice(mockPriceResult);

      // Assert
      expect(result.pgWritten).toBe(true);
      expect(result.kvWritten).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(pricesRepository.upsertPrices).toHaveBeenCalledWith([mockPriceResult]);
      expect(pricesCache.set).toHaveBeenCalledWith(mockPriceResult);
    });

    it("should continue if PostgreSQL write fails", async () => {
      // Arrange - PostgreSQL fails, KV succeeds
      vi.mocked(pricesRepository.upsertPrices).mockRejectedValue(new Error("DB error"));
      vi.mocked(pricesCache.set).mockResolvedValue(undefined);

      // Act
      const result = await service.writePrice(mockPriceResult);

      // Assert
      expect(result.pgWritten).toBe(false);
      expect(result.kvWritten).toBe(true);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ===========================================================================
  // EXCHANGE RATE OPERATIONS
  // ===========================================================================

  describe("getExchangeRate", () => {
    it("should return KV cache hit when available", async () => {
      // Arrange
      vi.mocked(exchangeRatesCache.get).mockResolvedValue(mockExchangeRateResult);

      // Act
      const result = await service.getExchangeRate("USD", "BRL");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("kv");
      expect(result.data.rate).toBe("5.50");
    });

    it("should fall back to PostgreSQL on KV miss", async () => {
      // Arrange
      vi.mocked(exchangeRatesCache.get).mockResolvedValue(null);
      vi.mocked(exchangeRatesRepository.getRate).mockResolvedValue({
        id: "1",
        baseCurrency: "USD",
        targetCurrency: "BRL",
        rate: "5.50",
        source: "exchangerate-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        rateDate: "2026-01-01",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await service.getExchangeRate("USD", "BRL");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("pg");
      expect(result.data.rate).toBe("5.50");
    });
  });

  describe("writeExchangeRates", () => {
    it("should write to both PostgreSQL and KV", async () => {
      // Arrange
      vi.mocked(exchangeRatesRepository.upsertRates).mockResolvedValue({
        inserted: 2,
        updated: 0,
        errors: [],
      });
      vi.mocked(exchangeRatesCache.set).mockResolvedValue(undefined);

      // Act
      const result = await service.writeExchangeRates(mockExchangeRateResult);

      // Assert
      expect(result.pgWritten).toBe(true);
      expect(result.kvWritten).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ===========================================================================
  // FUNDAMENTALS OPERATIONS
  // ===========================================================================

  describe("getFundamentals", () => {
    it("should return KV cache hit when available", async () => {
      // Arrange
      vi.mocked(fundamentalsCache.get).mockResolvedValue(mockFundamentalsResult);

      // Act
      const result = await service.getFundamentals("PETR4");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("kv");
      expect(result.data).toEqual(mockFundamentalsResult);
    });

    it("should fall back to PostgreSQL on KV miss", async () => {
      // Arrange
      vi.mocked(fundamentalsCache.get).mockResolvedValue(null);
      vi.mocked(fundamentalsRepository.getFundamentalsBySymbol).mockResolvedValue(
        mockFundamentalsResult
      );

      // Act
      const result = await service.getFundamentals("PETR4");

      // Assert
      expect(result.found).toBe(true);
      expect(result.source).toBe("pg");
      expect(result.kvRepopulationTriggered).toBe(true);
    });
  });

  describe("writeFundamentals", () => {
    it("should write to both PostgreSQL and KV", async () => {
      // Arrange
      vi.mocked(fundamentalsRepository.upsertFundamentals).mockResolvedValue({
        inserted: 1,
        updated: 0,
        errors: [],
      });
      vi.mocked(fundamentalsCache.set).mockResolvedValue(undefined);

      // Act
      const result = await service.writeFundamentals(mockFundamentalsResult);

      // Assert
      expect(result.pgWritten).toBe(true);
      expect(result.kvWritten).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ===========================================================================
  // PERFORMANCE TESTS
  // ===========================================================================

  describe("Performance", () => {
    it("should complete KV cache hit in under 50ms", async () => {
      // Arrange - simulate fast KV response
      vi.mocked(pricesCache.get).mockResolvedValue(mockPriceResult);

      // Act
      const startTime = performance.now();
      const result = await service.getPrice("PETR4");
      const endTime = performance.now();

      // Assert
      expect(result.source).toBe("kv");
      // Note: This tests the code path is fast, not actual network latency
      // In real tests with mocks, this will be <1ms
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
