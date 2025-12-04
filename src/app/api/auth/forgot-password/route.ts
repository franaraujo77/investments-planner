/**
 * Forgot Password API Route
 *
 * Story 2.5: Password Reset Flow
 *
 * POST /api/auth/forgot-password
 * - Accepts email address
 * - Always returns same message (no email enumeration)
 * - If user exists: generates reset token and sends email
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserByEmail,
  createPasswordResetToken,
  invalidateUserPasswordResetTokens,
} from "@/lib/auth/service";
import { sendPasswordResetEmail } from "@/lib/email/email-service";

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
 * AC-2.5.2: No Email Enumeration
 * Always returns the same message regardless of whether the email exists
 */
export async function POST(request: Request) {
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

    // Log the request for security monitoring
    console.log(`[Password Reset] Request received for email: ${email.substring(0, 3)}***`);

    // Look up user by email
    const user = await findUserByEmail(email);

    if (user) {
      // User exists - generate token and send email
      try {
        // Invalidate any existing unused reset tokens for this user
        await invalidateUserPasswordResetTokens(user.id);

        // Generate new reset token
        const token = await createPasswordResetToken(user.id);

        // Send password reset email
        await sendPasswordResetEmail(email, token);

        console.log(`[Password Reset] Email sent successfully for user: ${user.id}`);
      } catch (error) {
        // Log error but don't expose to client
        console.error("[Password Reset] Failed to process reset request:", error);
        // Still return success to prevent enumeration
      }
    } else {
      // User doesn't exist - log but return same response
      console.log(`[Password Reset] No user found for email: ${email.substring(0, 3)}***`);
    }

    // Always return the same response (AC-2.5.2)
    return NextResponse.json(STANDARD_RESPONSE);
  } catch (error) {
    console.error("[Password Reset] Unexpected error:", error);

    // Even on error, return same message to prevent information leakage
    return NextResponse.json(STANDARD_RESPONSE);
  }
}
