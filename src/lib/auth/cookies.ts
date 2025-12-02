/**
 * Cookie Utilities
 *
 * Secure cookie management for authentication tokens.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC4: Session cookies are httpOnly, secure, sameSite: strict
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAMES, COOKIE_OPTIONS, AUTH_CONSTANTS } from "./constants";

/**
 * Sets the access token cookie on a response
 *
 * Access token cookie expires after 15 minutes.
 * Uses secure cookie options to prevent XSS and CSRF.
 *
 * @param response - NextResponse to set cookie on
 * @param token - JWT access token string
 */
export function setAccessTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, token, {
    ...COOKIE_OPTIONS,
    maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Sets the refresh token cookie on a response
 *
 * Refresh token cookie expires after 7 days (or 30 days with remember me).
 * Uses secure cookie options to prevent XSS and CSRF.
 *
 * @param response - NextResponse to set cookie on
 * @param token - JWT refresh token string
 * @param remember - If true, extends expiry to 30 days
 */
export function setRefreshTokenCookie(
  response: NextResponse,
  token: string,
  remember: boolean = false
): void {
  const maxAge = remember ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRY : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY;

  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, token, {
    ...COOKIE_OPTIONS,
    maxAge,
  });
}

/**
 * Sets both access and refresh token cookies
 *
 * Convenience function for login/register flows.
 *
 * @param response - NextResponse to set cookies on
 * @param accessToken - JWT access token string
 * @param refreshToken - JWT refresh token string
 * @param remember - If true, extends refresh token expiry to 30 days
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  remember: boolean = false
): void {
  setAccessTokenCookie(response, accessToken);
  setRefreshTokenCookie(response, refreshToken, remember);
}

/**
 * Clears all authentication cookies
 *
 * Used during logout to invalidate the session.
 *
 * @param response - NextResponse to clear cookies on
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Gets the access token from request cookies
 *
 * @param request - NextRequest to read cookie from
 * @returns Access token string or null if not present
 */
export function getAccessToken(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
}

/**
 * Gets the refresh token from request cookies
 *
 * @param request - NextRequest to read cookie from
 * @returns Refresh token string or null if not present
 */
export function getRefreshToken(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
}
