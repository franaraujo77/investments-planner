/**
 * Auth Module Exports
 *
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 */

// Types
export type {
  JwtPayload,
  RefreshTokenPayload,
  Session,
  AuthenticatedHandler,
  AuthResponse,
  RateLimitResult,
  RegisterRequest,
  LoginRequest,
  AuthError,
} from "./types";

// Constants
export {
  AUTH_CONSTANTS,
  COOKIE_NAMES,
  COOKIE_OPTIONS,
  JWT_ALGORITHM,
  PASSWORD_RULES,
  AUTH_MESSAGES,
} from "./constants";

// Password utilities
export { hashPassword, verifyPassword, validatePassword } from "./password";

// JWT utilities
export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt";

// Cookie utilities
export {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setAuthCookies,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
} from "./cookies";

// Rate limiting
export {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  getClientIp,
} from "./rate-limit";

// Middleware
export { verifyAuth, withAuth, withOptionalAuth } from "./middleware";

// Service
export {
  createUser,
  findUserByEmail,
  findUserById,
  getSafeUserById,
  storeRefreshToken,
  findRefreshToken,
  findRefreshTokenById,
  deleteRefreshToken,
  deleteUserRefreshTokens,
  emailExists,
} from "./service";
export type { SafeUser } from "./service";
