/**
 * Portfolio Service Unit Tests
 *
 * Story 2.1: Create Portfolio (Epic 2)
 * Story 3.1: Create Portfolio (Legacy)
 *
 * Tests for portfolio service functions:
 * - AC-2.1.4: checkSimilarPortfolioName fuzzy matching
 * - AC-3.1.3: createPortfolio creates with valid input
 * - AC-3.1.4: createPortfolio enforces 5 portfolio limit
 * - Multi-tenant isolation: getUserPortfolios returns only user's portfolios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockPortfolioCountResult: { count: number }[] = [];
let mockPortfoliosResult: unknown[] = [];
let mockInsertResult: unknown[] = [];
let mockAssetTypesInsertResult: unknown[] = [];

// Mock drizzle-orm operators first (before db mock)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  count: vi.fn(() => ({ type: "count" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  ne: vi.fn((field, value) => ({ field, value, type: "ne" })),
}));

// Mock the database module with transaction support
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
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(mockInsertResult)),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    // Transaction mock for createPortfolio (Story 2.1)
    transaction: vi.fn(async (callback) => {
      // Create a mock tx object that matches the real transaction interface
      const tx = {
        insert: vi.fn(() => ({
          values: vi.fn((_data) => {
            // If inserting into portfolio table (returns portfolio)
            if (mockInsertResult.length > 0) {
              return { returning: vi.fn(() => Promise.resolve(mockInsertResult)) };
            }
            // If inserting asset types (no return needed)
            return { returning: vi.fn(() => Promise.resolve(mockAssetTypesInsertResult)) };
          }),
        })),
      };
      // Execute the callback with the mock tx
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
}));

// Import after mocks
import {
  createPortfolio,
  getUserPortfolios,
  getPortfolioCount,
  getPortfolioById,
  canCreatePortfolio,
  checkSimilarPortfolioName,
  PortfolioLimitError,
} from "@/lib/services/portfolio-service";
import { MAX_PORTFOLIOS_PER_USER } from "@/lib/validations/portfolio";

describe("Portfolio Service", () => {
  const mockUserId = "user-123";
  const mockPortfolioId = "portfolio-456";

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock control variables
    mockPortfolioCountResult = [{ count: 0 }];
    mockPortfoliosResult = [];
    mockInsertResult = [];
    mockAssetTypesInsertResult = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("MAX_PORTFOLIOS_PER_USER", () => {
    it("should be 5 (AC-3.1.4)", () => {
      expect(MAX_PORTFOLIOS_PER_USER).toBe(5);
    });
  });

  describe("getPortfolioCount", () => {
    it("should return 0 when user has no portfolios", async () => {
      mockPortfolioCountResult = [{ count: 0 }];

      const count = await getPortfolioCount(mockUserId);

      expect(count).toBe(0);
    });

    it("should return correct count when user has portfolios", async () => {
      mockPortfolioCountResult = [{ count: 3 }];

      const count = await getPortfolioCount(mockUserId);

      expect(count).toBe(3);
    });

    it("should return 0 when result is empty", async () => {
      mockPortfolioCountResult = [];

      const count = await getPortfolioCount(mockUserId);

      expect(count).toBe(0);
    });
  });

  describe("getUserPortfolios", () => {
    it("should return empty array when user has no portfolios", async () => {
      mockPortfoliosResult = [];

      const portfolios = await getUserPortfolios(mockUserId);

      expect(portfolios).toEqual([]);
    });

    it("should return user portfolios (multi-tenant isolation)", async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: "My Portfolio",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPortfoliosResult = [mockPortfolio];

      const portfolios = await getUserPortfolios(mockUserId);

      expect(portfolios).toHaveLength(1);
      expect(portfolios[0]).toEqual(mockPortfolio);
    });
  });

  describe("getPortfolioById", () => {
    it("should return null when portfolio not found", async () => {
      mockPortfoliosResult = [];

      const portfolio = await getPortfolioById(mockUserId, mockPortfolioId);

      expect(portfolio).toBeNull();
    });

    it("should return portfolio when found and owned by user", async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: "My Portfolio",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPortfoliosResult = [mockPortfolio];

      const portfolio = await getPortfolioById(mockUserId, mockPortfolioId);

      expect(portfolio).toEqual(mockPortfolio);
    });
  });

  describe("canCreatePortfolio", () => {
    it("should return true when user has less than 5 portfolios", async () => {
      mockPortfolioCountResult = [{ count: 4 }];

      const canCreate = await canCreatePortfolio(mockUserId);

      expect(canCreate).toBe(true);
    });

    it("should return false when user has 5 portfolios", async () => {
      mockPortfolioCountResult = [{ count: 5 }];

      const canCreate = await canCreatePortfolio(mockUserId);

      expect(canCreate).toBe(false);
    });

    it("should return true when user has no portfolios", async () => {
      mockPortfolioCountResult = [{ count: 0 }];

      const canCreate = await canCreatePortfolio(mockUserId);

      expect(canCreate).toBe(true);
    });
  });

  describe("createPortfolio", () => {
    it("should create portfolio with valid input (AC-3.1.3, AC-2.1.1)", async () => {
      const mockCreatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Technology",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPortfolioCountResult = [{ count: 0 }];
      mockInsertResult = [mockCreatedPortfolio];

      const portfolio = await createPortfolio(mockUserId, {
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Technology",
        assetTypes: ["Stocks", "ETFs"],
      });

      // Should include acceptedAssetTypes from input
      expect(portfolio.name).toBe("My Portfolio");
      expect(portfolio.baseCurrency).toBe("USD");
      expect(portfolio.industrySector).toBe("Technology");
      expect(portfolio.acceptedAssetTypes).toEqual(["Stocks", "ETFs"]);
    });

    it("should throw PortfolioLimitError when user has 5 portfolios (AC-3.1.4)", async () => {
      mockPortfolioCountResult = [{ count: 5 }];

      await expect(
        createPortfolio(mockUserId, {
          name: "New Portfolio",
          baseCurrency: "USD",
          industrySector: "Other",
          assetTypes: ["Stocks"],
        })
      ).rejects.toThrow(PortfolioLimitError);
    });

    it("should throw PortfolioLimitError with correct message", async () => {
      mockPortfolioCountResult = [{ count: 5 }];

      await expect(
        createPortfolio(mockUserId, {
          name: "New Portfolio",
          baseCurrency: "USD",
          industrySector: "Other",
          assetTypes: ["Stocks"],
        })
      ).rejects.toThrow("Maximum portfolios reached (5)");
    });

    it("should create portfolio when user has 4 portfolios", async () => {
      const mockCreatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: "Fifth Portfolio",
        baseCurrency: "EUR",
        industrySector: "Banking",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPortfolioCountResult = [{ count: 4 }];
      mockInsertResult = [mockCreatedPortfolio];

      const portfolio = await createPortfolio(mockUserId, {
        name: "Fifth Portfolio",
        baseCurrency: "EUR",
        industrySector: "Banking",
        assetTypes: ["Bonds"],
      });

      expect(portfolio.name).toBe("Fifth Portfolio");
      expect(portfolio.acceptedAssetTypes).toEqual(["Bonds"]);
    });
  });

  describe("PortfolioLimitError", () => {
    it("should have correct name", () => {
      const error = new PortfolioLimitError();
      expect(error.name).toBe("PortfolioLimitError");
    });

    it("should have correct message", () => {
      const error = new PortfolioLimitError();
      expect(error.message).toBe("Maximum portfolios reached (5)");
    });

    it("should be instance of Error", () => {
      const error = new PortfolioLimitError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("checkSimilarPortfolioName (AC-2.1.4)", () => {
    it("should return empty array when no portfolios exist", async () => {
      mockPortfoliosResult = [];

      const result = await checkSimilarPortfolioName(mockUserId, "My Portfolio");

      expect(result).toEqual([]);
    });

    it("should return empty array for empty name input", async () => {
      mockPortfoliosResult = [{ id: "p1", name: "Existing" }];

      const result = await checkSimilarPortfolioName(mockUserId, "");

      expect(result).toEqual([]);
    });

    it("should return empty array for whitespace-only name", async () => {
      mockPortfoliosResult = [{ id: "p1", name: "Existing" }];

      const result = await checkSimilarPortfolioName(mockUserId, "   ");

      expect(result).toEqual([]);
    });

    it("should detect exact match (case-insensitive)", async () => {
      mockPortfoliosResult = [
        { id: "p1", name: "Tech Portfolio" },
        { id: "p2", name: "Retirement Fund" },
      ];

      const result = await checkSimilarPortfolioName(mockUserId, "TECH PORTFOLIO");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "p1",
        name: "Tech Portfolio",
        similarity: "exact",
      });
    });

    it("should detect substring match (input contains existing name)", async () => {
      mockPortfoliosResult = [{ id: "p1", name: "Tech" }];

      const result = await checkSimilarPortfolioName(mockUserId, "Tech Portfolio");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "p1",
        name: "Tech",
        similarity: "similar",
      });
    });

    it("should detect substring match (existing contains input)", async () => {
      mockPortfoliosResult = [{ id: "p1", name: "Tech Portfolio" }];

      const result = await checkSimilarPortfolioName(mockUserId, "Tech");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "p1",
        name: "Tech Portfolio",
        similarity: "similar",
      });
    });

    it("should detect Levenshtein similarity > 70%", async () => {
      // "Retirement" vs "Retirment" - 1 char difference out of 10 = 90% similar
      mockPortfoliosResult = [{ id: "p1", name: "Retirement" }];

      const result = await checkSimilarPortfolioName(mockUserId, "Retirment");

      expect(result).toHaveLength(1);
      expect(result[0]?.similarity).toBe("similar");
    });

    it("should not match names with < 70% Levenshtein similarity", async () => {
      // "Tech" vs "Bond" - completely different
      mockPortfoliosResult = [{ id: "p1", name: "Technology Stocks" }];

      const result = await checkSimilarPortfolioName(mockUserId, "Bond Fund");

      expect(result).toHaveLength(0);
    });

    it("should return multiple matches when applicable", async () => {
      mockPortfoliosResult = [
        { id: "p1", name: "Tech Portfolio" },
        { id: "p2", name: "Tech Fund" },
        { id: "p3", name: "Bond Portfolio" },
      ];

      const result = await checkSimilarPortfolioName(mockUserId, "Tech");

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toContain("p1");
      expect(result.map((r) => r.id)).toContain("p2");
    });

    it("should prioritize exact match over similar", async () => {
      mockPortfoliosResult = [
        { id: "p1", name: "Tech" },
        { id: "p2", name: "Tech Portfolio" },
      ];

      const result = await checkSimilarPortfolioName(mockUserId, "Tech");

      const exactMatch = result.find((r) => r.id === "p1");
      const similarMatch = result.find((r) => r.id === "p2");

      expect(exactMatch?.similarity).toBe("exact");
      expect(similarMatch?.similarity).toBe("similar");
    });

    it("should trim input name before comparison", async () => {
      mockPortfoliosResult = [{ id: "p1", name: "Tech Portfolio" }];

      const result = await checkSimilarPortfolioName(mockUserId, "  Tech Portfolio  ");

      expect(result).toHaveLength(1);
      expect(result[0]?.similarity).toBe("exact");
    });
  });
});
