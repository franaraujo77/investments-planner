/**
 * Authentication Constants
 *
 * Configuration values for JWT authentication system.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * IMPORTANT: These values are from the technical specification
 * and should not be changed without reviewing security implications.
 */

/**
 * Token expiry times in seconds
 */
export const AUTH_CONSTANTS = {
  /** Access token expiry: 15 minutes (900 seconds) */
  ACCESS_TOKEN_EXPIRY: 15 * 60,

  /** Refresh token expiry: 7 days (604800 seconds) */
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60,

  /** Extended refresh token expiry with "remember me": 30 days */
  REMEMBER_ME_EXPIRY: 30 * 24 * 60 * 60,

  /** Verification token expiry: 24 hours (86400 seconds) */
  VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60,

  /** Password reset token expiry: 1 hour (3600 seconds) */
  PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60,

  /** bcrypt cost factor for password hashing */
  BCRYPT_COST_FACTOR: 12,

  /** Rate limit: maximum failed login attempts per hour per IP */
  RATE_LIMIT_MAX_ATTEMPTS: 5,

  /** Rate limit window: 1 hour in milliseconds */
  RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * Cookie names for authentication tokens
 */
export const COOKIE_NAMES = {
  /** Access token cookie name */
  ACCESS_TOKEN: "access_token",

  /** Refresh token cookie name */
  REFRESH_TOKEN: "refresh_token",
} as const;

/**
 * Cookie configuration for secure authentication
 * All auth cookies use these security settings
 */
export const COOKIE_OPTIONS = {
  /** Prevent JavaScript access (XSS protection) */
  httpOnly: true,

  /** Only send over HTTPS in production */
  secure: process.env.NODE_ENV === "production",

  /** Strict same-site policy (CSRF protection) */
  sameSite: "strict" as const,

  /** Cookie path - available on all routes */
  path: "/",
} as const;

/**
 * JWT algorithm for signing tokens
 * Using HS256 (HMAC with SHA-256) as specified in architecture
 */
export const JWT_ALGORITHM = "HS256" as const;

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
  /** Minimum password length */
  MIN_LENGTH: 8,

  /** Maximum password length (prevent DoS via bcrypt) */
  MAX_LENGTH: 72,
} as const;

/**
 * API response messages
 */
export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_EXISTS: "An account with this email already exists",
  RATE_LIMITED: "Too many login attempts. Please try again later.",
  UNAUTHORIZED: "Authentication required",
  TOKEN_EXPIRED: "Token has expired",
  TOKEN_INVALID: "Invalid token",
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`,
  PASSWORD_TOO_LONG: `Password must be at most ${PASSWORD_RULES.MAX_LENGTH} characters`,
  PASSWORD_MISSING_UPPERCASE: "Password must contain at least one uppercase letter",
  PASSWORD_MISSING_LOWERCASE: "Password must contain at least one lowercase letter",
  PASSWORD_MISSING_NUMBER: "Password must contain at least one number",
  PASSWORD_MISSING_SPECIAL: "Password must contain at least one special character (@$!%*?&)",
  INVALID_EMAIL: "Invalid email address",
  DISCLAIMER_REQUIRED: "You must acknowledge the financial disclaimer",
  VERIFICATION_EMAIL_SENT: "Verification email sent. Please check your inbox.",
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in",
} as const;
