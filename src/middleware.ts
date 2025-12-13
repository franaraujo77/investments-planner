/**
 * Next.js Middleware
 *
 * Story 2.2: Email Verification
 * AC-2.2.4: Unverified users accessing dashboard routes redirect to verify-pending
 *
 * Route protection and authentication handling.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth/constants";
import { verifyAccessToken } from "@/lib/auth/jwt";

/**
 * Routes that require authentication
 * Note: "/" is the dashboard page (route group doesn't add to URL)
 */
const PROTECTED_ROUTES = ["/", "/portfolio", "/settings", "/criteria", "/strategy", "/history"];

/**
 * Routes that don't require authentication (public)
 */
const PUBLIC_ROUTES = ["/login", "/register", "/verify", "/verify-pending", "/reset-password"];

// Note: emailVerified check is done client-side via VerificationGate
// to avoid database calls in edge middleware. The following routes
// would be used if we implement server-side verification check:
// - /verify, /verify-pending, /logout
// - /api/auth/verify, /api/auth/resend-verification, /api/auth/logout, /api/auth/me

/**
 * Checks if a path matches any of the given route prefixes
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => path === route || path.startsWith(`${route}/`));
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes (except auth)
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Get access token from cookie
  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

  // Check if route is protected
  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);
  const isPublicRoute = matchesRoute(pathname, PUBLIC_ROUTES);

  // For protected routes, verify authentication
  if (isProtectedRoute) {
    if (!accessToken) {
      // No token - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify token is valid
      await verifyAccessToken(accessToken);

      // Token is valid - allow access
      // Note: emailVerified check is done client-side via VerificationGate
      // This avoids database calls in edge middleware
      return NextResponse.next();
    } catch {
      // Token invalid/expired - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);

      // Clear invalid cookies
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(COOKIE_NAMES.ACCESS_TOKEN);
      return response;
    }
  }

  // For public routes when user is authenticated
  if (isPublicRoute && accessToken) {
    try {
      // If token is valid and user is on login/register, redirect to dashboard
      await verifyAccessToken(accessToken);

      // Don't redirect if on verify pages (user might need to verify)
      if (pathname === "/login" || pathname === "/register") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      // Token invalid - let them continue to public route
      // Clear invalid cookies
      const response = NextResponse.next();
      response.cookies.delete(COOKIE_NAMES.ACCESS_TOKEN);
      return response;
    }
  }

  return NextResponse.next();
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
