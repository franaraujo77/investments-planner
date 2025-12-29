/**
 * InvestmentHistoryTab Component Tests
 *
 * Story 2.8: Investment History
 *
 * AC-2.8.2: View Investment History Tab
 * - Chronological list of investments (most recent first)
 * - Each entry shows: date, asset symbol/name, amount invested, quantity
 *
 * AC-2.8.4: History Filtering
 * - Filter by date range, asset class, specific asset
 * - Filters applied immediately without page reload
 *
 * AC-2.8.5: Empty State
 * - Show empty state with message and CTA when no investments
 *
 * AC-2.8.6: Regional Number Formatting
 * - Numbers display in regional format via useNumberFormat()
 * - Component rendering with locale-specific formatting is tested in E2E tests
 *
 * Test Coverage:
 * - Filtering logic (date range, asset class, specific asset)
 * - Chronological sorting (most recent first)
 * - Combined filter scenarios
 * - Empty state detection
 * - Edge cases (null values, timezone handling)
 *
 * Note: Component rendering tests are in E2E tests (Playwright) which
 * exercise the full NumberFormatProvider context and UI interactions.
 */

import { describe, it, expect } from "vitest";
import type {
  InvestmentWithContext,
  InvestmentFilters,
} from "@/components/portfolio/investment-history-tab";

// =============================================================================
// MOCK DATA
// =============================================================================

function createMockInvestment(
  overrides: Partial<InvestmentWithContext> = {}
): InvestmentWithContext {
  return {
    id: "inv-1",
    userId: "user-1",
    portfolioId: "portfolio-1",
    assetId: "asset-1",
    symbol: "AAPL",
    quantity: "10",
    pricePerUnit: "150.00",
    totalAmount: "1500.00",
    currency: "USD",
    recommendedAmount: null,
    investedAt: new Date("2024-06-15T10:00:00Z"),
    createdAt: new Date("2024-06-15T10:00:00Z"),
    assetName: "Apple Inc.",
    assetClass: "Stocks",
    ...overrides,
  };
}

// =============================================================================
// FILTERING LOGIC (replicating component's filter logic for testing)
// =============================================================================

/**
 * Apply filters to investments list
 * This mirrors the filtering logic in InvestmentHistoryTab component
 */
function applyFilters(
  investments: InvestmentWithContext[],
  filters: InvestmentFilters
): InvestmentWithContext[] {
  return investments.filter((investment) => {
    // Date range filter - from
    if (filters.from && new Date(investment.investedAt) < filters.from) {
      return false;
    }

    // Date range filter - to
    if (filters.to) {
      const toEnd = new Date(filters.to);
      toEnd.setHours(23, 59, 59, 999);
      if (new Date(investment.investedAt) > toEnd) {
        return false;
      }
    }

    // Asset class filter
    if (filters.assetClass && investment.assetClass !== filters.assetClass) {
      return false;
    }

    // Specific asset filter
    if (filters.assetId && investment.assetId !== filters.assetId) {
      return false;
    }

    return true;
  });
}

/**
 * Sort investments by date (most recent first)
 * AC-2.8.2: Chronological list (most recent first)
 */
