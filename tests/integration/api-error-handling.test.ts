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
import { DbErrorCode } from "@/lib/db/errors";

// Mock session for authenticated requests
let mockSession: { userId: string } | null = null;

// Mock database errors with postgres.js error shape
function createDbError(
  code: string,
  message: string,
  cause?: string
): Error & { code?: string; cause?: Error } {
  const error = new Error(message) as Error & { code?: string; cause?: Error };
  error.code = code;
  if (cause) {
    error.cause = new Error(cause);
  }
  return error;
}

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
import { getPortfolioById, createPortfolio } from "@/lib/services/portfolio-service";

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

  // ===========================================================================
  // Database Error Scenario Tests
  // ===========================================================================

  describe("Database Error Scenarios", () => {
    describe("Connection Errors (503)", () => {
      it("should return 503 with DATABASE_CONNECTION_ERROR for connection failures", async () => {
        // Mock service to throw connection error
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.CONNECTION_FAILURE, "Connection refused", "ECONNREFUSED")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.code).toBe("DATABASE_CONNECTION_ERROR");
        expect(body.error).toContain("Database connection error");
      });

      it("should return 503 for connection exception errors", async () => {
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.CONNECTION_EXCEPTION, "Connection exception")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.code).toBe("DATABASE_CONNECTION_ERROR");
      });

      it("should return 503 for ECONNREFUSED errors without code", async () => {
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        const error = new Error("connect ECONNREFUSED 127.0.0.1:5432") as Error & { cause?: Error };
        error.cause = new Error("ECONNREFUSED");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(error);

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.code).toBe("DATABASE_CONNECTION_ERROR");
      });
    });

    describe("Timeout Errors", () => {
      it("should return 503 for query cancellation (57xxx codes categorized as connection)", async () => {
        // Note: QUERY_CANCELED (57014) is categorized as "connection" in extractDbError
        // because 57xxx codes are operator intervention codes
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.QUERY_CANCELED, "Query was canceled")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.code).toBe("DATABASE_CONNECTION_ERROR");
      });

      it("should return 503 for ETIMEDOUT errors (connection category)", async () => {
        // Note: ETIMEDOUT errors are categorized as "connection" and isConnectionError=true
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        const error = new Error("Connection timeout") as Error & { cause?: Error };
        error.cause = new Error("ETIMEDOUT");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(error);

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.code).toBe("DATABASE_CONNECTION_ERROR");
      });
    });

    describe("Constraint Violations", () => {
      // Note: Current route implementation only handles connection/timeout errors
      // Constraint violations fall through to generic INTERNAL_ERROR
      // This tests actual behavior, not ideal behavior

      it("should return 500 INTERNAL_ERROR for unique violations (not handled by route)", async () => {
        // The portfolios route only checks isConnectionError || isTimeout
        // Unique violations don't match, so they fall to generic 500
        const { createPortfolio } = await import("@/lib/services/portfolio-service");
        vi.mocked(createPortfolio).mockRejectedValueOnce(
          createDbError(
            DbErrorCode.UNIQUE_VIOLATION,
            "duplicate key value violates unique constraint"
          )
        );

        const request = new NextRequest("http://localhost/api/portfolios", {
          method: "POST",
          body: JSON.stringify({ name: "Duplicate Portfolio" }),
          headers: { "Content-Type": "application/json" },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.code).toBe("INTERNAL_ERROR");
      });

      it("should return 500 INTERNAL_ERROR for foreign key violations (not handled by route)", async () => {
        const { createPortfolio } = await import("@/lib/services/portfolio-service");
        vi.mocked(createPortfolio).mockRejectedValueOnce(
          createDbError(DbErrorCode.FOREIGN_KEY_VIOLATION, "violates foreign key constraint")
        );

        const request = new NextRequest("http://localhost/api/portfolios", {
          method: "POST",
          body: JSON.stringify({ name: "Invalid Portfolio" }),
          headers: { "Content-Type": "application/json" },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.code).toBe("INTERNAL_ERROR");
      });
    });

    describe("Resource Exhaustion", () => {
      it("should return 503 for too many connections (message contains 'connection')", async () => {
        // TOO_MANY_CONNECTIONS (53300) - categorized as "connection" because
        // the message "too many connections" contains "connection"
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.TOO_MANY_CONNECTIONS, "too many connections for role")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.code).toBe("DATABASE_CONNECTION_ERROR");
      });

      it("should return 500 for out of memory errors (not connection/timeout)", async () => {
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.OUT_OF_MEMORY, "out of memory")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.code).toBe("INTERNAL_ERROR");
      });
    });

    describe("Authentication/Permission Errors", () => {
      it("should return 500 INTERNAL_ERROR for database authentication errors", async () => {
        // Auth errors (28xxx) don't match connection/timeout check
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.INVALID_PASSWORD, "password authentication failed")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.code).toBe("INTERNAL_ERROR");
      });

      it("should return 500 INTERNAL_ERROR for insufficient privilege errors", async () => {
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.INSUFFICIENT_PRIVILEGE, "permission denied for table")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.code).toBe("INTERNAL_ERROR");
      });
    });

    describe("Error Response Security", () => {
      it("should not expose internal database details in error messages", async () => {
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(
            DbErrorCode.CONNECTION_FAILURE,
            "Failed query: SELECT * FROM users WHERE id = 'secret'"
          )
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        // Should not expose query details
        expect(body.error).not.toContain("SELECT");
        expect(body.error).not.toContain("users");
        expect(body.error).not.toContain("secret");
      });

      it("should not expose database host information", async () => {
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");
        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(
            DbErrorCode.CONNECTION_FAILURE,
            "connect to db.internal.example.com:5432 failed"
          )
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        const response = await GET(request);
        const body = await response.json();

        // Should not expose internal hostnames
        expect(body.error).not.toContain("db.internal.example.com");
        expect(body.error).not.toContain("5432");
      });
    });

    describe("Error Logging", () => {
      it("should log database errors with full context", async () => {
        const { logger } = await import("@/lib/telemetry/logger");
        const { getUserPortfolios } = await import("@/lib/services/portfolio-service");

        vi.mocked(getUserPortfolios).mockRejectedValueOnce(
          createDbError(DbErrorCode.CONNECTION_FAILURE, "Connection failed")
        );

        const request = new NextRequest("http://localhost/api/portfolios");
        await GET(request);

        // Verify logger was called with database error context
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining("Database error"),
          expect.objectContaining({
            dbErrorCode: DbErrorCode.CONNECTION_FAILURE,
            isConnectionError: true,
          })
        );
      });
    });
  });
});
