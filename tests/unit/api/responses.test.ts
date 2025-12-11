/**
 * API Response Utilities Tests
 *
 * Tests for API response factory functions.
 * Epic 3 Retrospective Action Item: Add test coverage for response utilities.
 *
 * Tests:
 * - errorResponse: Mapping error codes to HTTP status
 * - validationError: Zod issue formatting
 * - successResponse: Data wrapping and meta support
 * - withErrorHandling: Error catching and logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

// Mock the logger to prevent console output and verify calls
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  errorResponse,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  rateLimitError,
  internalError,
  successResponse,
  createdResponse,
  noContentResponse,
  withErrorHandling,
  type ErrorResponseBody,
  type SuccessResponseBody,
} from "@/lib/api/responses";

import {
  VALIDATION_ERRORS,
  NOT_FOUND_ERRORS,
  AUTH_ERRORS,
  INTERNAL_ERRORS,
  RATE_LIMIT_ERRORS,
  getHttpStatusForErrorCode,
} from "@/lib/api/error-codes";

import { logger } from "@/lib/telemetry/logger";

describe("API Response Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // errorResponse Tests
  // ===========================================================================

  describe("errorResponse", () => {
    it("should map error codes to correct HTTP status", async () => {
      const response = errorResponse("Not found", NOT_FOUND_ERRORS.USER_NOT_FOUND);
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(404);
      expect(body.error).toBe("Not found");
      expect(body.code).toBe("NOT_FOUND_USER");
    });

    it("should use provided status over default", async () => {
      const response = errorResponse("Custom error", VALIDATION_ERRORS.INVALID_INPUT, 422);
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(422);
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
    });

    it("should include details when provided", async () => {
      const details = { field: "email", reason: "already exists" };
      const response = errorResponse(
        "Validation failed",
        VALIDATION_ERRORS.INVALID_INPUT,
        400,
        details
      );
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.details).toEqual(details);
    });

    it("should not include details when not provided", async () => {
      const response = errorResponse("Error", INTERNAL_ERRORS.INTERNAL_ERROR);
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.details).toBeUndefined();
    });

    it("should map validation errors to 400", async () => {
      const response = errorResponse("Invalid input", VALIDATION_ERRORS.INVALID_UUID);
      expect(response.status).toBe(400);
    });

    it("should map auth errors to 401", async () => {
      const response = errorResponse("Unauthorized", AUTH_ERRORS.UNAUTHORIZED);
      expect(response.status).toBe(401);
    });

    it("should map not found errors to 404", async () => {
      const response = errorResponse("Not found", NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND);
      expect(response.status).toBe(404);
    });

    it("should map rate limit errors to 429", async () => {
      const response = errorResponse("Too many requests", RATE_LIMIT_ERRORS.RATE_LIMITED);
      expect(response.status).toBe(429);
    });

    it("should map internal errors to 500", async () => {
      const response = errorResponse("Internal error", INTERNAL_ERRORS.INTERNAL_ERROR);
      expect(response.status).toBe(500);
    });
  });

  // ===========================================================================
  // validationError Tests
  // ===========================================================================

  describe("validationError", () => {
    it("should format Zod issues correctly", async () => {
      const issues = [
        { path: ["email"], message: "Invalid email", code: "invalid_string" as const },
        { path: ["password"], message: "Too short", code: "too_small" as const },
      ];

      const response = validationError(issues as Parameters<typeof validationError>[0]);
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_INVALID_INPUT");
      expect(body.error).toBe("Validation failed");
      expect(body.details).toEqual([
        { path: "email", message: "Invalid email", code: "invalid_string" },
        { path: "password", message: "Too short", code: "too_small" },
      ]);
    });

    it("should handle nested paths", async () => {
      const issues = [
        { path: ["user", "profile", "name"], message: "Required", code: "invalid_type" as const },
      ];

      const response = validationError(issues as Parameters<typeof validationError>[0]);
      const body = (await response.json()) as ErrorResponseBody;

      expect((body.details as Array<{ path: string }>)[0].path).toBe("user.profile.name");
    });

    it("should handle empty issues array", async () => {
      const response = validationError([]);
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(400);
      expect(body.details).toEqual([]);
    });
  });

  // ===========================================================================
  // Convenience Error Functions Tests
  // ===========================================================================

  describe("unauthorizedError", () => {
    it("should return 401 with default message", async () => {
      const response = unauthorizedError();
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(401);
      expect(body.error).toBe("Authentication required");
      expect(body.code).toBe("AUTH_UNAUTHORIZED");
    });

    it("should accept custom message", async () => {
      const response = unauthorizedError("Token expired");
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.error).toBe("Token expired");
    });

    it("should accept custom code", async () => {
      const response = unauthorizedError("Token expired", AUTH_ERRORS.TOKEN_EXPIRED);
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.code).toBe("AUTH_TOKEN_EXPIRED");
    });
  });

  describe("forbiddenError", () => {
    it("should return 403 with default message", async () => {
      const response = forbiddenError();
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(403);
      expect(body.error).toBe("Access denied");
      expect(body.code).toBe("AUTH_FORBIDDEN");
    });

    it("should accept custom message", async () => {
      const response = forbiddenError("Insufficient permissions");
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.error).toBe("Insufficient permissions");
    });
  });

  describe("notFoundError", () => {
    it("should return 404 with resource name", async () => {
      const response = notFoundError("Portfolio", NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND);
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(404);
      expect(body.error).toBe("Portfolio not found");
      expect(body.code).toBe("NOT_FOUND_PORTFOLIO");
    });
  });

  describe("rateLimitError", () => {
    it("should return 429 with retryAfter", async () => {
      const response = rateLimitError(3600);
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(429);
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect((body.details as { retryAfter: number }).retryAfter).toBe(3600);
      expect(response.headers.get("Retry-After")).toBe("3600");
    });

    it("should accept custom code", async () => {
      const response = rateLimitError(60, RATE_LIMIT_ERRORS.LOGIN_ATTEMPTS_EXCEEDED);
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.code).toBe("RATE_LIMIT_LOGIN_EXCEEDED");
    });
  });

  describe("internalError", () => {
    it("should return 500 with default message", async () => {
      const response = internalError();
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(500);
      expect(body.error).toBe("An unexpected error occurred");
      expect(body.code).toBe("INTERNAL_ERROR");
    });

    it("should accept custom message", async () => {
      const response = internalError("Database connection failed");
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.error).toBe("Database connection failed");
    });
  });

  // ===========================================================================
  // Success Response Tests
  // ===========================================================================

  describe("successResponse", () => {
    it("should wrap data in data property", async () => {
      const data = { id: "123", name: "Test" };
      const response = successResponse(data);
      const body = (await response.json()) as SuccessResponseBody<typeof data>;

      expect(response.status).toBe(200);
      expect(body.data).toEqual(data);
    });

    it("should accept custom status", async () => {
      const response = successResponse({ ok: true }, 201);
      expect(response.status).toBe(201);
    });

    it("should include meta when provided", async () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { page: 1, limit: 10, total: 50 };
      const response = successResponse(data, 200, meta);
      const body = (await response.json()) as SuccessResponseBody<typeof data>;

      expect(body.data).toEqual(data);
      expect(body.meta).toEqual(meta);
    });

    it("should not include meta when not provided", async () => {
      const response = successResponse({ id: "123" });
      const body = (await response.json()) as SuccessResponseBody;

      expect(body.meta).toBeUndefined();
    });
  });

  describe("createdResponse", () => {
    it("should return 201 with data", async () => {
      const data = { id: "new-123", createdAt: new Date().toISOString() };
      const response = createdResponse(data);
      const body = (await response.json()) as SuccessResponseBody<typeof data>;

      expect(response.status).toBe(201);
      expect(body.data).toEqual(data);
    });
  });

  describe("noContentResponse", () => {
    it("should return 204 with no body", async () => {
      const response = noContentResponse();

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });

  // ===========================================================================
  // withErrorHandling Tests
  // ===========================================================================

  describe("withErrorHandling", () => {
    it("should pass through successful responses", async () => {
      const handler = vi.fn().mockResolvedValue(successResponse({ ok: true }));
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();
      const body = (await response.json()) as SuccessResponseBody;

      expect(response.status).toBe(200);
      expect(body.data).toEqual({ ok: true });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should catch and log errors", async () => {
      // Use an error message that won't be categorized as a connection error
      const testError = new Error("Unexpected processing failure");
      const handler = vi.fn().mockRejectedValue(testError);
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();
      const body = (await response.json()) as ErrorResponseBody;

      expect(response.status).toBe(500);
      expect(body.code).toBe("INTERNAL_ERROR");
      expect(logger.error).toHaveBeenCalledWith(
        "API Error",
        expect.objectContaining({
          dbErrorMessage: "Unexpected processing failure",
          errorName: "Error",
        })
      );
    });

    it("should handle non-Error thrown values", async () => {
      const handler = vi.fn().mockRejectedValue("string error");
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        "API Error",
        expect.objectContaining({
          dbErrorMessage: "string error",
          errorName: "UnknownError",
        })
      );
    });

    it("should pass arguments to the wrapped handler", async () => {
      const handler = vi.fn().mockResolvedValue(successResponse({ ok: true }));
      const wrappedHandler = withErrorHandling(handler);

      const mockRequest = new Request("http://localhost/test");
      await wrappedHandler(mockRequest, { userId: "123" });

      expect(handler).toHaveBeenCalledWith(mockRequest, { userId: "123" });
    });

    it("should not expose internal error details to client", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Sensitive database info"));
      const wrappedHandler = withErrorHandling(handler);

      const response = await wrappedHandler();
      const body = (await response.json()) as ErrorResponseBody;

      expect(body.error).toBe("An unexpected error occurred");
      expect(body.error).not.toContain("Sensitive");
      expect(body.details).toBeUndefined();
    });
  });

  // ===========================================================================
  // getHttpStatusForErrorCode Tests
  // ===========================================================================

  describe("getHttpStatusForErrorCode", () => {
    it("should return 400 for validation errors", () => {
      expect(getHttpStatusForErrorCode(VALIDATION_ERRORS.INVALID_INPUT)).toBe(400);
      expect(getHttpStatusForErrorCode(VALIDATION_ERRORS.INVALID_UUID)).toBe(400);
      expect(getHttpStatusForErrorCode(VALIDATION_ERRORS.INVALID_EMAIL)).toBe(400);
    });

    it("should return 401 for auth unauthorized errors", () => {
      expect(getHttpStatusForErrorCode(AUTH_ERRORS.UNAUTHORIZED)).toBe(401);
      expect(getHttpStatusForErrorCode(AUTH_ERRORS.INVALID_CREDENTIALS)).toBe(401);
      expect(getHttpStatusForErrorCode(AUTH_ERRORS.TOKEN_EXPIRED)).toBe(401);
    });

    it("should return 403 for forbidden errors", () => {
      expect(getHttpStatusForErrorCode(AUTH_ERRORS.FORBIDDEN)).toBe(403);
    });

    it("should return 404 for not found errors", () => {
      expect(getHttpStatusForErrorCode(NOT_FOUND_ERRORS.USER_NOT_FOUND)).toBe(404);
      expect(getHttpStatusForErrorCode(NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND)).toBe(404);
    });

    it("should return 429 for rate limit errors", () => {
      expect(getHttpStatusForErrorCode(RATE_LIMIT_ERRORS.RATE_LIMITED)).toBe(429);
      expect(getHttpStatusForErrorCode(RATE_LIMIT_ERRORS.LOGIN_ATTEMPTS_EXCEEDED)).toBe(429);
    });

    it("should return 500 for internal errors", () => {
      expect(getHttpStatusForErrorCode(INTERNAL_ERRORS.INTERNAL_ERROR)).toBe(500);
      expect(getHttpStatusForErrorCode(INTERNAL_ERRORS.UNEXPECTED_ERROR)).toBe(500);
    });
  });
});
