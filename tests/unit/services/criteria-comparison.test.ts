/**
 * Criteria Comparison Service Unit Tests
 *
 * Story 5.6: Compare Criteria Sets
 *
 * Tests for:
 * - AC-5.6.2: calculateCriteriaDifferences - identifying only_a, only_b, modified, identical
 * - AC-5.6.3: Average score calculations with decimal.js
 * - AC-5.6.4: calculateRankingChanges - ranking change detection
 * - Multi-tenant isolation: Cannot compare criteria from other users
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";
import {
  calculateCriteriaDifferences,
  calculateRankingChanges,
  getSampleAssets,
  compareCriteriaSets,
  MAX_SAMPLE_ASSETS,
} from "@/lib/services/criteria-comparison-service";
import type { CriterionRule } from "@/lib/db/schema";

// =============================================================================
// MOCK DATA
// =============================================================================

const mockUserId = "user-123";
const mockSetAId = "set-a-id";
const mockSetBId = "set-b-id";

// Base criterion template
function createCriterion(overrides: Partial<CriterionRule>): CriterionRule {
  return {
    id: `criterion-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Criterion",
    metric: "dividend_yield",
    operator: "gt" as const,
    value: "5.0",
    value2: null,
    points: 10,
    requiredFundamentals: ["dividend_yield"],
    sortOrder: 0,
    ...overrides,
  };
}

// Mock criteria sets
const criteriaSetA = [
  createCriterion({
    name: "High Dividend",
    metric: "dividend_yield",
    operator: "gt",
    value: "5.0",
    points: 10,
  }),
  createCriterion({ name: "Low PE", metric: "pe_ratio", operator: "lt", value: "15", points: 5 }),
  createCriterion({ name: "Strong ROE", metric: "roe", operator: "gte", value: "18", points: 8 }),
];

const criteriaSetB = [
  createCriterion({
    name: "High Dividend",
    metric: "dividend_yield",
    operator: "gt",
    value: "6.0",
    points: 12,
  }), // Modified
  createCriterion({ name: "Low PE", metric: "pe_ratio", operator: "lt", value: "15", points: 5 }), // Identical
  createCriterion({
    name: "Low Debt",
    metric: "debt_to_equity",
    operator: "lt",
    value: "0.5",
    points: 7,
  }), // Only in B
];

// Mock CriteriaVersion objects for service tests
const mockSetA = {
  id: mockSetAId,
  userId: mockUserId,
  assetType: "stock",
  targetMarket: "BR_BANKS",
  name: "Test Set A",
  criteria: criteriaSetA,
  version: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSetB = {
  id: mockSetBId,
  userId: mockUserId,
  assetType: "stock",
  targetMarket: "BR_BANKS",
  name: "Test Set B",
  criteria: criteriaSetB,
  version: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock storage for controlling test behavior
let mockGetByIdResults: Map<string, typeof mockSetA | null> = new Map();

// Mock getCriteriaById from criteria-service
vi.mock("@/lib/services/criteria-service", () => ({
  getCriteriaById: vi.fn((userId: string, setId: string) => {
    // Simulate user isolation - only return if userId matches
    const result = mockGetByIdResults.get(setId);
    if (result && result.userId !== userId) {
      return Promise.resolve(null);
    }
    return Promise.resolve(result);
  }),
  CriteriaNotFoundError: class CriteriaNotFoundError extends Error {
    constructor() {
      super("Criteria set not found");
      this.name = "CriteriaNotFoundError";
    }
  },
}));

// =============================================================================
// TESTS
// =============================================================================

describe("Criteria Comparison Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdResults = new Map([
      [mockSetAId, mockSetA],
      [mockSetBId, mockSetB],
    ]);
  });

  describe("calculateCriteriaDifferences (AC-5.6.2)", () => {
    it("should identify criteria only in Set A", () => {
      const differences = calculateCriteriaDifferences(criteriaSetA, criteriaSetB);

      const onlyADiffs = differences.filter((d) => d.differenceType === "only_a");
      expect(onlyADiffs).toHaveLength(1);
      expect(onlyADiffs[0]?.criterionName).toBe("Strong ROE");
      expect(onlyADiffs[0]?.inSetA).not.toBeNull();
      expect(onlyADiffs[0]?.inSetB).toBeNull();
    });

    it("should identify criteria only in Set B", () => {
      const differences = calculateCriteriaDifferences(criteriaSetA, criteriaSetB);

      const onlyBDiffs = differences.filter((d) => d.differenceType === "only_b");
      expect(onlyBDiffs).toHaveLength(1);
      expect(onlyBDiffs[0]?.criterionName).toBe("Low Debt");
      expect(onlyBDiffs[0]?.inSetA).toBeNull();
      expect(onlyBDiffs[0]?.inSetB).not.toBeNull();
    });

    it("should identify modified criteria (same name, different config)", () => {
      const differences = calculateCriteriaDifferences(criteriaSetA, criteriaSetB);

      const modifiedDiffs = differences.filter((d) => d.differenceType === "modified");
      expect(modifiedDiffs).toHaveLength(1);
      expect(modifiedDiffs[0]?.criterionName).toBe("High Dividend");
      expect(modifiedDiffs[0]?.inSetA?.value).toBe("5.0");
      expect(modifiedDiffs[0]?.inSetB?.value).toBe("6.0");
      expect(modifiedDiffs[0]?.inSetA?.points).toBe(10);
      expect(modifiedDiffs[0]?.inSetB?.points).toBe(12);
    });

    it("should identify identical criteria", () => {
      const differences = calculateCriteriaDifferences(criteriaSetA, criteriaSetB);

      const identicalDiffs = differences.filter((d) => d.differenceType === "identical");
      expect(identicalDiffs).toHaveLength(1);
      expect(identicalDiffs[0]?.criterionName).toBe("Low PE");
    });

    it("should match criteria by name (case-insensitive)", () => {
      const setA = [createCriterion({ name: "HIGH DIVIDEND", value: "5.0" })];
      const setB = [createCriterion({ name: "high dividend", value: "5.0" })];

      const differences = calculateCriteriaDifferences(setA, setB);

      expect(differences).toHaveLength(1);
      expect(differences[0]?.differenceType).toBe("identical");
    });

    it("should handle empty criteria sets", () => {
      const differences = calculateCriteriaDifferences([], []);
      expect(differences).toHaveLength(0);
    });

    it("should handle one empty set", () => {
      const differences = calculateCriteriaDifferences(criteriaSetA, []);

      expect(differences).toHaveLength(criteriaSetA.length);
      expect(differences.every((d) => d.differenceType === "only_a")).toBe(true);
    });

    it("should sort differences: only_a, only_b, modified, then identical", () => {
      const differences = calculateCriteriaDifferences(criteriaSetA, criteriaSetB);

      // Find indices
      const onlyAIndex = differences.findIndex((d) => d.differenceType === "only_a");
      const onlyBIndex = differences.findIndex((d) => d.differenceType === "only_b");
      const modifiedIndex = differences.findIndex((d) => d.differenceType === "modified");
      const identicalIndex = differences.findIndex((d) => d.differenceType === "identical");

      // Verify order: only_a < only_b < modified < identical
      expect(onlyAIndex).toBeLessThan(onlyBIndex);
      expect(onlyBIndex).toBeLessThan(modifiedIndex);
      expect(modifiedIndex).toBeLessThan(identicalIndex);
    });
  });

  describe("calculateRankingChanges (AC-5.6.4)", () => {
    it("should identify improved rankings (higher rank in Set B)", () => {
      const scoresA = new Map<string, Decimal>([
        ["ITUB4", new Decimal(30)], // Rank 1
        ["BBDC4", new Decimal(20)], // Rank 2
        ["SANB11", new Decimal(10)], // Rank 3
      ]);

      const scoresB = new Map<string, Decimal>([
        ["SANB11", new Decimal(35)], // Rank 1 (was 3)
        ["ITUB4", new Decimal(25)], // Rank 2 (was 1)
        ["BBDC4", new Decimal(15)], // Rank 3 (was 2)
      ]);

      const assets = [
        { symbol: "ITUB4", name: "Itau", fundamentals: {} },
        { symbol: "BBDC4", name: "Bradesco", fundamentals: {} },
        { symbol: "SANB11", name: "Santander", fundamentals: {} },
      ];

      const changes = calculateRankingChanges(scoresA, scoresB, assets);

      // SANB11 improved from 3 to 1
      const sanb = changes.find((c) => c.assetSymbol === "SANB11");
      expect(sanb?.change).toBe("improved");
      expect(sanb?.positionChange).toBe(2);

      // ITUB4 declined from 1 to 2
      const itub = changes.find((c) => c.assetSymbol === "ITUB4");
      expect(itub?.change).toBe("declined");
      expect(itub?.positionChange).toBe(1);
    });

    it("should not include unchanged rankings", () => {
      const scoresA = new Map<string, Decimal>([
        ["ITUB4", new Decimal(30)],
        ["BBDC4", new Decimal(20)],
      ]);

      const scoresB = new Map<string, Decimal>([
        ["ITUB4", new Decimal(35)], // Still rank 1
        ["BBDC4", new Decimal(25)], // Still rank 2
      ]);

      const assets = [
        { symbol: "ITUB4", name: "Itau", fundamentals: {} },
        { symbol: "BBDC4", name: "Bradesco", fundamentals: {} },
      ];

      const changes = calculateRankingChanges(scoresA, scoresB, assets);

      expect(changes).toHaveLength(0);
    });

    it("should sort by position change descending", () => {
      const scoresA = new Map<string, Decimal>([
        ["A", new Decimal(50)], // Rank 1
        ["B", new Decimal(40)], // Rank 2
        ["C", new Decimal(30)], // Rank 3
        ["D", new Decimal(20)], // Rank 4
        ["E", new Decimal(10)], // Rank 5
      ]);

      const scoresB = new Map<string, Decimal>([
        ["E", new Decimal(60)], // Rank 1 (was 5) - 4 position change
        ["D", new Decimal(55)], // Rank 2 (was 4) - 2 position change
        ["C", new Decimal(50)], // Rank 3 (was 3) - no change
        ["B", new Decimal(40)], // Rank 4 (was 2) - 2 position change
        ["A", new Decimal(30)], // Rank 5 (was 1) - 4 position change
      ]);

      const assets = [
        { symbol: "A", name: "A", fundamentals: {} },
        { symbol: "B", name: "B", fundamentals: {} },
        { symbol: "C", name: "C", fundamentals: {} },
        { symbol: "D", name: "D", fundamentals: {} },
        { symbol: "E", name: "E", fundamentals: {} },
      ];

      const changes = calculateRankingChanges(scoresA, scoresB, assets);

      // A and E have 4 position changes (tied), sorted by symbol
      // Then B and D have 2 position changes (tied), sorted by symbol
      // C has 0 changes, filtered out

      expect(changes).toHaveLength(4); // C is unchanged
      expect(changes[0]?.positionChange).toBe(4);
      expect(changes[1]?.positionChange).toBe(4);
      expect(changes[2]?.positionChange).toBe(2);
      expect(changes[3]?.positionChange).toBe(2);

      // Within same position change, sorted alphabetically by symbol
      expect(changes[0]?.assetSymbol).toBe("A");
      expect(changes[1]?.assetSymbol).toBe("E");
    });

    it("should include asset names from sample assets", () => {
      const scoresA = new Map<string, Decimal>([
        ["ITUB4", new Decimal(30)],
        ["BBDC4", new Decimal(10)],
      ]);

      const scoresB = new Map<string, Decimal>([
        ["BBDC4", new Decimal(40)],
        ["ITUB4", new Decimal(20)],
      ]);

      const assets = [
        { symbol: "ITUB4", name: "Itau Unibanco Holding", fundamentals: {} },
        { symbol: "BBDC4", name: "Bradesco Pref", fundamentals: {} },
      ];

      const changes = calculateRankingChanges(scoresA, scoresB, assets);

      const itub = changes.find((c) => c.assetSymbol === "ITUB4");
      expect(itub?.assetName).toBe("Itau Unibanco Holding");
    });
  });

  describe("getSampleAssets", () => {
    it("should return at most MAX_SAMPLE_ASSETS assets", () => {
      const assets = getSampleAssets(mockUserId);
      expect(assets.length).toBeLessThanOrEqual(MAX_SAMPLE_ASSETS);
    });

    it("should return assets with symbol, name, and fundamentals", () => {
      const assets = getSampleAssets(mockUserId);

      expect(assets.length).toBeGreaterThan(0);
      for (const asset of assets) {
        expect(asset).toHaveProperty("symbol");
        expect(asset).toHaveProperty("name");
        expect(asset).toHaveProperty("fundamentals");
        expect(typeof asset.symbol).toBe("string");
        expect(typeof asset.name).toBe("string");
        expect(typeof asset.fundamentals).toBe("object");
      }
    });
  });

  describe("compareCriteriaSets (AC-5.6.2, AC-5.6.3, AC-5.6.4)", () => {
    it("should throw CriteriaNotFoundError when Set A does not exist", async () => {
      mockGetByIdResults.delete(mockSetAId);

      const { CriteriaNotFoundError } = await import("@/lib/services/criteria-service");
      await expect(compareCriteriaSets(mockUserId, mockSetAId, mockSetBId)).rejects.toThrow(
        CriteriaNotFoundError
      );
    });

    it("should throw CriteriaNotFoundError when Set B does not exist", async () => {
      mockGetByIdResults.delete(mockSetBId);

      const { CriteriaNotFoundError } = await import("@/lib/services/criteria-service");
      await expect(compareCriteriaSets(mockUserId, mockSetAId, mockSetBId)).rejects.toThrow(
        CriteriaNotFoundError
      );
    });

    it("should throw CriteriaNotFoundError for criteria owned by another user", async () => {
      // Set A belongs to different user
      mockGetByIdResults.set(mockSetAId, { ...mockSetA, userId: "other-user" });

      const { CriteriaNotFoundError } = await import("@/lib/services/criteria-service");
      await expect(compareCriteriaSets(mockUserId, mockSetAId, mockSetBId)).rejects.toThrow(
        CriteriaNotFoundError
      );
    });

    it("should return complete comparison result", async () => {
      const result = await compareCriteriaSets(mockUserId, mockSetAId, mockSetBId);

      // Check setA summary
      expect(result.setA).toEqual({
        id: mockSetAId,
        name: "Test Set A",
        market: "BR_BANKS",
        criteriaCount: criteriaSetA.length,
        averageScore: expect.any(String),
      });

      // Check setB summary
      expect(result.setB).toEqual({
        id: mockSetBId,
        name: "Test Set B",
        market: "BR_BANKS",
        criteriaCount: criteriaSetB.length,
        averageScore: expect.any(String),
      });

      // Check differences
      expect(result.differences).toBeDefined();
      expect(Array.isArray(result.differences)).toBe(true);

      // Check ranking changes
      expect(result.rankingChanges).toBeDefined();
      expect(Array.isArray(result.rankingChanges)).toBe(true);

      // Check sample size
      expect(result.sampleSize).toBeDefined();
      expect(result.sampleSize).toBeLessThanOrEqual(MAX_SAMPLE_ASSETS);
    });

    it("should calculate average scores using decimal.js", async () => {
      const result = await compareCriteriaSets(mockUserId, mockSetAId, mockSetBId);

      // Average scores should be strings with 2 decimal places
      expect(result.setA.averageScore).toMatch(/^\d+\.\d{2}$/);
      expect(result.setB.averageScore).toMatch(/^\d+\.\d{2}$/);
    });
  });
});
