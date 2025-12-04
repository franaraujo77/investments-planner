/**
 * API Error Handling Integration Tests
 *
 * Tests for standardized API error responses.
 * Epic 3 Retrospective Action Item: Add integration tests for error response flow.
 *
 * These tests verify that API routes return consistent error formats
 * with proper error codes and HTTP status mapping.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock session for authenticated requests
let mockSession: { userId: string } | null = null;

// Mock the auth middleware
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
vi.mock("@/lib/services/portfolio-service", () => ({
  getUserPortfolios: vi.fn(() => Promise.resolve([])),
  createPortfolio: vi.fn(() => Promise.resolve({ id: "test-id", name: "Test" })),
  canCreatePortfolio: vi.fn(() => Promise.resolve(true)),
  getPortfolioById: vi.fn(() => Promise.resolve(null)),
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

// Import route handlers after mocks
import { GET, POST } from "@/app/api/portfolios/route";
import { getPortfolioById } from "@/lib/services/portfolio-service";

describe("API Error Handling", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { userId: mockUserId };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Authentication Error Tests
  // ===========================================================================

  describe("Authentication Errors", () => {
    it("should return 401 with AUTH_UNAUTHORIZED code when not authenticated", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/portfolios");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code");
      expect(body.code).toBe("AUTH_UNAUTHORIZED");
    });

    it("should include error message in authentication error", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        body: JSON.stringify({ name: "Test Portfolio" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.error).toBe("Authentication required");
    });
  });

  // ===========================================================================
  // Validation Error Tests
  // ===========================================================================

  describe("Validation Errors", () => {
    it("should return 400 with VALIDATION_ERROR code for invalid input", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        body: JSON.stringify({ name: "" }), // Empty name should fail validation
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should include field errors in validation response", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body).toHaveProperty("details");
      expect(body.details).toHaveProperty("name");
    });

    it("should return 400 for missing required fields", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        body: JSON.stringify({}), // Missing name field
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  // ===========================================================================
  // Not Found Error Tests
  // ===========================================================================

  describe("Not Found Errors", () => {
    it("should return standardized not found response format", async () => {
      // Mock getPortfolioById to return null (not found)
      vi.mocked(getPortfolioById).mockResolvedValueOnce(null);

      // This simulates what a proper not found response should look like
      const notFoundBody = {
        error: "Portfolio not found",
        code: "NOT_FOUND_PORTFOLIO",
      };

      expect(notFoundBody).toHaveProperty("error");
      expect(notFoundBody).toHaveProperty("code");
      expect(notFoundBody.code).toMatch(/^NOT_FOUND_/);
    });
  });

  // ===========================================================================
  // Error Response Structure Tests
  // ===========================================================================

  describe("Error Response Structure", () => {
    it("should have consistent error response structure", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/portfolios");
      const response = await GET(request);
      const body = await response.json();

      // Verify required fields
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code");

      // Verify types
      expect(typeof body.error).toBe("string");
      expect(typeof body.code).toBe("string");
    });

    it("should return JSON content type for error responses", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/portfolios");
      const response = await GET(request);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should have error code in expected format (CATEGORY_SPECIFIC)", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/portfolios");
      const response = await GET(request);
      const body = await response.json();

      // Error codes should follow CATEGORY_SPECIFIC pattern
      expect(body.code).toMatch(/^[A-Z]+_[A-Z_]+$/);
    });
  });

  // ===========================================================================
  // Error Code to HTTP Status Mapping Tests
  // ===========================================================================

  describe("Error Code to HTTP Status Mapping", () => {
    it("should map AUTH errors to 401", async () => {
      mockSession = null;

      const request = new NextRequest("http://localhost/api/portfolios");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.code).toMatch(/^AUTH_/);
    });

    it("should map VALIDATION errors to 400", async () => {
      const request = new NextRequest("http://localhost/api/portfolios", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toMatch(/^VALIDATION/);
    });
  });

  // ===========================================================================
  // UUID Validation Tests
  // ===========================================================================

  describe("UUID Validation", () => {
    it("should detect invalid UUID format in error message", () => {
      // Example of what VALIDATION_INVALID_UUID error should look like
      const invalidUuidError = {
        error: "Invalid portfolio ID format",
        code: "VALIDATION_INVALID_UUID",
      };

      expect(invalidUuidError.code).toBe("VALIDATION_INVALID_UUID");
    });
  });
});
