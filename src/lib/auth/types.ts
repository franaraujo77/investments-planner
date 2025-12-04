/**
 * Authentication Types
 *
 * Type definitions for JWT authentication system.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 */

import type { NextRequest, NextResponse } from "next/server";

/**
 * JWT Access Token Payload
 * Short-lived token (15 minutes) for API authentication
 */
export interface JwtPayload {
  /** User's unique identifier (UUID) */
  userId: string;
  /** User's email address */
  email: string;
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Expiration timestamp (Unix seconds) */
  exp: number;
}

/**
 * JWT Refresh Token Payload
 * Long-lived token (7-30 days) for session persistence
 */
export interface RefreshTokenPayload {
  /** User's unique identifier (UUID) */
  userId: string;
  /** Unique token identifier for database lookup */
  tokenId: string;
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Expiration timestamp (Unix seconds) */
  exp: number;
}

/**
 * Session object extracted from verified JWT
 * Contains only essential user information for request handling
 */
export interface Session {
  /** User's unique identifier (UUID) */
  userId: string;
  /** User's email address */
  email: string;
}

/**
 * Authenticated request handler type
 * Used with withAuth middleware wrapper
 * Allows returning error responses alongside success responses
 */
export type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  session: Session,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T | AuthError>>;

/**
 * Standard API response for auth operations
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    baseCurrency: string;
    emailVerified: boolean;
    createdAt: Date;
  };
  accessToken: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Seconds until rate limit resets (if blocked) */
  retryAfter?: number;
  /** Number of remaining attempts */
  remaining?: number;
}

/**
 * JWT Verification Token Payload
 * Story 2.1: User Registration Flow
 * Single-use token (24h expiry) for email verification
 */
export interface VerificationTokenPayload {
  /** User's unique identifier (UUID) */
  userId: string;
  /** Token purpose identifier */
  purpose: "email_verification";
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Expiration timestamp (Unix seconds) */
  exp: number;
}

/**
 * Registration request body
 * Story 2.1: User Registration Flow
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  disclaimerAcknowledged: boolean;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * Error response format
 */
export interface AuthError {
  error: string;
  code?: string;
  retryAfter?: number;
}
