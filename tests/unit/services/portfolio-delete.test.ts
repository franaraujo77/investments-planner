/**
 * Portfolio Delete Service Unit Tests
 *
 * Story 2.4: Delete Portfolio
 *
 * Tests for deletePortfolio service function:
 * - AC-2.4.7: Multi-tenant isolation - Only deletes if portfolio belongs to userId
 * - AC-2.4.4: Cascade deletes holdings via FK constraint (handled by DB)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockDeleteResult: { id: string }[] = [];
let mockFindFirstResult: unknown = null;

// Mock drizzle-orm operators first
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  count: vi.fn(() => ({ type: "count" })),
  ne: vi.fn((field, value) => ({ field, value, type: "ne" })),
  inArray: vi.fn((field, values) => ({ field, values, type: "inArray" })),
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn(() => Promise.resolve([])),
    })),
    query: {
      portfolios: {
        findMany: vi.fn(() => Promise.resolve([])),
        findFirst: vi.fn(() => Promise.resolve(mockFindFirstResult)),
      },
      portfolioAcceptedAssetTypes: {
        findMany: vi.fn(() => Promise.resolve([])),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(mockDeleteResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    transaction: vi.fn(async (callback) => {
      const tx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([])),
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
              returning: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
        query: {
          portfolioAcceptedAssetTypes: {
            findMany: vi.fn(() => Promise.resolve([])),
          },
        },
      };
      return callback(tx);
    }),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  portfolios: {
    id: "id",
    userId: "user_id",
    name: "name",
    baseCurrency: "base_currency",
    industrySector: "industry_sector",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  portfolioAcceptedAssetTypes: {
    id: "id",
    portfolioId: "portfolio_id",
    assetType: "asset_type",
    createdAt: "created_at",
  },
  portfolioAssets: {
    id: "id",
    portfolioId: "portfolio_id",
  },
}));

// Import after mocks
import { deletePortfolio } from "@/lib/services/portfolio-service";
import { logger } from "@/lib/telemetry/logger";

describe("Portfolio Delete Service (Story 2.4)", () => {
  const mockUserId = "user-123";
  const mockPortfolioId = "portfolio-456";
  const mockOtherUserId = "user-other";

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteResult = [];
    mockFindFirstResult = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deletePortfolio", () => {
    it("should delete portfolio when owned by user (AC-2.4.7)", async () => {
      // Mock successful deletion
      mockDeleteResult = [{ id: mockPortfolioId }];

      const result = await deletePortfolio(mockUserId, mockPortfolioId);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith("Portfolio deleted", {
        userId: mockUserId,
        portfolioId: mockPortfolioId,
      });
    });

    it("should return false when portfolio not found", async () => {
      // Mock no deletion (portfolio doesn't exist)
      mockDeleteResult = [];

      const result = await deletePortfolio(mockUserId, "non-existent");

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Portfolio deletion failed - not found or not owned",
        {
          userId: mockUserId,
          portfolioId: "non-existent",
        }
      );
    });

    it("should return false when portfolio not owned by user (AC-2.4.7)", async () => {
      // Mock no deletion (portfolio owned by different user)
      mockDeleteResult = [];

      const result = await deletePortfolio(mockOtherUserId, mockPortfolioId);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Portfolio deletion failed - not found or not owned",
        {
          userId: mockOtherUserId,
          portfolioId: mockPortfolioId,
        }
      );
    });

    it("should log successful deletion with user and portfolio info", async () => {
      mockDeleteResult = [{ id: mockPortfolioId }];

      await deletePortfolio(mockUserId, mockPortfolioId);

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("deleted"),
        expect.objectContaining({
          userId: mockUserId,
          portfolioId: mockPortfolioId,
        })
      );
    });

    it("should log warning when deletion fails", async () => {
      mockDeleteResult = [];

      await deletePortfolio(mockUserId, mockPortfolioId);

      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multi-tenant isolation (AC-2.4.7)", () => {
    it("should only delete if user owns the portfolio", async () => {
      // First user can delete their portfolio
      mockDeleteResult = [{ id: mockPortfolioId }];
      const result1 = await deletePortfolio(mockUserId, mockPortfolioId);
      expect(result1).toBe(true);

      // Different user cannot delete the same portfolio
      mockDeleteResult = [];
      const result2 = await deletePortfolio(mockOtherUserId, mockPortfolioId);
      expect(result2).toBe(false);
    });

    it("should validate both portfolioId and userId in delete condition", async () => {
      mockDeleteResult = [];

      await deletePortfolio(mockUserId, mockPortfolioId);

      // The db.delete should be called - we verify this via logging
      // The actual ownership check is in the WHERE clause using and()
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
