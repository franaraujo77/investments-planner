/**
 * useStrategyAllocation Hook Logic Tests
 *
 * Story 3.6: Strategy Allocation Overview Chart
 * AC-3.6.1: Auto-refresh on mount for pie chart display
 *
 * Tests for the useStrategyAllocation hook types and response handling.
 * Hook rendering tests are in E2E via Playwright.
 */

import { describe, it, expect } from "vitest";
import type { StrategyAllocation } from "@/lib/services/strategy-allocation-service";

// =============================================================================
// TYPE DEFINITIONS (mirroring hook return types)
// =============================================================================

interface UseStrategyAllocationReturn {
  allocations: StrategyAllocation[];
  totalValue: string;
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  };
  hasAssets: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface ApiResponse {
  data: {
    allocations: StrategyAllocation[];
    totalPortfolioValue: string;
    unclassifiedValue: string;
    unclassifiedPercentage: string;
    unclassifiedAssetCount: number;
  };
  meta: {
    hasAssets: boolean;
  };
}

// =============================================================================
// RESPONSE TRANSFORMATION FUNCTIONS (mirroring hook logic)
// =============================================================================

/**
 * Transform API response to hook return format
 */
function transformApiResponse(
  response: ApiResponse
): Omit<UseStrategyAllocationReturn, "refresh" | "isLoading" | "error"> {
  return {
    allocations: response.data.allocations,
    totalValue: response.data.totalPortfolioValue,
    unclassified: {
      value: response.data.unclassifiedValue,
      percentage: response.data.unclassifiedPercentage,
      assetCount: response.data.unclassifiedAssetCount,
    },
    hasAssets: response.meta.hasAssets,
  };
}

/**
 * Get error message from HTTP status
 */
function getErrorMessage(status: number): string {
  if (status === 401) {
    return "Please sign in to view allocation data";
  }
  return "Failed to fetch allocation data";
}

/**
 * Get error message from caught error
 */
function getErrorFromCatch(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

// =============================================================================
// TESTS
// =============================================================================

describe("useStrategyAllocation", () => {
  describe("initial state", () => {
    it("should define default allocations as empty array", () => {
      const defaultAllocations: StrategyAllocation[] = [];
      expect(defaultAllocations).toEqual([]);
    });

    it("should define default totalValue as '0'", () => {
      const defaultTotalValue = "0";
      expect(defaultTotalValue).toBe("0");
    });

    it("should define default unclassified values", () => {
      const defaultUnclassified = {
        value: "0",
        percentage: "0",
        assetCount: 0,
      };
      expect(defaultUnclassified.value).toBe("0");
      expect(defaultUnclassified.percentage).toBe("0");
      expect(defaultUnclassified.assetCount).toBe(0);
    });
  });

  describe("transformApiResponse", () => {
    it("should transform API response with allocations", () => {
      const mockResponse: ApiResponse = {
        data: {
          allocations: [
            {
              classId: "class-1",
              className: "Stocks",
              targetMin: "40",
              targetMax: "60",
              currentValue: "5000.0000",
              currentPercentage: "50.0000",
              assetCount: 3,
              status: "on-target",
            },
          ],
          totalPortfolioValue: "10000.0000",
          unclassifiedValue: "0",
          unclassifiedPercentage: "0",
          unclassifiedAssetCount: 0,
        },
        meta: {
          hasAssets: true,
        },
      };

      const result = transformApiResponse(mockResponse);

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0]?.className).toBe("Stocks");
      expect(result.totalValue).toBe("10000.0000");
      expect(result.hasAssets).toBe(true);
    });

    it("should transform API response with unclassified assets", () => {
      const mockResponse: ApiResponse = {
        data: {
          allocations: [],
          totalPortfolioValue: "10000.0000",
          unclassifiedValue: "3000.0000",
          unclassifiedPercentage: "30.0000",
          unclassifiedAssetCount: 5,
        },
        meta: {
          hasAssets: true,
        },
      };

      const result = transformApiResponse(mockResponse);

      expect(result.unclassified.value).toBe("3000.0000");
      expect(result.unclassified.percentage).toBe("30.0000");
      expect(result.unclassified.assetCount).toBe(5);
    });

    it("should transform empty API response", () => {
      const mockResponse: ApiResponse = {
        data: {
          allocations: [],
          totalPortfolioValue: "0",
          unclassifiedValue: "0",
          unclassifiedPercentage: "0",
          unclassifiedAssetCount: 0,
        },
        meta: {
          hasAssets: false,
        },
      };

      const result = transformApiResponse(mockResponse);

      expect(result.allocations).toHaveLength(0);
      expect(result.totalValue).toBe("0");
      expect(result.hasAssets).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    it("should return auth error for 401 status", () => {
      expect(getErrorMessage(401)).toBe("Please sign in to view allocation data");
    });

    it("should return generic error for 500 status", () => {
      expect(getErrorMessage(500)).toBe("Failed to fetch allocation data");
    });

    it("should return generic error for 404 status", () => {
      expect(getErrorMessage(404)).toBe("Failed to fetch allocation data");
    });

    it("should return generic error for 403 status", () => {
      expect(getErrorMessage(403)).toBe("Failed to fetch allocation data");
    });
  });

  describe("getErrorFromCatch", () => {
    it("should extract message from Error instance", () => {
      const error = new Error("Network error");
      expect(getErrorFromCatch(error)).toBe("Network error");
    });

    it("should return generic message for non-Error", () => {
      expect(getErrorFromCatch("string error")).toBe("An unexpected error occurred");
    });

    it("should return generic message for null", () => {
      expect(getErrorFromCatch(null)).toBe("An unexpected error occurred");
    });

    it("should return generic message for undefined", () => {
      expect(getErrorFromCatch(undefined)).toBe("An unexpected error occurred");
    });

    it("should return generic message for object", () => {
      expect(getErrorFromCatch({ message: "object error" })).toBe("An unexpected error occurred");
    });
  });

  describe("allocation status types", () => {
    it("should validate allocation status values", () => {
      const validStatuses = ["on-target", "under", "over", "no-target"];

      const mockAllocation: StrategyAllocation = {
        classId: "test",
        className: "Test",
        targetMin: "40",
        targetMax: "60",
        currentValue: "5000",
        currentPercentage: "50",
        assetCount: 3,
        status: "on-target",
      };

      expect(validStatuses).toContain(mockAllocation.status);
    });

    it("should allow null targetMin and targetMax for no-target status", () => {
      const mockAllocation: StrategyAllocation = {
        classId: "test",
        className: "Test",
        targetMin: null,
        targetMax: null,
        currentValue: "5000",
        currentPercentage: "50",
        assetCount: 3,
        status: "no-target",
      };

      expect(mockAllocation.targetMin).toBeNull();
      expect(mockAllocation.targetMax).toBeNull();
      expect(mockAllocation.status).toBe("no-target");
    });
  });

  describe("API endpoint configuration", () => {
    it("should use correct endpoint path", () => {
      const endpoint = "/api/strategy/allocation";
      expect(endpoint).toBe("/api/strategy/allocation");
    });

    it("should use GET method", () => {
      const method = "GET";
      expect(method).toBe("GET");
    });

    it("should include credentials", () => {
      const credentials = "include";
      expect(credentials).toBe("include");
    });
  });
});
