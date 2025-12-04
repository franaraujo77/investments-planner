/**
 * Portfolio Asset Service Unit Tests
 *
 * Story 3.2: Add Asset to Portfolio
 * Story 3.3: Update Asset Holdings
 * Story 3.4: Remove Asset from Portfolio
 * Story 3.5: Mark Asset as Ignored
 *
 * Tests for asset service functions:
 * - AC-3.2.4: addAsset rejects duplicate symbol in same portfolio
 * - AC-3.2.6: addAsset creates asset with ownership verification
 * - AC-3.4.3: removeAsset hard deletes asset
 * - AC-3.4.6: removeAsset verifies ownership (multi-tenant isolation)
 * - AC-3.5.3: toggleAssetIgnored toggles isIgnored flag
 * - AC-3.5.6: toggleAssetIgnored is reversible
 * - AC-3.5.7: toggleAssetIgnored verifies ownership (multi-tenant isolation)
 * - Multi-tenant isolation: getPortfolioAssets verifies ownership
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockPortfolioCountResult: { count: number }[] = [];
let mockPortfoliosResult: unknown[] = [];
let mockAssetsResult: unknown[] = [];
let mockInsertResult: unknown[] = [];
let mockInsertError: Error | null = null;
let mockUpdateResult: unknown[] = [];

// Mock drizzle-orm operators first (before db mock)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  count: vi.fn(() => ({ type: "count" })),
}));

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn(() => Promise.resolve(mockPortfolioCountResult)),
    })),
    query: {
      portfolios: {
        findMany: vi.fn(() => Promise.resolve(mockPortfoliosResult)),
        findFirst: vi.fn(() =>
          Promise.resolve(mockPortfoliosResult.length > 0 ? mockPortfoliosResult[0] : null)
        ),
      },
      portfolioAssets: {
        findMany: vi.fn(() => Promise.resolve(mockAssetsResult)),
        findFirst: vi.fn(() =>
          Promise.resolve(mockAssetsResult.length > 0 ? mockAssetsResult[0] : null)
        ),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => {
          if (mockInsertError) {
            return Promise.reject(mockInsertError);
          }
          return Promise.resolve(mockInsertResult);
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(mockUpdateResult)),
        })),
      })),
    })),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  portfolios: {
    id: "id",
    userId: "user_id",
    name: "name",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  portfolioAssets: {
    id: "id",
    portfolioId: "portfolio_id",
    symbol: "symbol",
    name: "name",
    quantity: "quantity",
    purchasePrice: "purchase_price",
    currency: "currency",
    assetClassId: "asset_class_id",
    subclassId: "subclass_id",
    isIgnored: "is_ignored",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

// Import after mocks
import {
  addAsset,
  getPortfolioAssets,
  getAssetById,
  updateAsset,
  removeAsset,
  toggleAssetIgnored,
  AssetExistsError,
  PortfolioNotFoundError,
  AssetNotFoundError,
} from "@/lib/services/portfolio-service";

describe("Portfolio Asset Service", () => {
  const mockUserId = "user-123";
  const mockPortfolioId = "portfolio-456";
  const mockAssetId = "asset-789";

  const mockPortfolio = {
    id: mockPortfolioId,
    userId: mockUserId,
    name: "My Portfolio",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAsset = {
    id: mockAssetId,
    portfolioId: mockPortfolioId,
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: "10.5",
    purchasePrice: "150.00",
    currency: "USD",
    assetClassId: null,
    subclassId: null,
    isIgnored: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock control variables
    mockPortfolioCountResult = [{ count: 0 }];
    mockPortfoliosResult = [];
    mockAssetsResult = [];
    mockInsertResult = [];
    mockInsertError = null;
    mockUpdateResult = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addAsset", () => {
    it("should create asset with valid input (AC-3.2.6)", async () => {
      mockPortfoliosResult = [mockPortfolio];
      mockInsertResult = [mockAsset];

      const asset = await addAsset(mockUserId, mockPortfolioId, {
        symbol: "AAPL",
        name: "Apple Inc.",
        quantity: "10.5",
        purchasePrice: "150.00",
        currency: "USD",
      });

      expect(asset).toEqual(mockAsset);
    });

    it("should throw PortfolioNotFoundError when portfolio does not exist", async () => {
      mockPortfoliosResult = [];

      await expect(
        addAsset(mockUserId, mockPortfolioId, {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        })
      ).rejects.toThrow(PortfolioNotFoundError);
    });

    it("should throw PortfolioNotFoundError when portfolio belongs to another user", async () => {
      // Portfolio exists but belongs to different user
      mockPortfoliosResult = [];

      await expect(
        addAsset(mockUserId, mockPortfolioId, {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        })
      ).rejects.toThrow(PortfolioNotFoundError);
    });

    it("should throw AssetExistsError for duplicate symbol (AC-3.2.4)", async () => {
      mockPortfoliosResult = [mockPortfolio];
      // Simulate PostgreSQL unique constraint violation
      mockInsertError = Object.assign(new Error("duplicate key"), { code: "23505" });

      await expect(
        addAsset(mockUserId, mockPortfolioId, {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150",
          currency: "USD",
        })
      ).rejects.toThrow(AssetExistsError);
    });

    it("should allow same symbol in different portfolios", async () => {
      const otherPortfolioId = "portfolio-other";
      const otherPortfolio = { ...mockPortfolio, id: otherPortfolioId };
      mockPortfoliosResult = [otherPortfolio];

      const newAsset = { ...mockAsset, id: "asset-new", portfolioId: otherPortfolioId };
      mockInsertResult = [newAsset];

      const asset = await addAsset(mockUserId, otherPortfolioId, {
        symbol: "AAPL",
        quantity: "5",
        purchasePrice: "160",
        currency: "USD",
      });

      expect(asset.portfolioId).toBe(otherPortfolioId);
    });

    it("should handle optional name field", async () => {
      mockPortfoliosResult = [mockPortfolio];
      const assetWithoutName = { ...mockAsset, name: null };
      mockInsertResult = [assetWithoutName];

      const asset = await addAsset(mockUserId, mockPortfolioId, {
        symbol: "BTC",
        quantity: "0.5",
        purchasePrice: "40000",
        currency: "USD",
      });

      expect(asset.name).toBeNull();
    });
  });

  describe("getPortfolioAssets", () => {
    it("should return empty array when portfolio has no assets", async () => {
      mockPortfoliosResult = [mockPortfolio];
      mockAssetsResult = [];

      const assets = await getPortfolioAssets(mockUserId, mockPortfolioId);

      expect(assets).toEqual([]);
    });

    it("should return assets for owned portfolio", async () => {
      mockPortfoliosResult = [mockPortfolio];
      mockAssetsResult = [mockAsset];

      const assets = await getPortfolioAssets(mockUserId, mockPortfolioId);

      expect(assets).toHaveLength(1);
      expect(assets[0]).toEqual(mockAsset);
    });

    it("should throw PortfolioNotFoundError for non-existent portfolio", async () => {
      mockPortfoliosResult = [];

      await expect(getPortfolioAssets(mockUserId, mockPortfolioId)).rejects.toThrow(
        PortfolioNotFoundError
      );
    });

    it("should verify portfolio ownership (multi-tenant isolation)", async () => {
      // Simulate portfolio not found because user doesn't own it
      mockPortfoliosResult = [];

      await expect(getPortfolioAssets("other-user", mockPortfolioId)).rejects.toThrow(
        PortfolioNotFoundError
      );
    });
  });

  describe("getAssetById", () => {
    it("should return null when asset not found", async () => {
      mockAssetsResult = [];

      const asset = await getAssetById(mockUserId, mockAssetId);

      expect(asset).toBeNull();
    });

    it("should return asset when found and owned by user", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [mockPortfolio];

      const asset = await getAssetById(mockUserId, mockAssetId);

      expect(asset).toEqual(mockAsset);
    });

    it("should return null when asset's portfolio belongs to another user", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = []; // Portfolio lookup fails for wrong user

      const asset = await getAssetById("other-user", mockAssetId);

      expect(asset).toBeNull();
    });
  });

  describe("AssetExistsError", () => {
    it("should have correct name", () => {
      const error = new AssetExistsError("AAPL");
      expect(error.name).toBe("AssetExistsError");
    });

    it("should have correct message", () => {
      const error = new AssetExistsError("AAPL");
      expect(error.message).toBe("Asset already exists in this portfolio");
    });

    it("should store symbol", () => {
      const error = new AssetExistsError("AAPL");
      expect(error.symbol).toBe("AAPL");
    });

    it("should be instance of Error", () => {
      const error = new AssetExistsError("AAPL");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("PortfolioNotFoundError", () => {
    it("should have correct name", () => {
      const error = new PortfolioNotFoundError();
      expect(error.name).toBe("PortfolioNotFoundError");
    });

    it("should have correct message", () => {
      const error = new PortfolioNotFoundError();
      expect(error.message).toBe("Portfolio not found");
    });

    it("should be instance of Error", () => {
      const error = new PortfolioNotFoundError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  /**
   * Story 3.3: Update Asset Holdings
   *
   * Tests for updateAsset service function:
   * - AC-3.3.4: Updates save to database
   * - AC-3.3.6: Updated timestamp recorded
   * - Multi-tenant isolation: Verifies ownership
   */
  describe("updateAsset (Story 3.3)", () => {
    it("should update quantity only (AC-3.3.4)", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [mockPortfolio];
      const updatedAsset = { ...mockAsset, quantity: "20", updatedAt: new Date() };
      mockUpdateResult = [updatedAsset];

      const result = await updateAsset(mockUserId, mockAssetId, {
        quantity: "20",
      });

      expect(result.quantity).toBe("20");
    });

    it("should update price only (AC-3.3.4)", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [mockPortfolio];
      const updatedAsset = { ...mockAsset, purchasePrice: "200.00", updatedAt: new Date() };
      mockUpdateResult = [updatedAsset];

      const result = await updateAsset(mockUserId, mockAssetId, {
        purchasePrice: "200.00",
      });

      expect(result.purchasePrice).toBe("200.00");
    });

    it("should update both quantity and price", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [mockPortfolio];
      const updatedAsset = {
        ...mockAsset,
        quantity: "25",
        purchasePrice: "175.00",
        updatedAt: new Date(),
      };
      mockUpdateResult = [updatedAsset];

      const result = await updateAsset(mockUserId, mockAssetId, {
        quantity: "25",
        purchasePrice: "175.00",
      });

      expect(result.quantity).toBe("25");
      expect(result.purchasePrice).toBe("175.00");
    });

    it("should throw AssetNotFoundError when asset does not exist", async () => {
      mockAssetsResult = [];

      await expect(
        updateAsset(mockUserId, mockAssetId, {
          quantity: "20",
        })
      ).rejects.toThrow(AssetNotFoundError);
    });

    it("should throw AssetNotFoundError when asset belongs to another user", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = []; // Portfolio lookup fails for wrong user

      await expect(
        updateAsset("other-user", mockAssetId, {
          quantity: "20",
        })
      ).rejects.toThrow(AssetNotFoundError);
    });

    it("should verify ownership through portfolio chain (multi-tenant isolation)", async () => {
      // Asset exists but portfolio doesn't belong to user
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [];

      await expect(
        updateAsset("other-user", mockAssetId, {
          purchasePrice: "300",
        })
      ).rejects.toThrow(AssetNotFoundError);
    });
  });

  describe("AssetNotFoundError (Story 3.3)", () => {
    it("should have correct name", () => {
      const error = new AssetNotFoundError();
      expect(error.name).toBe("AssetNotFoundError");
    });

    it("should have correct message", () => {
      const error = new AssetNotFoundError();
      expect(error.message).toBe("Asset not found");
    });

    it("should be instance of Error", () => {
      const error = new AssetNotFoundError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  /**
   * Story 3.4: Remove Asset from Portfolio
   *
   * Tests for removeAsset service function:
   * - AC-3.4.3: Hard delete asset from database
   * - AC-3.4.6: Multi-tenant isolation verification
   */
  describe("removeAsset (Story 3.4)", () => {
    it("should delete asset when found and owned by user (AC-3.4.3)", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [mockPortfolio];

      // Should not throw
      await expect(removeAsset(mockUserId, mockAssetId)).resolves.toBeUndefined();
    });

    it("should throw AssetNotFoundError when asset does not exist", async () => {
      mockAssetsResult = [];

      await expect(removeAsset(mockUserId, mockAssetId)).rejects.toThrow(AssetNotFoundError);
    });

    it("should throw AssetNotFoundError when asset belongs to another user (AC-3.4.6)", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = []; // Portfolio lookup fails for wrong user

      await expect(removeAsset("other-user", mockAssetId)).rejects.toThrow(AssetNotFoundError);
    });

    it("should verify ownership through portfolio chain (multi-tenant isolation)", async () => {
      // Asset exists but portfolio doesn't belong to user
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [];

      await expect(removeAsset("other-user", mockAssetId)).rejects.toThrow(AssetNotFoundError);
    });
  });

  /**
   * Story 3.5: Mark Asset as Ignored
   *
   * Tests for toggleAssetIgnored service function:
   * - AC-3.5.3: Toggle isIgnored flag from false to true
   * - AC-3.5.6: Toggle isIgnored flag from true to false (reversible)
   * - AC-3.5.7: Multi-tenant isolation verification
   */
  describe("toggleAssetIgnored (Story 3.5)", () => {
    it("should toggle isIgnored from false to true (AC-3.5.3)", async () => {
      mockAssetsResult = [{ ...mockAsset, isIgnored: false }];
      mockPortfoliosResult = [mockPortfolio];
      const toggledAsset = { ...mockAsset, isIgnored: true, updatedAt: new Date() };
      mockUpdateResult = [toggledAsset];

      const result = await toggleAssetIgnored(mockUserId, mockAssetId);

      expect(result.isIgnored).toBe(true);
    });

    it("should toggle isIgnored from true to false (AC-3.5.6)", async () => {
      mockAssetsResult = [{ ...mockAsset, isIgnored: true }];
      mockPortfoliosResult = [mockPortfolio];
      const toggledAsset = { ...mockAsset, isIgnored: false, updatedAt: new Date() };
      mockUpdateResult = [toggledAsset];

      const result = await toggleAssetIgnored(mockUserId, mockAssetId);

      expect(result.isIgnored).toBe(false);
    });

    it("should throw AssetNotFoundError when asset does not exist", async () => {
      mockAssetsResult = [];

      await expect(toggleAssetIgnored(mockUserId, mockAssetId)).rejects.toThrow(AssetNotFoundError);
    });

    it("should throw AssetNotFoundError when asset belongs to another user (AC-3.5.7)", async () => {
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = []; // Portfolio lookup fails for wrong user

      await expect(toggleAssetIgnored("other-user", mockAssetId)).rejects.toThrow(
        AssetNotFoundError
      );
    });

    it("should verify ownership through portfolio chain (multi-tenant isolation)", async () => {
      // Asset exists but portfolio doesn't belong to user
      mockAssetsResult = [mockAsset];
      mockPortfoliosResult = [];

      await expect(toggleAssetIgnored("other-user", mockAssetId)).rejects.toThrow(
        AssetNotFoundError
      );
    });
  });
});
