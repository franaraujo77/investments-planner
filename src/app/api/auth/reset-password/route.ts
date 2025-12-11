/**
 * Reset Password API Route
 *
 * Story 2.5: Password Reset Flow
 *
 * POST /api/auth/reset-password
 * - Accepts token and new password
 * - Validates token (not expired, not used)
 * - Validates password complexity
 * - Updates password and invalidates all sessions
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { logger, redactUserId } from "@/lib/telemetry/logger";
import {
  findPasswordResetToken,
  findPasswordResetTokenRaw,
  markPasswordResetTokenUsed,
  updateUserPassword,
  deleteUserRefreshTokens,
  hashToken,
} from "@/lib/auth/service";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_MESSAGES, PASSWORD_RULES } from "@/lib/auth/constants";

/**
 * Request validation schema with password complexity
 */
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z
    .string()
    .min(PASSWORD_RULES.MIN_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_SHORT)
    .max(PASSWORD_RULES.MAX_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_LONG)
    .refine((password) => /[a-z]/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_LOWERCASE,
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_UPPERCASE,
    })
    .refine((password) => /\d/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_NUMBER,
    })
    .refine((password) => /[@$!%*?&]/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_SPECIAL,
    }),
});

/**
 * POST /api/auth/reset-password
 *
 * AC-2.5.3: Reset link expires in 1 hour
 * AC-2.5.5: Session invalidation - all refresh tokens deleted
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error.issues[0]?.message || "Invalid request",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { token, newPassword } = result.data;

    // Hash the incoming token to look up in database
    const tokenHash = hashToken(token);

    // First, check if token exists at all (for differentiated error messages)
    const rawToken = await findPasswordResetTokenRaw(tokenHash);

    if (!rawToken) {
      return NextResponse.json(
        {
          error: "Invalid or expired reset link",
          code: "INVALID_TOKEN",
        },
        { status: 400 }
      );
    }

    // Check if token was already used
    if (rawToken.usedAt) {
      return NextResponse.json(
        {
          error: "This reset link has already been used",
          code: "TOKEN_USED",
        },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (rawToken.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "This reset link has expired. Please request a new one.",
          code: "TOKEN_EXPIRED",
        },
        { status: 400 }
      );
    }

    // Token is valid - proceed with password reset
    const validToken = await findPasswordResetToken(tokenHash);
    if (!validToken) {
      // This shouldn't happen given the checks above, but just in case
      return NextResponse.json(
        {
          error: "Invalid or expired reset link",
          code: "INVALID_TOKEN",
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user's password
    await updateUserPassword(validToken.userId, newPasswordHash);

    // Invalidate all existing sessions (AC-2.5.5)
    await deleteUserRefreshTokens(validToken.userId);

    // Mark the reset token as used (single-use)
    await markPasswordResetTokenUsed(validToken.id);

    logger.info("Password successfully reset", { userId: redactUserId(validToken.userId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Password reset unexpected error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
