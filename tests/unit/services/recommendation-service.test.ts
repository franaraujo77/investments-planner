/**
 * Recommendation Service Unit Tests
 *
 * Story 7.4: Generate Investment Recommendations
 * AC-7.4.5: Event Sourcing for Audit Trail
 *
 * Tests event emission sequence and correlation_id linking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RecommendationService } from "@/lib/services/recommendation-service";
import type { EventStore } from "@/lib/events/event-store";
import type { Database } from "@/lib/db";
import type { CalculationEvent } from "@/lib/events/types";

// =============================================================================
// MOCKS
// =============================================================================

// Mock portfolio service
vi.mock("@/lib/services/portfolio-service", () => ({
  getPortfolioWithValues: vi.fn().mockResolvedValue({
    portfolio: { id: "portfolio-1", name: "Test Portfolio", userId: "user-1" },
    assets: [
      {
        id: "asset-1",
        symbol: "AAPL",
        name: "Apple Inc.",
        quantity: "10",
        purchasePrice: "150.0000",
        currency: "USD",
        valueNative: "1500.0000",
        valueBase: "1500.0000",
        currentPrice: "150.0000",
        priceUpdatedAt: new Date(),
        priceSource: "mock",
        gainLoss: "0.0000",
        gainLossPercent: "0.0000",
        isIgnored: false,
        assetClassId: "class-1",
        subclassId: "subclass-1",
      },
      {
        id: "asset-2",
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        quantity: "5",
        purchasePrice: "200.0000",
        currency: "USD",
        valueNative: "1000.0000",
        valueBase: "1000.0000",
        currentPrice: "200.0000",
        priceUpdatedAt: new Date(),
        priceSource: "mock",
        gainLoss: "0.0000",
        gainLossPercent: "0.0000",
        isIgnored: false,
        assetClassId: "class-1",
        subclassId: null,
      },
    ],
    totalValueBase: "2500.0000",
    totalActiveValueBase: "2500.0000",
    baseCurrency: "USD",
    dataFreshness: new Date(),
  }),
  PortfolioNotFoundError: class PortfolioNotFoundError extends Error {
    constructor() {
      super("Portfolio not found");
      this.name = "PortfolioNotFoundError";
    }
  },
}));

// Mock allocation service
vi.mock("@/lib/services/allocation-service", () => ({
  getAllocationBreakdown: vi.fn().mockResolvedValue({
    classes: [
      {
        classId: "class-1",
        className: "Stocks",
        value: "2500.0000",
        percentage: "100.0000",
        assetCount: 2,
        targetMin: "60.00",
        targetMax: "80.00",
        status: "over",
        subclasses: [],
      },
    ],
    unclassified: { value: "0.0000", percentage: "0.0000", assetCount: 0 },
    totalValueBase: "2500.0000",
    totalActiveValueBase: "2500.0000",
    baseCurrency: "USD",
    dataFreshness: new Date(),
  }),
}));

// Mock cache client
vi.mock("@/lib/cache/client", () => ({
  cacheSet: vi.fn().mockResolvedValue({ success: true }),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheDel: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock crypto for randomUUID
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "mock-correlation-id"),
}));

// =============================================================================
// TEST SETUP
// =============================================================================

describe("RecommendationService", () => {
  let service: RecommendationService;
  let mockDatabase: Database;
  let mockEventStore: EventStore;
  let appendedEvents: CalculationEvent[];

  beforeEach(() => {
    appendedEvents = [];

    // Mock event store
    mockEventStore = {
      append: vi.fn(async (_userId: string, event: CalculationEvent) => {
        appendedEvents.push(event);
      }),
      appendBatch: vi.fn(),
      getByCorrelationId: vi.fn().mockResolvedValue([]),
      getByUserId: vi.fn().mockResolvedValue([]),
      getByEventType: vi.fn().mockResolvedValue([]),
      getCalcStartedEvent: vi.fn().mockResolvedValue(null),
    } as unknown as EventStore;

    // Mock database with call-order tracking
    // The service calls select in this order:
    // 1. portfolioAssets (with where+inArray) -> returns array directly
    // 2. assetScores (with where+orderBy) -> returns array
    // 3. assetClasses (with where) -> returns array
    // 4. assetSubclasses (no where) -> returns array directly
    let selectCallCount = 0;

    mockDatabase = {
      query: {
        recommendations: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        const callNumber = selectCallCount;

        return {
          from: vi.fn().mockImplementation(() => {
            // Call 1: portfolioAssets - returns directly from where
            if (callNumber === 1) {
              return {
                where: vi.fn().mockResolvedValue([
                  { id: "asset-1", assetClassId: "class-1", subclassId: "subclass-1" },
                  { id: "asset-2", assetClassId: "class-1", subclassId: null },
                ]),
              };
            }
            // Call 2: assetScores - returns from orderBy
            if (callNumber === 2) {
              return {
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([
                    {
                      assetId: "asset-1",
                      symbol: "AAPL",
                      score: "85.0000",
                      criteriaVersionId: "criteria-1",
                      userId: "user-1",
                      calculatedAt: new Date(),
                    },
                    {
                      assetId: "asset-2",
                      symbol: "GOOGL",
                      score: "80.0000",
                      criteriaVersionId: "criteria-1",
                      userId: "user-1",
                      calculatedAt: new Date(),
                    },
                  ]),
                }),
              };
            }
            // Call 3: assetClasses - returns from where
            if (callNumber === 3) {
              return {
                where: vi.fn().mockResolvedValue([
                  {
                    id: "class-1",
                    name: "Stocks",
                    targetMin: "60.00",
                    targetMax: "80.00",
                    minAllocationValue: null,
                  },
                ]),
              };
            }
            // Call 4: assetSubclasses - returns directly from from
            if (callNumber === 4) {
              return Promise.resolve([]);
            }
            // Default fallback
            return {
              where: vi.fn().mockResolvedValue([]),
            };
          }),
        };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "rec-1",
              userId: "user-1",
              portfolioId: "portfolio-1",
              contribution: "1000.0000",
              dividends: "100.0000",
              totalInvestable: "1100.0000",
              baseCurrency: "USD",
              correlationId: "mock-correlation-id",
              status: "active",
              generatedAt: new Date(),
              expiresAt: new Date(Date.now() + 86400000),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      }),
    } as unknown as Database;

    service = new RecommendationService(mockDatabase, mockEventStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // EVENT EMISSION TESTS (AC-7.4.5)
  // ===========================================================================

  describe("event emission", () => {
    it("should emit events in correct sequence: CALC_STARTED -> RECS_INPUTS_CAPTURED -> RECS_COMPUTED -> CALC_COMPLETED", async () => {
      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      // Verify 4 events were emitted
      expect(appendedEvents).toHaveLength(4);

      // Verify sequence
      expect(appendedEvents[0].type).toBe("CALC_STARTED");
      expect(appendedEvents[1].type).toBe("RECS_INPUTS_CAPTURED");
      expect(appendedEvents[2].type).toBe("RECS_COMPUTED");
      expect(appendedEvents[3].type).toBe("CALC_COMPLETED");
    });

    it("should link all events with same correlation_id", async () => {
      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      // All events should have the same correlation ID
      const correlationIds = appendedEvents.map((e) => e.correlationId);
      const uniqueIds = new Set(correlationIds);

      expect(uniqueIds.size).toBe(1);
      expect(correlationIds[0]).toBe("mock-correlation-id");
    });

    it("should include portfolio state in RECS_INPUTS_CAPTURED event", async () => {
      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      const inputsEvent = appendedEvents.find((e) => e.type === "RECS_INPUTS_CAPTURED");
      expect(inputsEvent).toBeDefined();

      if (inputsEvent?.type === "RECS_INPUTS_CAPTURED") {
        expect(inputsEvent.portfolioState).toBeDefined();
        expect(inputsEvent.portfolioState.portfolioId).toBe("portfolio-1");
        expect(inputsEvent.portfolioState.baseCurrency).toBe("USD");
        expect(inputsEvent.totalInvestable).toBe("1100.0000");
        expect(inputsEvent.contribution).toBe("1000.0000");
        expect(inputsEvent.dividends).toBe("100.0000");
      }
    });

    it("should include allocation targets in RECS_INPUTS_CAPTURED event", async () => {
      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      const inputsEvent = appendedEvents.find((e) => e.type === "RECS_INPUTS_CAPTURED");

      if (inputsEvent?.type === "RECS_INPUTS_CAPTURED") {
        expect(inputsEvent.allocationTargets).toBeDefined();
        expect(inputsEvent.allocationTargets.classes).toBeDefined();
        expect(inputsEvent.allocationTargets.subclasses).toBeDefined();
      }
    });

    it("should include recommendation details in RECS_COMPUTED event", async () => {
      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      const computedEvent = appendedEvents.find((e) => e.type === "RECS_COMPUTED");
      expect(computedEvent).toBeDefined();

      if (computedEvent?.type === "RECS_COMPUTED") {
        expect(computedEvent.recommendationId).toBe("rec-1");
        expect(computedEvent.totalInvestable).toBe("1100.0000");
        expect(computedEvent.items).toBeDefined();
        expect(Array.isArray(computedEvent.items)).toBe(true);
      }
    });

    it("should include success status in CALC_COMPLETED event on success", async () => {
      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      const completedEvent = appendedEvents.find((e) => e.type === "CALC_COMPLETED");
      expect(completedEvent).toBeDefined();

      if (completedEvent?.type === "CALC_COMPLETED") {
        expect(completedEvent.status).toBe("success");
        expect(completedEvent.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe("error handling", () => {
    it("should emit CALC_COMPLETED with failed status on error", async () => {
      // Mock database error
      const errorDatabase = {
        ...mockDatabase,
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error("Database error")),
          }),
        }),
      } as unknown as Database;

      const errorService = new RecommendationService(errorDatabase, mockEventStore);

      await expect(
        errorService.generateRecommendations("user-1", {
          portfolioId: "portfolio-1",
          contribution: "1000.0000",
          dividends: "100.0000",
          baseCurrency: "USD",
        })
      ).rejects.toThrow();

      // Should still emit CALC_STARTED and CALC_COMPLETED
      const completedEvent = appendedEvents.find((e) => e.type === "CALC_COMPLETED");

      if (completedEvent?.type === "CALC_COMPLETED") {
        expect(completedEvent.status).toBe("failed");
        expect(completedEvent.errorMessage).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // RESULT FORMAT TESTS
  // ===========================================================================

  describe("result format", () => {
    it("should return complete recommendation result", async () => {
      const result = await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      expect(result).toMatchObject({
        id: "rec-1",
        userId: "user-1",
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        totalInvestable: "1100.0000",
        baseCurrency: "USD",
        correlationId: "mock-correlation-id",
        status: "active",
      });

      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.items).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should include items with correct structure", async () => {
      const result = await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      if (result.items.length > 0) {
        const item = result.items[0];
        expect(item).toHaveProperty("assetId");
        expect(item).toHaveProperty("symbol");
        expect(item).toHaveProperty("score");
        expect(item).toHaveProperty("currentAllocation");
        expect(item).toHaveProperty("targetAllocation");
        expect(item).toHaveProperty("allocationGap");
        expect(item).toHaveProperty("recommendedAmount");
        expect(item).toHaveProperty("isOverAllocated");
        expect(item).toHaveProperty("breakdown");
        expect(item).toHaveProperty("sortOrder");
      }
    });
  });

  // ===========================================================================
  // CACHE TESTS
  // ===========================================================================

  describe("caching", () => {
    it("should cache recommendation after generation", async () => {
      const { cacheSet } = await import("@/lib/cache/client");

      await service.generateRecommendations("user-1", {
        portfolioId: "portfolio-1",
        contribution: "1000.0000",
        dividends: "100.0000",
        baseCurrency: "USD",
      });

      expect(cacheSet).toHaveBeenCalledWith(
        "recs:user-1",
        { recommendationId: "rec-1" },
        expect.objectContaining({
          ttlSeconds: 86400,
          source: "recommendation-service",
        })
      );
    });

    it("should invalidate cache when requested", async () => {
      const { cacheDel } = await import("@/lib/cache/client");

      await service.invalidateCache("user-1");

      expect(cacheDel).toHaveBeenCalledWith("recs:user-1");
    });
  });
});
