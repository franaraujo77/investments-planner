/**
 * Criteria Service Unit Tests
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Tests for criteria CRUD service functions:
 * - AC-5.1.1: Create new criterion set
 * - AC-5.1.3: Criteria organization by market/asset type
 * - AC-5.1.4: CriteriaBlock component interactions (CRUD operations)
 * - AC-5.1.6: Criteria versioning (immutable)
 * - Multi-tenant isolation: All operations scoped by userId
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCriteriaSetCount,
  getCriteriaSetsForUser,
  getCriteriaById,
  createCriteriaSet,
  updateCriteriaSet,
  addCriterion,
  updateCriterion,
  deleteCriterion,
  reorderCriteria,
  deleteCriteriaSet,
  canCreateCriteriaSet,
  CriteriaNotFoundError,
  CriterionNotFoundError,
  CriteriaSetLimitError,
} from "@/lib/services/criteria-service";
import type { CriteriaVersion, CriterionRule } from "@/lib/db/schema";

// Mock data
const mockUserId = "user-123";
const mockCriteriaId = "criteria-456";
const mockNewUUID = "new-uuid-789";
const mockNewCriteriaId = "new-criteria-id";

// Mock criterion rules
const mockCriterionRules: CriterionRule[] = [
  {
    id: "criterion-1",
    name: "High Dividend",
    metric: "dividend_yield",
    operator: "gt",
    value: "4.0",
    value2: undefined,
    points: 10,
    requiredFundamentals: ["dividend_yield"],
    sortOrder: 0,
  },
  {
    id: "criterion-2",
    name: "Low PE",
    metric: "pe_ratio",
    operator: "lt",
    value: "15",
    value2: undefined,
    points: 5,
    requiredFundamentals: ["pe_ratio"],
    sortOrder: 1,
  },
];

// Mock source criteria set
const mockCriteriaVersion: CriteriaVersion = {
  id: mockCriteriaId,
  userId: mockUserId,
  assetType: "stock",
  targetMarket: "BR_BANKS",
  name: "Test Criteria",
  criteria: mockCriterionRules,
  version: 1,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Mock storage for control
let mockGetByIdResult: CriteriaVersion | null = mockCriteriaVersion;
let mockCriteriaCountArray: Array<{ id: string }> = [];
let mockFindManyResult: CriteriaVersion[] = [];
let mockInsertResult: CriteriaVersion | null = null;
let mockUpdateResult: CriteriaVersion | null = null;

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => mockNewUUID),
});

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  desc: vi.fn((field) => ({ field, type: "desc" })),
  count: vi.fn(() => ({ type: "count" })),
}));

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn(() => Promise.resolve(mockCriteriaCountArray)),
    })),
    query: {
      criteriaVersions: {
        findFirst: vi.fn(() => Promise.resolve(mockGetByIdResult)),
        findMany: vi.fn(() => Promise.resolve(mockFindManyResult)),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(mockInsertResult ? [mockInsertResult] : [])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(mockUpdateResult ? [mockUpdateResult] : [])),
        })),
      })),
    })),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  criteriaVersions: {
    id: "id",
    userId: "user_id",
    assetType: "asset_type",
    targetMarket: "target_market",
    name: "name",
    criteria: "criteria",
    version: "version",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

describe("Criteria Service - CRUD Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdResult = { ...mockCriteriaVersion };
    mockCriteriaCountArray = Array.from({ length: 5 }, (_, i) => ({ id: `criteria-${i}` }));
    mockFindManyResult = [mockCriteriaVersion];
    mockInsertResult = {
      ...mockCriteriaVersion,
      id: mockNewCriteriaId,
    };
    mockUpdateResult = {
      ...mockCriteriaVersion,
      updatedAt: new Date(),
    };
  });

  describe("getCriteriaSetCount", () => {
    it("should return count of active criteria sets", async () => {
      mockCriteriaCountArray = [{ id: "1" }, { id: "2" }, { id: "3" }];

      const result = await getCriteriaSetCount(mockUserId);

      expect(result).toBe(3);
    });

    it("should return 0 when no criteria sets exist", async () => {
      mockCriteriaCountArray = [];

      const result = await getCriteriaSetCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe("getCriteriaSetsForUser (AC-5.1.3)", () => {
    it("should return criteria sets for user", async () => {
      mockFindManyResult = [mockCriteriaVersion];

      const result = await getCriteriaSetsForUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(mockUserId);
    });

    it("should filter by asset type when provided", async () => {
      mockFindManyResult = [mockCriteriaVersion];

      const result = await getCriteriaSetsForUser(mockUserId, { assetType: "stock" });

      expect(result).toHaveLength(1);
      expect(result[0]?.assetType).toBe("stock");
    });

    it("should filter by target market when provided", async () => {
      mockFindManyResult = [mockCriteriaVersion];

      const result = await getCriteriaSetsForUser(mockUserId, { targetMarket: "BR_BANKS" });

      expect(result).toHaveLength(1);
      expect(result[0]?.targetMarket).toBe("BR_BANKS");
    });

    it("should return empty array when no criteria match", async () => {
      mockFindManyResult = [];

      const result = await getCriteriaSetsForUser(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe("getCriteriaById", () => {
    it("should return criteria set when found and owned by user", async () => {
      mockGetByIdResult = mockCriteriaVersion;

      const result = await getCriteriaById(mockUserId, mockCriteriaId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCriteriaId);
    });

    it("should return null when criteria not found", async () => {
      mockGetByIdResult = null;

      const result = await getCriteriaById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createCriteriaSet (AC-5.1.1, AC-5.1.6)", () => {
    it("should create a new criteria set with version 1", async () => {
      mockCriteriaCountArray = [];
      mockInsertResult = {
        ...mockCriteriaVersion,
        id: mockNewCriteriaId,
        version: 1,
      };

      const result = await createCriteriaSet(mockUserId, {
        assetType: "stock",
        targetMarket: "BR_BANKS",
        name: "New Criteria",
        criteria: [
          {
            name: "Test Rule",
            metric: "dividend_yield",
            operator: "gt",
            value: "4.0",
            points: 10,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      expect(result.version).toBe(1);
      expect(result.isActive).toBe(true);
    });

    it("should throw CriteriaSetLimitError when limit reached", async () => {
      // 50 is the MAX_CRITERIA_SETS_PER_USER
      mockCriteriaCountArray = Array.from({ length: 50 }, (_, i) => ({ id: `criteria-${i}` }));

      await expect(
        createCriteriaSet(mockUserId, {
          assetType: "stock",
          targetMarket: "BR_BANKS",
          name: "New Criteria",
          criteria: [
            {
              name: "Test",
              metric: "dividend_yield",
              operator: "gt",
              value: "4.0",
              points: 10,
              requiredFundamentals: [],
              sortOrder: 0,
            },
          ],
        })
      ).rejects.toThrow(CriteriaSetLimitError);
    });

    it("should generate UUIDs for criteria without IDs", async () => {
      mockCriteriaCountArray = [];

      await createCriteriaSet(mockUserId, {
        assetType: "stock",
        targetMarket: "BR_BANKS",
        name: "New Criteria",
        criteria: [
          {
            name: "Test Rule",
            metric: "dividend_yield",
            operator: "gt",
            value: "4.0",
            points: 10,
            requiredFundamentals: [],
            sortOrder: 0,
          },
        ],
      });

      expect(crypto.randomUUID).toHaveBeenCalled();
    });
  });

  describe("updateCriteriaSet (AC-5.1.6 - Immutable Versioning)", () => {
    it("should throw CriteriaNotFoundError when criteria not found", async () => {
      mockGetByIdResult = null;

      await expect(
        updateCriteriaSet(mockUserId, "non-existent", { name: "Updated Name" })
      ).rejects.toThrow(CriteriaNotFoundError);
    });

    it("should update isActive without creating new version (soft delete)", async () => {
      mockGetByIdResult = mockCriteriaVersion;
      mockUpdateResult = {
        ...mockCriteriaVersion,
        isActive: false,
      };

      const result = await updateCriteriaSet(mockUserId, mockCriteriaId, { isActive: false });

      expect(result.isActive).toBe(false);
      expect(result.version).toBe(mockCriteriaVersion.version);
    });
  });

  describe("addCriterion (AC-5.1.1, AC-5.1.6)", () => {
    it("should throw CriteriaNotFoundError when criteria not found", async () => {
      mockGetByIdResult = null;

      await expect(
        addCriterion(mockUserId, "non-existent", {
          name: "New Criterion",
          metric: "dividend_yield",
          operator: "gt",
          value: "5.0",
          points: 10,
          requiredFundamentals: [],
          sortOrder: 0,
        })
      ).rejects.toThrow(CriteriaNotFoundError);
    });
  });

  describe("updateCriterion (AC-5.1.4)", () => {
    it("should throw CriteriaNotFoundError when criteria not found", async () => {
      mockGetByIdResult = null;

      await expect(
        updateCriterion(mockUserId, "non-existent", "criterion-1", { name: "Updated" })
      ).rejects.toThrow(CriteriaNotFoundError);
    });

    it("should throw CriterionNotFoundError when criterion not in set", async () => {
      mockGetByIdResult = mockCriteriaVersion;

      await expect(
        updateCriterion(mockUserId, mockCriteriaId, "non-existent-criterion", { name: "Updated" })
      ).rejects.toThrow(CriterionNotFoundError);
    });
  });

  describe("deleteCriterion (AC-5.1.4)", () => {
    it("should throw CriteriaNotFoundError when criteria not found", async () => {
      mockGetByIdResult = null;

      await expect(deleteCriterion(mockUserId, "non-existent", "criterion-1")).rejects.toThrow(
        CriteriaNotFoundError
      );
    });

    it("should throw CriterionNotFoundError when criterion not in set", async () => {
      mockGetByIdResult = mockCriteriaVersion;

      await expect(
        deleteCriterion(mockUserId, mockCriteriaId, "non-existent-criterion")
      ).rejects.toThrow(CriterionNotFoundError);
    });
  });

  describe("reorderCriteria (AC-5.1.4)", () => {
    it("should throw CriteriaNotFoundError when criteria not found", async () => {
      mockGetByIdResult = null;

      await expect(
        reorderCriteria(mockUserId, "non-existent", ["criterion-1", "criterion-2"])
      ).rejects.toThrow(CriteriaNotFoundError);
    });

    it("should throw CriterionNotFoundError when criterion ID not in set", async () => {
      mockGetByIdResult = mockCriteriaVersion;

      await expect(
        reorderCriteria(mockUserId, mockCriteriaId, ["criterion-1", "invalid-criterion"])
      ).rejects.toThrow(CriterionNotFoundError);
    });
  });

  describe("deleteCriteriaSet", () => {
    it("should throw CriteriaNotFoundError when criteria not found", async () => {
      mockGetByIdResult = null;

      await expect(deleteCriteriaSet(mockUserId, "non-existent")).rejects.toThrow(
        CriteriaNotFoundError
      );
    });
  });

  describe("canCreateCriteriaSet", () => {
    it("should return true when under limit", async () => {
      mockCriteriaCountArray = Array.from({ length: 10 }, (_, i) => ({ id: `criteria-${i}` }));

      const result = await canCreateCriteriaSet(mockUserId);

      expect(result).toBe(true);
    });

    it("should return false when at limit", async () => {
      mockCriteriaCountArray = Array.from({ length: 50 }, (_, i) => ({ id: `criteria-${i}` }));

      const result = await canCreateCriteriaSet(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe("Custom Error Classes", () => {
    it("CriteriaNotFoundError should have correct name and message", () => {
      const error = new CriteriaNotFoundError();
      expect(error.name).toBe("CriteriaNotFoundError");
      expect(error.message.toLowerCase()).toContain("not found");
    });

    it("CriterionNotFoundError should have correct name and message", () => {
      const error = new CriterionNotFoundError();
      expect(error.name).toBe("CriterionNotFoundError");
      expect(error.message.toLowerCase()).toContain("not found");
    });

    it("CriteriaSetLimitError should have correct name and message", () => {
      const error = new CriteriaSetLimitError();
      expect(error.name).toBe("CriteriaSetLimitError");
      expect(error.message).toContain("50");
    });
  });
});
