/**
 * Auth Middleware
 *
 * Route protection middleware for authenticated endpoints.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC1, AC4: Verify JWT from secure cookies
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./jwt";
import { getAccessToken } from "./cookies";
import { AUTH_MESSAGES } from "./constants";
import type { Session, AuthenticatedHandler, AuthError } from "./types";

/**
 * Verifies authentication from request cookies
 *
 * Extracts and verifies the access token from httpOnly cookie.
 *
 * @param request - Next.js request object
 * @returns Session if authenticated, null otherwise
 */
export async function verifyAuth(request: NextRequest): Promise<Session | null> {
  const token = getAccessToken(request);

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    // Token invalid or expired
    return null;
  }
}

/**
 * Creates an unauthorized JSON response
 *
 * @param message - Optional custom error message
 * @returns NextResponse with 401 status
 */
function unauthorizedResponse(
  message: string = AUTH_MESSAGES.UNAUTHORIZED
): NextResponse<AuthError> {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
}

/**
 * Higher-order function to protect routes requiring authentication
 *
 * Wraps a route handler to verify authentication before execution.
 * If not authenticated, returns 401 Unauthorized.
 *
 * @param handler - Authenticated route handler function
 * @returns Route handler that verifies auth before calling the handler
 *
 * @example
 * ```ts
 * // In src/app/api/protected/route.ts
 * import { withAuth } from "@/lib/auth/middleware";
 *
 * export const GET = withAuth(async (request, session, context) => {
 *   // session.userId and session.email are available
 *   return NextResponse.json({ userId: session.userId });
 * });
 * ```
 */
export function withAuth<T>(
  handler: AuthenticatedHandler<T>
): (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T | AuthError>> {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const session = await verifyAuth(request);

    if (!session) {
      return unauthorizedResponse();
    }

    return handler(request, session, context);
  };
}

/**
 * Optional auth verification for routes that work with or without auth
 *
 * Unlike withAuth, this doesn't return 401 if not authenticated.
 * The handler receives session or null.
 *
 * @param handler - Route handler that receives optional session
 * @returns Route handler that passes session (or null) to handler
 */
export function withOptionalAuth<T>(
  handler: (
    request: NextRequest,
    session: Session | null,
    context: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse<T>>
): (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T>> {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const session = await verifyAuth(request);
    return handler(request, session, context);
  };
}
