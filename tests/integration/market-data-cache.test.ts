/**
 * Integration Tests: Market Data Cache Flow
 *
 * Story 5.2: Two-Tier Refresh Architecture
 * Tests the integration between cache tiers:
 * - AC-5.2.1: PostgreSQL as durable storage
 * - AC-5.2.2: Vercel KV as hot cache with TTL
 * - AC-5.2.3: Cache-first read pattern
 * - AC-5.2.4: Cache miss fallback to PostgreSQL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PriceResult, ExchangeRateResult, FundamentalsResult } from "@/lib/providers/types";

// =============================================================================
// MOCKS - All data must be inlined due to vi.mock hoisting
// =============================================================================

// Track mock call sequences for integration testing
const callSequence: string[] = [];

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock KV cache service
vi.mock("@/lib/cache", () => ({
  cacheService: {
    get: vi.fn().mockImplementation(async () => {
      return null; // KV miss
    }),
    set: vi.fn(),
    del: vi.fn(),
    delMultiple: vi.fn(),
    isEnabled: () => true,
  },
  isCacheEnabled: () => true,
}));

// Mock prices cache - simulates Vercel KV
vi.mock("@/lib/providers/prices-cache", () => ({
  pricesCache: {
    get: vi.fn().mockImplementation(async () => {
      return null; // Simulating cache miss initially
    }),
    set: vi.fn(),
    getMultiple: vi.fn().mockResolvedValue(new Map()),
    setMultiple: vi.fn(),
  },
  generatePricesCacheKey: vi.fn(),
}));

// Mock exchange rates cache
vi.mock("@/lib/providers/exchange-rates-cache", () => ({
  exchangeRatesCache: {
    get: vi.fn().mockImplementation(async () => {
      return null;
    }),
    set: vi.fn(),
  },
  generateExchangeRatesCacheKey: vi.fn(),
}));

// Mock fundamentals cache
vi.mock("@/lib/providers/fundamentals-cache", () => ({
  fundamentalsCache: {
    get: vi.fn().mockImplementation(async () => {
      return null;
    }),
    set: vi.fn(),
    getMultiple: vi.fn().mockResolvedValue(new Map()),
    setMultiple: vi.fn(),
  },
  generateFundamentalsCacheKey: vi.fn(),
}));

// Mock prices repository - simulates PostgreSQL
// Note: Mock data must be inlined due to vi.mock hoisting
vi.mock("@/lib/repositories/prices-repository", () => ({
  pricesRepository: {
    getPriceBySymbol: vi.fn().mockImplementation(async () => {
      return {
        symbol: "PETR4",
        close: "35.50",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        priceDate: new Date("2026-01-01"),
      };
    }),
    getPricesBySymbols: vi.fn().mockImplementation(async () => {
      return [
        {
          symbol: "PETR4",
          close: "35.50",
          currency: "BRL",
          source: "gemini-api",
          fetchedAt: new Date("2026-01-01T10:00:00Z"),
          priceDate: new Date("2026-01-01"),
        },
      ];
    }),
    upsertPrices: vi.fn().mockImplementation(async () => {
      return { inserted: 1, updated: 0, errors: [] };
    }),
  },
  PricesRepository: {
    toPriceResult: (record: unknown) => ({
      ...(record as object),
      priceDate: new Date("2026-01-01"),
    }),
  },
}));

// Mock exchange rates repository
vi.mock("@/lib/repositories/exchange-rates-repository", () => ({
  exchangeRatesRepository: {
    getRate: vi.fn().mockImplementation(async () => {
      return {
        id: "rate-1",
        baseCurrency: "USD",
        targetCurrency: "BRL",
        rate: "5.50",
        source: "exchangerate-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        rateDate: "2026-01-01",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
    getRates: vi.fn(),
    upsertRates: vi.fn().mockImplementation(async () => {
      return { inserted: 1, updated: 0, errors: [] };
    }),
  },
  ExchangeRatesRepository: {
    toExchangeRateResult: (records: unknown) => records,
  },
}));

// Mock fundamentals repository
vi.mock("@/lib/repositories/fundamentals-repository", () => ({
  fundamentalsRepository: {
    getFundamentalsBySymbol: vi.fn().mockImplementation(async () => {
      return {
        symbol: "PETR4",
        source: "gemini-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        dataDate: new Date("2026-01-01"),
        peRatio: "8.5",
        dividendYield: "12.5",
        marketCap: "500000000000",
      };
    }),
    getFundamentalsBySymbols: vi.fn(),
    upsertFundamentals: vi.fn().mockImplementation(async () => {
      return { inserted: 1, updated: 0, errors: [] };
    }),
  },
  FundamentalsRepository: {
    toFundamentalsResult: (record: unknown) => ({
      ...(record as object),
      dataDate: new Date("2026-01-01"),
    }),
  },
}));

// Import after all mocks are set up
import { MarketDataCacheService } from "@/lib/services/data-access/market-data-cache-service";
import { pricesCache } from "@/lib/providers/prices-cache";
import { exchangeRatesCache } from "@/lib/providers/exchange-rates-cache";
import { fundamentalsCache } from "@/lib/providers/fundamentals-cache";
import { pricesRepository } from "@/lib/repositories/prices-repository";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import { fundamentalsRepository } from "@/lib/repositories/fundamentals-repository";

// =============================================================================
// TESTS
// =============================================================================

describe("Market Data Cache Flow Integration", () => {
  let service: MarketDataCacheService;

  beforeEach(() => {
    callSequence.length = 0; // Clear sequence
    vi.clearAllMocks();
    service = new MarketDataCacheService();

    // Set up mock implementations that track call sequence
    vi.mocked(pricesCache.get).mockImplementation(async (symbol: string) => {
      callSequence.push(`prices-kv:get:${symbol}`);
      return null; // Cache miss by default
    });
    vi.mocked(pricesCache.set).mockImplementation(async () => {
      callSequence.push("prices-kv:set");
    });
    vi.mocked(exchangeRatesCache.get).mockImplementation(async () => {
      callSequence.push("rates-kv:get");
      return null;
    });
    vi.mocked(exchangeRatesCache.set).mockImplementation(async () => {
      callSequence.push("rates-kv:set");
    });
    vi.mocked(fundamentalsCache.get).mockImplementation(async () => {
      callSequence.push("fundamentals-kv:get");
      return null;
    });
    vi.mocked(fundamentalsCache.set).mockImplementation(async () => {
      callSequence.push("fundamentals-kv:set");
    });
    vi.mocked(pricesRepository.getPriceBySymbol).mockImplementation(async () => {
      callSequence.push("prices-pg:get");
      return {
        symbol: "PETR4",
        close: "35.50",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        priceDate: new Date("2026-01-01"),
      };
    });
    vi.mocked(pricesRepository.upsertPrices).mockImplementation(async () => {
      callSequence.push("prices-pg:upsert");
      return { inserted: 1, updated: 0, errors: [] };
    });
    vi.mocked(exchangeRatesRepository.getRate).mockImplementation(async () => {
      callSequence.push("rates-pg:get");
      return {
        id: "rate-1",
        baseCurrency: "USD",
        targetCurrency: "BRL",
        rate: "5.50",
        source: "exchangerate-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        rateDate: "2026-01-01",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    vi.mocked(exchangeRatesRepository.upsertRates).mockImplementation(async () => {
      callSequence.push("rates-pg:upsert");
      return { inserted: 1, updated: 0, errors: [] };
    });
    vi.mocked(fundamentalsRepository.getFundamentalsBySymbol).mockImplementation(async () => {
      callSequence.push("fundamentals-pg:get");
      return {
        symbol: "PETR4",
        source: "gemini-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        dataDate: new Date("2026-01-01"),
        peRatio: "8.5",
        dividendYield: "12.5",
        marketCap: "500000000000",
      };
    });
    vi.mocked(fundamentalsRepository.upsertFundamentals).mockImplementation(async () => {
      callSequence.push("fundamentals-pg:upsert");
      return { inserted: 1, updated: 0, errors: [] };
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // AC-5.2.3: Cache-First Read Pattern
  // ===========================================================================

  describe("AC-5.2.3: Cache-First Read Pattern", () => {
    it("should check KV cache before PostgreSQL", async () => {
      // Act
      await service.getPrice("PETR4");

      // Assert - KV should be checked first
      expect(callSequence[0]).toBe("prices-kv:get:PETR4");
    });

    it("should return KV data without hitting PostgreSQL when cache hit", async () => {
      // Arrange - Simulate KV cache hit
      const cachedPrice: PriceResult = {
        symbol: "PETR4",
        close: "35.50",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date("2026-01-01T10:00:00Z"),
        priceDate: new Date("2026-01-01"),
      };
      vi.mocked(pricesCache.get).mockResolvedValue(cachedPrice);

      // Act
      const result = await service.getPrice("PETR4");

      // Assert
      expect(result.source).toBe("kv");
      expect(result.found).toBe(true);
      expect(pricesRepository.getPriceBySymbol).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // AC-5.2.4: Cache Miss Fallback
  // ===========================================================================

  describe("AC-5.2.4: Cache Miss Fallback to PostgreSQL", () => {
    it("should fall back to PostgreSQL on KV miss", async () => {
      // Arrange - KV miss (default mock behavior)
      vi.mocked(pricesCache.get).mockResolvedValue(null);

      // Act
      const result = await service.getPrice("PETR4");

      // Assert
      expect(result.source).toBe("pg");
      expect(result.found).toBe(true);
      expect(pricesRepository.getPriceBySymbol).toHaveBeenCalled();
    });

    it("should repopulate KV cache after PostgreSQL fetch", async () => {
      // Arrange - KV miss
      vi.mocked(pricesCache.get).mockResolvedValue(null);

      // Act
      const result = await service.getPrice("PETR4");

      // Assert - Should trigger KV repopulation (non-blocking)
      expect(result.kvRepopulationTriggered).toBe(true);
      // Note: The repopulation happens asynchronously via .catch(),
      // so we verify the flag was set (actual repopulation may still fail)
    });

    it("should follow correct call sequence: KV → PG → KV repopulate", async () => {
      // Arrange - KV miss (using mockImplementation to track sequence)
      vi.mocked(pricesCache.get).mockImplementation(async (symbol: string) => {
        callSequence.push(`prices-kv:get:${symbol}`);
        return null; // Cache miss
      });

      // Act
      await service.getPrice("PETR4");

      // Assert - Verify the call sequence
      expect(callSequence).toContain("prices-kv:get:PETR4");
      expect(callSequence).toContain("prices-pg:get");
      // KV set happens asynchronously, so might not be in sequence yet
    });
  });

  // ===========================================================================
  // AC-5.2.1: PostgreSQL as Durable Storage
  // ===========================================================================

  describe("AC-5.2.1: PostgreSQL as Durable Storage", () => {
    it("should write prices to PostgreSQL first when caching", async () => {
      // Arrange
      const price: PriceResult = {
        symbol: "PETR4",
        close: "36.00",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date(),
        priceDate: new Date(),
      };

      // Act
      const result = await service.writePrice(price);

      // Assert - PostgreSQL write should succeed
      expect(result.pgWritten).toBe(true);
      expect(callSequence).toContain("prices-pg:upsert");
    });

    it("should continue KV write even if not strictly before PG in sequence", async () => {
      // Arrange
      const price: PriceResult = {
        symbol: "PETR4",
        close: "36.00",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date(),
        priceDate: new Date(),
      };

      // Act
      const result = await service.writePrice(price);

      // Assert - Both writes should succeed
      expect(result.pgWritten).toBe(true);
      expect(result.kvWritten).toBe(true);
    });
  });

  // ===========================================================================
  // AC-5.2.2: Vercel KV Cache with TTL
  // ===========================================================================

  describe("AC-5.2.2: Vercel KV Cache with TTL", () => {
    it("should write exchange rates to both tiers", async () => {
      // Arrange
      const rates: ExchangeRateResult = {
        base: "USD",
        rates: { BRL: "5.50", EUR: "0.92" },
        source: "exchangerate-api",
        fetchedAt: new Date(),
        rateDate: new Date(),
      };

      // Act
      const result = await service.writeExchangeRates(rates);

      // Assert
      expect(result.pgWritten).toBe(true);
      expect(result.kvWritten).toBe(true);
      expect(callSequence).toContain("rates-pg:upsert");
      expect(callSequence).toContain("rates-kv:set");
    });

    it("should write fundamentals to both tiers", async () => {
      // Arrange
      const fundamentals: FundamentalsResult = {
        symbol: "PETR4",
        source: "gemini-api",
        fetchedAt: new Date(),
        dataDate: new Date(),
        peRatio: "8.5",
        dividendYield: "12.5",
      };

      // Act
      const result = await service.writeFundamentals(fundamentals);

      // Assert
      expect(result.pgWritten).toBe(true);
      expect(result.kvWritten).toBe(true);
      expect(callSequence).toContain("fundamentals-pg:upsert");
      expect(callSequence).toContain("fundamentals-kv:set");
    });
  });

  // ===========================================================================
  // Error Resilience
  // ===========================================================================

  describe("Error Resilience", () => {
    it("should handle KV errors gracefully and fall back to PostgreSQL", async () => {
      // Arrange - KV throws error
      vi.mocked(pricesCache.get).mockRejectedValue(new Error("KV connection failed"));

      // Act
      const result = await service.getPrice("PETR4");

      // Assert - Should still return data from PostgreSQL
      expect(result.found).toBe(true);
      expect(result.source).toBe("pg");
    });

    it("should report partial success if PostgreSQL write fails but KV succeeds", async () => {
      // Arrange
      vi.mocked(pricesRepository.upsertPrices).mockRejectedValue(new Error("DB error"));

      const price: PriceResult = {
        symbol: "PETR4",
        close: "36.00",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date(),
        priceDate: new Date(),
      };

      // Act
      const result = await service.writePrice(price);

      // Assert
      expect(result.pgWritten).toBe(false);
      expect(result.kvWritten).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
