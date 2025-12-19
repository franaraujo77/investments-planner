/**
 * GET /api/auth/me
 *
 * Get current user endpoint.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC1: Return authenticated user data
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getSafeUserById } from "@/lib/auth/service";
import type { AuthError } from "@/lib/auth/types";

interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    baseCurrency: string;
    emailVerified: boolean;
    disclaimerAcknowledgedAt: Date | null;
    createdAt: Date;
  };
}

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's data.
 * Requires authentication (access token).
 *
 * Response:
 * - 200: { user } - User data (excluding password hash)
 * - 401: Not authenticated
 */
export const GET = withAuth<MeResponse>(async (_request, session) => {
  try {
    // Fetch full user data from database
    const user = await getSafeUserById(session.userId);

    if (!user) {
      return NextResponse.json<AuthError>(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    return NextResponse.json<MeResponse>(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          baseCurrency: user.baseCurrency,
          emailVerified: user.emailVerified ?? false,
          disclaimerAcknowledgedAt: user.disclaimerAcknowledgedAt ?? null,
          createdAt: user.createdAt ?? new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const dbError = handleDbError(error, "fetch current user", { userId: session.userId });
    return databaseError(dbError, "user data");
  }
});
