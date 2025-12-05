/**
 * Asset Class and Subclass Service Unit Tests
 *
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * Tests for asset class service functions:
 * - AC-4.1.2: createClass creates with valid input
 * - AC-4.1.3: updateClass updates name
 * - AC-4.1.4: deleteClass removes asset class
 * - Tech spec: Enforces 10 asset class limit
 * - Multi-tenant isolation: getClassesForUser returns only user's classes
 *
 * Tests for subclass service functions:
 * - AC-4.2.2: createSubclass creates with valid input
 * - AC-4.2.3: updateSubclass updates name
 * - AC-4.2.4: deleteSubclass removes subclass
 * - Tech spec: Enforces 10 subclass per class limit
 * - Multi-tenant isolation: getSubclassesForClass verifies parent ownership
 *
 * Tests for allocation service functions:
 * - AC-4.3.1: updateClass updates targetMin/targetMax
 * - AC-4.3.3: validateAllocationRanges warns when sum > 100%
 * - getAllocationSummary returns correct totals
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockAssetClassCountResult: { count: number }[] = [];
let mockAssetClassesResult: unknown[] = [];
let mockSubclassesResult: unknown[] = [];
let mockSubclassCountResult: { count: number }[] = [];
let mockInsertResult: unknown[] = [];
let mockUpdateResult: unknown[] = [];

// Mock drizzle-orm operators first (before db mock)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  count: vi.fn(() => ({ type: "count" })),
  desc: vi.fn((field) => ({ field, type: "desc" })),
}));

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((_table: unknown) => ({
        where: vi.fn(() => {
          // Return appropriate mock based on which table we're querying
          // The table is either assetClasses or assetSubclasses based on schema reference
          if (mockSubclassCountResult.length > 0 && mockAssetClassCountResult.length === 0) {
            return Promise.resolve(mockSubclassCountResult);
          }
          return Promise.resolve(mockAssetClassCountResult);
        }),
      })),
    })),
    query: {
      assetClasses: {
        findMany: vi.fn(() => Promise.resolve(mockAssetClassesResult)),
        findFirst: vi.fn(() =>
          Promise.resolve(mockAssetClassesResult.length > 0 ? mockAssetClassesResult[0] : null)
        ),
      },
      assetSubclasses: {
        findMany: vi.fn(() => Promise.resolve(mockSubclassesResult)),
        findFirst: vi.fn(() =>
          Promise.resolve(mockSubclassesResult.length > 0 ? mockSubclassesResult[0] : null)
        ),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(mockInsertResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(mockUpdateResult)),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  assetClasses: {
    id: "id",
    userId: "user_id",
    name: "name",
    icon: "icon",
    targetMin: "target_min",
    targetMax: "target_max",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  assetSubclasses: {
    id: "id",
    classId: "class_id",
    name: "name",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  portfolioAssets: {
    id: "id",
    portfolioId: "portfolio_id",
    assetClassId: "asset_class_id",
    subclassId: "subclass_id",
  },
}));

// Import after mocks
import {
  createClass,
  getClassesForUser,
  getAssetClassCount,
  getAssetClassById,
  updateClass,
  deleteClass,
  canCreateAssetClass,
  AssetClassLimitError,
  AssetClassNotFoundError,
  MAX_ASSET_CLASSES_PER_USER,
  // Subclass imports
  createSubclass,
  getSubclassesForClass,
  getSubclassById,
  updateSubclass,
  deleteSubclass,
  canCreateSubclass,
  SubclassLimitError,
  SubclassNotFoundError,
  MAX_SUBCLASSES_PER_CLASS,
  // Allocation imports (Story 4.3)
  validateAllocationRanges,
  getAllocationSummary,
} from "@/lib/services/asset-class-service";

describe("Asset Class Service", () => {
  const mockUserId = "user-123";
  const mockClassId = "class-456";
  const mockSubclassId = "subclass-789";

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock control variables
    mockAssetClassCountResult = [{ count: 0 }];
    mockAssetClassesResult = [];
    mockSubclassesResult = [];
    mockSubclassCountResult = [];
    mockInsertResult = [];
    mockUpdateResult = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("MAX_ASSET_CLASSES_PER_USER", () => {
    it("should be 10 (per tech spec)", () => {
      expect(MAX_ASSET_CLASSES_PER_USER).toBe(10);
    });
  });

  describe("getAssetClassCount", () => {
    it("should return 0 when user has no asset classes", async () => {
      mockAssetClassCountResult = [{ count: 0 }];

      const count = await getAssetClassCount(mockUserId);

      expect(count).toBe(0);
    });

    it("should return correct count when user has asset classes", async () => {
      mockAssetClassCountResult = [{ count: 5 }];

      const count = await getAssetClassCount(mockUserId);

      expect(count).toBe(5);
    });

    it("should return 0 when result is empty", async () => {
      mockAssetClassCountResult = [];

      const count = await getAssetClassCount(mockUserId);

      expect(count).toBe(0);
    });
  });

  describe("getClassesForUser", () => {
    it("should return empty array when user has no asset classes", async () => {
      mockAssetClassesResult = [];

      const classes = await getClassesForUser(mockUserId);

      expect(classes).toEqual([]);
    });

    it("should return user asset classes (multi-tenant isolation)", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];

      const classes = await getClassesForUser(mockUserId);

      expect(classes).toHaveLength(1);
      expect(classes[0]).toEqual(mockClass);
    });
  });

  describe("getAssetClassById", () => {
    it("should return null when asset class not found", async () => {
      mockAssetClassesResult = [];

      const assetClass = await getAssetClassById(mockUserId, mockClassId);

      expect(assetClass).toBeNull();
    });

    it("should return asset class when found and owned by user", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];

      const assetClass = await getAssetClassById(mockUserId, mockClassId);

      expect(assetClass).toEqual(mockClass);
    });
  });

  describe("canCreateAssetClass", () => {
    it("should return true when user has less than 10 asset classes", async () => {
      mockAssetClassCountResult = [{ count: 9 }];

      const canCreate = await canCreateAssetClass(mockUserId);

      expect(canCreate).toBe(true);
    });

    it("should return false when user has 10 asset classes", async () => {
      mockAssetClassCountResult = [{ count: 10 }];

      const canCreate = await canCreateAssetClass(mockUserId);

      expect(canCreate).toBe(false);
    });

    it("should return true when user has no asset classes", async () => {
      mockAssetClassCountResult = [{ count: 0 }];

      const canCreate = await canCreateAssetClass(mockUserId);

      expect(canCreate).toBe(true);
    });
  });

  describe("createClass", () => {
    it("should create asset class with valid input (AC-4.1.2)", async () => {
      const mockCreatedClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassCountResult = [{ count: 0 }];
      mockAssetClassesResult = [];
      mockInsertResult = [mockCreatedClass];

      const assetClass = await createClass(mockUserId, {
        name: "Stocks",
        icon: "📈",
      });

      expect(assetClass).toEqual(mockCreatedClass);
    });

    it("should throw AssetClassLimitError when user has 10 asset classes", async () => {
      mockAssetClassCountResult = [{ count: 10 }];

      await expect(createClass(mockUserId, { name: "New Class" })).rejects.toThrow(
        AssetClassLimitError
      );
    });

    it("should throw AssetClassLimitError with correct message", async () => {
      mockAssetClassCountResult = [{ count: 10 }];

      await expect(createClass(mockUserId, { name: "New Class" })).rejects.toThrow(
        "Maximum of 10 asset classes allowed"
      );
    });

    it("should create asset class without icon", async () => {
      const mockCreatedClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Bonds",
        icon: null,
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassCountResult = [{ count: 0 }];
      mockAssetClassesResult = [];
      mockInsertResult = [mockCreatedClass];

      const assetClass = await createClass(mockUserId, { name: "Bonds" });

      expect(assetClass.icon).toBeNull();
    });
  });

  describe("updateClass", () => {
    it("should update asset class name (AC-4.1.3)", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdatedClass = {
        ...mockClass,
        name: "Equities",
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockUpdateResult = [mockUpdatedClass];

      const result = await updateClass(mockUserId, mockClassId, {
        name: "Equities",
      });

      expect(result.name).toBe("Equities");
    });

    it("should throw AssetClassNotFoundError when class not found", async () => {
      mockAssetClassesResult = [];

      await expect(updateClass(mockUserId, mockClassId, { name: "Updated" })).rejects.toThrow(
        AssetClassNotFoundError
      );
    });
  });

  describe("deleteClass", () => {
    it("should delete asset class (AC-4.1.4)", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];

      await expect(deleteClass(mockUserId, mockClassId)).resolves.not.toThrow();
    });

    it("should throw AssetClassNotFoundError when class not found", async () => {
      mockAssetClassesResult = [];

      await expect(deleteClass(mockUserId, mockClassId)).rejects.toThrow(AssetClassNotFoundError);
    });
  });

  describe("AssetClassLimitError", () => {
    it("should have correct name", () => {
      const error = new AssetClassLimitError();
      expect(error.name).toBe("AssetClassLimitError");
    });

    it("should have correct message", () => {
      const error = new AssetClassLimitError();
      expect(error.message).toBe("Maximum of 10 asset classes allowed");
    });

    it("should be instance of Error", () => {
      const error = new AssetClassLimitError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("AssetClassNotFoundError", () => {
    it("should have correct name", () => {
      const error = new AssetClassNotFoundError();
      expect(error.name).toBe("AssetClassNotFoundError");
    });

    it("should have correct message", () => {
      const error = new AssetClassNotFoundError();
      expect(error.message).toBe("Asset class not found");
    });

    it("should be instance of Error", () => {
      const error = new AssetClassNotFoundError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ==========================================================================
  // SUBCLASS SERVICE TESTS (Story 4.2)
  // ==========================================================================

  describe("MAX_SUBCLASSES_PER_CLASS", () => {
    it("should be 10 (per tech spec)", () => {
      expect(MAX_SUBCLASSES_PER_CLASS).toBe(10);
    });
  });

  describe("getSubclassesForClass", () => {
    it("should throw AssetClassNotFoundError when class not found", async () => {
      mockAssetClassesResult = [];

      await expect(getSubclassesForClass(mockUserId, mockClassId)).rejects.toThrow(
        AssetClassNotFoundError
      );
    });

    it("should return empty array when class has no subclasses", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockSubclassesResult = [];

      const subclasses = await getSubclassesForClass(mockUserId, mockClassId);

      expect(subclasses).toEqual([]);
    });

    it("should return subclasses for owned class (multi-tenant isolation)", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockSubclass = {
        id: mockSubclassId,
        classId: mockClassId,
        name: "ETFs",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockSubclassesResult = [mockSubclass];

      const subclasses = await getSubclassesForClass(mockUserId, mockClassId);

      expect(subclasses).toHaveLength(1);
      expect(subclasses[0]).toEqual(mockSubclass);
    });
  });

  describe("getSubclassById", () => {
    it("should return null when subclass not found", async () => {
      mockSubclassesResult = [];

      const subclass = await getSubclassById(mockUserId, mockSubclassId);

      expect(subclass).toBeNull();
    });

    it("should return null when subclass owned by different user", async () => {
      const mockSubclass = {
        id: mockSubclassId,
        classId: mockClassId,
        name: "ETFs",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
        assetClass: {
          id: mockClassId,
          userId: "different-user",
          name: "Stocks",
        },
      };
      mockSubclassesResult = [mockSubclass];

      const subclass = await getSubclassById(mockUserId, mockSubclassId);

      expect(subclass).toBeNull();
    });

    it("should return subclass when found and owned by user", async () => {
      const mockSubclass = {
        id: mockSubclassId,
        classId: mockClassId,
        name: "ETFs",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
        assetClass: {
          id: mockClassId,
          userId: mockUserId,
          name: "Stocks",
        },
      };
      mockSubclassesResult = [mockSubclass];

      const subclass = await getSubclassById(mockUserId, mockSubclassId);

      expect(subclass).toEqual(mockSubclass);
    });
  });

  describe("canCreateSubclass", () => {
    it("should throw AssetClassNotFoundError when class not found", async () => {
      mockAssetClassesResult = [];

      await expect(canCreateSubclass(mockUserId, mockClassId)).rejects.toThrow(
        AssetClassNotFoundError
      );
    });

    it("should return true when class has less than 10 subclasses", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockAssetClassCountResult = []; // Clear asset class count
      mockSubclassCountResult = [{ count: 9 }];

      const canCreate = await canCreateSubclass(mockUserId, mockClassId);

      expect(canCreate).toBe(true);
    });
  });

  describe("createSubclass", () => {
    it("should throw AssetClassNotFoundError when class not found", async () => {
      mockAssetClassesResult = [];

      await expect(createSubclass(mockUserId, mockClassId, { name: "ETFs" })).rejects.toThrow(
        AssetClassNotFoundError
      );
    });

    it("should create subclass with valid input (AC-4.2.2)", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockCreatedSubclass = {
        id: mockSubclassId,
        classId: mockClassId,
        name: "ETFs",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockAssetClassCountResult = []; // Clear asset class count
      mockSubclassCountResult = [{ count: 0 }];
      mockSubclassesResult = [];
      mockInsertResult = [mockCreatedSubclass];

      const subclass = await createSubclass(mockUserId, mockClassId, {
        name: "ETFs",
      });

      expect(subclass).toEqual(mockCreatedSubclass);
    });
  });

  describe("updateSubclass", () => {
    it("should throw SubclassNotFoundError when subclass not found", async () => {
      mockSubclassesResult = [];

      await expect(updateSubclass(mockUserId, mockSubclassId, { name: "Updated" })).rejects.toThrow(
        SubclassNotFoundError
      );
    });

    it("should update subclass name (AC-4.2.3)", async () => {
      const mockSubclass = {
        id: mockSubclassId,
        classId: mockClassId,
        name: "ETFs",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
        assetClass: {
          id: mockClassId,
          userId: mockUserId,
          name: "Stocks",
        },
      };
      const mockUpdatedSubclass = {
        ...mockSubclass,
        name: "Index Funds",
        updatedAt: new Date(),
      };
      mockSubclassesResult = [mockSubclass];
      mockUpdateResult = [mockUpdatedSubclass];

      const result = await updateSubclass(mockUserId, mockSubclassId, {
        name: "Index Funds",
      });

      expect(result.name).toBe("Index Funds");
    });
  });

  describe("deleteSubclass", () => {
    it("should throw SubclassNotFoundError when subclass not found", async () => {
      mockSubclassesResult = [];

      await expect(deleteSubclass(mockUserId, mockSubclassId)).rejects.toThrow(
        SubclassNotFoundError
      );
    });

    it("should delete subclass (AC-4.2.4)", async () => {
      const mockSubclass = {
        id: mockSubclassId,
        classId: mockClassId,
        name: "ETFs",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
        assetClass: {
          id: mockClassId,
          userId: mockUserId,
          name: "Stocks",
        },
      };
      mockSubclassesResult = [mockSubclass];

      await expect(deleteSubclass(mockUserId, mockSubclassId)).resolves.not.toThrow();
    });
  });

  describe("SubclassLimitError", () => {
    it("should have correct name", () => {
      const error = new SubclassLimitError();
      expect(error.name).toBe("SubclassLimitError");
    });

    it("should have correct message", () => {
      const error = new SubclassLimitError();
      expect(error.message).toBe("Maximum of 10 subclasses per class allowed");
    });

    it("should be instance of Error", () => {
      const error = new SubclassLimitError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("SubclassNotFoundError", () => {
    it("should have correct name", () => {
      const error = new SubclassNotFoundError();
      expect(error.name).toBe("SubclassNotFoundError");
    });

    it("should have correct message", () => {
      const error = new SubclassNotFoundError();
      expect(error.message).toBe("Subclass not found");
    });

    it("should be instance of Error", () => {
      const error = new SubclassNotFoundError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ==========================================================================
  // ALLOCATION SERVICE TESTS (Story 4.3)
  // ==========================================================================

  describe("updateClass with allocation ranges", () => {
    it("should update targetMin and targetMax (AC-4.3.1)", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdatedClass = {
        ...mockClass,
        targetMin: "40.00",
        targetMax: "50.00",
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockUpdateResult = [mockUpdatedClass];

      const result = await updateClass(mockUserId, mockClassId, {
        targetMin: "40.00",
        targetMax: "50.00",
      });

      expect(result.targetMin).toBe("40.00");
      expect(result.targetMax).toBe("50.00");
    });

    it("should update only targetMin when targetMax not provided", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: null,
        targetMax: null,
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdatedClass = {
        ...mockClass,
        targetMin: "30.00",
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockUpdateResult = [mockUpdatedClass];

      const result = await updateClass(mockUserId, mockClassId, {
        targetMin: "30.00",
      });

      expect(result.targetMin).toBe("30.00");
    });

    it("should clear targetMin when set to null", async () => {
      const mockClass = {
        id: mockClassId,
        userId: mockUserId,
        name: "Stocks",
        icon: "📈",
        targetMin: "40.00",
        targetMax: "50.00",
        sortOrder: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdatedClass = {
        ...mockClass,
        targetMin: null,
        updatedAt: new Date(),
      };
      mockAssetClassesResult = [mockClass];
      mockUpdateResult = [mockUpdatedClass];

      const result = await updateClass(mockUserId, mockClassId, {
        targetMin: null,
      });

      expect(result.targetMin).toBeNull();
    });
  });

  describe("validateAllocationRanges", () => {
    it("should return valid=true when sum of minimums <= 100% (AC-4.3.3)", async () => {
      mockAssetClassesResult = [
        {
          id: "class-1",
          userId: mockUserId,
          name: "Stocks",
          targetMin: "40.00",
          targetMax: "50.00",
        },
        {
          id: "class-2",
          userId: mockUserId,
          name: "Bonds",
          targetMin: "30.00",
          targetMax: "40.00",
        },
        { id: "class-3", userId: mockUserId, name: "Cash", targetMin: "20.00", targetMax: "30.00" },
      ];

      const result = await validateAllocationRanges(mockUserId);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should return warning when sum of minimums > 100% (AC-4.3.3)", async () => {
      mockAssetClassesResult = [
        {
          id: "class-1",
          userId: mockUserId,
          name: "Stocks",
          targetMin: "50.00",
          targetMax: "60.00",
        },
        {
          id: "class-2",
          userId: mockUserId,
          name: "Bonds",
          targetMin: "40.00",
          targetMax: "50.00",
        },
        { id: "class-3", userId: mockUserId, name: "Cash", targetMin: "30.00", targetMax: "40.00" },
      ];

      const result = await validateAllocationRanges(mockUserId);

      expect(result.valid).toBe(true); // Still valid (warning, not error)
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("MINIMUM_SUM_EXCEEDS_100");
      expect(result.warnings[0].totalMinimums).toBe("120.00");
      expect(result.warnings[0].affectedClasses).toHaveLength(3);
    });

    it("should return valid=true when no asset classes", async () => {
      mockAssetClassesResult = [];

      const result = await validateAllocationRanges(mockUserId);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should ignore classes without targetMin in sum calculation", async () => {
      mockAssetClassesResult = [
        {
          id: "class-1",
          userId: mockUserId,
          name: "Stocks",
          targetMin: "40.00",
          targetMax: "50.00",
        },
        { id: "class-2", userId: mockUserId, name: "Bonds", targetMin: null, targetMax: "40.00" },
        { id: "class-3", userId: mockUserId, name: "Cash", targetMin: "50.00", targetMax: "60.00" },
      ];

      const result = await validateAllocationRanges(mockUserId);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("getAllocationSummary", () => {
    it("should return correct totals", async () => {
      mockAssetClassesResult = [
        {
          id: "class-1",
          userId: mockUserId,
          name: "Stocks",
          targetMin: "40.00",
          targetMax: "50.00",
        },
        {
          id: "class-2",
          userId: mockUserId,
          name: "Bonds",
          targetMin: "30.00",
          targetMax: "40.00",
        },
      ];

      const summary = await getAllocationSummary(mockUserId);

      expect(summary.totalMinimums).toBe("70.00");
      expect(summary.totalMaximums).toBe("90.00");
      expect(summary.unallocatedMinimum).toBe("30.00");
      expect(summary.classCount).toBe(2);
      expect(summary.classesWithRanges).toBe(2);
    });

    it("should handle empty asset classes", async () => {
      mockAssetClassesResult = [];

      const summary = await getAllocationSummary(mockUserId);

      expect(summary.totalMinimums).toBe("0.00");
      expect(summary.totalMaximums).toBe("0.00");
      expect(summary.unallocatedMinimum).toBe("100.00");
      expect(summary.classCount).toBe(0);
      expect(summary.classesWithRanges).toBe(0);
    });

    it("should handle classes without allocation ranges", async () => {
      mockAssetClassesResult = [
        { id: "class-1", userId: mockUserId, name: "Stocks", targetMin: "40.00", targetMax: null },
        { id: "class-2", userId: mockUserId, name: "Bonds", targetMin: null, targetMax: "50.00" },
        { id: "class-3", userId: mockUserId, name: "Cash", targetMin: null, targetMax: null },
      ];

      const summary = await getAllocationSummary(mockUserId);

      expect(summary.totalMinimums).toBe("40.00");
      expect(summary.totalMaximums).toBe("50.00");
      expect(summary.unallocatedMinimum).toBe("60.00");
      expect(summary.classCount).toBe(3);
      expect(summary.classesWithRanges).toBe(1); // Only class-1 has targetMin
    });

    it("should return 0.00 unallocatedMinimum when minimums exceed 100%", async () => {
      mockAssetClassesResult = [
        {
          id: "class-1",
          userId: mockUserId,
          name: "Stocks",
          targetMin: "60.00",
          targetMax: "70.00",
        },
        {
          id: "class-2",
          userId: mockUserId,
          name: "Bonds",
          targetMin: "50.00",
          targetMax: "60.00",
        },
      ];

      const summary = await getAllocationSummary(mockUserId);

      expect(summary.totalMinimums).toBe("110.00");
      expect(summary.unallocatedMinimum).toBe("0.00"); // Can't be negative
    });
  });
});
