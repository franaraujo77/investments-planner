/**
 * Send Verification Email Function
 *
 * Story 2.1: User Registration Flow
 * Story 2.2: Email Verification
 *
 * Handles verification email sending with retry logic.
 * Replaces fire-and-forget pattern with reliable delivery.
 *
 * Benefits:
 * - 3 automatic retries on failure
 * - Visible in Inngest dashboard for debugging
 * - Async processing doesn't block registration response
 */

import { inngest } from "../client";
import { sendVerificationEmail } from "@/lib/email/email-service";

/**
 * Send Verification Email Function
 *
 * Triggered by: email/verification.requested event
 * Behavior: Sends verification email with automatic retries
 */
export const sendVerificationEmailJob = inngest.createFunction(
  {
    id: "send-verification-email",
    name: "Send Verification Email",
    retries: 3,
  },
  { event: "email/verification.requested" },
  async ({ event, step }) => {
    const { userId, email, token, requestedAt } = event.data;

    // Send the email with retry support
    await step.run("send-email", async () => {
      await sendVerificationEmail(email, token);
    });

    return {
      success: true,
      userId,
      email,
      requestedAt,
      sentAt: new Date().toISOString(),
    };
  }
);
