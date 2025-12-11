/**
 * Data Refresh Service Tests
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Refresh Button Available on Dashboard and Portfolio
 * AC-6.6.2: Loading Spinner Shown During Refresh
 * AC-6.6.3: Success Toast with Timestamp
 *
 * Tests for the DataRefreshService class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataRefreshService, type RefreshInput } from "@/lib/services/data-refresh-service";
import type { PriceServiceResult } from "@/lib/providers/price-service";
import type { ExchangeRateServiceResult } from "@/lib/providers/exchange-rate-service";
import type { FundamentalsServiceResult } from "@/lib/providers/fundamentals-service";

// Mock dependencies
vi.mock("@/lib/cache", () => ({
  cacheService: {
    del: vi.fn().mockResolvedValue(undefined),
    delMultiple: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create mock services
const mockPriceService = {
  getPrices: vi.fn(),
  getPrice: vi.fn(),
  healthCheck: vi.fn(),
  getCircuitBreakerStates: vi.fn(),
};

const mockExchangeRateService = {
  getRates: vi.fn(),
  getRate: vi.fn(),
  healthCheck: vi.fn(),
  getCircuitBreakerStates: vi.fn(),
};

const mockFundamentalsService = {
  getFundamentals: vi.fn(),
  getFundamental: vi.fn(),
  healthCheck: vi.fn(),
  getCircuitBreakerStates: vi.fn(),
};

const mockEventStore = {
  append: vi.fn().mockResolvedValue(undefined),
  appendBatch: vi.fn().mockResolvedValue(undefined),
  getByCorrelationId: vi.fn(),
  getByUserId: vi.fn(),
  getByEventType: vi.fn(),
  getCalcStartedEvent: vi.fn(),
};

describe("DataRefreshService", () => {
  let service: DataRefreshService;

  // Mock successful results
  const mockPriceResult: PriceServiceResult = {
    prices: [
      {
        symbol: "PETR4",
        close: "35.50",
        currency: "BRL",
        source: "gemini-api",
        fetchedAt: new Date(),
        priceDate: new Date(),
      },
    ],
    fromCache: false,
    freshness: {
      source: "gemini-api",
      fetchedAt: new Date(),
      isStale: false,
    },
    provider: "gemini-api",
  };

  const mockRatesResult: ExchangeRateServiceResult = {
    rates: {
      base: "USD",
      rates: { BRL: "5.05", EUR: "0.92" },
      source: "exchangerate-api",
      fetchedAt: new Date(),
    },
    fromCache: false,
    freshness: {
      source: "exchangerate-api",
      fetchedAt: new Date(),
      isStale: false,
    },
    provider: "exchangerate-api",
  };

  const mockFundamentalsResult: FundamentalsServiceResult = {
    fundamentals: [
      {
        symbol: "PETR4",
        dividendYield: "0.08",
        eps: "4.50",
        peRatio: "7.89",
        source: "gemini-api",
        fetchedAt: new Date(),
      },
    ],
    fromCache: false,
    freshness: {
      source: "gemini-api",
      fetchedAt: new Date(),
      isStale: false,
    },
    provider: "gemini-api",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-10T12:00:00Z"));

    // Setup default mock responses
    mockPriceService.getPrices.mockResolvedValue(mockPriceResult);
    mockExchangeRateService.getRates.mockResolvedValue(mockRatesResult);
    mockFundamentalsService.getFundamentals.mockResolvedValue(mockFundamentalsResult);

    service = new DataRefreshService({
      priceService: mockPriceService as unknown as Parameters<
        typeof DataRefreshService
      >[0]["priceService"],
      exchangeRateService: mockExchangeRateService as unknown as Parameters<
        typeof DataRefreshService
      >[0]["exchangeRateService"],
      fundamentalsService: mockFundamentalsService as unknown as Parameters<
        typeof DataRefreshService
      >[0]["fundamentalsService"],
      eventStore: mockEventStore as unknown as Parameters<
        typeof DataRefreshService
      >[0]["eventStore"],
      emitEvents: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("refresh", () => {
    describe("type: prices", () => {
      it("should refresh only prices when type is 'prices'", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "prices",
          symbols: ["PETR4", "VALE3"],
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(true);
        expect(mockPriceService.getPrices).toHaveBeenCalledWith(["PETR4", "VALE3"], {
          skipCache: true,
        });
        expect(mockExchangeRateService.getRates).not.toHaveBeenCalled();
        expect(mockFundamentalsService.getFundamentals).not.toHaveBeenCalled();
      });

      it("should not call price service if no symbols provided", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "prices",
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(true);
        expect(mockPriceService.getPrices).not.toHaveBeenCalled();
      });
    });

    describe("type: rates", () => {
      it("should refresh only rates when type is 'rates'", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "rates",
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(true);
        expect(mockExchangeRateService.getRates).toHaveBeenCalledWith(
          "USD",
          ["BRL", "EUR", "GBP", "JPY"],
          { skipCache: true }
        );
        expect(mockPriceService.getPrices).not.toHaveBeenCalled();
        expect(mockFundamentalsService.getFundamentals).not.toHaveBeenCalled();
      });
    });

    describe("type: fundamentals", () => {
      it("should refresh only fundamentals when type is 'fundamentals'", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "fundamentals",
          symbols: ["PETR4"],
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(true);
        expect(mockFundamentalsService.getFundamentals).toHaveBeenCalledWith(["PETR4"], {
          skipCache: true,
        });
        expect(mockPriceService.getPrices).not.toHaveBeenCalled();
        expect(mockExchangeRateService.getRates).not.toHaveBeenCalled();
      });
    });

    describe("type: all", () => {
      it("should refresh all data types when type is 'all'", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "all",
          symbols: ["PETR4", "VALE3"],
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(true);
        expect(mockPriceService.getPrices).toHaveBeenCalledWith(["PETR4", "VALE3"], {
          skipCache: true,
        });
        expect(mockExchangeRateService.getRates).toHaveBeenCalledWith(
          "USD",
          ["BRL", "EUR", "GBP", "JPY"],
          { skipCache: true }
        );
        expect(mockFundamentalsService.getFundamentals).toHaveBeenCalledWith(["PETR4", "VALE3"], {
          skipCache: true,
        });
      });
    });

    describe("result structure", () => {
      it("should return success with refreshedAt timestamp", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "rates",
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(true);
        expect(result.refreshedAt).toBeInstanceOf(Date);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      });

      it("should return providers that served data", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "all",
          symbols: ["PETR4"],
        };

        const result = await service.refresh(input);

        expect(result.providers.prices).toBe("gemini-api");
        expect(result.providers.rates).toBe("exchangerate-api");
        expect(result.providers.fundamentals).toBe("gemini-api");
      });

      it("should return refreshed types", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "all",
          symbols: ["PETR4"],
        };

        const result = await service.refresh(input);

        expect(result.refreshedTypes).toContain("prices");
        expect(result.refreshedTypes).toContain("rates");
        expect(result.refreshedTypes).toContain("fundamentals");
      });
    });

    describe("error handling", () => {
      it("should return error result when provider fails", async () => {
        mockPriceService.getPrices.mockRejectedValue(new Error("Provider failed"));

        const input: RefreshInput = {
          userId: "user-123",
          type: "prices",
          symbols: ["PETR4"],
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Provider failed");
      });

      it("should return partial success when some providers fail", async () => {
        mockExchangeRateService.getRates.mockRejectedValue(new Error("Rate provider failed"));

        const input: RefreshInput = {
          userId: "user-123",
          type: "all",
          symbols: ["PETR4"],
        };

        const result = await service.refresh(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Rate provider failed");
      });
    });

    describe("audit trail events", () => {
      it("should emit DATA_REFRESHED event on success", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "rates",
        };

        await service.refresh(input);

        expect(mockEventStore.append).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            type: "DATA_REFRESHED",
            userId: "user-123",
            refreshType: "rates",
            success: true,
          })
        );
      });

      it("should emit DATA_REFRESHED event on failure", async () => {
        mockExchangeRateService.getRates.mockRejectedValue(new Error("Failed"));

        const input: RefreshInput = {
          userId: "user-123",
          type: "rates",
        };

        await service.refresh(input);

        expect(mockEventStore.append).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            type: "DATA_REFRESHED",
            success: false,
            errorMessage: "Failed",
          })
        );
      });

      it("should include symbols in event when provided", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "prices",
          symbols: ["PETR4", "VALE3"],
        };

        await service.refresh(input);

        expect(mockEventStore.append).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            symbols: ["PETR4", "VALE3"],
          })
        );
      });

      it("should include duration in event", async () => {
        const input: RefreshInput = {
          userId: "user-123",
          type: "rates",
        };

        await service.refresh(input);

        expect(mockEventStore.append).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            durationMs: expect.any(Number),
          })
        );
      });
    });

    describe("event emission toggle", () => {
      it("should not emit events when emitEvents is false", async () => {
        const noEventService = new DataRefreshService({
          priceService: mockPriceService as unknown as Parameters<
            typeof DataRefreshService
          >[0]["priceService"],
          exchangeRateService: mockExchangeRateService as unknown as Parameters<
            typeof DataRefreshService
          >[0]["exchangeRateService"],
          fundamentalsService: mockFundamentalsService as unknown as Parameters<
            typeof DataRefreshService
          >[0]["fundamentalsService"],
          eventStore: mockEventStore as unknown as Parameters<
            typeof DataRefreshService
          >[0]["eventStore"],
          emitEvents: false,
        });

        await noEventService.refresh({
          userId: "user-123",
          type: "rates",
        });

        expect(mockEventStore.append).not.toHaveBeenCalled();
      });
    });
  });
});
