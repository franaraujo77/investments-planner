/**
 * Portfolio Service Unit Tests
 *
 * Story 3.1: Create Portfolio
 *
 * Tests for portfolio service functions:
 * - AC-3.1.3: createPortfolio creates with valid input
 * - AC-3.1.4: createPortfolio enforces 5 portfolio limit
 * - Multi-tenant isolation: getUserPortfolios returns only user's portfolios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Storage for mock control
let mockPortfolioCountResult: { count: number }[] = [];
let mockPortfoliosResult: unknown[] = [];
let mockInsertResult: unknown[] = [];

// Mock drizzle-orm operators first (before db mock)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
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
}));

// Import after mocks
import {
  createPortfolio,
  getUserPortfolios,
  getPortfolioCount,
  getPortfolioById,
  canCreatePortfolio,
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
    it("should create portfolio with valid input (AC-3.1.3)", async () => {
      const mockCreatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: "My Portfolio",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPortfolioCountResult = [{ count: 0 }];
      mockInsertResult = [mockCreatedPortfolio];

      const portfolio = await createPortfolio(mockUserId, { name: "My Portfolio" });

      expect(portfolio).toEqual(mockCreatedPortfolio);
    });

    it("should throw PortfolioLimitError when user has 5 portfolios (AC-3.1.4)", async () => {
      mockPortfolioCountResult = [{ count: 5 }];

      await expect(createPortfolio(mockUserId, { name: "New Portfolio" })).rejects.toThrow(
        PortfolioLimitError
      );
    });

    it("should throw PortfolioLimitError with correct message", async () => {
      mockPortfolioCountResult = [{ count: 5 }];

      await expect(createPortfolio(mockUserId, { name: "New Portfolio" })).rejects.toThrow(
        "Maximum portfolios reached (5)"
      );
    });

    it("should create portfolio when user has 4 portfolios", async () => {
      const mockCreatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: "Fifth Portfolio",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPortfolioCountResult = [{ count: 4 }];
      mockInsertResult = [mockCreatedPortfolio];

      const portfolio = await createPortfolio(mockUserId, { name: "Fifth Portfolio" });

      expect(portfolio.name).toBe("Fifth Portfolio");
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
});
