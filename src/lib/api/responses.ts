/**
 * API Response Utilities
 *
 * Standardized response factories for API routes.
 * Epic 3 Retrospective Action Item: Reduce code duplication in error responses.
 *
 * Usage:
 * ```typescript
 * import { errorResponse, successResponse, validationError } from "@/lib/api/responses";
 *
 * // Error response
 * return errorResponse("User not found", NOT_FOUND_ERRORS.USER_NOT_FOUND);
 *
 * // Success response
 * return successResponse({ user: userData });
 *
 * // Validation error with details
 * return validationError(result.error.issues);
 * ```
 */

import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";
import {
  type ErrorCode,
  VALIDATION_ERRORS,
  INTERNAL_ERRORS,
  DATABASE_ERRORS,
  CONFLICT_ERRORS,
  getHttpStatusForErrorCode,
} from "./error-codes";
import { logger } from "@/lib/telemetry/logger";
import {
  extractDbError,
  toLogContext,
  getUserFriendlyMessage,
  DbErrorCode,
  type DbErrorInfo,
} from "@/lib/db/errors";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Standard error response structure
 */
export interface ErrorResponseBody {
  error: string;
  code: ErrorCode;
  details?: unknown;
  requestId?: string;
}

/**
 * Standard success response structure
 */
export interface SuccessResponseBody<T = unknown> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

// =============================================================================
// ERROR RESPONSE FACTORIES
// =============================================================================

/**
 * Creates a standardized error response
 *
 * @param message - Human-readable error message
 * @param code - Error code from error-codes.ts
 * @param status - HTTP status code (defaults based on error code)
 * @param details - Optional additional error details
 * @returns NextResponse with error body
 *
 * @example
 * ```typescript
 * return errorResponse(
 *   "Portfolio not found",
 *   NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND
 * );
 * ```
 */
export function errorResponse(
  message: string,
  code: ErrorCode,
  status?: number,
  details?: unknown
): NextResponse<ErrorResponseBody> {
  const httpStatus = status ?? getHttpStatusForErrorCode(code);

  const body: ErrorResponseBody = {
    error: message,
    code,
  };

  if (details !== undefined) {
    body.details = details;
  }

  return NextResponse.json(body, { status: httpStatus });
}

/**
 * Creates a validation error response with Zod issues
 *
 * @param issues - Zod validation issues
 * @returns NextResponse with validation error body
 *
 * @example
 * ```typescript
 * const result = schema.safeParse(body);
 * if (!result.success) {
 *   return validationError(result.error.issues);
 * }
 * ```
 */
export function validationError(issues: ZodIssue[]): NextResponse<ErrorResponseBody> {
  // Format issues for response
  const formattedIssues = issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return errorResponse("Validation failed", VALIDATION_ERRORS.INVALID_INPUT, 400, formattedIssues);
}

/**
 * Creates an unauthorized error response
 *
 * @param message - Optional custom message
 * @param code - Optional specific auth error code
 * @returns NextResponse with 401 status
 */
export function unauthorizedError(
  message = "Authentication required",
  code: ErrorCode = "AUTH_UNAUTHORIZED"
): NextResponse<ErrorResponseBody> {
  return errorResponse(message, code, 401);
}

/**
 * Creates a forbidden error response
 *
 * @param message - Optional custom message
 * @returns NextResponse with 403 status
 */
export function forbiddenError(message = "Access denied"): NextResponse<ErrorResponseBody> {
  return errorResponse(message, "AUTH_FORBIDDEN", 403);
}

/**
 * Creates a not found error response
 *
 * @param resource - Name of the resource not found
 * @param code - Specific not found error code
 * @returns NextResponse with 404 status
 */
export function notFoundError(
  resource: string,
  code: ErrorCode = "NOT_FOUND_RESOURCE"
): NextResponse<ErrorResponseBody> {
  return errorResponse(`${resource} not found`, code, 404);
}

/**
 * Creates a rate limit error response
 *
 * @param retryAfter - Seconds until retry is allowed
 * @param code - Specific rate limit error code
 * @returns NextResponse with 429 status and Retry-After header
 */
export function rateLimitError(
  retryAfter: number,
  code: ErrorCode = "RATE_LIMIT_EXCEEDED"
): NextResponse<ErrorResponseBody> {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      code,
      details: { retryAfter },
    } as ErrorResponseBody,
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * Creates an internal error response
 *
 * @param message - Optional custom message (defaults to generic for security)
 * @returns NextResponse with 500 status
 */
export function internalError(
  message = "An unexpected error occurred"
): NextResponse<ErrorResponseBody> {
  return errorResponse(message, INTERNAL_ERRORS.INTERNAL_ERROR, 500);
}

/**
 * Creates a database error response with appropriate error code
 *
 * @param dbError - Extracted database error info
 * @param context - Optional context for the error message
 * @returns NextResponse with appropriate status code
 */
