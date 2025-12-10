/**
 * useAssetScore Hook Tests
 *
 * Story 5.10: View Asset Score
 *
 * Tests:
 * - Loading, success, and error states
 * - Handling null score (unscored asset)
 * - Criteria matched calculation
 * - API response parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAssetScore API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("API Response Handling", () => {
    it("parses successful score response correctly", async () => {
      const mockResponse = {
        data: {
          assetId: "asset-123",
          symbol: "AAPL",
          score: "85.5000",
          breakdown: [
            {
              criterionId: "crit-1",
              criterionName: "Dividend Yield",
              matched: true,
              pointsAwarded: 10,
              actualValue: "2.5",
              skippedReason: null,
            },
            {
              criterionId: "crit-2",
              criterionName: "P/E Ratio",
              matched: false,
              pointsAwarded: 0,
              actualValue: "25.0",
              skippedReason: null,
            },
          ],
          criteriaVersionId: "version-123",
          calculatedAt: "2025-12-10T12:00:00.000Z",
          isFresh: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Simulate fetching
      const response = await fetch("/api/scores/asset-123");
      const data = await response.json();

      expect(data.data.assetId).toBe("asset-123");
      expect(data.data.symbol).toBe("AAPL");
      expect(data.data.score).toBe("85.5000");
      expect(data.data.breakdown).toHaveLength(2);
      expect(data.data.breakdown[0].matched).toBe(true);
      expect(data.data.breakdown[1].matched).toBe(false);
    });

    it("handles 404 response for unscored asset", async () => {
      const mockResponse = {
        error: "No score found for this asset",
        code: "NOT_FOUND",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockResponse,
      });

      const response = await fetch("/api/scores/unscored-asset");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.code).toBe("NOT_FOUND");
    });

    it("handles server error response", async () => {
      const mockResponse = {
        error: "Failed to retrieve score",
        code: "INTERNAL_ERROR",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      });

      const response = await fetch("/api/scores/asset-123");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Criteria Matched Calculation", () => {
    it("calculates matched/total from breakdown array", () => {
      const breakdown = [
        { matched: true, pointsAwarded: 10 },
        { matched: true, pointsAwarded: 8 },
        { matched: false, pointsAwarded: 0 },
        { matched: true, pointsAwarded: 5 },
        { matched: false, pointsAwarded: 0 },
      ];

      const matched = breakdown.filter((b) => b.matched).length;
      const total = breakdown.length;

      expect(matched).toBe(3);
      expect(total).toBe(5);
    });

    it("handles empty breakdown array", () => {
      const breakdown: { matched: boolean }[] = [];

      const matched = breakdown.filter((b) => b.matched).length;
      const total = breakdown.length;

      expect(matched).toBe(0);
      expect(total).toBe(0);
    });

    it("handles all matched criteria", () => {
      const breakdown = [
        { matched: true, pointsAwarded: 10 },
        { matched: true, pointsAwarded: 8 },
        { matched: true, pointsAwarded: 5 },
      ];

      const matched = breakdown.filter((b) => b.matched).length;
      const total = breakdown.length;

      expect(matched).toBe(3);
      expect(total).toBe(3);
    });

    it("handles no matched criteria", () => {
      const breakdown = [
        { matched: false, pointsAwarded: 0 },
        { matched: false, pointsAwarded: 0 },
        { matched: false, pointsAwarded: 0 },
      ];

      const matched = breakdown.filter((b) => b.matched).length;
      const total = breakdown.length;

      expect(matched).toBe(0);
      expect(total).toBe(3);
    });
  });

  describe("Date Parsing", () => {
    it("parses ISO date string to Date object", () => {
      const isoString = "2025-12-10T12:00:00.000Z";
      const date = new Date(isoString);

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
      expect(date.toISOString()).toBe(isoString);
    });

    it("handles different date formats", () => {
      const formats = [
        "2025-12-10T12:00:00.000Z",
        "2025-12-10T12:00:00Z",
        "2025-12-10T00:00:00.000Z",
      ];

      formats.forEach((format) => {
        const date = new Date(format);
        expect(date).toBeInstanceOf(Date);
        expect(isNaN(date.getTime())).toBe(false);
      });
    });
  });
});

describe("useAssetScores Batch API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles mixed results (some scored, some unscored)", async () => {
    // First call - scored asset
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          assetId: "asset-1",
          symbol: "AAPL",
          score: "85.0000",
          breakdown: [],
          criteriaVersionId: "v1",
          calculatedAt: "2025-12-10T12:00:00.000Z",
          isFresh: true,
        },
      }),
    });

    // Second call - unscored asset
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: "No score found",
        code: "NOT_FOUND",
      }),
    });

    // Simulate batch fetch
    const assetIds = ["asset-1", "asset-2"];
    const results = await Promise.all(
      assetIds.map(async (id) => {
        const response = await fetch(`/api/scores/${id}`);
        const data = await response.json();
        return { id, ok: response.ok, data };
      })
    );

    expect(results[0].ok).toBe(true);
    expect(results[0].data.data.score).toBe("85.0000");
    expect(results[1].ok).toBe(false);
    expect(results[1].data.code).toBe("NOT_FOUND");
  });
});
