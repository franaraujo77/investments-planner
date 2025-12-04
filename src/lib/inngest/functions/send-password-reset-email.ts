/**
 * Send Password Reset Email Function
 *
 * Story 2.5: Password Reset Flow
 *
 * Handles password reset email sending with retry logic.
 * Replaces fire-and-forget pattern with reliable delivery.
 *
 * Benefits:
 * - 3 automatic retries on failure
 * - Visible in Inngest dashboard for debugging
 * - Async processing doesn't block API response
 */

import { inngest } from "../client";
import { sendPasswordResetEmail } from "@/lib/email/email-service";

/**
 * Send Password Reset Email Function
 *
 * Triggered by: email/password-reset.requested event
 * Behavior: Sends password reset email with automatic retries
 */
export const sendPasswordResetEmailJob = inngest.createFunction(
  {
    id: "send-password-reset-email",
    name: "Send Password Reset Email",
    retries: 3,
  },
  { event: "email/password-reset.requested" },
  async ({ event, step }) => {
    const { userId, email, token, requestedAt } = event.data;

    // Send the email with retry support
    await step.run("send-email", async () => {
      await sendPasswordResetEmail(email, token);
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
