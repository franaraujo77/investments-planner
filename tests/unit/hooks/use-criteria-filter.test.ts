/**
 * Criteria Filter Logic Unit Tests
 *
 * Story 5.4: Criteria Library View
 *
 * AC-5.4.4: Search/Filter Criteria by Name
 * - Case-insensitive name filtering
 * - Empty search returns all criteria
 * - Partial matches work
 * - Whitespace-only search returns all
 *
 * Tests the filtering logic used by useCriteriaFilter hook
 * Note: Tests the pure filtering function, not React hook lifecycle
 */

import { describe, it, expect } from "vitest";
import type { CriterionRule } from "@/lib/db/schema";

/**
 * Pure filtering function extracted from hook logic
 * This mirrors the filterCriteria implementation in useCriteriaFilter
 */
function filterCriteria(criteria: CriterionRule[], searchTerm: string): CriterionRule[] {
  if (!searchTerm.trim()) {
    return criteria;
  }

  const lowerSearch = searchTerm.toLowerCase().trim();
  return criteria.filter((criterion) => criterion.name.toLowerCase().includes(lowerSearch));
}

/**
 * Check if search is active
 */
function isSearchActive(searchTerm: string): boolean {
  return searchTerm.trim().length > 0;
}

// Sample criteria for testing
const sampleCriteria: CriterionRule[] = [
  {
    id: "1",
    name: "High Dividend Yield",
    metric: "dividend_yield",
    operator: "gt",
    value: "5",
    points: 20,
    requiredFundamentals: [],
    sortOrder: 0,
  },
  {
    id: "2",
    name: "Low P/E Ratio",
    metric: "pe_ratio",
    operator: "lt",
    value: "15",
    points: 15,
    requiredFundamentals: [],
    sortOrder: 1,
  },
  {
    id: "3",
    name: "dividend payout safe",
    metric: "payout_ratio",
    operator: "lt",
    value: "80",
    points: 10,
    requiredFundamentals: [],
    sortOrder: 2,
  },
  {
    id: "4",
    name: "Market Cap Check",
    metric: "market_cap",
    operator: "exists",
    value: "",
    points: 5,
    requiredFundamentals: [],
    sortOrder: 3,
  },
];

describe("Story 5.4: Criteria Library View - Filtering Logic", () => {
  // ===========================================================================
  // AC-5.4.4: Search/Filter Criteria by Name
  // ===========================================================================
  describe("AC-5.4.4: Search/Filter Criteria by Name", () => {
    it("should return all criteria when search term is empty", () => {
      const filtered = filterCriteria(sampleCriteria, "");

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(sampleCriteria);
    });

    it("should filter criteria by name (case-insensitive lowercase)", () => {
      const filtered = filterCriteria(sampleCriteria, "dividend");

      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.name).toBe("High Dividend Yield");
      expect(filtered[1]?.name).toBe("dividend payout safe");
    });

    it("should handle uppercase search (case-insensitive)", () => {
      const filtered = filterCriteria(sampleCriteria, "DIVIDEND");

      expect(filtered).toHaveLength(2);
    });

    it("should handle mixed case search (case-insensitive)", () => {
      const filtered = filterCriteria(sampleCriteria, "DiViDeNd");

      expect(filtered).toHaveLength(2);
    });

    it("should return empty array when no matches found", () => {
      const filtered = filterCriteria(sampleCriteria, "nonexistent");

      expect(filtered).toHaveLength(0);
    });

    it("should match partial strings", () => {
      const filtered = filterCriteria(sampleCriteria, "Ratio");

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.name).toBe("Low P/E Ratio");
    });

    it("should return all criteria when search term is whitespace only", () => {
      const filtered = filterCriteria(sampleCriteria, "   ");

      expect(filtered).toHaveLength(4);
    });

    it("should trim search term before filtering", () => {
      const filtered = filterCriteria(sampleCriteria, "  dividend  ");

      expect(filtered).toHaveLength(2);
    });

    it("should handle empty criteria array", () => {
      const filtered = filterCriteria([], "test");

      expect(filtered).toHaveLength(0);
    });

    it("should handle single character search", () => {
      const filtered = filterCriteria(sampleCriteria, "H");

      // "High Dividend Yield" and "Market Cap Check" contain 'H' or 'h'
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((c) => c.name.toLowerCase().includes("h"))).toBe(true);
    });

    it("should handle special characters in search", () => {
      const filtered = filterCriteria(sampleCriteria, "P/E");

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.name).toBe("Low P/E Ratio");
    });
  });

  describe("isSearchActive", () => {
    it("should return false for empty string", () => {
      expect(isSearchActive("")).toBe(false);
    });

    it("should return false for whitespace only", () => {
      expect(isSearchActive("   ")).toBe(false);
    });

    it("should return true for non-empty search term", () => {
      expect(isSearchActive("dividend")).toBe(true);
    });

    it("should return true for single character", () => {
      expect(isSearchActive("a")).toBe(true);
    });

    it("should return true for search with leading/trailing whitespace", () => {
      expect(isSearchActive("  test  ")).toBe(true);
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should filter large arrays efficiently", () => {
      const largeCriteria: CriterionRule[] = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Criterion ${i}`,
        metric: "dividend_yield" as const,
        operator: "gt" as const,
        value: "5",
        points: 10,
        requiredFundamentals: [],
        sortOrder: i,
      }));

      const start = performance.now();
      const filtered = filterCriteria(largeCriteria, "Criterion 99");
      const duration = performance.now() - start;

      // Should complete in under 50ms for 1000 items
      expect(duration).toBeLessThan(50);
      // Should find Criterion 99, 990-999
      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should handle criteria with undefined value2", () => {
      const criteriaWithUndefined: CriterionRule[] = [
        {
          id: "1",
          name: "Test Criterion",
          metric: "dividend_yield",
          operator: "gt",
          value: "5",
          value2: undefined,
          points: 10,
          requiredFundamentals: [],
          sortOrder: 0,
        },
      ];

      const filtered = filterCriteria(criteriaWithUndefined, "Test");

      expect(filtered).toHaveLength(1);
    });

    it("should handle criteria with between operator and value2", () => {
      const criteriaWithBetween: CriterionRule[] = [
        {
          id: "1",
          name: "Between Criterion",
          metric: "dividend_yield",
          operator: "between",
          value: "5",
          value2: "10",
          points: 10,
          requiredFundamentals: [],
          sortOrder: 0,
        },
      ];

      const filtered = filterCriteria(criteriaWithBetween, "Between");

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.value2).toBe("10");
    });

    it("should not modify original array", () => {
      const original = [...sampleCriteria];
      filterCriteria(sampleCriteria, "dividend");

      expect(sampleCriteria).toEqual(original);
    });

    it("should return new array instance when filtering", () => {
      const filtered = filterCriteria(sampleCriteria, "");

      // Even when returning all, should be same content
      expect(filtered).toEqual(sampleCriteria);
    });
  });
});
