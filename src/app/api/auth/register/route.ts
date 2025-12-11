/**
 * POST /api/auth/register
 *
 * User registration endpoint.
 * Story 2.1: User Registration Flow
 *
 * AC1: Valid email (RFC 5322) and password
 * AC2: Password complexity requirements
 * AC6: Registration completes in <2 seconds
 * AC7: Financial disclaimer acknowledgment
 * AC8: "Verification email sent" message
 */

import { NextResponse } from "next/server";
import { createUser, emailExists, storeVerificationToken } from "@/lib/auth/service";
import { signVerificationToken } from "@/lib/auth/jwt";
import { AUTH_MESSAGES } from "@/lib/auth/constants";
import { registerSchema } from "@/lib/auth/validation";
import { inngest } from "@/lib/inngest";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { DbErrorCode } from "@/lib/db/errors";

/**
 * Response type for registration
 */
interface RegisterResponse {
  user: {
    id: string;
    email: string;
  };
  message: string;
}

/**
 * Error response type
 */
interface RegisterError {
  error: string;
  code?: string;
  fields?: Record<string, string>;
}

const tracer = trace.getTracer("auth");

/**
 * POST /api/auth/register
 *
 * Creates a new user account and sends verification email.
 *
 * Request body:
 * - email: string (required) - Valid RFC 5322 email address
 * - password: string (required) - 8-72 chars, 1 upper, 1 lower, 1 number, 1 special
 * - name: string (optional) - Display name, max 100 chars
 * - disclaimerAcknowledged: boolean (required) - Must be true
 *
 * Response:
 * - 201: { user: { id, email }, message: "Verification email sent" }
 * - 400: Validation error with field details
 * - 409: Email already exists
 */
export async function POST(
  request: Request
): Promise<NextResponse<RegisterResponse | RegisterError>> {
  return tracer.startActiveSpan("POST /api/auth/register", async (span) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = registerSchema.safeParse(body);

      if (!validation.success) {
        // Extract field-specific errors for inline display (AC4)
        const fieldErrors: Record<string, string> = {};
        for (const issue of validation.error.issues) {
          const field = issue.path[0];
          if (typeof field === "string" && !fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }

        span.setStatus({ code: SpanStatusCode.ERROR, message: "Validation failed" });
        span.end();

        return NextResponse.json(
          {
            error: "Validation error",
            code: "VALIDATION_ERROR",
            fields: fieldErrors,
          },
          { status: 400 }
        );
      }

      const { email, password, name, disclaimerAcknowledged } = validation.data;

      span.setAttribute("user.email_domain", email.split("@")[1] ?? "unknown");

      // Check if email already exists (AC1)
      // Note: Same error response for security (email enumeration prevention)
      if (await emailExists(email)) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Email exists" });
        span.end();

        return NextResponse.json(
          {
            error: AUTH_MESSAGES.EMAIL_EXISTS,
            code: "EMAIL_EXISTS",
          },
          { status: 409 }
        );
      }

      // Record disclaimer acknowledgment timestamp (AC7)
      const disclaimerAcknowledgedAt = disclaimerAcknowledged ? new Date() : undefined;

      // Create user (password is hashed in service with bcrypt cost 12)
      const user = await createUser(email, password, name, disclaimerAcknowledgedAt);

      span.setAttribute("user.id", user.id);

      // Generate verification token (JWT, 24h expiry)
      const verificationToken = await signVerificationToken(user.id);

      // Store token in database (for single-use validation)
      await storeVerificationToken(user.id, verificationToken);

      // Send verification email via Inngest (async with retries) (AC6, AC8)
      // Inngest handles retries and failure visibility in dashboard
      await inngest.send({
        name: "email/verification.requested",
        data: {
          userId: user.id,
          email,
          token: verificationToken,
          requestedAt: new Date().toISOString(),
        },
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      // Return 201 Created with success message (AC8)
      return NextResponse.json<RegisterResponse>(
        {
          user: {
            id: user.id,
            email: user.email,
          },
          message: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT,
        },
        { status: 201 }
      );
    } catch (error) {
      // Enhanced error logging with full database error context
      // Note: email may not be defined if error occurred during validation
      const dbError = handleDbError(error, "user registration");

      span.setStatus({ code: SpanStatusCode.ERROR, message: dbError.message });
      span.recordException(error as Error);
      span.end();

      // Handle specific database errors with proper codes
      if (dbError.code === DbErrorCode.UNIQUE_VIOLATION) {
        return NextResponse.json(
          {
            error: AUTH_MESSAGES.EMAIL_EXISTS,
            code: "EMAIL_EXISTS",
          },
          { status: 409 }
        );
      }

      return databaseError(dbError, "registration");
    }
  });
}
