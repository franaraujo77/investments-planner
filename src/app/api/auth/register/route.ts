/**
 * POST /api/auth/register
 *
 * User registration endpoint.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC1, AC3, AC4: Register with hashed password, return JWT in secure cookies
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, emailExists, storeRefreshToken } from "@/lib/auth/service";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import { AUTH_MESSAGES, PASSWORD_RULES, AUTH_CONSTANTS } from "@/lib/auth/constants";
import type { AuthResponse, AuthError } from "@/lib/auth/types";
import crypto from "crypto";

/**
 * Request body validation schema
 */
const registerSchema = z.object({
  email: z.string().email(AUTH_MESSAGES.INVALID_EMAIL),
  password: z
    .string()
    .min(PASSWORD_RULES.MIN_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_SHORT)
    .max(PASSWORD_RULES.MAX_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_LONG),
  name: z.string().max(100).optional(),
});

/**
 * POST /api/auth/register
 *
 * Creates a new user account and returns authentication tokens.
 *
 * Request body:
 * - email: string (required) - Valid email address
 * - password: string (required) - 8-72 characters
 * - name: string (optional) - Display name, max 100 chars
 *
 * Response:
 * - 200: { user, accessToken } + secure cookies set
 * - 400: Validation error
 * - 409: Email already exists
 */
export async function POST(request: Request): Promise<NextResponse<AuthResponse | AuthError>> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

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

    const { email, password, name } = validation.data;

    // Check if email already exists
    if (await emailExists(email)) {
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.EMAIL_EXISTS,
          code: "EMAIL_EXISTS",
        },
        { status: 409 }
      );
    }

    // Create user (password is hashed in service)
    const user = await createUser(email, password, name);

    // Generate token ID for refresh token
    const tokenId = crypto.randomUUID();

    // Calculate expiry (7 days for new registration)
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY * 1000);

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user.id, email: user.email }),
      signRefreshToken({ userId: user.id, tokenId }),
    ]);

    // Store refresh token hash in database
    // Using SHA-256 hash of the token for storage
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await storeRefreshToken(user.id, tokenHash, expiresAt);

    // Create response with user data
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

    // Set secure cookies
    setAuthCookies(response, accessToken, refreshToken, false);

    return response;
  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific database errors
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return NextResponse.json(
        {
          error: AUTH_MESSAGES.EMAIL_EXISTS,
          code: "EMAIL_EXISTS",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "An error occurred during registration",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
