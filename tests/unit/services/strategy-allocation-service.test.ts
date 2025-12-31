/**
 * Strategy Allocation Service Tests
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * Tests for strategy allocation calculation and status determination.
 *
 * Test Coverage:
 * - calculateStrategyAllocationStatus
 * - getStrategyAllocation (mocked DB)
 * - hasPortfolioAssets (mocked DB)
 * - Decimal precision maintained
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateStrategyAllocationStatus,
  getStrategyAllocation,
  hasPortfolioAssets,
} from "@/lib/services/strategy-allocation-service";

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Strategy Allocation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateStrategyAllocationStatus", () => {
    describe("no-target scenarios", () => {
      it("should return 'no-target' when both targets are null", () => {
        const status = calculateStrategyAllocationStatus("50", null, null);
        expect(status).toBe("no-target");
      });

      it("should return 'no-target' for invalid numeric values", () => {
        expect(calculateStrategyAllocationStatus("invalid", "40", "50")).toBe("no-target");
        expect(calculateStrategyAllocationStatus("abc", "40", "50")).toBe("no-target");
      });
    });

    describe("under-allocated scenarios", () => {
      it("should return 'under' when current is below targetMin", () => {
        const status = calculateStrategyAllocationStatus("35", "40", "60");
        expect(status).toBe("under");
      });

      it("should return 'under' when current is just below targetMin", () => {
        const status = calculateStrategyAllocationStatus("39.9", "40", "60");
        expect(status).toBe("under");
      });

      it("should return 'under' for zero allocation with target", () => {
        const status = calculateStrategyAllocationStatus("0", "10", "20");
        expect(status).toBe("under");
      });
    });

    describe("on-target scenarios", () => {
      it("should return 'on-target' when current equals targetMin", () => {
        const status = calculateStrategyAllocationStatus("40", "40", "60");
        expect(status).toBe("on-target");
      });

      it("should return 'on-target' when current is within range", () => {
        const status = calculateStrategyAllocationStatus("50", "40", "60");
        expect(status).toBe("on-target");
      });

      it("should return 'on-target' when current equals targetMax", () => {
        const status = calculateStrategyAllocationStatus("60", "40", "60");
        expect(status).toBe("on-target");
      });

      it("should return 'on-target' at midpoint of range", () => {
        const status = calculateStrategyAllocationStatus("50", "40", "60");
        expect(status).toBe("on-target");
      });
    });

    describe("over-allocated scenarios", () => {
      it("should return 'over' when current is above targetMax", () => {
        const status = calculateStrategyAllocationStatus("65", "40", "60");
        expect(status).toBe("over");
      });

      it("should return 'over' when current is just above targetMax", () => {
        const status = calculateStrategyAllocationStatus("60.1", "40", "60");
        expect(status).toBe("over");
      });

      it("should return 'over' for high allocation exceeding target", () => {
        const status = calculateStrategyAllocationStatus("100", "10", "20");
        expect(status).toBe("over");
      });
    });

    describe("partial targets", () => {
      it("should return 'under' when only targetMin is set and current is below", () => {
        const status = calculateStrategyAllocationStatus("35", "40", null);
        expect(status).toBe("under");
      });

      it("should return 'on-target' when only targetMin is set and current is above", () => {
        const status = calculateStrategyAllocationStatus("45", "40", null);
        expect(status).toBe("on-target");
      });

      it("should return 'over' when only targetMax is set and current is above", () => {
        const status = calculateStrategyAllocationStatus("65", null, "60");
        expect(status).toBe("over");
      });

      it("should return 'on-target' when only targetMax is set and current is below", () => {
        const status = calculateStrategyAllocationStatus("55", null, "60");
        expect(status).toBe("on-target");
      });
    });

    describe("decimal precision", () => {
      it("should handle decimal values correctly", () => {
        // 42.5 is within 40-50 range
        expect(calculateStrategyAllocationStatus("42.5", "40", "50")).toBe("on-target");

        // 39.9 is below 40 (just under)
        expect(calculateStrategyAllocationStatus("39.9", "40", "50")).toBe("under");

        // 50.1 is above 50 (just over)
        expect(calculateStrategyAllocationStatus("50.1", "40", "50")).toBe("over");
      });

      it("should handle very small differences correctly", () => {
        // Test decimal precision
        expect(calculateStrategyAllocationStatus("39.9999", "40", "50")).toBe("under");
        expect(calculateStrategyAllocationStatus("40.0000", "40", "50")).toBe("on-target");
        expect(calculateStrategyAllocationStatus("50.0001", "40", "50")).toBe("over");
      });

      it("should handle high precision decimals", () => {
        expect(calculateStrategyAllocationStatus("45.123456", "40", "50")).toBe("on-target");
        expect(calculateStrategyAllocationStatus("39.999999", "40", "50")).toBe("under");
        expect(calculateStrategyAllocationStatus("50.000001", "40", "50")).toBe("over");
      });
    });

    describe("edge cases", () => {
      it("should handle zero range (targetMin equals targetMax)", () => {
        expect(calculateStrategyAllocationStatus("50", "50", "50")).toBe("on-target");
        expect(calculateStrategyAllocationStatus("49.9", "50", "50")).toBe("under");
        expect(calculateStrategyAllocationStatus("50.1", "50", "50")).toBe("over");
      });

      it("should handle large numbers", () => {
        expect(calculateStrategyAllocationStatus("1000000", "500000", "1500000")).toBe("on-target");
      });

      it("should handle very small percentages", () => {
        expect(calculateStrategyAllocationStatus("0.001", "0.001", "0.005")).toBe("on-target");
        expect(calculateStrategyAllocationStatus("0.0005", "0.001", "0.005")).toBe("under");
      });
    });
  });

  describe("getStrategyAllocation", () => {
    it("should return empty allocations when no data", async () => {
      const { db } = await import("@/lib/db");
      // Mock DB to return empty array
      const mockGroupBy = vi.fn().mockResolvedValue([]);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: mockGroupBy,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await getStrategyAllocation("user-123");

      expect(result).toEqual({
        allocations: [],
        totalPortfolioValue: "0.0000",
        unclassifiedValue: "0.0000",
        unclassifiedPercentage: "0.0000",
        unclassifiedAssetCount: 0,
      });
    });

    it("should calculate allocations from grouped data", async () => {
      const { db } = await import("@/lib/db");
      // Mock DB to return grouped allocation data
      const mockData = [
        {
          assetClassId: "class-1",
          className: "Stocks",
          targetMin: "40",
          targetMax: "60",
          totalValue: "5000",
          assetCount: 3,
        },
        {
          assetClassId: "class-2",
          className: "Bonds",
          targetMin: "20",
          targetMax: "30",
          totalValue: "2500",
          assetCount: 2,
        },
      ];

      const mockGroupBy = vi.fn().mockResolvedValue(mockData);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: mockGroupBy,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await getStrategyAllocation("user-123");

      expect(result.allocations).toHaveLength(2);
      expect(result.totalPortfolioValue).toBe("7500.0000");
      expect(result.allocations[0]?.classId).toBe("class-1");
      expect(result.allocations[0]?.className).toBe("Stocks");
      expect(result.allocations[0]?.currentValue).toBe("5000.0000");
    });

    it("should handle unclassified assets", async () => {
      const { db } = await import("@/lib/db");
      // Mock DB to return data with null assetClassId
      const mockData = [
        {
          assetClassId: "class-1",
          className: "Stocks",
          targetMin: "40",
          targetMax: "60",
          totalValue: "7000",
          assetCount: 3,
        },
        {
          assetClassId: null,
          className: null,
          targetMin: null,
          targetMax: null,
          totalValue: "3000",
          assetCount: 2,
        },
      ];

      const mockGroupBy = vi.fn().mockResolvedValue(mockData);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: mockGroupBy,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await getStrategyAllocation("user-123");

      expect(result.allocations).toHaveLength(1);
      expect(result.unclassifiedValue).toBe("3000.0000");
      expect(result.unclassifiedAssetCount).toBe(2);
      // Total is 10000, unclassified is 3000, so percentage is 30%
      expect(parseFloat(result.unclassifiedPercentage)).toBeCloseTo(30, 1);
    });

    it("should sort allocations by percentage descending", async () => {
      const { db } = await import("@/lib/db");
      const mockData = [
        {
          assetClassId: "class-1",
          className: "Small",
          targetMin: null,
          targetMax: null,
          totalValue: "1000",
          assetCount: 1,
        },
        {
          assetClassId: "class-2",
          className: "Large",
          targetMin: null,
          targetMax: null,
          totalValue: "9000",
          assetCount: 5,
        },
      ];

      const mockGroupBy = vi.fn().mockResolvedValue(mockData);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: mockGroupBy,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await getStrategyAllocation("user-123");

      // Large (90%) should come before Small (10%)
      expect(result.allocations[0]?.className).toBe("Large");
      expect(result.allocations[1]?.className).toBe("Small");
    });
  });

  describe("hasPortfolioAssets", () => {
    it("should return false when no assets", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await hasPortfolioAssets("user-123");
      expect(result).toBe(false);
    });

    it("should return true when assets exist", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await hasPortfolioAssets("user-123");
      expect(result).toBe(true);
    });

    it("should return false when result is empty", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await hasPortfolioAssets("user-123");
      expect(result).toBe(false);
    });
  });
});
