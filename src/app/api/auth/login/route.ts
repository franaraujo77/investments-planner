/**
 * POST /api/auth/login
 *
 * User login endpoint.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 * Story 2.3: User Login - Enhanced with email verification and soft-delete checks
 *
 * AC-2.3.1: Valid credentials redirect to dashboard
 * AC-2.3.3: Failed login shows "Invalid credentials" (no hints)
 * AC-2.3.4: Rate limiting (5 attempts/hour, 15min lockout)
 * AC-2.3.5: JWT in httpOnly cookie (15min expiry)
 * AC-2.3.6: Remember me extends refresh token to 30 days
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, storeRefreshToken } from "@/lib/auth/service";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  getClientIp,
} from "@/lib/auth/rate-limit";
import { AUTH_MESSAGES, AUTH_CONSTANTS } from "@/lib/auth/constants";
import { handleDbError, databaseError } from "@/lib/api/responses";
import type { AuthResponse, AuthError } from "@/lib/auth/types";
import crypto from "crypto";

/**
 * Request body validation schema
 */
const loginSchema = z.object({
  email: z.string().email(AUTH_MESSAGES.INVALID_EMAIL),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional().default(false),
});

/**
 * POST /api/auth/login
 *
 * Authenticates a user and returns tokens.
 *
 * Request body:
 * - email: string (required) - Valid email address
 * - password: string (required) - User's password
 * - remember: boolean (optional) - Extend session to 30 days
 *
 * Response:
 * - 200: { user, accessToken } + secure cookies set
 * - 400: Validation error
 * - 401: Invalid credentials
 * - 429: Rate limited (too many failed attempts)
 */
export async function POST(request: Request): Promise<NextResponse<AuthResponse | AuthError>> {
  const ip = getClientIp(request);

  // Check rate limit first (AC5) - uses Vercel KV in production
  const rateLimitResult = await checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.retryAfter ?? 3600;
    return NextResponse.json(
      {
        error: AUTH_MESSAGES.RATE_LIMITED,
        code: "RATE_LIMITED",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message ?? "Validation error",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { email, password, remember } = validation.data;

    // Find user by email
    const user = await findUserByEmail(email);

    // Treat soft-deleted users as non-existent (AC-2.3.3)
    if (!user || user.deletedAt !== null) {
      // Record failed attempt before returning
      await recordFailedAttempt(ip);
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.INVALID_CREDENTIALS,
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    // Verify password (AC-2.3.3)
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Record failed attempt before returning
      await recordFailedAttempt(ip);
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.INVALID_CREDENTIALS,
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    // Check email verification (AC-2.3.3) - unverified users cannot login
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    // Clear rate limit on successful login
    await clearRateLimit(ip);

    // Generate token ID for refresh token
    const tokenId = crypto.randomUUID();

    // Calculate expiry based on remember option (AC1)
    const refreshExpiry = remember
      ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRY
      : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY;
    const expiresAt = new Date(Date.now() + refreshExpiry * 1000);

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user.id, email: user.email }),
      signRefreshToken({ userId: user.id, tokenId }, remember),
    ]);

    // Store refresh token hash in database
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Get device fingerprint from User-Agent
    const deviceFingerprint = request.headers.get("user-agent") ?? undefined;

    await storeRefreshToken(user.id, tokenHash, expiresAt, deviceFingerprint);

    // Create response with user data (excluding password hash)
    const response = NextResponse.json<AuthResponse>(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          baseCurrency: user.baseCurrency,
          emailVerified: user.emailVerified ?? false,
          createdAt: user.createdAt ?? new Date(),
        },
        accessToken,
      },
      { status: 200 }
    );

    // Set secure cookies (AC4)
    setAuthCookies(response, accessToken, refreshToken, remember);

    return response;
  } catch (error) {
    const dbError = handleDbError(error, "user login");

    // Connection/timeout errors get specific responses
    if (dbError.isConnectionError || dbError.isTimeout) {
      return databaseError(dbError, "login");
    }

    return NextResponse.json(
      {
        error: "An error occurred during login",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
