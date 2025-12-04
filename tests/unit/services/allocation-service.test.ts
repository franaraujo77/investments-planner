/**
 * Allocation Service Tests
 *
 * Story 3.7: Allocation Percentage View
 * Tests for allocation calculation and aggregation logic.
 *
 * Test Coverage:
 * - calculateAllocationStatus
 * - formatAllocationPercent
 * - Status determination (under/on-target/over/no-target)
 * - Decimal precision maintained
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateAllocationStatus,
  formatAllocationPercent,
  getAllocationBreakdown,
} from "@/lib/services/allocation-service";
import * as portfolioService from "@/lib/services/portfolio-service";

// Mock portfolio service
vi.mock("@/lib/services/portfolio-service", () => ({
  getPortfolioWithValues: vi.fn(),
  PortfolioNotFoundError: class PortfolioNotFoundError extends Error {
    constructor() {
      super("Portfolio not found");
      this.name = "PortfolioNotFoundError";
    }
  },
}));

describe("Allocation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateAllocationStatus", () => {
    it("should return 'no-target' when targetMin is null", () => {
      const status = calculateAllocationStatus("50", null, "70");
      expect(status).toBe("no-target");
    });

    it("should return 'no-target' when targetMax is null", () => {
      const status = calculateAllocationStatus("50", "40", null);
      expect(status).toBe("no-target");
    });

    it("should return 'no-target' when both targets are null", () => {
      const status = calculateAllocationStatus("50", null, null);
      expect(status).toBe("no-target");
    });

    it("should return 'under' when current is below targetMin", () => {
      const status = calculateAllocationStatus("35", "40", "60");
      expect(status).toBe("under");
    });

    it("should return 'on-target' when current equals targetMin", () => {
      const status = calculateAllocationStatus("40", "40", "60");
      expect(status).toBe("on-target");
    });

    it("should return 'on-target' when current is within range", () => {
      const status = calculateAllocationStatus("50", "40", "60");
      expect(status).toBe("on-target");
    });

    it("should return 'on-target' when current equals targetMax", () => {
      const status = calculateAllocationStatus("60", "40", "60");
      expect(status).toBe("on-target");
    });

    it("should return 'over' when current is above targetMax", () => {
      const status = calculateAllocationStatus("65", "40", "60");
      expect(status).toBe("over");
    });

    it("should handle decimal values correctly", () => {
      // 42.5 is within 40-50 range
      expect(calculateAllocationStatus("42.5", "40", "50")).toBe("on-target");

      // 39.9 is below 40 (just under)
      expect(calculateAllocationStatus("39.9", "40", "50")).toBe("under");

      // 50.1 is above 50 (just over)
      expect(calculateAllocationStatus("50.1", "40", "50")).toBe("over");
    });

    it("should handle very small differences correctly", () => {
      // Test decimal precision
      expect(calculateAllocationStatus("39.9999", "40", "50")).toBe("under");
      expect(calculateAllocationStatus("40.0000", "40", "50")).toBe("on-target");
      expect(calculateAllocationStatus("50.0001", "40", "50")).toBe("over");
    });

    it("should return 'no-target' for invalid numeric values", () => {
      expect(calculateAllocationStatus("invalid", "40", "50")).toBe("no-target");
    });
  });

  describe("formatAllocationPercent", () => {
    it("should format to 1 decimal precision", () => {
      expect(formatAllocationPercent("42.567")).toBe("42.6");
      expect(formatAllocationPercent("42.543")).toBe("42.5");
      expect(formatAllocationPercent("42.555")).toBe("42.6"); // Banker's rounding
    });

    it("should handle whole numbers", () => {
      expect(formatAllocationPercent("42")).toBe("42.0");
      expect(formatAllocationPercent("100")).toBe("100.0");
    });

    it("should handle zero", () => {
      expect(formatAllocationPercent("0")).toBe("0.0");
      expect(formatAllocationPercent("0.0")).toBe("0.0");
    });

    it("should handle very small values", () => {
      expect(formatAllocationPercent("0.123")).toBe("0.1");
      expect(formatAllocationPercent("0.089")).toBe("0.1");
    });

    it("should handle values over 100", () => {
      expect(formatAllocationPercent("125.5678")).toBe("125.6");
    });

    it("should return '0.0' for invalid input", () => {
      expect(formatAllocationPercent("invalid")).toBe("0.0");
    });
  });

  describe("getAllocationBreakdown", () => {
    const mockPortfolioData: portfolioService.PortfolioWithValues = {
      portfolio: {
        id: "portfolio-1",
        userId: "user-1",
        name: "Test Portfolio",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      assets: [
        {
          id: "asset-1",
          portfolioId: "portfolio-1",
          symbol: "VOO",
          name: "Vanguard S&P 500",
          quantity: "10",
          purchasePrice: "400",
          currency: "USD",
          isIgnored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          currentPrice: "450",
          valueNative: "4500",
          valueBase: "4500",
          exchangeRate: "1",
          allocationPercent: "45",
          priceUpdatedAt: new Date(),
        },
        {
          id: "asset-2",
          portfolioId: "portfolio-1",
          symbol: "BND",
          name: "Vanguard Total Bond",
          quantity: "50",
          purchasePrice: "80",
          currency: "USD",
          isIgnored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          currentPrice: "75",
          valueNative: "3750",
          valueBase: "3750",
          exchangeRate: "1",
          allocationPercent: "37.5",
          priceUpdatedAt: new Date(),
        },
        {
          id: "asset-3",
          portfolioId: "portfolio-1",
          symbol: "VNQ",
          name: "Vanguard Real Estate",
          quantity: "20",
          purchasePrice: "90",
          currency: "USD",
          isIgnored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          currentPrice: "87.50",
          valueNative: "1750",
          valueBase: "1750",
          exchangeRate: "1",
          allocationPercent: "17.5",
          priceUpdatedAt: new Date(),
        },
      ],
      totalValueBase: "10000",
      totalActiveValueBase: "10000",
      baseCurrency: "USD",
      dataFreshness: new Date(),
      assetCount: 3,
      activeAssetCount: 3,
      ignoredAssetCount: 0,
    };

    it("should aggregate assets by inferred class", async () => {
      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(mockPortfolioData);

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      expect(breakdown.classes.length).toBeGreaterThan(0);
      expect(breakdown.baseCurrency).toBe("USD");
    });

    it("should calculate class percentages using decimal.js", async () => {
      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(mockPortfolioData);

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      // Sum of all class percentages + unclassified should equal ~100%
      const totalPercentage = breakdown.classes.reduce((sum, c) => {
        return sum + parseFloat(c.percentage);
      }, parseFloat(breakdown.unclassified.percentage));

      // Allow for small rounding differences
      expect(totalPercentage).toBeGreaterThanOrEqual(99.9);
      expect(totalPercentage).toBeLessThanOrEqual(100.1);
    });

    it("should exclude ignored assets from allocation", async () => {
      const dataWithIgnored = {
        ...mockPortfolioData,
        assets: [
          ...mockPortfolioData.assets,
          {
            ...mockPortfolioData.assets[0]!,
            id: "asset-ignored",
            symbol: "IGNORED",
            isIgnored: true,
            valueBase: "5000",
          },
        ],
      };

      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(
        dataWithIgnored as portfolioService.PortfolioWithValues
      );

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      // Ignored asset should not appear in any class
      for (const classAlloc of breakdown.classes) {
        expect(classAlloc.assetCount).toBeLessThanOrEqual(3);
      }
    });

    it("should track unclassified assets separately", async () => {
      const dataWithUnclassified = {
        ...mockPortfolioData,
        assets: [
          ...mockPortfolioData.assets,
          {
            ...mockPortfolioData.assets[0]!,
            id: "asset-unknown",
            symbol: "UNKNOWN_ASSET_XYZ",
            valueBase: "1000",
          },
        ],
        totalActiveValueBase: "11000",
      };

      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(
        dataWithUnclassified as portfolioService.PortfolioWithValues
      );

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      // Unclassified should have at least one asset
      expect(breakdown.unclassified.assetCount).toBeGreaterThanOrEqual(1);
    });

    it("should handle empty portfolio", async () => {
      const emptyData = {
        ...mockPortfolioData,
        assets: [],
        totalValueBase: "0",
        totalActiveValueBase: "0",
        assetCount: 0,
        activeAssetCount: 0,
      };

      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(emptyData);

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      expect(breakdown.classes.length).toBe(0);
      expect(breakdown.unclassified.assetCount).toBe(0);
    });

    it("should set status for classes with targets", async () => {
      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(mockPortfolioData);

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      // Each class should have a valid status
      for (const classAlloc of breakdown.classes) {
        expect(["under", "on-target", "over", "no-target"]).toContain(classAlloc.status);
      }
    });

    it("should preserve decimal precision in values", async () => {
      vi.mocked(portfolioService.getPortfolioWithValues).mockResolvedValue(mockPortfolioData);

      const breakdown = await getAllocationBreakdown("user-1", "portfolio-1");

      // Check that values have 4 decimal places
      for (const classAlloc of breakdown.classes) {
        expect(classAlloc.value).toMatch(/^\d+\.\d{4}$/);
        expect(classAlloc.percentage).toMatch(/^\d+\.\d{4}$/);
      }
    });
  });
});
