/**
 * Forgot Password API Route
 *
 * Story 1.3: Password Reset Flow
 *
 * POST /api/auth/forgot-password
 * - Accepts email address
 * - Always returns same message (no email enumeration)
 * - If user exists: generates reset token and sends email
 * - Rate limited by IP (5/hour) and email (3/hour)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserByEmail,
  createPasswordResetToken,
  invalidateUserPasswordResetTokens,
} from "@/lib/auth/service";
import { inngest } from "@/lib/inngest";
import {
  checkRateLimit,
  recordFailedAttempt,
  checkEmailRateLimit,
  recordEmailResendAttempt,
  getClientIp,
} from "@/lib/auth/rate-limit";
import { AUTH_MESSAGES } from "@/lib/auth/constants";

/**
 * Request validation schema
 */
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .transform((email) => email.toLowerCase().trim()),
});

/**
 * Standard response message (same for all cases to prevent email enumeration)
 */
const STANDARD_RESPONSE = {
  message: "If an account exists, a reset link has been sent",
};

/**
 * POST /api/auth/forgot-password
 *
 * AC-1.3.2: No Email Enumeration
 * Always returns the same message regardless of whether the email exists
 *
 * Security: Rate limited by IP (5/hour) and email (3/hour)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Check IP-based rate limit first (prevents spray attacks)
  const ipRateLimitResult = await checkRateLimit(ip);
  if (!ipRateLimitResult.allowed) {
    const retryAfter = ipRateLimitResult.retryAfter ?? 3600;
    return NextResponse.json(
      {
        error: AUTH_MESSAGES.RATE_LIMITED,
        code: "RATE_LIMITED",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  try {
    const body = await request.json();

    // Validate request body
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Check email-based rate limit (prevents targeting specific users)
    const emailRateLimitResult = await checkEmailRateLimit(email);
    if (!emailRateLimitResult.allowed) {
      // Still return standard response to prevent enumeration
      // But don't actually send an email
      return NextResponse.json(STANDARD_RESPONSE);
    }

    // Record the attempt for email rate limiting
    await recordEmailResendAttempt(email);

    // Look up user by email
    const user = await findUserByEmail(email);

    if (user) {
      // User exists - generate token and send email via Inngest
      try {
        // Invalidate any existing unused reset tokens for this user
        await invalidateUserPasswordResetTokens(user.id);

        // Generate new reset token
        const token = await createPasswordResetToken(user.id);

        // Send password reset email via Inngest (async with retries)
        await inngest.send({
          name: "email/password-reset.requested",
          data: {
            userId: user.id,
            email,
            token,
            requestedAt: new Date().toISOString(),
          },
        });
      } catch {
        // Silently fail to prevent enumeration - Inngest handles retries
        // Still return success response
      }
    } else {
      // User doesn't exist - record IP failure for rate limiting
      // This helps prevent email enumeration via timing attacks
      await recordFailedAttempt(ip);
    }

    // Always return the same response (AC-1.3.2)
    return NextResponse.json(STANDARD_RESPONSE);
  } catch {
    // Even on error, return same message to prevent information leakage
    return NextResponse.json(STANDARD_RESPONSE);
  }
}