export function databaseError(
  dbError: DbErrorInfo,
  context?: string
): NextResponse<ErrorResponseBody> {
  // Map database error category to appropriate response
  switch (dbError.category) {
    case "connection":
      return errorResponse(
        "Database connection error. Please try again later.",
        DATABASE_ERRORS.CONNECTION_ERROR,
        503 // Service Unavailable
      );

    case "timeout":
      return errorResponse(
        "Database operation timed out. Please try again.",
        DATABASE_ERRORS.DATABASE_ERROR,
        504 // Gateway Timeout
      );

    case "constraint":
      // For unique violations, return 409 Conflict
      if (dbError.code === DbErrorCode.UNIQUE_VIOLATION) {
        return errorResponse(
          context ? `${context} already exists` : "Resource already exists",
          CONFLICT_ERRORS.RESOURCE_CONFLICT,
          409
        );
      }
      return errorResponse("Data validation failed", DATABASE_ERRORS.CONSTRAINT_VIOLATION, 400);

    case "authentication":
      return errorResponse("Database authentication failed", DATABASE_ERRORS.DATABASE_ERROR, 500);

    case "permission":
      return errorResponse("Database permission denied", DATABASE_ERRORS.DATABASE_ERROR, 500);

    case "not_found":
      return errorResponse("Database schema error", DATABASE_ERRORS.DATABASE_ERROR, 500);

    case "resource":
      return errorResponse(
        "Database resources exhausted. Please try again later.",
        DATABASE_ERRORS.DATABASE_ERROR,
        503
      );

    default:
      return errorResponse(getUserFriendlyMessage(dbError), DATABASE_ERRORS.DATABASE_ERROR, 500);
  }
}

// =============================================================================
// SUCCESS RESPONSE FACTORIES
// =============================================================================

/**
 * Creates a standardized success response
 *
 * @param data - Response data
 * @param status - HTTP status code (default 200)
 * @param meta - Optional metadata (pagination, etc.)
 * @returns NextResponse with success body
 *
 * @example
 * ```typescript
 * return successResponse({ portfolio });
 *
 * // With pagination
 * return successResponse(
 *   { portfolios },
 *   200,
 *   { page: 1, limit: 10, total: 50 }
 * );
 * ```
 */
export function successResponse<T>(
  data: T,
  status = 200,
  meta?: SuccessResponseBody["meta"]
): NextResponse<SuccessResponseBody<T>> {
  const body: SuccessResponseBody<T> = { data };

  if (meta) {
    body.meta = meta;
  }

  return NextResponse.json(body, { status });
}

/**
 * Creates a 201 Created response
 *
 * @param data - Created resource data
 * @returns NextResponse with 201 status
 */
export function createdResponse<T>(data: T): NextResponse<SuccessResponseBody<T>> {
  return successResponse(data, 201);
}

/**
 * Creates a 204 No Content response
 *
 * @returns NextResponse with 204 status and no body
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Wraps an async handler with standardized error handling
 *
 * Automatically detects database errors and logs full context including:
 * - PostgreSQL error codes
 * - Constraint names
 * - Underlying cause (connection errors, timeouts, etc.)
 *
 * @param handler - Async function to wrap
 * @param context - Optional context string for better error messages
 * @returns Wrapped handler that catches errors
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * }, "fetch user data");
 * ```
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: string
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract database error details (works for all errors, not just DB)
      const dbError = extractDbError(error);
      const logCtx = toLogContext(dbError);

      // Log with full context
      logger.error(context ? `API Error: ${context}` : "API Error", {
        ...logCtx,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorStack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      });

      // Return appropriate response based on error type
      if (dbError.isConnectionError || dbError.isTimeout || dbError.code) {
        return databaseError(dbError, context);
      }

      // Return generic error (don't expose internal details)
      return internalError();
    }
  };
}

/**
 * Enhanced error handler that provides detailed logging for database operations
 *
 * Use this when you need more control over error responses while still
 * getting full database error logging.
 *
 * @param error - The caught error
 * @param context - Description of the operation that failed
 * @param additionalContext - Extra context to include in logs
 * @returns Database error info for custom handling
 *
 * @example
 * ```typescript
 * try {
 *   await db.insert(users).values(data);
 * } catch (error) {
 *   const dbError = handleDbError(error, "create user", { email: data.email });
 *   if (dbError.code === DbErrorCode.UNIQUE_VIOLATION) {
 *     return errorResponse("Email already exists", CONFLICT_ERRORS.EMAIL_EXISTS, 409);
 *   }
 *   return databaseError(dbError);
 * }
 * ```
 */
export function handleDbError(
  error: unknown,
  context: string,
  additionalContext?: Record<string, unknown>
): DbErrorInfo {
  const dbError = extractDbError(error);
  const logCtx = toLogContext(dbError);

  logger.error(`Database error: ${context}`, {
    ...logCtx,
    ...additionalContext,
    errorStack:
      process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
  });

  return dbError;
}
