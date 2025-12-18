/**
 * User Query Service Tests
 *
 * Story 8.2: Overnight Scoring Job
 * AC-8.2.3: User Portfolio Processing - query active users with portfolios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database
const mockDbSelect = vi.fn();
const mockDbFrom = vi.fn();
const mockDbWhere = vi.fn();
const mockDbChain = {
  select: mockDbSelect,
  from: mockDbFrom,
  where: mockDbWhere,
};

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockDbChain,
  },
}));

// Mock schema
vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email", baseCurrency: "baseCurrency", deletedAt: "deletedAt" },
  portfolios: { id: "id", userId: "userId", name: "name" },
  portfolioAssets: {
    id: "id",
    portfolioId: "portfolioId",
    symbol: "symbol",
    quantity: "quantity",
    currency: "currency",
    isIgnored: "isIgnored",
  },
  criteriaVersions: {
    id: "id",
    userId: "userId",
    assetType: "assetType",
    targetMarket: "targetMarket",
    criteria: "criteria",
    isActive: "isActive",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", field: a, value: b })),
  and: vi.fn((...conditions) => ({ type: "and", conditions })),
  isNull: vi.fn((field) => ({ type: "isNull", field })),
  inArray: vi.fn((field, values) => ({ type: "inArray", field, values })),
}));

import { UserQueryService } from "@/lib/services/user-query-service";

describe("UserQueryService", () => {
  let service: UserQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserQueryService();

    // Default chain behavior
    mockDbSelect.mockReturnValue(mockDbChain);
    mockDbFrom.mockReturnValue(mockDbChain);
    mockDbWhere.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getActiveUsersWithPortfolios", () => {
    it("should return empty array when no active users", async () => {
      mockDbWhere.mockResolvedValueOnce([]);

      const result = await service.getActiveUsersWithPortfolios();

      expect(result).toEqual([]);
    });

    it("should filter out users without portfolios", async () => {
      // Users exist
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test@example.com", baseCurrency: "USD" },
      ]);
      // No portfolios
      mockDbWhere.mockResolvedValueOnce([]);

      const result = await service.getActiveUsersWithPortfolios();

      expect(result).toEqual([]);
    });

    it("should return users with their portfolios and assets", async () => {
      // Users
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test@example.com", baseCurrency: "USD" },
      ]);
      // Portfolios
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", portfolioId: "portfolio-1", portfolioName: "Main" },
      ]);
      // Assets
      mockDbWhere.mockResolvedValueOnce([
        {
          portfolioId: "portfolio-1",
          assetId: "asset-1",
          symbol: "AAPL",
          quantity: "10",
          currency: "USD",
          isIgnored: false,
        },
      ]);
      // Criteria
      mockDbWhere.mockResolvedValueOnce([
        {
          userId: "user-1",
          versionId: "criteria-1",
          assetType: "stock",
          targetMarket: "US_TECH",
          criteria: [
            { id: "c1", name: "Test", metric: "pe_ratio", operator: "lt", value: "20", points: 10 },
          ],
        },
      ]);

      const result = await service.getActiveUsersWithPortfolios();

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-1");
      expect(result[0].portfolioId).toBe("portfolio-1");
      expect(result[0].assets).toHaveLength(1);
      expect(result[0].assets[0].symbol).toBe("AAPL");
      expect(result[0].criteria).toBeDefined();
    });

    it("should skip ignored assets", async () => {
      // Users
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test@example.com", baseCurrency: "USD" },
      ]);
      // Portfolios
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", portfolioId: "portfolio-1", portfolioName: "Main" },
      ]);
      // Assets - one active, one ignored
      mockDbWhere.mockResolvedValueOnce([
        {
          portfolioId: "portfolio-1",
          assetId: "asset-1",
          symbol: "AAPL",
          quantity: "10",
          currency: "USD",
          isIgnored: false,
        },
        {
          portfolioId: "portfolio-1",
          assetId: "asset-2",
          symbol: "GOOG",
          quantity: "5",
          currency: "USD",
          isIgnored: true, // Should be filtered out
        },
      ]);
      // Criteria
      mockDbWhere.mockResolvedValueOnce([]);

      const result = await service.getActiveUsersWithPortfolios();

      expect(result).toHaveLength(1);
      expect(result[0].assets).toHaveLength(1);
      expect(result[0].assets[0].symbol).toBe("AAPL");
    });

    it("should handle users without criteria", async () => {
      // Users
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test@example.com", baseCurrency: "USD" },
      ]);
      // Portfolios
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", portfolioId: "portfolio-1", portfolioName: "Main" },
      ]);
      // Assets
      mockDbWhere.mockResolvedValueOnce([
        {
          portfolioId: "portfolio-1",
          assetId: "asset-1",
          symbol: "AAPL",
          quantity: "10",
          currency: "USD",
          isIgnored: false,
        },
      ]);
      // No criteria
      mockDbWhere.mockResolvedValueOnce([]);

      const result = await service.getActiveUsersWithPortfolios();

      expect(result).toHaveLength(1);
      expect(result[0].criteria).toBeNull();
    });
  });

  describe("getUserBatch", () => {
    it("should return a batch of users with offset and total", async () => {
      // Setup mock for getActiveUsersWithPortfolios
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test1@example.com", baseCurrency: "USD" },
        { userId: "user-2", email: "test2@example.com", baseCurrency: "USD" },
        { userId: "user-3", email: "test3@example.com", baseCurrency: "USD" },
      ]);
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", portfolioId: "p-1", portfolioName: "P1" },
        { userId: "user-2", portfolioId: "p-2", portfolioName: "P2" },
        { userId: "user-3", portfolioId: "p-3", portfolioName: "P3" },
      ]);
      mockDbWhere.mockResolvedValueOnce([
        {
          portfolioId: "p-1",
          assetId: "a-1",
          symbol: "AAPL",
          quantity: "10",
          currency: "USD",
          isIgnored: false,
        },
        {
          portfolioId: "p-2",
          assetId: "a-2",
          symbol: "GOOG",
          quantity: "5",
          currency: "USD",
          isIgnored: false,
        },
        {
          portfolioId: "p-3",
          assetId: "a-3",
          symbol: "MSFT",
          quantity: "8",
          currency: "USD",
          isIgnored: false,
        },
      ]);
      mockDbWhere.mockResolvedValueOnce([]);

      const result = await service.getUserBatch(0, 2);

      expect(result.offset).toBe(0);
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it("should respect batch size limit", async () => {
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test1@example.com", baseCurrency: "USD" },
      ]);
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", portfolioId: "p-1", portfolioName: "P1" },
      ]);
      mockDbWhere.mockResolvedValueOnce([
        {
          portfolioId: "p-1",
          assetId: "a-1",
          symbol: "AAPL",
          quantity: "10",
          currency: "USD",
          isIgnored: false,
        },
      ]);
      mockDbWhere.mockResolvedValueOnce([]);

      const result = await service.getUserBatch(0, 50);

      expect(result.users.length).toBeLessThanOrEqual(50);
    });
  });

  describe("getActiveUserCount", () => {
    it("should return count of active users with portfolios", async () => {
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", email: "test@example.com", baseCurrency: "USD" },
      ]);
      mockDbWhere.mockResolvedValueOnce([
        { userId: "user-1", portfolioId: "p-1", portfolioName: "Main" },
      ]);
      mockDbWhere.mockResolvedValueOnce([
        {
          portfolioId: "p-1",
          assetId: "a-1",
          symbol: "AAPL",
          quantity: "10",
          currency: "USD",
          isIgnored: false,
        },
      ]);
      mockDbWhere.mockResolvedValueOnce([]);

      const count = await service.getActiveUserCount();

      expect(count).toBe(1);
    });
  });

  describe("getUniqueAssetSymbols", () => {
    it("should return unique symbols from all portfolios", async () => {
      mockDbWhere.mockResolvedValueOnce([
        { symbol: "AAPL" },
        { symbol: "GOOG" },
        { symbol: "AAPL" }, // Duplicate
        { symbol: "MSFT" },
      ]);

      const symbols = await service.getUniqueAssetSymbols();

      expect(symbols).toHaveLength(3);
      expect(symbols).toContain("AAPL");
      expect(symbols).toContain("GOOG");
      expect(symbols).toContain("MSFT");
    });
  });

  describe("getUniqueCurrencies", () => {
    it("should return unique currencies from assets and users", async () => {
      // Asset currencies
      mockDbSelect.mockReturnValue(mockDbChain);
      mockDbFrom.mockResolvedValueOnce([
        { currency: "USD" },
        { currency: "BRL" },
        { currency: "USD" },
      ]);
      // User base currencies
      mockDbFrom.mockReturnValue(mockDbChain);
      mockDbWhere.mockResolvedValueOnce([{ baseCurrency: "USD" }, { baseCurrency: "EUR" }]);

      const currencies = await service.getUniqueCurrencies();

      expect(currencies).toContain("USD");
      expect(currencies).toContain("BRL");
      expect(currencies).toContain("EUR");
    });
  });
});
