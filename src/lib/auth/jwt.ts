/**
 * JWT Utilities
 *
 * JWT signing and verification using jose library.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC1: JWT access token (15min expiry) and refresh token (7d expiry)
 */

import { SignJWT, jwtVerify, errors } from "jose";
import { AUTH_CONSTANTS, JWT_ALGORITHM, AUTH_MESSAGES } from "./constants";
import type { JwtPayload, RefreshTokenPayload, VerificationTokenPayload } from "./types";

/**
 * Get the JWT secret key as Uint8Array
 * Throws if AUTH_SECRET is not configured
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is not set. Generate one with: openssl rand -hex 32"
    );
  }

  // Minimum 32 characters for HS256
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long");
  }

  return new TextEncoder().encode(secret);
}

/**
 * Signs an access token JWT
 *
 * Access tokens are short-lived (15 minutes) and contain user identity.
 * Used for authenticating API requests.
 *
 * @param payload - User identity data (userId, email)
 * @returns Promise resolving to signed JWT string
 */
export async function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  const secret = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

/**
 * Signs a refresh token JWT
 *
 * Refresh tokens are long-lived (7-30 days) and contain token ID for
 * database lookup and rotation.
 *
 * @param payload - Token identity data (userId, tokenId)
 * @param remember - If true, uses 30-day expiry instead of 7-day
 * @returns Promise resolving to signed JWT string
 */
export async function signRefreshToken(
  payload: Omit<RefreshTokenPayload, "iat" | "exp">,
  remember: boolean = false
): Promise<string> {
  const secret = getSecretKey();
  const now = Math.floor(Date.now() / 1000);
  const expiry = remember ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRY : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY;

  return new SignJWT({
    userId: payload.userId,
    tokenId: payload.tokenId,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + expiry)
    .sign(secret);
}

/**
 * Verifies and decodes an access token
 *
 * @param token - JWT string to verify
 * @returns Promise resolving to decoded payload
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const secret = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    // Validate required fields
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
      throw new Error(AUTH_MESSAGES.TOKEN_INVALID);
    }

    return {
      userId: payload.userId,
      email: payload.email,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new Error(AUTH_MESSAGES.TOKEN_EXPIRED);
    }
    if (
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed
    ) {
      throw new Error(AUTH_MESSAGES.TOKEN_INVALID);
    }
    throw error;
  }
}

/**
 * Verifies and decodes a refresh token
 *
 * @param token - JWT string to verify
 * @returns Promise resolving to decoded payload
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const secret = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    // Validate required fields
    if (typeof payload.userId !== "string" || typeof payload.tokenId !== "string") {
      throw new Error(AUTH_MESSAGES.TOKEN_INVALID);
    }

    return {
      userId: payload.userId,
      tokenId: payload.tokenId,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new Error(AUTH_MESSAGES.TOKEN_EXPIRED);
    }
    if (
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed
    ) {
      throw new Error(AUTH_MESSAGES.TOKEN_INVALID);
    }
    throw error;
  }
}

/**
 * Signs a verification token JWT
 *
 * Story 2.1: User Registration Flow
 * Verification tokens are single-use (24h expiry) for email verification.
 *
 * @param userId - User ID to include in token
 * @returns Promise resolving to signed JWT string
 */
export async function signVerificationToken(userId: string): Promise<string> {
  const secret = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    userId,
    purpose: "email_verification",
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + AUTH_CONSTANTS.VERIFICATION_TOKEN_EXPIRY)
    .sign(secret);
}

/**
 * Verifies and decodes a verification token
 *
 * @param token - JWT string to verify
 * @returns Promise resolving to decoded payload
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifyVerificationToken(token: string): Promise<VerificationTokenPayload> {
  const secret = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    // Validate required fields
    if (typeof payload.userId !== "string" || payload.purpose !== "email_verification") {
      throw new Error(AUTH_MESSAGES.TOKEN_INVALID);
    }

    return {
      userId: payload.userId,
      purpose: "email_verification",
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new Error(AUTH_MESSAGES.TOKEN_EXPIRED);
    }
    if (
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed
    ) {
      throw new Error(AUTH_MESSAGES.TOKEN_INVALID);
    }
    throw error;
  }
}
