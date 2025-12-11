/**
 * POST /api/auth/verify
 *
 * Email verification endpoint.
 * Story 2.2: Email Verification
 *
 * AC-2.2.1: Clicking valid link activates account and redirects to login with toast
 * AC-2.2.2: Verification link expires after 24 hours
 * AC-2.2.3: Link is single-use; reuse returns "Link already used" error
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/telemetry/logger";
import {
  findVerificationTokenRaw,
  markVerificationTokenUsed,
  markEmailVerified,
} from "@/lib/auth/service";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { z } from "zod/v4";

/**
 * Response type for successful verification
 */
interface VerifyResponse {
  success: boolean;
  message: string;
}

/**
 * Error response type
 */
interface VerifyError {
  error: string;
  code: string;
}

/**
 * Verification request schema
 */
const verifySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const tracer = trace.getTracer("auth");

/**
 * POST /api/auth/verify
 *
 * Verifies a user's email address using the verification token.
 *
 * Request body:
 * - token: string (required) - The verification JWT token
 *
 * Response:
 * - 200: { success: true, message: "Email verified successfully" }
 * - 400: Invalid token format
 * - 409: Token already used
 * - 410: Token expired
 */
export async function POST(request: Request): Promise<NextResponse<VerifyResponse | VerifyError>> {
  return tracer.startActiveSpan("POST /api/auth/verify", async (span) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = verifySchema.safeParse(body);

      if (!validation.success) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Invalid token format" });
        span.end();

        return NextResponse.json(
          {
            error: "Invalid token",
            code: "INVALID_TOKEN",
          },
          { status: 400 }
        );
      }

      const { token } = validation.data;

      // Find the verification token in database
      const verificationToken = await findVerificationTokenRaw(token);

      // Token not found - invalid
      if (!verificationToken) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Token not found" });
        span.end();

        return NextResponse.json(
          {
            error: "Invalid verification link",
            code: "INVALID_TOKEN",
          },
          { status: 400 }
        );
      }

      span.setAttribute("user.id", verificationToken.userId);

      // Check if token was already used (AC-2.2.3)
      if (verificationToken.usedAt) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Token already used" });
        span.end();

        return NextResponse.json(
          {
            error: "This verification link has already been used",
            code: "TOKEN_ALREADY_USED",
          },
          { status: 409 }
        );
      }

      // Check if token is expired (AC-2.2.2)
      if (verificationToken.expiresAt < new Date()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Token expired" });
        span.end();

        return NextResponse.json(
          {
            error: "This verification link has expired",
            code: "TOKEN_EXPIRED",
          },
          { status: 410 }
        );
      }

      // Mark token as used (AC-2.2.3)
      await markVerificationTokenUsed(verificationToken.id);

      // Mark user's email as verified (AC-2.2.1)
      await markEmailVerified(verificationToken.userId);

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      // Return success (AC-2.2.1)
      return NextResponse.json<VerifyResponse>({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      logger.error("Verification error", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      span.end();

      return NextResponse.json(
        {
          error: "An error occurred during verification",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  });
}