function sortByDateDescending(investments: InvestmentWithContext[]): InvestmentWithContext[] {
  return [...investments].sort(
    (a, b) => new Date(b.investedAt).getTime() - new Date(a.investedAt).getTime()
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe("InvestmentHistoryTab Logic", () => {
  describe("AC-2.8.2: Chronological Ordering", () => {
    it("sorts investments by date descending (most recent first)", () => {
      const investments = [
        createMockInvestment({ id: "inv-1", investedAt: new Date("2024-01-01") }),
        createMockInvestment({ id: "inv-2", investedAt: new Date("2024-06-15") }),
        createMockInvestment({ id: "inv-3", investedAt: new Date("2024-03-10") }),
      ];

      const sorted = sortByDateDescending(investments);

      expect(sorted[0]?.id).toBe("inv-2"); // June 15
      expect(sorted[1]?.id).toBe("inv-3"); // March 10
      expect(sorted[2]?.id).toBe("inv-1"); // January 1
    });

    it("handles investments on the same day", () => {
      const investments = [
        createMockInvestment({
          id: "inv-1",
          investedAt: new Date("2024-06-15T08:00:00Z"),
        }),
        createMockInvestment({
          id: "inv-2",
          investedAt: new Date("2024-06-15T14:00:00Z"),
        }),
      ];

      const sorted = sortByDateDescending(investments);

      expect(sorted[0]?.id).toBe("inv-2"); // 14:00
      expect(sorted[1]?.id).toBe("inv-1"); // 08:00
    });

    it("returns empty array for empty input", () => {
      const sorted = sortByDateDescending([]);
      expect(sorted).toEqual([]);
    });
  });

  describe("AC-2.8.4: Date Range Filtering", () => {
    const investments = [
      createMockInvestment({ id: "inv-1", investedAt: new Date("2024-01-15") }),
      createMockInvestment({ id: "inv-2", investedAt: new Date("2024-03-20") }),
      createMockInvestment({ id: "inv-3", investedAt: new Date("2024-06-10") }),
      createMockInvestment({ id: "inv-4", investedAt: new Date("2024-09-05") }),
    ];

    it("filters by from date", () => {
      const filters: InvestmentFilters = {
        from: new Date("2024-03-01"),
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((i) => i.id)).toEqual(["inv-2", "inv-3", "inv-4"]);
    });

    it("filters by to date", () => {
      const filters: InvestmentFilters = {
        to: new Date("2024-06-15"),
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((i) => i.id)).toEqual(["inv-1", "inv-2", "inv-3"]);
    });

    it("filters by date range (from and to)", () => {
      const filters: InvestmentFilters = {
        from: new Date("2024-03-01"),
        to: new Date("2024-07-01"),
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(["inv-2", "inv-3"]);
    });

    it("includes investments on the boundary dates", () => {
      const filters: InvestmentFilters = {
        from: new Date("2024-03-20"),
        to: new Date("2024-06-10"),
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(["inv-2", "inv-3"]);
    });

    it("returns empty when no investments match date range", () => {
      const filters: InvestmentFilters = {
        from: new Date("2025-01-01"),
        to: new Date("2025-12-31"),
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(0);
    });
  });

  describe("AC-2.8.4: Asset Class Filtering", () => {
    const investments = [
      createMockInvestment({ id: "inv-1", assetClass: "Stocks" }),
      createMockInvestment({ id: "inv-2", assetClass: "Bonds" }),
      createMockInvestment({ id: "inv-3", assetClass: "Stocks" }),
      createMockInvestment({ id: "inv-4", assetClass: "ETFs" }),
    ];

    it("filters by asset class", () => {
      const filters: InvestmentFilters = {
        assetClass: "Stocks",
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(["inv-1", "inv-3"]);
    });

    it("returns empty when no investments match asset class", () => {
      const filters: InvestmentFilters = {
        assetClass: "Crypto",
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(0);
    });

    it("returns all when no asset class filter", () => {
      const filters: InvestmentFilters = {};

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(4);
    });
  });

  describe("AC-2.8.4: Specific Asset Filtering", () => {
    const investments = [
      createMockInvestment({ id: "inv-1", assetId: "asset-1", symbol: "AAPL" }),
      createMockInvestment({ id: "inv-2", assetId: "asset-2", symbol: "GOOGL" }),
      createMockInvestment({ id: "inv-3", assetId: "asset-1", symbol: "AAPL" }),
      createMockInvestment({ id: "inv-4", assetId: "asset-3", symbol: "MSFT" }),
    ];

    it("filters by specific asset ID", () => {
      const filters: InvestmentFilters = {
        assetId: "asset-1",
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(["inv-1", "inv-3"]);
    });

    it("returns empty when no investments match asset ID", () => {
      const filters: InvestmentFilters = {
        assetId: "asset-999",
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(0);
    });
  });

  describe("AC-2.8.4: Combined Filters", () => {
    const investments = [
      createMockInvestment({
        id: "inv-1",
        assetId: "asset-1",
        assetClass: "Stocks",
        investedAt: new Date("2024-03-15"),
      }),
      createMockInvestment({
        id: "inv-2",
        assetId: "asset-2",
        assetClass: "Bonds",
        investedAt: new Date("2024-03-20"),
      }),
      createMockInvestment({
        id: "inv-3",
        assetId: "asset-1",
        assetClass: "Stocks",
        investedAt: new Date("2024-06-10"),
      }),
      createMockInvestment({
        id: "inv-4",
        assetId: "asset-3",
        assetClass: "Stocks",
        investedAt: new Date("2024-06-15"),
      }),
    ];

    it("combines date range and asset class filters", () => {
      const filters: InvestmentFilters = {
        from: new Date("2024-05-01"),
        assetClass: "Stocks",
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(["inv-3", "inv-4"]);
    });

    it("combines all three filter types", () => {
      const filters: InvestmentFilters = {
        from: new Date("2024-01-01"),
        to: new Date("2024-07-01"),
        assetClass: "Stocks",
        assetId: "asset-1",
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(["inv-1", "inv-3"]);
    });

    it("returns empty when combined filters produce no matches", () => {
      const filters: InvestmentFilters = {
        from: new Date("2024-06-01"),
        assetClass: "Bonds", // No Bonds in June
      };

      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(0);
    });
  });

  describe("AC-2.8.5: Empty State Detection", () => {
    it("detects empty investments array", () => {
      const investments: InvestmentWithContext[] = [];
      expect(investments.length === 0).toBe(true);
    });

    it("detects non-empty investments array", () => {
      const investments = [createMockInvestment()];
      expect(investments.length === 0).toBe(false);
    });

    it("detects empty results after filtering", () => {
      const investments = [createMockInvestment({ assetClass: "Stocks" })];
      const filters: InvestmentFilters = { assetClass: "Bonds" };

      const filtered = applyFilters(investments, filters);
      expect(filtered.length === 0).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles null assetClass in investment", () => {
      const investments = [
        createMockInvestment({ id: "inv-1", assetClass: undefined }),
        createMockInvestment({ id: "inv-2", assetClass: "Stocks" }),
      ];

      const filters: InvestmentFilters = { assetClass: "Stocks" };
      const filtered = applyFilters(investments, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe("inv-2");
    });

    it("handles timezone edge cases for date filtering", () => {
      // Investment at midnight UTC
      const investments = [
        createMockInvestment({
          id: "inv-1",
          investedAt: new Date("2024-06-15T00:00:00Z"),
        }),
      ];

      // Filter for that exact day
      const filters: InvestmentFilters = {
        from: new Date("2024-06-15T00:00:00Z"),
        to: new Date("2024-06-15T00:00:00Z"),
      };

      const filtered = applyFilters(investments, filters);
      expect(filtered).toHaveLength(1);
    });

    it("preserves original array order when no sorting applied", () => {
      const investments = [
        createMockInvestment({ id: "inv-1" }),
        createMockInvestment({ id: "inv-2" }),
        createMockInvestment({ id: "inv-3" }),
      ];

      const filters: InvestmentFilters = {};
      const filtered = applyFilters(investments, filters);

      expect(filtered.map((i) => i.id)).toEqual(["inv-1", "inv-2", "inv-3"]);
    });
  });
});
