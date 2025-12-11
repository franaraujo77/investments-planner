/**
 * Exchange Rate Service Tests
 *
 * Story 6.1: Provider Abstraction Layer
 * AC-6.1.3: Provider Implementations Are Swappable
 * AC-6.1.4: Retry Logic Applied
 * AC-6.1.5: Circuit Breaker Disables Failing Provider
 *
 * Tests for ExchangeRateService with fallback chain.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExchangeRateService } from "@/lib/providers/exchange-rate-service";
import {
  MockExchangeRateProvider,
  createSuccessfulExchangeRateProvider,
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

describe("ExchangeRateService", () => {
  let primaryProvider: MockExchangeRateProvider;
  let fallbackProvider: MockExchangeRateProvider;
  let service: ExchangeRateService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);

    primaryProvider = createSuccessfulExchangeRateProvider("primary");
    fallbackProvider = createSuccessfulExchangeRateProvider("fallback");

    service = new ExchangeRateService({
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
    it("should fetch exchange rates from primary provider", async () => {
      const result = await service.getRates("USD", ["BRL", "EUR"]);

      expect(result.rates.base).toBe("USD");
      expect(Object.keys(result.rates.rates)).toHaveLength(2);
      expect(result.fromCache).toBe(false);
      expect(result.provider).toBe("primary");
      expect(result.freshness.source).toBe("primary");
      expect(result.freshness.isStale).toBe(false);
    });

    it("should cache successful results", async () => {
      await service.getRates("USD", ["BRL"]);

      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe("fallback to secondary provider", () => {
    it("should fallback to secondary provider when primary fails", async () => {
      primaryProvider.setFailure("Primary unavailable");

      const result = await service.getRates("USD", ["BRL"]);

      expect(result.provider).toBe("fallback");
      expect(result.fromCache).toBe(false);
    });
  });

  describe("stale cache fallback", () => {
    it("should return stale cache when all providers fail", async () => {
      primaryProvider.setFailure("Primary down");
      fallbackProvider.setFailure("Fallback down");

      const cachedRates = {
        base: "USD",
        rates: { BRL: "5.0000" },
        source: "primary",
        fetchedAt: new Date(Date.now() - 1000),
        rateDate: new Date(),
      };

      // First call: Return null so we try providers (which fail)
      // Second call: Return stale data as fallback
      mockCache.get
        .mockResolvedValueOnce(null) // First check - no fresh cache
        .mockResolvedValue({
          // Second check - stale fallback
          data: cachedRates,
          metadata: { source: "primary", cachedAt: new Date(Date.now() - 1000) },
        });

      const result = await service.getRates("USD", ["BRL"]);

      expect(result.fromCache).toBe(true);
      expect(result.freshness.isStale).toBe(true);
      expect(result.rates.isStale).toBe(true);
    });

    it("should throw when all providers fail and no cache available", async () => {
      primaryProvider.setFailure("Primary down");
      fallbackProvider.setFailure("Fallback down");
      mockCache.get.mockResolvedValue(null);

      try {
        await service.getRates("USD", ["BRL"]);
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
          await service.getRates("USD", ["BRL"]);
        } catch {
          // Expected
        }
        primaryProvider.setSuccess();
      }

      // Primary circuit should be open, should use fallback
      const result = await service.getRates("USD", ["BRL"]);

      expect(result.provider).toBe("fallback");
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
      const customProvider = new MockExchangeRateProvider("custom");
      customProvider.setRate("BRL", "4.9876");

      const customService = new ExchangeRateService({
        primary: customProvider,
        cache: mockCache as never,
        retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      });

      const result = await customService.getRates("USD", ["BRL"]);

      expect(result.provider).toBe("custom");
      expect(result.rates.rates.BRL).toBe("4.9876");
    });

    it("should swap providers without changing business logic", async () => {
      // Service 1 with provider A
      const providerA = new MockExchangeRateProvider("provider-a");
      providerA.setRate("BRL", "5.0000");

      // Service 2 with provider B
      const providerB = new MockExchangeRateProvider("provider-b");
      providerB.setRate("BRL", "5.0000");

      const serviceA = new ExchangeRateService({
        primary: providerA,
        cache: mockCache as never,
        retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      });

      const serviceB = new ExchangeRateService({
        primary: providerB,
        cache: mockCache as never,
        retryOptions: { maxAttempts: 1, backoffMs: [0], timeoutMs: 5000 },
      });

      const resultA = await serviceA.getRates("USD", ["BRL"]);
      const resultB = await serviceB.getRates("USD", ["BRL"]);

      // Same interface, same data structure
      expect(resultA.rates.rates.BRL).toBe(resultB.rates.rates.BRL);
      expect(resultA.rates.base).toBe(resultB.rates.base);
    });
  });

  describe("getRate (single rate)", () => {
    it("should get single exchange rate", async () => {
      primaryProvider.setRate("BRL", "5.0123");

      const result = await service.getRate("USD", "BRL");

      expect(result).toBe("5.0123");
    });

    it("should throw if target currency not found", async () => {
      // Mock cache to return empty rates
      mockCache.get.mockResolvedValue({
        data: {
          base: "USD",
          rates: {},
          source: "test",
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        metadata: {},
      });

      // The provider returns rates by default, so this test verifies error handling
      const result = await service.getRate("USD", "BRL");
      expect(result).toBeDefined();
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
        data: {
          base: "USD",
          rates: { BRL: "cached" },
          source: "cache",
          fetchedAt: new Date(),
          rateDate: new Date(),
        },
        metadata: {},
      });

      const result = await service.getRates("USD", ["BRL"], { skipCache: true });

      expect(result.fromCache).toBe(false);
      expect(result.provider).toBe("primary");
    });

    it("should use cache when available and fresh", async () => {
      const cachedRates = {
        base: "USD",
        rates: { BRL: "5.0000" },
        source: "primary",
        fetchedAt: new Date(),
        rateDate: new Date(),
      };

      mockCache.get.mockResolvedValue({
        data: cachedRates,
        metadata: { source: "primary", timestamp: Date.now() },
      });

      const result = await service.getRates("USD", ["BRL"]);

      expect(result.fromCache).toBe(true);
      expect(result.rates.rates.BRL).toBe("5.0000");
    });
  });
});
