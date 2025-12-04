/**
 * API Error Codes
 *
 * Standardized error codes for API responses.
 * Epic 3 Retrospective Action Item: Replace generic error messages with specific codes.
 *
 * Code Format: CATEGORY_SPECIFIC_ERROR
 * Categories:
 * - AUTH_*     - Authentication and authorization errors
 * - VALIDATION_* - Input validation errors
 * - NOT_FOUND_* - Resource not found errors
 * - CONFLICT_*  - Resource conflict errors (e.g., duplicate)
 * - RATE_LIMIT_* - Rate limiting errors
 * - DATABASE_*  - Database operation errors
 * - EXTERNAL_*  - External service errors
 * - INTERNAL_*  - Internal server errors
 */

// =============================================================================
// AUTHENTICATION & AUTHORIZATION ERRORS
// =============================================================================

export const AUTH_ERRORS = {
  /** Invalid or missing authentication token */
  UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  /** Valid token but insufficient permissions */
  FORBIDDEN: "AUTH_FORBIDDEN",
  /** Token has expired */
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  /** Invalid credentials provided */
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  /** Email not verified */
  EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",
  /** Account is deleted/deactivated */
  ACCOUNT_DELETED: "AUTH_ACCOUNT_DELETED",
  /** Account is locked */
  ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
} as const;

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export const VALIDATION_ERRORS = {
  /** Generic validation failure */
  INVALID_INPUT: "VALIDATION_INVALID_INPUT",
  /** Required field missing */
  REQUIRED_FIELD: "VALIDATION_REQUIRED_FIELD",
  /** Field format is invalid */
  INVALID_FORMAT: "VALIDATION_INVALID_FORMAT",
  /** Value is out of allowed range */
  OUT_OF_RANGE: "VALIDATION_OUT_OF_RANGE",
  /** Value exceeds maximum length */
  TOO_LONG: "VALIDATION_TOO_LONG",
  /** Value is below minimum length */
  TOO_SHORT: "VALIDATION_TOO_SHORT",
  /** Invalid email format */
  INVALID_EMAIL: "VALIDATION_INVALID_EMAIL",
  /** Password too weak */
  WEAK_PASSWORD: "VALIDATION_WEAK_PASSWORD",
  /** Invalid UUID format */
  INVALID_UUID: "VALIDATION_INVALID_UUID",
  /** Invalid decimal/number format */
  INVALID_NUMBER: "VALIDATION_INVALID_NUMBER",
  /** Invalid date format */
  INVALID_DATE: "VALIDATION_INVALID_DATE",
  /** Invalid currency code */
  INVALID_CURRENCY: "VALIDATION_INVALID_CURRENCY",
} as const;

// =============================================================================
// NOT FOUND ERRORS
// =============================================================================

export const NOT_FOUND_ERRORS = {
  /** Generic resource not found */
  RESOURCE_NOT_FOUND: "NOT_FOUND_RESOURCE",
  /** User not found */
  USER_NOT_FOUND: "NOT_FOUND_USER",
  /** Portfolio not found */
  PORTFOLIO_NOT_FOUND: "NOT_FOUND_PORTFOLIO",
  /** Asset not found */
  ASSET_NOT_FOUND: "NOT_FOUND_ASSET",
  /** Investment not found */
  INVESTMENT_NOT_FOUND: "NOT_FOUND_INVESTMENT",
  /** Token not found (verification, password reset) */
  TOKEN_NOT_FOUND: "NOT_FOUND_TOKEN",
} as const;

// =============================================================================
// CONFLICT ERRORS
// =============================================================================

export const CONFLICT_ERRORS = {
  /** Generic resource conflict */
  RESOURCE_CONFLICT: "CONFLICT_RESOURCE",
  /** Email already registered */
  EMAIL_EXISTS: "CONFLICT_EMAIL_EXISTS",
  /** User already has a portfolio */
  PORTFOLIO_EXISTS: "CONFLICT_PORTFOLIO_EXISTS",
  /** Asset already in portfolio */
  ASSET_EXISTS: "CONFLICT_ASSET_EXISTS",
  /** Token already used */
  TOKEN_USED: "CONFLICT_TOKEN_USED",
} as const;

// =============================================================================
// RATE LIMITING ERRORS
// =============================================================================

