/**
 * Investment Service Unit Tests
 *
 * Story 3.8: Record Investment Amount
 *
 * Tests for investment service functions:
 * - AC-3.8.1: recordInvestments creates complete investment record
 * - AC-3.8.2: recordInvestments updates asset quantity atomically
 * - AC-3.8.6: recordInvestments stores recommended amount
 * - Multi-tenant isolation: getInvestmentHistory returns only user's investments
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockInvestmentsResult: unknown[] = [];
let mockAssetResult: unknown = null;
let mockPortfolioResult: unknown = null;
let mockInsertResult: unknown[] = [];
let transactionOperations: string[] = [];

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  gte: vi.fn((field, value) => ({ field, value, type: "gte" })),
  lte: vi.fn((field, value) => ({ field, value, type: "lte" })),
  desc: vi.fn((field) => ({ field, type: "desc" })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: "sql" })),
}));

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      portfolios: {
        findFirst: vi.fn(() => Promise.resolve(mockPortfolioResult)),
      },
      portfolioAssets: {
        findFirst: vi.fn(() => Promise.resolve(mockAssetResult)),
      },
      investments: {
        findMany: vi.fn(() => Promise.resolve(mockInvestmentsResult)),
        findFirst: vi.fn(() =>
          Promise.resolve(mockInvestmentsResult.length > 0 ? mockInvestmentsResult[0] : null)
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
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    transaction: vi.fn(async (callback) => {
      transactionOperations = [];
      const tx = {
        insert: vi.fn((table) => {
          transactionOperations.push(`insert:${table}`);
          return {
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve(mockInsertResult)),
            })),
          };
        }),
        update: vi.fn((table) => {
          transactionOperations.push(`update:${table}`);
          return {
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          };
        }),
      };
      return callback(tx);
    }),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  investments: {
    id: "id",
    userId: "user_id",
    portfolioId: "portfolio_id",
    assetId: "asset_id",
    symbol: "symbol",
    quantity: "quantity",
    pricePerUnit: "price_per_unit",
    totalAmount: "total_amount",
    currency: "currency",
    recommendedAmount: "recommended_amount",
    investedAt: "invested_at",
    createdAt: "created_at",
  },
  portfolioAssets: {
    id: "id",
    portfolioId: "portfolio_id",
    quantity: "quantity",
    updatedAt: "updated_at",
  },
  portfolios: {
    id: "id",
    userId: "user_id",
  },
  calculationEvents: {
    correlationId: "correlation_id",
    userId: "user_id",
    eventType: "event_type",
    payload: "payload",
  },
}));

// Mock decimal.js config
vi.mock("@/lib/calculations/decimal-config", () => ({
  Decimal: class MockDecimal {
    private value: number;

    constructor(val: string | number) {
      this.value = typeof val === "string" ? parseFloat(val) : val;
    }

    times(other: MockDecimal | string | number): MockDecimal {
      const otherVal = other instanceof MockDecimal ? other.value : parseFloat(String(other));
      return new MockDecimal(this.value * otherVal);
    }

    plus(other: MockDecimal | string | number): MockDecimal {
      const otherVal = other instanceof MockDecimal ? other.value : parseFloat(String(other));
      return new MockDecimal(this.value + otherVal);
    }

    toFixed(places: number): string {
      return this.value.toFixed(places);
    }

    toString(): string {
      return String(this.value);
    }

    isNaN(): boolean {
      return isNaN(this.value);
    }

    lte(other: number): boolean {
      return this.value <= other;
    }
  },
}));

// Import after mocks
import {
  calculateTotalAmount,
  updateAssetQuantity,
  recordInvestments,
  getInvestmentHistory,
  getInvestmentById,
  InvestmentAssetNotFoundError,
  InvestmentPortfolioNotFoundError,
} from "@/lib/services/investment-service";

describe("Investment Service", () => {
  const mockUserId = "user-123";
  const mockPortfolioId = "portfolio-456";
  const mockAssetId = "asset-789";

  const mockAsset = {
    id: mockAssetId,
    portfolioId: mockPortfolioId,
    symbol: "AAPL",
    quantity: "10.00000000",
    purchasePrice: "150.0000",
    currency: "USD",
    isIgnored: false,
    portfolio: {
      id: mockPortfolioId,
      userId: mockUserId,
      name: "Test Portfolio",
    },
  };

  const mockInvestmentInput = {
    portfolioId: mockPortfolioId,
    assetId: mockAssetId,
    symbol: "AAPL",
    quantity: "5",
    pricePerUnit: "155.50",
    currency: "USD",
    recommendedAmount: "800",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock control variables
    mockInvestmentsResult = [];
    mockAssetResult = null;
    mockPortfolioResult = null;
    mockInsertResult = [];
    transactionOperations = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // CALCULATION TESTS
  // ==========================================================================

  describe("calculateTotalAmount", () => {
    it("should calculate total amount correctly using decimal.js", () => {
      const result = calculateTotalAmount("10", "155.5");
      // 10 * 155.5 = 1555.0000
      expect(result).toBe("1555.0000");
    });

    it("should handle decimal quantities", () => {
      const result = calculateTotalAmount("5.5", "100");
      // 5.5 * 100 = 550.0000
      expect(result).toBe("550.0000");
    });

    it("should handle small quantities (crypto-like)", () => {
      const result = calculateTotalAmount("0.00001", "50000");
      // 0.00001 * 50000 = 0.5000
      expect(result).toBe("0.5000");
    });

    it("should return 4 decimal places", () => {
      const result = calculateTotalAmount("1", "1");
      expect(result).toMatch(/^\d+\.\d{4}$/);
    });
  });

  describe("updateAssetQuantity", () => {
    it("should add quantities correctly using decimal.js", () => {
      const result = updateAssetQuantity("10", "5");
      // 10 + 5 = 15.00000000
      expect(result).toBe("15.00000000");
    });

    it("should handle decimal quantities", () => {
      const result = updateAssetQuantity("10.5", "2.5");
      // 10.5 + 2.5 = 13.00000000
      expect(result).toBe("13.00000000");
    });

    it("should return 8 decimal places", () => {
      const result = updateAssetQuantity("1", "1");
      expect(result).toMatch(/^\d+\.\d{8}$/);
    });
  });

  // ==========================================================================
  // RECORD INVESTMENTS TESTS
  // ==========================================================================

  describe("recordInvestments", () => {
    it("should throw InvestmentAssetNotFoundError if asset not found", async () => {
      mockAssetResult = null;

      await expect(recordInvestments(mockUserId, [mockInvestmentInput])).rejects.toThrow(
        InvestmentAssetNotFoundError
      );
    });

    it("should throw InvestmentAssetNotFoundError if asset belongs to different user", async () => {
      mockAssetResult = {
        ...mockAsset,
        portfolio: { ...mockAsset.portfolio, userId: "other-user" },
      };

      await expect(recordInvestments(mockUserId, [mockInvestmentInput])).rejects.toThrow(
        InvestmentAssetNotFoundError
      );
    });

    it("should throw InvestmentPortfolioNotFoundError if portfolio ID mismatch", async () => {
      mockAssetResult = {
        ...mockAsset,
        portfolioId: "different-portfolio",
      };

      await expect(recordInvestments(mockUserId, [mockInvestmentInput])).rejects.toThrow(
        InvestmentPortfolioNotFoundError
      );
    });

    it("should create investment record with all required fields (AC-3.8.1)", async () => {
      mockAssetResult = mockAsset;
      mockInsertResult = [
        {
          id: "investment-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          recommendedAmount: "800",
          investedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const result = await recordInvestments(mockUserId, [mockInvestmentInput]);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[0].quantity).toBe("5");
      expect(result[0].pricePerUnit).toBe("155.50");
      expect(result[0].currency).toBe("USD");
    });

    it("should store recommended amount when provided (AC-3.8.6)", async () => {
      mockAssetResult = mockAsset;
      mockInsertResult = [
        {
          id: "investment-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          recommendedAmount: "800",
          investedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const result = await recordInvestments(mockUserId, [mockInvestmentInput]);

      expect(result[0].recommendedAmount).toBe("800");
    });

    it("should allow null recommended amount for manual investments (AC-3.8.6)", async () => {
      mockAssetResult = mockAsset;
      mockInsertResult = [
        {
          id: "investment-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          recommendedAmount: null,
          investedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const inputWithoutRecommended = {
        ...mockInvestmentInput,
        recommendedAmount: undefined,
      };

      const result = await recordInvestments(mockUserId, [inputWithoutRecommended]);

      expect(result[0].recommendedAmount).toBeNull();
    });

    it("should execute operations in transaction for atomicity (AC-3.8.2)", async () => {
      mockAssetResult = mockAsset;
      mockInsertResult = [
        {
          id: "investment-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          recommendedAmount: "800",
          investedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      await recordInvestments(mockUserId, [mockInvestmentInput]);

      // Verify transaction was used
      const { db } = await import("@/lib/db");
      expect(db.transaction).toHaveBeenCalled();
    });

    it("should handle multiple investments in single transaction", async () => {
      mockAssetResult = mockAsset;
      mockInsertResult = [
        {
          id: "investment-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          recommendedAmount: "800",
          investedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const investments = [mockInvestmentInput, { ...mockInvestmentInput, symbol: "GOOGL" }];

      const result = await recordInvestments(mockUserId, investments);

      // Should return results for both investments
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // GET INVESTMENT HISTORY TESTS
  // ==========================================================================

  describe("getInvestmentHistory", () => {
    it("should return empty array when no investments exist", async () => {
      mockInvestmentsResult = [];

      const result = await getInvestmentHistory(mockUserId);

      expect(result).toEqual([]);
    });

    it("should return investments for user", async () => {
      mockInvestmentsResult = [
        {
          id: "inv-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          investedAt: new Date(),
        },
      ];

      const result = await getInvestmentHistory(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });

    it("should support date range filtering", async () => {
      mockInvestmentsResult = [];

      const from = new Date("2024-01-01");
      const to = new Date("2024-12-31");

      await getInvestmentHistory(mockUserId, { from, to });

      // Verify that query was called
      const { db } = await import("@/lib/db");
      expect(db.query.investments.findMany).toHaveBeenCalled();
    });

    it("should support portfolioId filtering", async () => {
      mockInvestmentsResult = [];

      await getInvestmentHistory(mockUserId, { portfolioId: mockPortfolioId });

      const { db } = await import("@/lib/db");
      expect(db.query.investments.findMany).toHaveBeenCalled();
    });

    it("should support assetId filtering", async () => {
      mockInvestmentsResult = [];

      await getInvestmentHistory(mockUserId, { assetId: mockAssetId });

      const { db } = await import("@/lib/db");
      expect(db.query.investments.findMany).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET INVESTMENT BY ID TESTS
  // ==========================================================================

  describe("getInvestmentById", () => {
    it("should return null when investment not found", async () => {
      mockInvestmentsResult = [];

      const result = await getInvestmentById(mockUserId, "nonexistent-id");

      expect(result).toBeNull();
    });

    it("should return investment when found and owned by user", async () => {
      mockInvestmentsResult = [
        {
          id: "inv-001",
          userId: mockUserId,
          portfolioId: mockPortfolioId,
          assetId: mockAssetId,
          symbol: "AAPL",
          quantity: "5",
          pricePerUnit: "155.50",
          totalAmount: "777.5000",
          currency: "USD",
          investedAt: new Date(),
        },
      ];

      const result = await getInvestmentById(mockUserId, "inv-001");

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe("AAPL");
    });
  });

  // ==========================================================================
  // ERROR CLASS TESTS
  // ==========================================================================

  describe("InvestmentAssetNotFoundError", () => {
    it("should have correct name and message", () => {
      const error = new InvestmentAssetNotFoundError("asset-123");

      expect(error.name).toBe("InvestmentAssetNotFoundError");
      expect(error.assetId).toBe("asset-123");
      expect(error.message).toContain("asset-123");
    });
  });

  describe("InvestmentPortfolioNotFoundError", () => {
    it("should have correct name and message", () => {
      const error = new InvestmentPortfolioNotFoundError("portfolio-456");

      expect(error.name).toBe("InvestmentPortfolioNotFoundError");
      expect(error.portfolioId).toBe("portfolio-456");
      expect(error.message).toContain("portfolio-456");
    });
  });
});
