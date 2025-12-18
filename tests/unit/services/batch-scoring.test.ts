/**
 * Batch Scoring Service Tests
 *
 * Story 8.2: Overnight Scoring Job
 * AC-8.2.3: User Portfolio Processing
 * AC-8.2.4: Event Sourcing Integration (4 events per user)
 * AC-8.2.5: Graceful Error Handling
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from "vitest";
import type { CriterionRule } from "@/lib/db/schema";

// Mock logger first
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock event store
vi.mock("@/lib/events/event-store", () => ({
  eventStore: {
    append: vi.fn().mockResolvedValue({ id: "event-1" }),
  },
  EventStore: vi.fn(),
}));

// Mock scoring engine
vi.mock("@/lib/calculations/scoring-engine", () => ({
  calculateScores: vi.fn().mockReturnValue([
    {
      assetId: "asset-1",
      symbol: "AAPL",
      score: "75.0000",
      criteriaVersionId: "criteria-1",
      calculatedAt: new Date(),
      breakdown: [
        {
          criterionId: "criterion-1",
          criterionName: "P/E Ratio Check",
          matched: true,
          pointsAwarded: 10,
          actualValue: "15.5",
          skippedReason: null,
        },
      ],
    },
  ]),
}));

// Mock database with chainable mock
vi.mock("@/lib/db", () => {
  const chain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    onConflictDoUpdate: vi.fn(),
  };
  // Setup chain behavior
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockResolvedValue([]); // For fundamentals query
  chain.insert.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.onConflictDoUpdate.mockResolvedValue([{ id: "score-1" }]);
  return { db: chain };
});

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  inArray: vi.fn(),
  desc: vi.fn(),
}));

// Mock schema
vi.mock("@/lib/db/schema", () => ({
  assetScores: {},
  scoreHistory: {},
  assetFundamentals: {},
}));

import {
  BatchScoringService,
  type ExchangeRatesMap,
  type PricesMap,
} from "@/lib/services/batch-scoring-service";
import type { ActiveUserForScoring } from "@/lib/services/user-query-service";
import { logger } from "@/lib/telemetry/logger";
import { eventStore } from "@/lib/events/event-store";

describe("BatchScoringService", () => {
  let service: BatchScoringService;

  const mockCriteriaRules: CriterionRule[] = [
    {
      id: "criterion-1",
      name: "P/E Ratio Check",
      metric: "pe_ratio",
      operator: "lt",
      value: "20",
      points: 10,
      requiredFundamentals: ["pe_ratio"],
      sortOrder: 0,
    },
  ];

  const mockUser: ActiveUserForScoring = {
    userId: "user-1",
    email: "test@example.com",
    baseCurrency: "USD",
    portfolioId: "portfolio-1",
    portfolioName: "Main Portfolio",
    assets: [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        quantity: "10",
        currency: "USD",
      },
    ],
    criteria: {
      versionId: "criteria-1",
      assetType: "stock",
      targetMarket: "US_TECH",
      rules: mockCriteriaRules,
    },
  };

  const mockContext = {
    exchangeRates: { USD_BRL: "5.0" } as ExchangeRatesMap,
    prices: {
      AAPL: {
        price: "150.00",
        currency: "USD",
        fetchedAt: new Date().toISOString(),
        source: "test-provider",
      },
    } as PricesMap,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchScoringService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("processUserBatch", () => {
    it("should process users and return batch result", async () => {
      const result = await service.processUserBatch([mockUser], mockContext);

      expect(result.usersProcessed).toBe(1);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.results).toHaveLength(1);
    });

    it("should emit events for successful processing (AC-8.2.4)", async () => {
      const appendMock = eventStore.append as MockedFunction<typeof eventStore.append>;
      await service.processUserBatch([mockUser], mockContext);

      // Should emit at least CALC_STARTED and CALC_COMPLETED
      expect(appendMock).toHaveBeenCalled();

      const eventTypes = appendMock.mock.calls.map((call) => call[1].type);
      expect(eventTypes).toContain("CALC_STARTED");
    });

    it("should handle users without criteria gracefully (AC-8.2.5)", async () => {
      const userWithNoCriteria: ActiveUserForScoring = {
        ...mockUser,
        userId: "user-2",
        email: "user2@example.com",
        criteria: null,
      };

      const result = await service.processUserBatch([userWithNoCriteria], mockContext);

      // User should be marked as failed due to no criteria
      expect(result.usersProcessed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("criteria");
    });

    it("should handle users with no assets gracefully", async () => {
      const userWithNoAssets: ActiveUserForScoring = {
        ...mockUser,
        userId: "user-3",
        assets: [],
      };

      const result = await service.processUserBatch([userWithNoAssets], mockContext);

      expect(result.usersProcessed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("assets");
    });

    it("should log batch completion", async () => {
      const loggerInfoMock = logger.info as MockedFunction<typeof logger.info>;

      await service.processUserBatch([mockUser], mockContext);

      expect(loggerInfoMock).toHaveBeenCalledWith(
        "Batch processing completed",
        expect.objectContaining({
          usersProcessed: 1,
        })
      );
    });

    it("should return individual user results with correlation IDs", async () => {
      const result = await service.processUserBatch([mockUser], mockContext);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].userId).toBe("user-1");
      expect(result.results[0].correlationId).toBeDefined();
      expect(result.results[0].correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should track timing for each user", async () => {
      const result = await service.processUserBatch([mockUser], mockContext);

      expect(result.results[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("batch processing", () => {
    it("should process multiple users", async () => {
      const users: ActiveUserForScoring[] = [
        mockUser,
        { ...mockUser, userId: "user-2", email: "user2@example.com" },
      ];

      const result = await service.processUserBatch(users, mockContext);

      expect(result.usersProcessed).toBe(2);
    });

    it("should continue after user failure (AC-8.2.5)", async () => {
      const userWithNoCriteria: ActiveUserForScoring = {
        ...mockUser,
        userId: "user-fail",
        email: "fail@example.com",
        criteria: null,
      };

      const users = [userWithNoCriteria, mockUser];
      const result = await service.processUserBatch(users, mockContext);

      // Both users should be processed
      expect(result.usersProcessed).toBe(2);
      // At least one user should fail (the one with no criteria)
      expect(result.usersFailed).toBeGreaterThanOrEqual(1);
      // Results should contain both users
      expect(result.results).toHaveLength(2);
      // First user (no criteria) should definitely fail
      expect(result.results[0].success).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should return failed result for user without criteria", async () => {
      const userWithNoCriteria: ActiveUserForScoring = {
        ...mockUser,
        criteria: null,
      };

      const result = await service.processUserBatch([userWithNoCriteria], mockContext);

      // Result should indicate failure
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBeDefined();
    });
  });
});

describe("Event emission format", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CALC_STARTED should include required fields", async () => {
    const appendMock = eventStore.append as MockedFunction<typeof eventStore.append>;
    const service = new BatchScoringService();

    const testUser: ActiveUserForScoring = {
      userId: "user-1",
      email: "test@example.com",
      baseCurrency: "USD",
      portfolioId: "portfolio-1",
      portfolioName: "Main Portfolio",
      assets: [{ assetId: "asset-1", symbol: "AAPL", quantity: "10", currency: "USD" }],
      criteria: {
        versionId: "criteria-1",
        assetType: "stock",
        targetMarket: "US_TECH",
        rules: [
          {
            id: "criterion-1",
            name: "Test",
            metric: "pe_ratio",
            operator: "lt",
            value: "20",
            points: 10,
            requiredFundamentals: ["pe_ratio"],
            sortOrder: 0,
          },
        ],
      },
    };

    await service.processUserBatch([testUser], {
      exchangeRates: {},
      prices: {},
    });

    const calcStartedCall = appendMock.mock.calls.find((call) => call[1].type === "CALC_STARTED");

    expect(calcStartedCall).toBeDefined();
    expect(calcStartedCall![1]).toMatchObject({
      type: "CALC_STARTED",
      correlationId: expect.any(String),
      userId: "user-1",
      timestamp: expect.any(Date),
    });
  });

  it("should include failed result with error for user without criteria", async () => {
    const service = new BatchScoringService();

    const testUserNoCriteria: ActiveUserForScoring = {
      userId: "user-1",
      email: "test@example.com",
      baseCurrency: "USD",
      portfolioId: "portfolio-1",
      portfolioName: "Main Portfolio",
      assets: [{ assetId: "asset-1", symbol: "AAPL", quantity: "10", currency: "USD" }],
      criteria: null, // Will fail
    };

    const result = await service.processUserBatch([testUserNoCriteria], {
      exchangeRates: {},
      prices: {},
    });

    // Result should capture failure with error details
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain("criteria");
    expect(result.results[0].correlationId).toBeDefined();
  });
});
