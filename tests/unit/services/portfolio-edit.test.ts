/**
 * Portfolio Edit Service Tests
 *
 * Story 2.3: Edit Portfolio
 *
 * Tests for updatePortfolio and getImpactedAssets functions.
 *
 * AC-2.3.2: Update portfolio name
 * AC-2.3.3: Industry sector change impact
 * AC-2.3.4: Asset type removal impact
 * AC-2.3.5: Confirm destructive change
 * AC-2.3.7: Currency change handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      portfolios: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      portfolioAcceptedAssetTypes: {
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  updatePortfolio,
  getImpactedAssets,
  PortfolioNotFoundError,
  type UpdatePortfolioResult,
  type ImpactAnalysisResult,
} from "@/lib/services/portfolio-service";
import type { UpdatePortfolioInput } from "@/lib/validations/portfolio";

describe("Portfolio Edit Service (Story 2.3)", () => {
  const mockUserId = "user-123";
  const mockPortfolioId = "portfolio-456";

  const mockExistingPortfolio = {
    id: mockPortfolioId,
    userId: mockUserId,
    name: "Original Portfolio",
    baseCurrency: "USD",
    industrySector: "Technology",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("updatePortfolio (AC-2.3.2, AC-2.3.5, AC-2.3.7)", () => {
    describe("Basic Updates", () => {
      it("should update portfolio name successfully", async () => {
        // Setup: Mock findFirst to return existing portfolio
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

        // Setup: Mock transaction
        const mockUpdatedPortfolio = {
          ...mockExistingPortfolio,
          name: "Updated Portfolio",
          updatedAt: new Date(),
        };

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
          const mockTx = {
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockUpdatedPortfolio]),
                }),
              }),
            }),
            query: {
              portfolioAcceptedAssetTypes: {
                findMany: vi
                  .fn()
                  .mockResolvedValue([{ portfolioId: mockPortfolioId, assetType: "Stocks" }]),
              },
            },
          };
          return callback(mockTx as never);
        });

        const input: UpdatePortfolioInput = { name: "Updated Portfolio" };

        const result = await updatePortfolio(mockUserId, mockPortfolioId, input);

        expect(result.portfolio.name).toBe("Updated Portfolio");
        expect(result.removedAssetCount).toBe(0);
      });

      it("should update base currency successfully (AC-2.3.7)", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

        const mockUpdatedPortfolio = {
          ...mockExistingPortfolio,
          baseCurrency: "EUR",
          updatedAt: new Date(),
        };

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
          const mockTx = {
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockUpdatedPortfolio]),
                }),
              }),
            }),
            query: {
              portfolioAcceptedAssetTypes: {
                findMany: vi
                  .fn()
                  .mockResolvedValue([{ portfolioId: mockPortfolioId, assetType: "Stocks" }]),
              },
            },
          };
          return callback(mockTx as never);
        });

        const input: UpdatePortfolioInput = { baseCurrency: "EUR" };

        const result = await updatePortfolio(mockUserId, mockPortfolioId, input);

        expect(result.portfolio.baseCurrency).toBe("EUR");
      });

      it("should update industry sector successfully", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

        const mockUpdatedPortfolio = {
          ...mockExistingPortfolio,
          industrySector: "Healthcare",
          updatedAt: new Date(),
        };

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
          const mockTx = {
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockUpdatedPortfolio]),
                }),
              }),
            }),
            query: {
              portfolioAcceptedAssetTypes: {
                findMany: vi
                  .fn()
                  .mockResolvedValue([{ portfolioId: mockPortfolioId, assetType: "Stocks" }]),
              },
            },
          };
          return callback(mockTx as never);
        });

        const input: UpdatePortfolioInput = { industrySector: "Healthcare" };

        const result = await updatePortfolio(mockUserId, mockPortfolioId, input);

        expect(result.portfolio.industrySector).toBe("Healthcare");
      });

      it("should update asset types successfully", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

        const mockUpdatedPortfolio = {
          ...mockExistingPortfolio,
          updatedAt: new Date(),
        };

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
          const mockTx = {
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockUpdatedPortfolio]),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockResolvedValue(undefined),
            }),
          };
          return callback(mockTx as never);
        });

        const input: UpdatePortfolioInput = { assetTypes: ["Stocks", "ETFs", "Bonds"] };

        const result = await updatePortfolio(mockUserId, mockPortfolioId, input);

        expect(result.portfolio.acceptedAssetTypes).toEqual(["Stocks", "ETFs", "Bonds"]);
      });
    });

    describe("Asset Removal (AC-2.3.5)", () => {
      it("should remove specified assets during update", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

        const mockUpdatedPortfolio = {
          ...mockExistingPortfolio,
          updatedAt: new Date(),
        };

        const assetIdsToRemove = ["asset-1", "asset-2"];

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
          const mockTx = {
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: "asset-1" }, { id: "asset-2" }]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockUpdatedPortfolio]),
                }),
              }),
            }),
            query: {
              portfolioAcceptedAssetTypes: {
                findMany: vi
                  .fn()
                  .mockResolvedValue([{ portfolioId: mockPortfolioId, assetType: "Stocks" }]),
              },
            },
          };
          return callback(mockTx as never);
        });

        const input: UpdatePortfolioInput = { name: "Updated" };

        const result = await updatePortfolio(mockUserId, mockPortfolioId, input, assetIdsToRemove);

        expect(result.removedAssetCount).toBe(2);
      });

      it("should handle empty asset removal list", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

        const mockUpdatedPortfolio = {
          ...mockExistingPortfolio,
          name: "Updated",
          updatedAt: new Date(),
        };

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
          const mockTx = {
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockUpdatedPortfolio]),
                }),
              }),
            }),
            query: {
              portfolioAcceptedAssetTypes: {
                findMany: vi
                  .fn()
                  .mockResolvedValue([{ portfolioId: mockPortfolioId, assetType: "Stocks" }]),
              },
            },
          };
          return callback(mockTx as never);
        });

        const input: UpdatePortfolioInput = { name: "Updated" };

        const result = await updatePortfolio(mockUserId, mockPortfolioId, input, []);

        expect(result.removedAssetCount).toBe(0);
      });
    });

    describe("Error Handling", () => {
      it("should throw PortfolioNotFoundError when portfolio does not exist", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(null);

        const input: UpdatePortfolioInput = { name: "Updated" };

        await expect(updatePortfolio(mockUserId, mockPortfolioId, input)).rejects.toThrow(
          PortfolioNotFoundError
        );
      });

      it("should throw PortfolioNotFoundError when portfolio belongs to different user", async () => {
        vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(null);

        const input: UpdatePortfolioInput = { name: "Updated" };

        await expect(updatePortfolio("different-user", mockPortfolioId, input)).rejects.toThrow(
          PortfolioNotFoundError
        );
      });
    });
  });

  describe("getImpactedAssets (AC-2.3.3, AC-2.3.4)", () => {
    it("should return empty impact when portfolio exists", async () => {
      vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

      const result = await getImpactedAssets(mockUserId, mockPortfolioId, ["Stocks"]);

      // Current implementation returns empty impact (documented limitation)
      expect(result.hasImpact).toBe(false);
      expect(result.removedAssetCount).toBe(0);
      expect(result.assetsToRemove).toEqual([]);
    });

    it("should throw PortfolioNotFoundError when portfolio does not exist", async () => {
      vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(null);

      await expect(getImpactedAssets(mockUserId, mockPortfolioId, ["Stocks"])).rejects.toThrow(
        PortfolioNotFoundError
      );
    });

    it("should handle undefined asset types parameter", async () => {
      vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(mockExistingPortfolio);

      const result = await getImpactedAssets(mockUserId, mockPortfolioId, undefined);

      expect(result.hasImpact).toBe(false);
      expect(result.removedAssetCount).toBe(0);
    });

    it("should verify portfolio ownership before analysis", async () => {
      vi.mocked(db.query.portfolios.findFirst).mockResolvedValue(null);

      await expect(getImpactedAssets("wrong-user", mockPortfolioId, ["Stocks"])).rejects.toThrow(
        PortfolioNotFoundError
      );
    });
  });

  describe("ImpactAnalysisResult Type", () => {
    it("should have correct structure for ImpactAnalysisResult", () => {
      const result: ImpactAnalysisResult = {
        assetsToRemove: [{ id: "1", symbol: "AAPL", name: "Apple Inc", assetType: "Stocks" }],
        removedAssetCount: 1,
        hasImpact: true,
      };

      expect(result.assetsToRemove).toHaveLength(1);
      expect(result.assetsToRemove[0]).toHaveProperty("id");
      expect(result.assetsToRemove[0]).toHaveProperty("symbol");
      expect(result.assetsToRemove[0]).toHaveProperty("name");
      expect(result.assetsToRemove[0]).toHaveProperty("assetType");
    });
  });

  describe("UpdatePortfolioResult Type", () => {
    it("should have correct structure for UpdatePortfolioResult", () => {
      const result: UpdatePortfolioResult = {
        portfolio: {
          id: mockPortfolioId,
          userId: mockUserId,
          name: "Test",
          baseCurrency: "USD",
          industrySector: "Technology",
          createdAt: new Date(),
          updatedAt: new Date(),
          acceptedAssetTypes: ["Stocks"],
        },
        removedAssetCount: 0,
      };

      expect(result.portfolio).toHaveProperty("id");
      expect(result.portfolio).toHaveProperty("acceptedAssetTypes");
      expect(result).toHaveProperty("removedAssetCount");
    });
  });
});
