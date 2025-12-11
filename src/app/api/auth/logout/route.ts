/**
 * POST /api/auth/logout
 *
 * User logout endpoint.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC2: Invalidate refresh token and clear cookies
 */

import { NextResponse } from "next/server";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getRefreshToken, clearAuthCookies } from "@/lib/auth/cookies";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { findRefreshTokenById, deleteRefreshToken } from "@/lib/auth/service";
import { withAuth } from "@/lib/auth/middleware";

interface LogoutResponse {
  success: boolean;
}

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by invalidating their refresh token
 * and clearing authentication cookies.
 *
 * Requires authentication (access token).
 *
 * Response:
 * - 200: { success: true } + cookies cleared
 * - 401: Not authenticated
 */

export const POST = withAuth<LogoutResponse>(async (request, _session) => {
  try {
    // Get refresh token from cookie
    const refreshToken = getRefreshToken(request);

    if (refreshToken) {
      try {
        // Verify and decode the refresh token to get tokenId
        const payload = await verifyRefreshToken(refreshToken);

        // Find and delete the refresh token from database
        const dbToken = await findRefreshTokenById(payload.tokenId);
        if (dbToken) {
          await deleteRefreshToken(dbToken.id);
        }
      } catch {
        // Token invalid or expired - still proceed with logout
        // This handles cases where token is already invalid
      }
    }

    // Create response
    const response = NextResponse.json<LogoutResponse>({ success: true }, { status: 200 });

    // Clear authentication cookies
    clearAuthCookies(response);

    return response;
  } catch (error) {
    const dbError = handleDbError(error, "user logout");
    return databaseError(dbError, "logout");
  }
});
