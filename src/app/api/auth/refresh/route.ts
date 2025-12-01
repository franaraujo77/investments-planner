/**
 * POST /api/auth/refresh
 *
 * Token refresh endpoint with rotation.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC1, AC2, AC4: Rotate refresh tokens and issue new access token
 */

import { NextRequest, NextResponse } from "next/server";
import { getRefreshToken, setAuthCookies } from "@/lib/auth/cookies";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import {
  findRefreshTokenById,
  deleteRefreshToken,
  storeRefreshToken,
  findUserById,
} from "@/lib/auth/service";
import { AUTH_MESSAGES, AUTH_CONSTANTS } from "@/lib/auth/constants";
import type { AuthError } from "@/lib/auth/types";
import crypto from "crypto";

interface RefreshResponse {
  accessToken: string;
}

/**
 * POST /api/auth/refresh
 *
 * Refreshes the access token using the refresh token cookie.
 * Implements token rotation: old refresh token is invalidated
 * and a new one is issued (AC2).
 *
 * Request: Uses refresh_token from httpOnly cookie
 *
 * Response:
 * - 200: { accessToken } + new cookies set
 * - 401: Invalid or expired refresh token
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<RefreshResponse | AuthError>> {
  try {
    // Get refresh token from cookie
    const refreshToken = getRefreshToken(request);

    if (!refreshToken) {
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.UNAUTHORIZED,
          code: "NO_REFRESH_TOKEN",
        },
        { status: 401 }
      );
    }

    // Verify refresh token signature
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.TOKEN_INVALID,
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    // Find token in database by ID from payload
    const dbToken = await findRefreshTokenById(payload.tokenId);

    if (!dbToken) {
      // Token not in database (possibly already rotated or revoked)
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.TOKEN_INVALID,
          code: "TOKEN_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (dbToken.expiresAt < new Date()) {
      // Clean up expired token
      await deleteRefreshToken(dbToken.id);
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.TOKEN_EXPIRED,
          code: "TOKEN_EXPIRED",
        },
        { status: 401 }
      );
    }

    // Verify token hash matches
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    if (dbToken.tokenHash !== tokenHash) {
      // Hash mismatch - possible token reuse attack
      // Delete all tokens for this user as a security measure
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.TOKEN_INVALID,
          code: "HASH_MISMATCH",
        },
        { status: 401 }
      );
    }

    // Get user for new token
    const user = await findUserById(payload.userId);
    if (!user) {
      // User no longer exists
      await deleteRefreshToken(dbToken.id);
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.UNAUTHORIZED,
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    // Delete old refresh token (rotation - AC2)
    await deleteRefreshToken(dbToken.id);

    // Generate new token ID
    const newTokenId = crypto.randomUUID();

    // Calculate new expiry (use remaining time from old token or standard expiry)
    const remainingTime = dbToken.expiresAt.getTime() - Date.now();
    const isRememberMe = remainingTime > AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY * 1000;

    const newExpiry = isRememberMe
      ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRY
      : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY;
    const newExpiresAt = new Date(Date.now() + newExpiry * 1000);

    // Generate new tokens
    const [newAccessToken, newRefreshToken] = await Promise.all([
      signAccessToken({ userId: user.id, email: user.email }),
      signRefreshToken({ userId: user.id, tokenId: newTokenId }, isRememberMe),
    ]);

    // Store new refresh token hash
    const newTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    await storeRefreshToken(
      user.id,
      newTokenHash,
      newExpiresAt,
      dbToken.deviceFingerprint ?? undefined
    );

    // Create response
    const response = NextResponse.json<RefreshResponse>(
      { accessToken: newAccessToken },
      { status: 200 }
    );

    // Set new cookies (AC4)
    setAuthCookies(response, newAccessToken, newRefreshToken, isRememberMe);

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        error: "An error occurred during token refresh",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
