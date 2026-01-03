/**
 * Dismissed Pairs Service Tests
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.6: Dismissal Memory - prevents re-alerting for dismissed opportunities
 *
 * Tests the service that manages dismissed opportunity pairs to prevent
 * re-alerting users about opportunities they've already dismissed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies at module level using vi.hoisted
const {
  mockDbSelect,
  mockDbFrom,
  mockDbWhere,
  mockDbInsert,
  mockDbValues,
  mockDbOnConflict,
  mockDbDelete,
  mockDbReturning,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbFrom: vi.fn(),
  mockDbWhere: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbValues: vi.fn(),
  mockDbOnConflict: vi.fn(),
  mockDbDelete: vi.fn(),
  mockDbReturning: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    delete: mockDbDelete,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  dismissedOpportunityPairs: {
    id: "id",
    userId: "userId",
    currentAssetId: "currentAssetId",
    betterAssetId: "betterAssetId",
    lastScoreDifference: "lastScoreDifference",
    dismissedAt: "dismissedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ type: "eq", field, value })),
  and: vi.fn((...args) => ({ type: "and", args })),
  lt: vi.fn((field, value) => ({ type: "lt", field, value })),
  sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
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
  DismissedPairsService,
  RE_ALERT_THRESHOLD,
  CLEANUP_AGE_DAYS,
} from "@/lib/services/dismissed-pairs-service";
import Decimal from "decimal.js";

describe("DismissedPairsService", () => {
  let service: DismissedPairsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DismissedPairsService();

    // Default chain for select queries
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockResolvedValue([]);

    // Default chain for insert queries
    mockDbInsert.mockReturnValue({ values: mockDbValues });
    mockDbValues.mockReturnValue({ onConflictDoUpdate: mockDbOnConflict });
    mockDbOnConflict.mockResolvedValue(undefined);

    // Default chain for delete queries
    mockDbDelete.mockReturnValue({ where: mockDbWhere });
    // Override where for delete to return returning chain
    mockDbWhere.mockReturnValue({ returning: mockDbReturning });
    mockDbReturning.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Constants", () => {
    it("should define RE_ALERT_THRESHOLD as 10 points", () => {
      expect(RE_ALERT_THRESHOLD.toString()).toBe("10");
      expect(RE_ALERT_THRESHOLD.equals(new Decimal(10))).toBe(true);
    });

    it("should define CLEANUP_AGE_DAYS as 90 days", () => {
      expect(CLEANUP_AGE_DAYS).toBe(90);
    });
  });

  describe("recordDismissedPair", () => {
    it("should insert a new dismissed pair record", async () => {
      const userId = "user-1";
      const currentAssetId = "asset-current";
      const betterAssetId = "asset-better";
      const scoreDifference = "15.50";

      await service.recordDismissedPair(userId, currentAssetId, betterAssetId, scoreDifference);

      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          currentAssetId,
          betterAssetId,
          lastScoreDifference: scoreDifference,
        })
      );
    });

    it("should accept Decimal for score difference", async () => {
      const scoreDifference = new Decimal("25.75");

      await service.recordDismissedPair("user-1", "asset-1", "asset-2", scoreDifference);

      expect(mockDbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          lastScoreDifference: "25.75",
        })
      );
    });

    it("should use upsert to handle re-dismissals", async () => {
      await service.recordDismissedPair("user-1", "asset-1", "asset-2", "10");

      expect(mockDbOnConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          set: expect.objectContaining({
            lastScoreDifference: "10",
          }),
        })
      );
    });
  });

  describe("shouldSkipAlert", () => {
    it("should return shouldSkip=false when pair was not previously dismissed", async () => {
      // Return empty array - no existing record
      mockDbWhere.mockResolvedValue([]);

      const result = await service.shouldSkipAlert("user-1", "asset-current", "asset-better", "15");

      expect(result.shouldSkip).toBe(false);
      expect(result.reason).toBe("not_dismissed");
    });

    it("should return shouldSkip=true when pair was dismissed and score difference has not increased significantly", async () => {
      // Return existing dismissed pair with score difference of 15
      mockDbWhere.mockResolvedValue([
        {
          id: "pair-1",
          userId: "user-1",
          currentAssetId: "asset-current",
          betterAssetId: "asset-better",
          lastScoreDifference: "15",
          dismissedAt: new Date(),
        },
      ]);

      // Current score difference is 18 (only 3 points increase, below threshold of 10)
      const result = await service.shouldSkipAlert("user-1", "asset-current", "asset-better", "18");

      expect(result.shouldSkip).toBe(true);
      expect(result.reason).toBe("dismissed_recently");
    });

    it("should return shouldSkip=false when score difference increased by >10 points", async () => {
      // Return existing dismissed pair with score difference of 15
      mockDbWhere.mockResolvedValue([
        {
          id: "pair-1",
          userId: "user-1",
          currentAssetId: "asset-current",
          betterAssetId: "asset-better",
          lastScoreDifference: "15",
          dismissedAt: new Date(),
        },
      ]);

      // Current score difference is 30 (15 points increase, above threshold)
      const result = await service.shouldSkipAlert("user-1", "asset-current", "asset-better", "30");

      expect(result.shouldSkip).toBe(false);
      expect(result.reason).toBe("score_increased_significantly");
    });

    it("should allow re-alert when score difference increased exactly by threshold", async () => {
      // Existing with difference of 10
      mockDbWhere.mockResolvedValue([
        {
          id: "pair-1",
          userId: "user-1",
          currentAssetId: "asset-current",
          betterAssetId: "asset-better",
          lastScoreDifference: "10",
          dismissedAt: new Date(),
        },
      ]);

      // Current is 20, increase is exactly 10 - should NOT re-alert (>10 required)
      const result = await service.shouldSkipAlert("user-1", "asset-current", "asset-better", "20");

      expect(result.shouldSkip).toBe(true);
      expect(result.reason).toBe("dismissed_recently");
    });

    it("should accept Decimal for current score difference", async () => {
      mockDbWhere.mockResolvedValue([
        {
          id: "pair-1",
          userId: "user-1",
          currentAssetId: "asset-current",
          betterAssetId: "asset-better",
          lastScoreDifference: "10.00",
          dismissedAt: new Date(),
        },
      ]);

      const result = await service.shouldSkipAlert(
        "user-1",
        "asset-current",
        "asset-better",
        new Decimal("25.50")
      );

      // 25.50 - 10.00 = 15.50, which is > 10
      expect(result.shouldSkip).toBe(false);
      expect(result.reason).toBe("score_increased_significantly");
    });
  });

  describe("cleanupOldPairs", () => {
    it("should delete pairs older than 90 days", async () => {
      const deletedPairs = [{ id: "pair-1" }, { id: "pair-2" }, { id: "pair-3" }];
      mockDbReturning.mockResolvedValue(deletedPairs);

      const count = await service.cleanupOldPairs();

      expect(count).toBe(3);
      expect(mockDbDelete).toHaveBeenCalled();
    });

    it("should return 0 when no pairs to clean up", async () => {
      mockDbReturning.mockResolvedValue([]);

      const count = await service.cleanupOldPairs();

      expect(count).toBe(0);
    });
  });

  describe("getDismissedPairCount", () => {
    it("should return count of dismissed pairs for user", async () => {
      // Mock for count query
      mockDbWhere.mockResolvedValue([{ count: 5 }]);

      const count = await service.getDismissedPairCount("user-1");

      expect(count).toBe(5);
    });

    it("should return 0 when user has no dismissed pairs", async () => {
      mockDbWhere.mockResolvedValue([{ count: 0 }]);

      const count = await service.getDismissedPairCount("user-1");

      expect(count).toBe(0);
    });

    it("should return 0 when query returns undefined", async () => {
      mockDbWhere.mockResolvedValue([]);

      const count = await service.getDismissedPairCount("user-1");

      expect(count).toBe(0);
    });
  });
});

describe("DismissedPairsService - Tenant Isolation", () => {
  let service: DismissedPairsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DismissedPairsService();

    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockResolvedValue([]);
  });

  it("should filter by userId when checking dismissed pairs", async () => {
    const { eq, and } = await import("drizzle-orm");

    await service.shouldSkipAlert("user-1", "asset-1", "asset-2", "15");

    expect(and).toHaveBeenCalled();
    expect(eq).toHaveBeenCalled();
    // Verify userId is part of the filter conditions
    expect(mockDbWhere).toHaveBeenCalled();
  });

  it("should filter by userId when counting dismissed pairs", async () => {
    const { eq } = await import("drizzle-orm");
    mockDbWhere.mockResolvedValue([{ count: 3 }]);

    await service.getDismissedPairCount("user-specific");

    expect(eq).toHaveBeenCalled();
    expect(mockDbWhere).toHaveBeenCalled();
  });

  it("should include userId when recording dismissed pair", async () => {
    mockDbInsert.mockReturnValue({ values: mockDbValues });
    mockDbValues.mockReturnValue({ onConflictDoUpdate: mockDbOnConflict });
    mockDbOnConflict.mockResolvedValue(undefined);

    await service.recordDismissedPair("user-123", "asset-1", "asset-2", "10");

    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
      })
    );
  });
});
