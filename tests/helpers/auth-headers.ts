/**
 * Authentication Header Helper Functions
 *
 * Story 7.16: Fix Integration Test Infrastructure
 * AC-7.16.2: Test helper modules created
 *
 * Provides utilities for generating authentication headers and JWT tokens for integration tests.
 */

import { SignJWT } from "jose";

/**
 * Creates a JWT authentication token for testing
 *
 * @param userId - User ID to encode in the token
 * @param expiresIn - Token expiration time (default: 15m)
 * @returns JWT token string
 */
export async function createAuthToken(userId: string, expiresIn = "15m"): Promise<string> {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable is required for integration tests. " +
        "Set it in .env.test or .env.local"
    );
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);

  return token;
}

/**
 * Generates HTTP headers with JWT authentication
 *
 * @param userId - User ID to authenticate as
 * @returns Headers object with Authorization and Content-Type
 */
export async function getAuthHeaders(userId: string): Promise<Record<string, string>> {
  const token = await createAuthToken(userId);

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