export const RATE_LIMIT_ERRORS = {
  /** Generic rate limit exceeded */
  RATE_LIMITED: "RATE_LIMIT_EXCEEDED",
  /** Login attempts exceeded */
  LOGIN_ATTEMPTS_EXCEEDED: "RATE_LIMIT_LOGIN_EXCEEDED",
  /** Email resend attempts exceeded */
  EMAIL_RESEND_EXCEEDED: "RATE_LIMIT_EMAIL_EXCEEDED",
  /** API request limit exceeded */
  API_LIMIT_EXCEEDED: "RATE_LIMIT_API_EXCEEDED",
} as const;

// =============================================================================
// DATABASE ERRORS
// =============================================================================

export const DATABASE_ERRORS = {
  /** Generic database error */
  DATABASE_ERROR: "DATABASE_ERROR",
  /** Transaction failed */
  TRANSACTION_FAILED: "DATABASE_TRANSACTION_FAILED",
  /** Connection error */
  CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",
  /** Constraint violation */
  CONSTRAINT_VIOLATION: "DATABASE_CONSTRAINT_VIOLATION",
} as const;

// =============================================================================
// EXTERNAL SERVICE ERRORS
// =============================================================================

export const EXTERNAL_ERRORS = {
  /** Generic external service error */
  EXTERNAL_ERROR: "EXTERNAL_SERVICE_ERROR",
  /** Email service error */
  EMAIL_SERVICE_ERROR: "EXTERNAL_EMAIL_ERROR",
  /** Price data service error */
  PRICE_SERVICE_ERROR: "EXTERNAL_PRICE_ERROR",
  /** Exchange rate service error */
  EXCHANGE_RATE_ERROR: "EXTERNAL_EXCHANGE_RATE_ERROR",
} as const;

// =============================================================================
// INTERNAL ERRORS
// =============================================================================

export const INTERNAL_ERRORS = {
  /** Generic internal error */
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Unexpected error */
  UNEXPECTED_ERROR: "INTERNAL_UNEXPECTED_ERROR",
  /** Configuration error */
  CONFIG_ERROR: "INTERNAL_CONFIG_ERROR",
} as const;

// =============================================================================
// ALL ERROR CODES (Union type)
// =============================================================================

export type AuthErrorCode = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS];
export type ValidationErrorCode = (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS];
export type NotFoundErrorCode = (typeof NOT_FOUND_ERRORS)[keyof typeof NOT_FOUND_ERRORS];
export type ConflictErrorCode = (typeof CONFLICT_ERRORS)[keyof typeof CONFLICT_ERRORS];
export type RateLimitErrorCode = (typeof RATE_LIMIT_ERRORS)[keyof typeof RATE_LIMIT_ERRORS];
export type DatabaseErrorCode = (typeof DATABASE_ERRORS)[keyof typeof DATABASE_ERRORS];
export type ExternalErrorCode = (typeof EXTERNAL_ERRORS)[keyof typeof EXTERNAL_ERRORS];
export type InternalErrorCode = (typeof INTERNAL_ERRORS)[keyof typeof INTERNAL_ERRORS];

export type ErrorCode =
  | AuthErrorCode
  | ValidationErrorCode
  | NotFoundErrorCode
  | ConflictErrorCode
  | RateLimitErrorCode
  | DatabaseErrorCode
  | ExternalErrorCode
  | InternalErrorCode;

// =============================================================================
// ERROR CODE TO HTTP STATUS MAPPING
// =============================================================================

/**
 * Maps error codes to their default HTTP status codes
 */
export function getHttpStatusForErrorCode(code: ErrorCode): number {
  // Authentication errors -> 401/403
  if (
    code.startsWith("AUTH_UNAUTHORIZED") ||
    code.startsWith("AUTH_INVALID") ||
    code.startsWith("AUTH_TOKEN")
  ) {
    return 401;
  }
  if (code.startsWith("AUTH_FORBIDDEN")) {
    return 403;
  }
  if (code.startsWith("AUTH_")) {
    return 401;
  }

  // Validation errors -> 400
  if (code.startsWith("VALIDATION_")) {
    return 400;
  }

  // Not found errors -> 404
  if (code.startsWith("NOT_FOUND_")) {
    return 404;
  }

  // Conflict errors -> 409
  if (code.startsWith("CONFLICT_")) {
    return 409;
  }

  // Rate limit errors -> 429
  if (code.startsWith("RATE_LIMIT_")) {
    return 429;
  }

  // Database errors -> 500
  if (code.startsWith("DATABASE_")) {
    return 500;
  }

  // External service errors -> 502
  if (code.startsWith("EXTERNAL_")) {
    return 502;
  }

  // Internal errors -> 500
  return 500;
}
