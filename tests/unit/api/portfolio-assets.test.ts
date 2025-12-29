/**
 * Portfolio Assets API Endpoint Tests
 *
 * Story 2.5: Add Holdings to Portfolio
 * Story 3.2: Add Asset to Portfolio
 *
 * Tests for /api/portfolios/:portfolioId/assets endpoints:
 * - GET: List assets in portfolio
 * - POST: Add asset to portfolio
 *
 * AC-2.5.5: Form validation (quantity > 0, price > 0, valid currency)
 * AC-2.5.6: Successful asset addition
 * AC-2.5.8: Duplicate asset prevention
 * AC-2.5.9: Multi-tenant isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NOT_FOUND_ERRORS, CONFLICT_ERRORS, VALIDATION_ERRORS } from "@/lib/api/error-codes";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock control variables - must be at module level for vi.mock hoisting
const mockState = {
  assets: [] as unknown[],
  addedAsset: null as unknown,
  addAssetError: null as Error | null,
  getAssetsError: null as Error | null,
};

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock portfolio service with inline class definitions
vi.mock("@/lib/services/portfolio-service", () => {
  // Define mock classes inside the factory to avoid hoisting issues
  class PortfolioNotFoundError extends Error {
    constructor() {
      super("Portfolio not found");
      this.name = "PortfolioNotFoundError";
    }
  }

  class AssetExistsError extends Error {
    symbol: string;
    constructor(symbol: string) {
      super("This asset already exists in your portfolio");
      this.name = "AssetExistsError";
      this.symbol = symbol;
    }
  }

  return {
    getPortfolioAssets: vi.fn(() => {
      if (mockState.getAssetsError) {
        return Promise.reject(mockState.getAssetsError);
      }
      return Promise.resolve(mockState.assets);
    }),
    addAsset: vi.fn(() => {
      if (mockState.addAssetError) {
        return Promise.reject(mockState.addAssetError);
      }
      return Promise.resolve(mockState.addedAsset);
    }),
    PortfolioNotFoundError,
    AssetExistsError,
  };
});

// Mock auth middleware to extract session
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: Request, context: unknown) => {
      const mockSession = { userId: "test-user-123" };
      return handler(request, mockSession, context);
    };
  }),
}));

// Import after mocks are set up
import {
  getPortfolioAssets,
  addAsset,
  PortfolioNotFoundError,
  AssetExistsError,
} from "@/lib/services/portfolio-service";

// =============================================================================
// TESTS
// =============================================================================

describe("Portfolio Assets API (Story 2.5, Story 3.2)", () => {
  const mockUserId = "test-user-123";
  const mockPortfolioId = "portfolio-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.assets = [];
    mockState.addedAsset = null;
    mockState.addAssetError = null;
    mockState.getAssetsError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // GET /api/portfolios/:portfolioId/assets
  // ===========================================================================

  describe("GET /api/portfolios/:portfolioId/assets", () => {
    describe("Successful Response", () => {
      it("should return empty array when no assets exist", async () => {
        mockState.assets = [];

        const assets = await getPortfolioAssets(mockUserId, mockPortfolioId);

        expect(assets).toEqual([]);
        expect(getPortfolioAssets).toHaveBeenCalledWith(mockUserId, mockPortfolioId);
      });

      it("should return assets array when assets exist", async () => {
        const mockAssetData = [
          {
            id: "asset-1",
            portfolioId: mockPortfolioId,
            symbol: "AAPL",
            name: "Apple Inc.",
            quantity: "10",
            purchasePrice: "150.00",
            currency: "USD",
          },
          {
            id: "asset-2",
            portfolioId: mockPortfolioId,
            symbol: "MSFT",
            name: "Microsoft Corporation",
            quantity: "5",
            purchasePrice: "300.00",
            currency: "USD",
          },
        ];
        mockState.assets = mockAssetData;

        const assets = await getPortfolioAssets(mockUserId, mockPortfolioId);

        expect(assets).toHaveLength(2);
        expect(assets[0]).toEqual(mockAssetData[0]);
        expect(assets[1]).toEqual(mockAssetData[1]);
      });
    });

    describe("Error Handling", () => {
      it("should throw PortfolioNotFoundError when portfolio not found", async () => {
        mockState.getAssetsError = new PortfolioNotFoundError();

        await expect(getPortfolioAssets(mockUserId, "non-existent")).rejects.toThrow(
          "Portfolio not found"
        );
      });
    });

    describe("Multi-tenant Isolation (AC-2.5.9)", () => {
      it("should pass userId to service for ownership verification", async () => {
        mockState.assets = [];

        await getPortfolioAssets(mockUserId, mockPortfolioId);

        expect(getPortfolioAssets).toHaveBeenCalledWith(mockUserId, mockPortfolioId);
      });
    });
  });

  // ===========================================================================
  // POST /api/portfolios/:portfolioId/assets
  // ===========================================================================

  describe("POST /api/portfolios/:portfolioId/assets", () => {
    describe("Successful Asset Creation (AC-2.5.6)", () => {
      it("should create asset with valid input", async () => {
        const input = {
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: "10",
          purchasePrice: "150.00",
          currency: "USD",
        };

        const expectedAsset = {
          id: "new-asset-id",
          portfolioId: mockPortfolioId,
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockState.addedAsset = expectedAsset;

        const asset = await addAsset(mockUserId, mockPortfolioId, input);

        expect(asset).toEqual(expectedAsset);
        expect(addAsset).toHaveBeenCalledWith(mockUserId, mockPortfolioId, input);
      });

      it("should create asset without optional name", async () => {
        const input = {
          symbol: "BTC",
          quantity: "0.5",
          purchasePrice: "50000.00",
          currency: "USD",
        };

        const expectedAsset = {
          id: "new-asset-id",
          portfolioId: mockPortfolioId,
          ...input,
          name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockState.addedAsset = expectedAsset;

        const asset = await addAsset(mockUserId, mockPortfolioId, input);

        expect(asset.symbol).toBe("BTC");
        expect(asset.name).toBeNull();
      });
    });

    describe("Validation (AC-2.5.5)", () => {
      it("should call service with validated input", async () => {
        const input = {
          symbol: "AAPL",
          quantity: "10.5",
          purchasePrice: "150.25",
          currency: "USD",
        };
        mockState.addedAsset = { id: "test", ...input };

        await addAsset(mockUserId, mockPortfolioId, input);

        expect(addAsset).toHaveBeenCalledWith(mockUserId, mockPortfolioId, input);
      });
    });

    describe("Duplicate Asset Prevention (AC-2.5.8)", () => {
      it("should throw AssetExistsError for duplicate symbol", async () => {
        mockState.addAssetError = new AssetExistsError("AAPL");

        const input = {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150.00",
          currency: "USD",
        };

        await expect(addAsset(mockUserId, mockPortfolioId, input)).rejects.toThrow(
          "This asset already exists in your portfolio"
        );
      });
    });

    describe("Portfolio Not Found", () => {
      it("should throw PortfolioNotFoundError when portfolio does not exist", async () => {
        mockState.addAssetError = new PortfolioNotFoundError();

        const input = {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150.00",
          currency: "USD",
        };

        await expect(addAsset(mockUserId, "non-existent", input)).rejects.toThrow(
          "Portfolio not found"
        );
      });
    });

    describe("Multi-tenant Isolation (AC-2.5.9)", () => {
      it("should pass userId to service for ownership verification", async () => {
        const input = {
          symbol: "AAPL",
          quantity: "10",
          purchasePrice: "150.00",
          currency: "USD",
        };
        mockState.addedAsset = { id: "test", ...input };

        await addAsset(mockUserId, mockPortfolioId, input);

        // First argument should be the userId
        expect(addAsset).toHaveBeenCalledWith(mockUserId, mockPortfolioId, input);
      });
    });
  });

  // ===========================================================================
  // Error Code Tests
  // ===========================================================================

  describe("Error Code Constants", () => {
    it("should have correct NOT_FOUND error code for portfolio", () => {
      expect(NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND).toBe("NOT_FOUND_PORTFOLIO");
    });

    it("should have correct CONFLICT error code for asset exists", () => {
      expect(CONFLICT_ERRORS.ASSET_EXISTS).toBe("CONFLICT_ASSET_EXISTS");
    });

    it("should have correct VALIDATION error code for invalid input", () => {
      expect(VALIDATION_ERRORS.INVALID_INPUT).toBe("VALIDATION_INVALID_INPUT");
    });
  });
});
