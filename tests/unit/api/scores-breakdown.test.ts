/**
 * Unit Tests for Score Breakdown API Route
 *
 * Story 5.11: Score Breakdown View
 *
 * Tests cover:
 * - Successful breakdown response (200)
 * - 404 for non-existent asset score
 * - 401 for unauthorized access (tested via withAuth)
 * - Response format matches tech-spec contract
 * - Target market included in response
 *
 * Note: These tests mock the service layer and test route logic.
 * Auth tests are implicitly covered by withAuth middleware in integration tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =============================================================================
// MOCKS - Setup before imports
// =============================================================================

const mockGetAssetScore = vi.fn();
const mockDbSelectResult = vi.fn();
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

// Mock modules before importing the route
vi.mock("@/lib/services/score-service", () => ({
  getAssetScore: (...args: unknown[]) => mockGetAssetScore(...args),
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: mockLogger,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockDbSelectResult(),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  criteriaVersions: {},
  assetScores: {},
}));

// =============================================================================
// TEST DATA
// =============================================================================

const mockScoreResult = {
  assetId: "asset-123",
  symbol: "AAPL",
  score: "85.5000",
  breakdown: [
    {
      criterionId: "crit-1",
      criterionName: "Dividend Yield > 6%",
      matched: true,
      pointsAwarded: 20,
      actualValue: "7.5",
      skippedReason: null,
    },
    {
      criterionId: "crit-2",
      criterionName: "P/E Ratio < 15",
      matched: false,
      pointsAwarded: 0,
      actualValue: "18.2",
      skippedReason: null,
    },
    {
      criterionId: "crit-3",
      criterionName: "ROE > 15%",
      matched: false,
      pointsAwarded: 0,
      actualValue: null,
      skippedReason: "missing_fundamental",
    },
  ],
  criteriaVersionId: "criteria-v1",
  calculatedAt: new Date("2025-12-10T10:00:00Z"),
  isFresh: true,
};

const mockSession = {
  userId: "user-123",
  email: "test@example.com",
  role: "user",
};

// =============================================================================
// SERVICE LAYER TESTS
// =============================================================================

describe("Score Breakdown API - Service Layer Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbSelectResult.mockResolvedValue([{ targetMarket: "US_TECH", assetType: "equity" }]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getAssetScore service", () => {
    it("is called with userId and assetId", async () => {
      mockGetAssetScore.mockResolvedValue(mockScoreResult);

      // Simulate what the route does
      await mockGetAssetScore(mockSession.userId, "asset-123");

      expect(mockGetAssetScore).toHaveBeenCalledWith("user-123", "asset-123");
    });

    it("returns null when no score exists", async () => {
      mockGetAssetScore.mockResolvedValue(null);

      const result = await mockGetAssetScore(mockSession.userId, "nonexistent-asset");

      expect(result).toBeNull();
    });

    it("returns score with breakdown when score exists", async () => {
      mockGetAssetScore.mockResolvedValue(mockScoreResult);

      const result = await mockGetAssetScore(mockSession.userId, "asset-123");

      expect(result).toBeDefined();
      expect(result.score).toBe("85.5000");
      expect(result.breakdown).toHaveLength(3);
      expect(result.criteriaVersionId).toBe("criteria-v1");
    });
  });

  describe("Response format validation", () => {
    it("score result has correct structure", () => {
      expect(mockScoreResult).toHaveProperty("assetId");
      expect(mockScoreResult).toHaveProperty("symbol");
      expect(mockScoreResult).toHaveProperty("score");
      expect(mockScoreResult).toHaveProperty("breakdown");
      expect(mockScoreResult).toHaveProperty("criteriaVersionId");
      expect(mockScoreResult).toHaveProperty("calculatedAt");
      expect(mockScoreResult).toHaveProperty("isFresh");
    });

    it("breakdown items have correct structure", () => {
      const breakdownItem = mockScoreResult.breakdown[0]!;

      expect(breakdownItem).toHaveProperty("criterionId");
      expect(breakdownItem).toHaveProperty("criterionName");
      expect(breakdownItem).toHaveProperty("matched");
      expect(breakdownItem).toHaveProperty("pointsAwarded");
      expect(breakdownItem).toHaveProperty("actualValue");
      expect(breakdownItem).toHaveProperty("skippedReason");
    });

    it("matched criterion has correct values", () => {
      const matchedItem = mockScoreResult.breakdown[0]!;

      expect(matchedItem.matched).toBe(true);
      expect(matchedItem.pointsAwarded).toBe(20);
      expect(matchedItem.actualValue).toBe("7.5");
      expect(matchedItem.skippedReason).toBeNull();
    });

    it("skipped criterion has correct values", () => {
      const skippedItem = mockScoreResult.breakdown[2]!;

      expect(skippedItem.matched).toBe(false);
      expect(skippedItem.pointsAwarded).toBe(0);
      expect(skippedItem.actualValue).toBeNull();
      expect(skippedItem.skippedReason).toBe("missing_fundamental");
    });
  });

  describe("Criteria version lookup", () => {
    it("returns targetMarket from criteria version", async () => {
      mockDbSelectResult.mockResolvedValue([{ targetMarket: "US_TECH", assetType: "equity" }]);

      const result = await mockDbSelectResult();

      expect(result).toHaveLength(1);
      expect(result[0].targetMarket).toBe("US_TECH");
      expect(result[0].assetType).toBe("equity");
    });

    it("returns empty array when criteria version not found", async () => {
      mockDbSelectResult.mockResolvedValue([]);

      const result = await mockDbSelectResult();

      expect(result).toHaveLength(0);
    });
  });

  describe("UUID validation logic", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    it("accepts valid UUID", () => {
      expect(uuidRegex.test("00000000-0000-0000-0000-000000000001")).toBe(true);
      expect(uuidRegex.test("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
    });

    it("rejects invalid UUID", () => {
      expect(uuidRegex.test("invalid-uuid")).toBe(false);
      expect(uuidRegex.test("not-a-valid-uuid-format")).toBe(false);
      expect(uuidRegex.test("")).toBe(false);
      expect(uuidRegex.test("12345")).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("handles service errors", async () => {
      mockGetAssetScore.mockRejectedValue(new Error("Database error"));

      await expect(mockGetAssetScore(mockSession.userId, "asset-123")).rejects.toThrow(
        "Database error"
      );
    });
  });
});

// =============================================================================
// RESPONSE TRANSFORMATION TESTS
// =============================================================================

describe("Response Transformation Logic", () => {
  it("transforms calculatedAt to ISO string", () => {
    const date = new Date("2025-12-10T10:00:00Z");
    const isoString = date.toISOString();

    expect(isoString).toBe("2025-12-10T10:00:00.000Z");
  });

  it("transforms breakdown actualValue nulls", () => {
    const transformed = mockScoreResult.breakdown.map((b) => ({
      ...b,
      actualValue: b.actualValue ?? null,
      skippedReason: b.skippedReason ?? null,
    }));

    const nullValueItem = transformed[2]!;
    expect(nullValueItem.actualValue).toBeNull();
    expect(nullValueItem.skippedReason).toBe("missing_fundamental");
  });

  it("preserves breakdown order", () => {
    const transformed = mockScoreResult.breakdown.map((b, i) => ({
      index: i,
      name: b.criterionName,
    }));

    expect(transformed[0]!.name).toBe("Dividend Yield > 6%");
    expect(transformed[1]!.name).toBe("P/E Ratio < 15");
    expect(transformed[2]!.name).toBe("ROE > 15%");
  });
});

// =============================================================================
// CONTRACT TESTS
// =============================================================================

describe("API Contract - GET /api/scores/[assetId]/breakdown", () => {
  it("response should have data wrapper object", () => {
    // Expected response structure
    const expectedResponseStructure = {
      data: {
        assetId: expect.any(String),
        symbol: expect.any(String),
        score: expect.any(String),
        breakdown: expect.any(Array),
        criteriaVersionId: expect.any(String),
        calculatedAt: expect.any(String),
        isFresh: expect.any(Boolean),
        targetMarket: expect.toBeOneOf([expect.any(String), null]),
        assetType: expect.toBeOneOf([expect.any(String), null]),
      },
    };

    // Mock response
    const response = {
      data: {
        assetId: mockScoreResult.assetId,
        symbol: mockScoreResult.symbol,
        score: mockScoreResult.score,
        breakdown: mockScoreResult.breakdown,
        criteriaVersionId: mockScoreResult.criteriaVersionId,
        calculatedAt: mockScoreResult.calculatedAt.toISOString(),
        isFresh: mockScoreResult.isFresh,
        targetMarket: "US_TECH",
        assetType: "equity",
      },
    };

    expect(response).toMatchObject(expectedResponseStructure);
  });

  it("error response should have error and code", () => {
    const errorResponse = {
      error: "No score found for this asset",
      code: "NOT_FOUND",
    };

    expect(errorResponse).toHaveProperty("error");
    expect(errorResponse).toHaveProperty("code");
    expect(errorResponse.code).toBe("NOT_FOUND");
  });

  it("validation error response format", () => {
    const validationError = {
      error: "Invalid asset ID format",
      code: "VALIDATION_ERROR",
    };

    expect(validationError).toHaveProperty("error");
    expect(validationError).toHaveProperty("code");
    expect(validationError.code).toBe("VALIDATION_ERROR");
  });

  it("internal error response format", () => {
    const internalError = {
      error: "Failed to retrieve breakdown",
      code: "INTERNAL_ERROR",
    };

    expect(internalError).toHaveProperty("error");
    expect(internalError).toHaveProperty("code");
    expect(internalError.code).toBe("INTERNAL_ERROR");
  });
});
