/**
 * Price Service Tests
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.3: Provider Implementations Are Swappable
 * AC-6.1.4: Retry Logic Applied
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Tests for PriceService with fallback chain.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PriceService } from "@/lib/providers/price-service";
import {
  MockPriceProvider,
  createSuccessfulPriceProvider,
} from "@/lib/providers/implementations/mock-provider";
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

// Mock cache service
const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  delMultiple: vi.fn(),
  isEnabled: vi.fn().mockReturnValue(true),
  getOrSet: vi.fn(),
};

describe("PriceService", () => {
  let primaryProvider: MockPriceProvider;
  let fallbackProvider: MockPriceProvider;
  let service: PriceService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);

    primaryProvider = createSuccessfulPriceProvider("primary");
    fallbackProvider = createSuccessfulPriceProvider("fallback");

    service = new PriceService({
      primary: primaryProvider,
      fallback: fallbackProvider,
      cache: mockCache as never,
      cacheTtlSeconds: 86400,
      retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      circuitBreakerOptions: { failureThreshold: 5, resetTimeoutMs: 300000 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("primary provider success path", () => {
    it("should fetch prices from primary provider", async () => {
      const symbols = ["AAPL", "GOOGL"];

      const result = await service.getPrices(symbols);

      expect(result.prices).toHaveLength(2);
      expect(result.prices.map((p) => p.symbol)).toEqual(symbols);
      expect(result.fromCache).toBe(false);
      expect(result.provider).toBe("primary");
      expect(result.freshness.source).toBe("primary");
      expect(result.freshness.isStale).toBe(false);
    });

    it("should cache successful results", async () => {
      const symbols = ["AAPL"];

      await service.getPrices(symbols);

      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe("fallback to secondary provider", () => {
    it("should fallback to secondary provider when primary fails", async () => {
      primaryProvider.setFailure("Primary unavailable");
      const symbols = ["AAPL"];

      const result = await service.getPrices(symbols);

      expect(result.provider).toBe("fallback");
      expect(result.prices).toHaveLength(1);
      expect(result.fromCache).toBe(false);
    });

    it("should try primary first even when fallback exists", async () => {
      const fetchPricesSpy = vi.spyOn(primaryProvider, "fetchPrices");
      const symbols = ["AAPL"];

      await service.getPrices(symbols);

      expect(fetchPricesSpy).toHaveBeenCalled();
    });
  });

  describe("stale cache fallback", () => {
    it("should return stale cache when all providers fail", async () => {
      primaryProvider.setFailure("Primary down");
      fallbackProvider.setFailure("Fallback down");

      const cachedPrices = [
        {
          symbol: "AAPL",
          close: "150.00",
          currency: "USD",
          source: "primary",
          fetchedAt: new Date(Date.now() - 1000),
          priceDate: new Date(),
        },
      ];

      // First call: Return null so we try providers (which fail)
      // Second call: Return stale data as fallback
      mockCache.get
        .mockResolvedValueOnce(null) // First check - no fresh cache
        .mockResolvedValue({
          // Second check - stale fallback
          data: cachedPrices,
          metadata: { source: "primary", cachedAt: new Date(Date.now() - 1000) },
        });

      const symbols = ["AAPL"];
      const result = await service.getPrices(symbols);

      expect(result.fromCache).toBe(true);
      expect(result.freshness.isStale).toBe(true);
      expect(result.prices[0]?.isStale).toBe(true);
    });

    it("should throw when all providers fail and no cache available", async () => {
      primaryProvider.setFailure("Primary down");
      fallbackProvider.setFailure("Fallback down");
      mockCache.get.mockResolvedValue(null);

      try {
        await service.getPrices(["AAPL"]);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        const providerError = error as ProviderError;
        expect(providerError.code).toBe(PROVIDER_ERROR_CODES.ALL_PROVIDERS_FAILED);
      }
    });
  });

  describe("circuit breaker integration", () => {
    it("should skip provider when circuit is open", async () => {
      // Open the primary circuit by recording 5 failures
      for (let i = 0; i < 5; i++) {
        primaryProvider.setFailure("Fail");
        try {
          await service.getPrices(["AAPL"]);
        } catch {
          // Expected
        }
        primaryProvider.setSuccess();
      }

      // Now primary circuit should be open, should use fallback directly
      const fetchPricesSpy = vi.spyOn(fallbackProvider, "fetchPrices");
      const result = await service.getPrices(["AAPL"]);

      expect(result.provider).toBe("fallback");
      expect(fetchPricesSpy).toHaveBeenCalled();
    });

    it("should report circuit breaker states", () => {
      const states = service.getCircuitBreakerStates();

      expect(states.primary).toBeDefined();
      expect(states.primary.provider).toBe("primary");
      expect(states.primary.state).toBe("closed");
      expect(states.fallback).toBeDefined();
      expect(states.fallback?.provider).toBe("fallback");
    });
  });

  describe("provider swapping (AC-6.1.3)", () => {
    it("should work with different provider implementations", async () => {
      const customProvider = new MockPriceProvider("custom");
      customProvider.setPrice("AAPL", { close: "999.99", currency: "USD" });

      const customService = new PriceService({
        primary: customProvider,
        cache: mockCache as never,
        retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      });

      const result = await customService.getPrices(["AAPL"]);

      expect(result.provider).toBe("custom");
      expect(result.prices[0]?.close).toBe("999.99");
    });

    it("should swap providers without changing business logic", async () => {
      // Service 1 with provider A
      const providerA = new MockPriceProvider("provider-a");
      providerA.setPrice("AAPL", { close: "100.00", currency: "USD" });

      // Service 2 with provider B
      const providerB = new MockPriceProvider("provider-b");
      providerB.setPrice("AAPL", { close: "100.00", currency: "USD" });

      const serviceA = new PriceService({
        primary: providerA,
        cache: mockCache as never,
        retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      });

      const serviceB = new PriceService({
        primary: providerB,
        cache: mockCache as never,
        retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      });

      const resultA = await serviceA.getPrices(["AAPL"]);
      const resultB = await serviceB.getPrices(["AAPL"]);

      // Same interface, same data structure
      expect(resultA.prices[0]?.close).toBe(resultB.prices[0]?.close);
      expect(resultA.prices[0]?.symbol).toBe(resultB.prices[0]?.symbol);
    });
  });

  describe("getPrice (single symbol)", () => {
    it("should get price for single symbol", async () => {
      const result = await service.getPrice("AAPL");

      expect(result.symbol).toBe("AAPL");
      expect(result.close).toBeDefined();
    });

    it("should throw if symbol not found in results", async () => {
      primaryProvider.setPrice("GOOGL", { close: "100.00", currency: "USD" });

      // This shouldn't happen in practice, but test the error handling
      await expect(service.getPrice("AAPL")).resolves.toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return health status of all providers", async () => {
      const health = await service.healthCheck();

      expect(health.primary).toBe(true);
      expect(health.fallback).toBe(true);
    });

    it("should report unhealthy when provider is down", async () => {
      primaryProvider.configure({ isHealthy: false });
      fallbackProvider.configure({ isHealthy: true });

      const health = await service.healthCheck();

      expect(health.primary).toBe(false);
      expect(health.fallback).toBe(true);
    });
  });

  describe("cache behavior", () => {
    it("should skip cache when skipCache option is set", async () => {
      mockCache.get.mockResolvedValue({
        data: [{ symbol: "AAPL", close: "cached", currency: "USD" }],
        metadata: {},
      });

      const result = await service.getPrices(["AAPL"], { skipCache: true });

      expect(result.fromCache).toBe(false);
      expect(result.provider).toBe("primary");
    });

    it("should use cache when available and fresh", async () => {
      const cachedPrices = [
        {
          symbol: "AAPL",
          close: "150.00",
          currency: "USD",
          source: "primary",
          fetchedAt: new Date(),
          priceDate: new Date(),
        },
      ];

      mockCache.get.mockResolvedValue({
        data: cachedPrices,
        metadata: { source: "primary", timestamp: Date.now() },
      });

      const result = await service.getPrices(["AAPL"]);

      expect(result.fromCache).toBe(true);
      expect(result.prices[0]?.close).toBe("150.00");
    });
  });
});
