/**
 * Portfolio Creation Schema Integration Tests
 *
 * Story 3.1: Create Portfolio (Quick Modal)
 * Story 2.1: Create Portfolio (Full Form)
 *
 * These tests ensure schema alignment between:
 * - Quick modal (name-only) → createPortfolioQuickSchema
 * - Full form (all fields) → createPortfolioSchema
 * - API endpoint (accepts both, applies defaults)
 *
 * REGRESSION PREVENTION:
 * This test was added after a bug where the modal used createPortfolioSchema
 * (requiring 4 fields) but only provided a name input, causing the submit
 * button to never enable because isValid was always false.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createPortfolioQuickSchema,
  createPortfolioSchema,
  type CreatePortfolioQuickInput,
  type CreatePortfolioInput,
} from "@/lib/validations/portfolio";
import { VALIDATION_ERRORS } from "@/lib/api/error-codes";

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe("Portfolio Creation Schema Alignment", () => {
  describe("Quick Schema (Modal - Story 3.1)", () => {
    it("should validate successfully with only a name", () => {
      const input = { name: "My Portfolio" };
      const result = createPortfolioQuickSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
      }
    });

    it("should trim whitespace from name", () => {
      const input = { name: "  My Portfolio  " };
      const result = createPortfolioQuickSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Portfolio");
      }
    });

    it("should reject empty name", () => {
      const input = { name: "" };
      const result = createPortfolioQuickSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only name", () => {
      const input = { name: "   " };
      const result = createPortfolioQuickSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject name exceeding 50 characters", () => {
      const input = { name: "A".repeat(51) };
      const result = createPortfolioQuickSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should NOT require baseCurrency, industrySector, or assetTypes", () => {
      // This is the key test that prevents the regression
      const input: CreatePortfolioQuickInput = { name: "Test Portfolio" };

      // Verify the type only has 'name' field
      const _typeCheck: keyof CreatePortfolioQuickInput = "name";

      const result = createPortfolioQuickSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("Full Schema (Form - Story 2.1)", () => {
    it("should require all four fields", () => {
      const input = { name: "My Portfolio" };
      const result = createPortfolioSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.baseCurrency).toBeDefined();
        expect(errors.industrySector).toBeDefined();
        expect(errors.assetTypes).toBeDefined();
      }
    });

    it("should validate successfully with all fields", () => {
      const input: CreatePortfolioInput = {
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Technology",
        assetTypes: ["Stocks", "ETFs"],
      };
      const result = createPortfolioSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject empty assetTypes array", () => {
      const input = {
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Technology",
        assetTypes: [],
      };
      const result = createPortfolioSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid currency", () => {
      const input = {
        name: "My Portfolio",
        baseCurrency: "INVALID",
        industrySector: "Technology",
        assetTypes: ["Stocks"],
      };
      const result = createPortfolioSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid industry sector", () => {
      const input = {
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Invalid Sector",
        assetTypes: ["Stocks"],
      };
      const result = createPortfolioSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("Schema Type Compatibility", () => {
    it("quick input should be a subset of full input structure", () => {
      // A valid quick input with defaults should satisfy full schema
      const quickInput: CreatePortfolioQuickInput = { name: "Test" };
      const defaults = {
        baseCurrency: "USD" as const,
        industrySector: "Other" as const,
        assetTypes: ["Stocks"] as const,
      };

      const fullInput = { ...defaults, ...quickInput };
      const result = createPortfolioSchema.safeParse(fullInput);

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// API INTEGRATION TESTS
// =============================================================================

// Mock session for authenticated requests
let mockSession: { userId: string } | null = null;

// Mock the auth middleware - must be before imports
vi.mock("@/lib/auth/middleware", () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest, ...args: unknown[]) => {
      if (!mockSession) {
        return new Response(
          JSON.stringify({
            error: "Authentication required",
            code: "AUTH_UNAUTHORIZED",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return handler(request, mockSession, ...args);
    };
  }),
}));

// Mock the portfolio service
const mockCreatePortfolio = vi.fn();
vi.mock("@/lib/services/portfolio-service", () => ({
  getUserPortfoliosWithAssetTypes: vi.fn(() => Promise.resolve([])),
  createPortfolio: (...args: unknown[]) => mockCreatePortfolio(...args),
  canCreatePortfolio: vi.fn(() => Promise.resolve(true)),
  PortfolioLimitError: class PortfolioLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PortfolioLimitError";
    }
  },
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import route handler after mocks
import { POST } from "@/app/api/portfolios/route";

describe("Portfolio Creation API - Schema Integration", () => {
  beforeEach(() => {
    mockSession = { userId: "test-user-id" };
    mockCreatePortfolio.mockReset();
    mockCreatePortfolio.mockResolvedValue({
      id: "new-portfolio-id",
      name: "Test Portfolio",
      baseCurrency: "USD",
      industrySector: "Other",
      acceptedAssetTypes: ["Stocks"],
    });
  });

  afterEach(() => {
    mockSession = null;
    vi.clearAllMocks();
  });

  describe("Quick Creation (name-only payload)", () => {
    it("should accept name-only payload and apply defaults", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Quick Portfolio" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Verify createPortfolio was called with defaults applied
      expect(mockCreatePortfolio).toHaveBeenCalledWith("test-user-id", {
        name: "My Quick Portfolio",
        baseCurrency: "USD",
        industrySector: "Other",
        assetTypes: ["Stocks"],
      });
    });

    it("should use provided values over defaults", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tech Portfolio",
          baseCurrency: "EUR",
          industrySector: "Technology",
          assetTypes: ["Stocks", "ETFs"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      expect(mockCreatePortfolio).toHaveBeenCalledWith("test-user-id", {
        name: "Tech Portfolio",
        baseCurrency: "EUR",
        industrySector: "Technology",
        assetTypes: ["Stocks", "ETFs"],
      });
    });

    it("should reject empty name even with defaults", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe(VALIDATION_ERRORS.INVALID_INPUT);
    });

    it("should reject missing name field", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe(VALIDATION_ERRORS.INVALID_INPUT);
    });
  });

  describe("Full Creation (all fields)", () => {
    it("should accept full payload with all fields", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Complete Portfolio",
          baseCurrency: "GBP",
          industrySector: "Healthcare",
          assetTypes: ["Bonds", "REITs"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      expect(mockCreatePortfolio).toHaveBeenCalledWith("test-user-id", {
        name: "Complete Portfolio",
        baseCurrency: "GBP",
        industrySector: "Healthcare",
        assetTypes: ["Bonds", "REITs"],
      });
    });

    it("should reject invalid currency even with valid name", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Portfolio",
          baseCurrency: "INVALID",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject invalid industry sector", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Portfolio",
          industrySector: "Not A Real Sector",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Default Values", () => {
    it("should use USD as default currency", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });

      await POST(request);

      expect(mockCreatePortfolio).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ baseCurrency: "USD" })
      );
    });

    it("should use Other as default industry sector", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });

      await POST(request);

      expect(mockCreatePortfolio).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ industrySector: "Other" })
      );
    });

    it("should use Stocks as default asset type", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });

      await POST(request);

      expect(mockCreatePortfolio).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ assetTypes: ["Stocks"] })
      );
    });
  });
});

// =============================================================================
// FORM VALIDATION SIMULATION TESTS
// =============================================================================

describe("React Hook Form Validation Simulation", () => {
  /**
   * These tests simulate how React Hook Form would validate the form
   * to ensure the Create button would be enabled/disabled correctly.
   */

  describe("Quick Modal Form (Story 3.1)", () => {
    it("should be valid when user types a valid name", () => {
      // Simulate: User opens modal and types "My Portfolio"
      const formData = { name: "My Portfolio" };
      const result = createPortfolioQuickSchema.safeParse(formData);

      // Button should be ENABLED (isValid = true)
      expect(result.success).toBe(true);
    });

    it("should be invalid with empty name (initial state)", () => {
      // Simulate: Modal just opened, name is empty
      const formData = { name: "" };
      const result = createPortfolioQuickSchema.safeParse(formData);

      // Button should be DISABLED (isValid = false)
      expect(result.success).toBe(false);
    });

    it("should NOT require other fields that modal does not provide", () => {
      // This is the CRITICAL test that prevents the original bug
      // The modal only has a name input, so the schema must only require name

      const formData = { name: "Valid Name" };

      // Quick schema should pass with just name
      const quickResult = createPortfolioQuickSchema.safeParse(formData);
      expect(quickResult.success).toBe(true);

      // Full schema would FAIL with just name (this caused the original bug)
      const fullResult = createPortfolioSchema.safeParse(formData);
      expect(fullResult.success).toBe(false);
    });
  });

  describe("Full Form (Story 2.1)", () => {
    it("should be valid when all fields are filled", () => {
      const formData: CreatePortfolioInput = {
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Technology",
        assetTypes: ["Stocks"],
      };
      const result = createPortfolioSchema.safeParse(formData);

      expect(result.success).toBe(true);
    });

    it("should be invalid when assetTypes is empty", () => {
      const formData = {
        name: "My Portfolio",
        baseCurrency: "USD",
        industrySector: "Technology",
        assetTypes: [],
      };
      const result = createPortfolioSchema.safeParse(formData);

      expect(result.success).toBe(false);
    });
  });
});
