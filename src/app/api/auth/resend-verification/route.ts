/**
 * POST /api/auth/resend-verification
 *
 * Resend verification email endpoint.
 * Story 2.2: Email Verification
 *
 * AC-2.2.5: "Resend verification email" link available on login page and verification pending page
 *
 * Security:
 * - Always returns same message (no email enumeration)
 * - Rate limited: 3 requests per hour per email
 * - Invalidates previous unused tokens
 */

import { NextResponse } from "next/server";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  findUserByEmail,
  storeVerificationToken,
  invalidateUserVerificationTokens,
} from "@/lib/auth/service";
import { signVerificationToken } from "@/lib/auth/jwt";
import { checkEmailRateLimit, recordEmailResendAttempt } from "@/lib/auth/rate-limit";
import { inngest } from "@/lib/inngest";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { z } from "zod/v4";

/**
 * Response type for resend verification
 */
interface ResendResponse {
  message: string;
}

/**
 * Error response type
 */
interface ResendError {
  error: string;
  code: string;
  retryAfter?: number;
}

/**
 * Resend verification request schema
 */
const resendSchema = z.object({
  email: z.email("Invalid email address"),
});

const tracer = trace.getTracer("auth");

/**
 * Standard response message (no email enumeration)
 */
const RESEND_MESSAGE = "If an unverified account exists, a new verification link has been sent";

/**
 * POST /api/auth/resend-verification
 *
 * Resends verification email to the specified email address.
 *
 * Request body:
 * - email: string (required) - Email address to resend verification to
 *
 * Response:
 * - 200: { message: "If an unverified account exists..." } (always)
 * - 400: Invalid email format
 * - 429: Rate limited
 */
export async function POST(request: Request): Promise<NextResponse<ResendResponse | ResendError>> {
  return tracer.startActiveSpan("POST /api/auth/resend-verification", async (span) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = resendSchema.safeParse(body);

      if (!validation.success) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Invalid email format" });
        span.end();

        return NextResponse.json(
          {
            error: "Invalid email address",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      const { email } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      span.setAttribute("user.email_domain", normalizedEmail.split("@")[1] ?? "unknown");

      // Check rate limit (3 per hour per email) - uses Vercel KV in production
      const rateLimit = await checkEmailRateLimit(normalizedEmail);

      if (!rateLimit.allowed) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Rate limited" });
        span.end();

        const responseInit: ResponseInit = { status: 429 };
        if (rateLimit.retryAfter) {
          responseInit.headers = { "Retry-After": String(rateLimit.retryAfter) };
        }

        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            code: "RATE_LIMITED",
            retryAfter: rateLimit.retryAfter,
          },
          responseInit
        );
      }

      // Record the attempt (before any early returns)
      await recordEmailResendAttempt(normalizedEmail);

      // Find user by email
      const user = await findUserByEmail(normalizedEmail);

      // If user doesn't exist or is already verified, return same message (no enumeration)
      if (!user || user.emailVerified) {
        span.setStatus({ code: SpanStatusCode.OK, message: "No action needed" });
        span.end();

        // Return same message to prevent email enumeration
        return NextResponse.json<ResendResponse>({
          message: RESEND_MESSAGE,
        });
      }

      // Check if user is soft-deleted
      if (user.deletedAt) {
        span.setStatus({ code: SpanStatusCode.OK, message: "User deleted" });
        span.end();

        // Return same message to prevent enumeration
        return NextResponse.json<ResendResponse>({
          message: RESEND_MESSAGE,
        });
      }

      span.setAttribute("user.id", user.id);

      // Invalidate previous unused verification tokens
      await invalidateUserVerificationTokens(user.id);

      // Generate new verification token (JWT, 24h expiry)
      const verificationToken = await signVerificationToken(user.id);

      // Store token in database
      await storeVerificationToken(user.id, verificationToken);

      // Send verification email via Inngest (async with retries)
      await inngest.send({
        name: "email/verification.requested",
        data: {
          userId: user.id,
          email: normalizedEmail,
          token: verificationToken,
          requestedAt: new Date().toISOString(),
        },
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      // Return success message
      return NextResponse.json<ResendResponse>({
        message: RESEND_MESSAGE,
      });
    } catch (error) {
      const dbError = handleDbError(error, "resend verification");
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      span.end();
      return databaseError(dbError, "email verification");
    }
  });
}
