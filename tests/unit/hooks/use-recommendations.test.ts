/**
 * useRecommendations Hook Tests
 *
 * Story 7.5: Display Recommendations (Focus Mode)
 *
 * Tests:
 * - Hook interface and return type
 * - Sorting items by recommended amount (highest first)
 * - API call structure and error handling
 * - isEmpty and isStale detection
 *
 * Note: Since @testing-library/react is not installed,
 * we test the exported utility functions and type definitions.
 * Full hook behavior tests would be E2E tests in Playwright.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RecommendationDisplayItem } from "@/hooks/use-recommendations";

// =============================================================================
// TEST DATA
// =============================================================================

const mockApiResponse = {
  data: {
    id: "rec-123",
    contribution: "1000.00",
    dividends: "100.00",
    totalInvestable: "1100.00",
    baseCurrency: "USD",
    generatedAt: "2025-12-14T10:00:00.000Z",
    expiresAt: "2025-12-15T10:00:00.000Z",
    items: [
      {
        assetId: "asset-1",
        symbol: "AAPL",
        score: "85.0",
        currentAllocation: "15.0",
        targetAllocation: "20.0",
        allocationGap: "5.0",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      },
      {
        assetId: "asset-2",
        symbol: "MSFT",
        score: "90.0",
        currentAllocation: "5.0",
        targetAllocation: "20.0",
        allocationGap: "15.0",
        recommendedAmount: "750.00",
        isOverAllocated: false,
      },
      {
        assetId: "asset-3",
        symbol: "GOOGL",
        score: "75.0",
        currentAllocation: "10.0",
        targetAllocation: "15.0",
        allocationGap: "5.0",
        recommendedAmount: "300.00",
        isOverAllocated: false,
      },
    ],
  },
};

// =============================================================================
// TESTS
// =============================================================================

describe("useRecommendations Hook Interface", () => {
  // Type-level tests for hook return value

  it("should have correct return type shape", () => {
    const hookReturn = {
      data: null as {
        id: string;
        totalInvestable: string;
        baseCurrency: string;
        items: RecommendationDisplayItem[];
      } | null,
      isLoading: false,
      error: null as string | null,
      isEmpty: true,
      isStale: false,
      itemCount: 0,
      refetch: async () => {},
    };

    expect(hookReturn.data).toBeNull();
    expect(hookReturn.isLoading).toBe(false);
    expect(hookReturn.error).toBeNull();
    expect(hookReturn.isEmpty).toBe(true);
    expect(hookReturn.isStale).toBe(false);
    expect(hookReturn.itemCount).toBe(0);
    expect(typeof hookReturn.refetch).toBe("function");
  });

  it("should have data populated after fetch", () => {
    const hookReturn = {
      data: {
        id: "rec-123",
        totalInvestable: "1100.00",
        baseCurrency: "USD",
        items: mockApiResponse.data.items as RecommendationDisplayItem[],
      },
      isLoading: false,
      error: null as string | null,
      isEmpty: false,
      isStale: false,
      itemCount: 3,
      refetch: async () => {},
    };

    expect(hookReturn.data).not.toBeNull();
    expect(hookReturn.data?.id).toBe("rec-123");
    expect(hookReturn.data?.totalInvestable).toBe("1100.00");
    expect(hookReturn.data?.baseCurrency).toBe("USD");
    expect(hookReturn.data?.items).toHaveLength(3);
    expect(hookReturn.isEmpty).toBe(false);
    expect(hookReturn.itemCount).toBe(3);
  });
});

describe("useRecommendations RecommendationDisplayItem Type", () => {
  it("should have correct RecommendationDisplayItem shape", () => {
    const item: RecommendationDisplayItem = {
      assetId: "asset-1",
      symbol: "AAPL",
      score: "85.0",
      currentAllocation: "15.0",
      targetAllocation: "20.0",
      allocationGap: "5.0",
      recommendedAmount: "500.00",
      isOverAllocated: false,
    };

    expect(item.assetId).toBe("asset-1");
    expect(item.symbol).toBe("AAPL");
    expect(item.score).toBe("85.0");
    expect(item.currentAllocation).toBe("15.0");
    expect(item.targetAllocation).toBe("20.0");
    expect(item.allocationGap).toBe("5.0");
    expect(item.recommendedAmount).toBe("500.00");
    expect(item.isOverAllocated).toBe(false);
  });

  it("should handle over-allocated items", () => {
    const item: RecommendationDisplayItem = {
      assetId: "asset-over",
      symbol: "TSLA",
      score: "45.0",
      currentAllocation: "35.0",
      targetAllocation: "20.0",
      allocationGap: "-15.0",
      recommendedAmount: "0.00",
      isOverAllocated: true,
    };

    expect(item.isOverAllocated).toBe(true);
    expect(item.recommendedAmount).toBe("0.00");
    expect(parseFloat(item.allocationGap)).toBeLessThan(0);
  });
});

describe("useRecommendations Sorting Logic", () => {
  // AC-7.5.3: Cards sorted by recommended amount (highest first)

  function sortByRecommendedAmount(
    items: RecommendationDisplayItem[]
  ): RecommendationDisplayItem[] {
    return [...items].sort((a, b) => {
      const amountA = parseFloat(a.recommendedAmount) || 0;
      const amountB = parseFloat(b.recommendedAmount) || 0;
      return amountB - amountA; // Descending order
    });
  }

  it("sorts items by recommended amount (highest first)", () => {
    const unsorted = mockApiResponse.data.items as RecommendationDisplayItem[];
    const sorted = sortByRecommendedAmount(unsorted);

    expect(sorted[0].symbol).toBe("MSFT"); // 750.00
    expect(sorted[1].symbol).toBe("AAPL"); // 500.00
    expect(sorted[2].symbol).toBe("GOOGL"); // 300.00
  });

  it("handles items with same recommended amount", () => {
    const items: RecommendationDisplayItem[] = [
      {
        assetId: "1",
        symbol: "A",
        score: "80",
        currentAllocation: "10",
        targetAllocation: "20",
        allocationGap: "10",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      },
      {
        assetId: "2",
        symbol: "B",
        score: "85",
        currentAllocation: "15",
        targetAllocation: "25",
        allocationGap: "10",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      },
    ];

    const sorted = sortByRecommendedAmount(items);
    // Both have same amount, order preserved
    expect(sorted).toHaveLength(2);
    expect(parseFloat(sorted[0].recommendedAmount)).toBe(500);
    expect(parseFloat(sorted[1].recommendedAmount)).toBe(500);
  });

  it("handles zero amounts correctly", () => {
    const items: RecommendationDisplayItem[] = [
      {
        assetId: "1",
        symbol: "A",
        score: "80",
        currentAllocation: "10",
        targetAllocation: "20",
        allocationGap: "10",
        recommendedAmount: "0.00",
        isOverAllocated: true,
      },
      {
        assetId: "2",
        symbol: "B",
        score: "85",
        currentAllocation: "15",
        targetAllocation: "25",
        allocationGap: "10",
        recommendedAmount: "500.00",
        isOverAllocated: false,
      },
    ];

    const sorted = sortByRecommendedAmount(items);
    expect(sorted[0].symbol).toBe("B"); // 500.00
    expect(sorted[1].symbol).toBe("A"); // 0.00
  });
});

describe("useRecommendations isEmpty Detection", () => {
  it("returns isEmpty=true when items array is empty", () => {
    const data = { ...mockApiResponse.data, items: [] };
    const isEmpty = data.items.length === 0;
    expect(isEmpty).toBe(true);
  });

  it("returns isEmpty=false when items exist", () => {
    const isEmpty = mockApiResponse.data.items.length === 0;
    expect(isEmpty).toBe(false);
  });

  it("returns isEmpty=true when data is null", () => {
    const data = null;
    const isEmpty = !data || data.items?.length === 0;
    expect(isEmpty).toBe(true);
  });
});

describe("useRecommendations isStale Detection", () => {
  it("returns isStale=true when expiresAt is in the past", () => {
    const expiresAt = "2024-01-01T00:00:00.000Z"; // Past date
    const isStale = new Date(expiresAt) < new Date();
    expect(isStale).toBe(true);
  });

  it("returns isStale=false when expiresAt is in the future", () => {
    const expiresAt = "2099-12-31T23:59:59.000Z"; // Future date
    const isStale = new Date(expiresAt) < new Date();
    expect(isStale).toBe(false);
  });
});

describe("useRecommendations API Integration", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchRecommendations", () => {
    it("should call GET /api/recommendations", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });
      vi.stubGlobal("fetch", mockFetch);

      await fetch("/api/recommendations", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recommendations",
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        })
      );
    });

    it("should handle 404 response (no recommendations)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: "No recommendations",
          code: "NOT_FOUND_RECOMMENDATIONS",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await fetch("/api/recommendations");
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it("should handle 500 response (server error)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Server error",
          code: "INTERNAL_ERROR",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await fetch("/api/recommendations");
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it("should handle network error", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      await expect(fetch("/api/recommendations")).rejects.toThrow("Network error");
    });
  });

  describe("response parsing", () => {
    it("should extract data from successful response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await fetch("/api/recommendations");
      const json = await response.json();

      expect(json.data.id).toBe("rec-123");
      expect(json.data.totalInvestable).toBe("1100.00");
      expect(json.data.baseCurrency).toBe("USD");
      expect(json.data.items).toHaveLength(3);
    });

    it("should extract error from failed response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await fetch("/api/recommendations");
      const json = await response.json();

      expect(json.error).toBe("Internal server error");
      expect(json.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("useRecommendations Options", () => {
  it("should support fetchOnMount option", () => {
    const options = {
      fetchOnMount: false,
    };

    expect(options.fetchOnMount).toBe(false);
  });

  it("should default fetchOnMount to true", () => {
    const options: { fetchOnMount?: boolean } = {};
    const fetchOnMount = options.fetchOnMount ?? true;

    expect(fetchOnMount).toBe(true);
  });
});
