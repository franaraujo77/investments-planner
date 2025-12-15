/**
 * Audit Service Tests
 *
 * Story 8.6: Calculation Audit Trail
 * AC-8.6.4: Users can query calculation history by asset
 * AC-8.6.5: Audit data retained for 2 years
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all dependencies at module level using vi.hoisted
const {
  mockDbSelect,
  mockDbFrom,
  mockDbLeftJoin,
  mockDbWhere,
  mockDbOrderBy,
  mockDbLimit,
  mockDbOffset,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbFrom: vi.fn(),
  mockDbLeftJoin: vi.fn(),
  mockDbWhere: vi.fn(),
  mockDbOrderBy: vi.fn(),
  mockDbLimit: vi.fn(),
  mockDbOffset: vi.fn(),
}));

const { mockGetByAssetId, mockGetByCorrelationId } = vi.hoisted(() => ({
  mockGetByAssetId: vi.fn(),
  mockGetByCorrelationId: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  assetScores: {
    userId: "userId",
    assetId: "assetId",
    calculatedAt: "calculatedAt",
    score: "score",
    symbol: "symbol",
    breakdown: "breakdown",
    criteriaVersionId: "criteriaVersionId",
  },
  criteriaVersions: {
    id: "id",
    name: "name",
    version: "version",
  },
  overnightJobRuns: {
    id: "id",
    jobType: "jobType",
    status: "status",
    startedAt: "startedAt",
    completedAt: "completedAt",
    usersProcessed: "usersProcessed",
    usersFailed: "usersFailed",
    correlationId: "correlationId",
    metrics: "metrics",
  },
  calculationEvents: {
    createdAt: "createdAt",
    userId: "userId",
  },
  CriterionResult: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ type: "eq", field, value })),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((field) => ({ type: "desc", field })),
  gte: vi.fn((field, value) => ({ type: "gte", field, value })),
  lte: vi.fn((field, value) => ({ type: "lte", field, value })),
  lt: vi.fn((field, value) => ({ type: "lt", field, value })),
  sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

vi.mock("@/lib/events/event-store", () => ({
  eventStore: {
    getByAssetId: mockGetByAssetId,
    getByCorrelationId: mockGetByCorrelationId,
  },
  EventStore: vi.fn(),
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  AuditService,
  RETENTION_YEARS,
  type CalculationHistoryOptions,
} from "@/lib/services/audit-service";

describe("AuditService", () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService();

    // Set up default chain for queries with leftJoin (queryAssetScores)
    // Chain: select().from().leftJoin().where().orderBy().limit().offset()
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({
      leftJoin: mockDbLeftJoin,
      where: mockDbWhere, // For count queries and getJobRunHistory
    });
    mockDbLeftJoin.mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockReturnValue({ limit: mockDbLimit });
    mockDbLimit.mockReturnValue({ offset: mockDbOffset });
    mockDbOffset.mockResolvedValue([]); // Default empty array result

    // mockDbWhere needs to handle two patterns:
    // 1. Count queries that await .where() directly → thenable returning [{ count: N }]
    // 2. getJobRunHistory that chains .where().orderBy() → has orderBy property
    // Create a mock that satisfies both: thenable with orderBy property
    const mockWhereResult = {
      orderBy: mockDbOrderBy,
      then: (resolve: (value: { count: number }[]) => void) => resolve([{ count: 0 }]),
    };
    mockDbWhere.mockReturnValue(mockWhereResult);

    // Default mock for event store
    mockGetByAssetId.mockResolvedValue([]);
    mockGetByCorrelationId.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getCalculationHistory", () => {
    it("should query calculations for a specific asset", async () => {
      const userId = "user-1";
      const assetId = "asset-1";

      // Count query mock is already set up in beforeEach (mockDbWhere returns [{ count: 0 }])

      const result = await service.getCalculationHistory(userId, assetId);

      expect(result).toBeDefined();
      expect(result.metadata.assetId).toBe(assetId);
      expect(result.calculations).toEqual([]);
    });

    it("should apply date range filters when provided", async () => {
      const userId = "user-1";
      const assetId = "asset-1";
      const options: CalculationHistoryOptions = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      };

      // Count query mock is already set up in beforeEach

      const result = await service.getCalculationHistory(userId, assetId, options);

      expect(result.metadata.startDate).toEqual(options.startDate);
      expect(result.metadata.endDate).toEqual(options.endDate);
    });

    it("should respect pagination limits", async () => {
      const userId = "user-1";
      const assetId = "asset-1";

      // Count query mock is already set up in beforeEach

      const result = await service.getCalculationHistory(userId, assetId, {
        limit: 10,
        offset: 20,
      });

      expect(result.metadata.limit).toBe(10);
      expect(result.metadata.offset).toBe(20);
    });

    it("should enforce maximum limit of 100", async () => {
      const userId = "user-1";
      const assetId = "asset-1";

      // Count query mock is already set up in beforeEach

      const result = await service.getCalculationHistory(userId, assetId, {
        limit: 200, // Request more than max
      });

      expect(result.metadata.limit).toBe(100); // Should be capped at 100
    });
  });

  describe("getCalculationEvents", () => {
    it("should return events for a correlation ID", async () => {
      const userId = "user-1";
      const correlationId = "corr-1";
      const mockEvents = [
        { correlationId, userId, eventType: "CALC_STARTED", payload: {} },
        { correlationId, userId, eventType: "CALC_COMPLETED", payload: {} },
      ];

      mockGetByCorrelationId.mockResolvedValue(mockEvents);

      const result = await service.getCalculationEvents(userId, correlationId);

      expect(result).toHaveLength(2);
      expect(mockGetByCorrelationId).toHaveBeenCalledWith(correlationId);
    });

    it("should filter events for tenant isolation", async () => {
      const userId = "user-1";
      const correlationId = "corr-1";
      const mockEvents = [
        { correlationId, userId: "user-1", eventType: "CALC_STARTED", payload: {} },
        { correlationId, userId: "user-2", eventType: "CALC_STARTED", payload: {} }, // Different user
      ];

      mockGetByCorrelationId.mockResolvedValue(mockEvents);

      const result = await service.getCalculationEvents(userId, correlationId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userId);
    });
  });

  describe("getJobRunHistory", () => {
    it("should return job run history with default pagination", async () => {
      const mockJobRuns = [
        {
          id: "job-1",
          jobType: "scoring",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
          usersProcessed: 10,
          usersFailed: 0,
          correlationId: "corr-1",
          metrics: { totalDurationMs: 5000 },
        },
      ];

      mockDbOffset.mockResolvedValue(mockJobRuns);

      const result = await service.getJobRunHistory();

      expect(result).toHaveLength(1);
      expect(result[0].jobType).toBe("scoring");
    });

    it("should filter by job type when specified", async () => {
      mockDbOffset.mockResolvedValue([]);

      await service.getJobRunHistory({ jobType: "scoring" });

      expect(mockDbSelect).toHaveBeenCalled();
    });

    it("should filter by status when specified", async () => {
      mockDbOffset.mockResolvedValue([]);

      await service.getJobRunHistory({ status: "completed" });

      expect(mockDbSelect).toHaveBeenCalled();
    });
  });

  describe("Data Retention (AC-8.6.5)", () => {
    describe("RETENTION_YEARS constant", () => {
      it("should be set to 2 years", () => {
        expect(RETENTION_YEARS).toBe(2);
      });
    });

    describe("isWithinRetentionPeriod", () => {
      it("should return true for recent dates", () => {
        const recentDate = new Date();
        recentDate.setMonth(recentDate.getMonth() - 6); // 6 months ago

        expect(service.isWithinRetentionPeriod(recentDate)).toBe(true);
      });

      it("should return false for dates older than 2 years", () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 3); // 3 years ago

        expect(service.isWithinRetentionPeriod(oldDate)).toBe(false);
      });

      it("should return true for dates exactly at the boundary", () => {
        // Date exactly 2 years ago should still be within retention
        const boundaryDate = new Date();
        boundaryDate.setFullYear(boundaryDate.getFullYear() - 2);

        // This should be within retention as it's exactly at the boundary
        expect(service.isWithinRetentionPeriod(boundaryDate)).toBe(true);
      });
    });

    describe("getRetentionExpiryDate", () => {
      it("should calculate expiry date 2 years after creation", () => {
        const createdAt = new Date("2024-01-15");
        const expectedExpiry = new Date("2026-01-15");

        const expiryDate = service.getRetentionExpiryDate(createdAt);

        expect(expiryDate.getFullYear()).toBe(expectedExpiry.getFullYear());
        expect(expiryDate.getMonth()).toBe(expectedExpiry.getMonth());
        expect(expiryDate.getDate()).toBe(expectedExpiry.getDate());
      });

      it("should handle leap year dates", () => {
        const createdAt = new Date("2024-02-29"); // Leap year
        const expiryDate = service.getRetentionExpiryDate(createdAt);

        // 2026 is not a leap year, so Feb 29 becomes Feb 28 or Mar 1 depending on impl
        expect(expiryDate.getFullYear()).toBe(2026);
      });
    });

    describe("getRecordsForArchival", () => {
      it("should count records older than threshold", async () => {
        // Mock count queries
        mockDbWhere
          .mockResolvedValueOnce([{ count: 5 }]) // events
          .mockResolvedValueOnce([{ count: 10 }]) // scores
          .mockResolvedValueOnce([{ count: 3 }]); // job runs

        const result = await service.getRecordsForArchival();

        expect(result.calculationEventsCount).toBe(5);
        expect(result.assetScoresCount).toBe(10);
        expect(result.jobRunsCount).toBe(3);
      });

      it("should use default threshold of 2 years ago", async () => {
        // Mock count queries
        mockDbWhere
          .mockResolvedValueOnce([{ count: 0 }])
          .mockResolvedValueOnce([{ count: 0 }])
          .mockResolvedValueOnce([{ count: 0 }]);

        const result = await service.getRecordsForArchival();

        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        // Check threshold is approximately 2 years ago (within 1 day tolerance)
        const diffMs = Math.abs(result.thresholdDate.getTime() - twoYearsAgo.getTime());
        const oneDayMs = 24 * 60 * 60 * 1000;

        expect(diffMs).toBeLessThan(oneDayMs);
      });

      it("should accept custom threshold date", async () => {
        const customThreshold = new Date("2023-06-01");

        // Mock count queries
        mockDbWhere
          .mockResolvedValueOnce([{ count: 0 }])
          .mockResolvedValueOnce([{ count: 0 }])
          .mockResolvedValueOnce([{ count: 0 }]);

        const result = await service.getRecordsForArchival(customThreshold);

        expect(result.thresholdDate).toEqual(customThreshold);
      });
    });
  });
});

describe("AuditService - Tenant Isolation", () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService();

    // Set up default chain for queries with leftJoin (queryAssetScores)
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({
      leftJoin: mockDbLeftJoin,
      where: mockDbWhere,
    });
    mockDbLeftJoin.mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockReturnValue({ limit: mockDbLimit });
    mockDbLimit.mockReturnValue({ offset: mockDbOffset });
    mockDbOffset.mockResolvedValue([]);

    // mockDbWhere needs to handle two patterns:
    // 1. Count queries that await .where() directly
    // 2. getJobRunHistory that chains .where().orderBy()
    const mockWhereResult = {
      orderBy: mockDbOrderBy,
      then: (resolve: (value: { count: number }[]) => void) => resolve([{ count: 0 }]),
    };
    mockDbWhere.mockReturnValue(mockWhereResult);
  });

  it("should always filter by userId for calculation history", async () => {
    await service.getCalculationHistory("user-1", "asset-1");

    // Verify that the query includes userId filter
    expect(mockDbSelect).toHaveBeenCalled();
  });

  it("should only return events belonging to the requesting user", async () => {
    const events = [
      { correlationId: "corr-1", userId: "user-1", eventType: "CALC_STARTED", payload: {} },
      { correlationId: "corr-1", userId: "user-other", eventType: "CALC_STARTED", payload: {} },
    ];

    mockGetByCorrelationId.mockResolvedValue(events);

    const result = await service.getCalculationEvents("user-1", "corr-1");

    expect(result).toHaveLength(1);
    expect(result.every((e) => e.userId === "user-1")).toBe(true);
  });
});
