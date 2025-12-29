/**
 * Send Account Deletion Email Inngest Function
 *
 * Story 1.6: GDPR Compliance - AC-1.6.4
 *
 * Background job that sends a confirmation email when a user
 * deletes their account, including grace period information.
 *
 * Triggered by: email/account-deleted.requested event
 * Retry policy: Inngest default (3 retries with exponential backoff)
 */

import { inngest } from "../client";
import { sendAccountDeletionEmail } from "@/lib/email/email-service";
import { logger, redactUserId, redactEmail } from "@/lib/telemetry/logger";

/**
 * Send Account Deletion Email Job
 *
 * Sends a confirmation email to the user after account deletion
 * with information about the grace period and permanent deletion date.
 */
export const sendAccountDeletionEmailJob = inngest.createFunction(
  {
    id: "send-account-deletion-email",
    name: "Send Account Deletion Email",
    retries: 3,
  },
  { event: "email/account-deleted.requested" },
  async ({ event, step }) => {
    const { userId, email, scheduledPurgeDate, gracePeriodDays } = event.data;

    await step.run("send-email", async () => {
      logger.info("Sending account deletion confirmation email", {
        userId: redactUserId(userId),
        email: redactEmail(email),
        scheduledPurgeDate,
        gracePeriodDays,
      });

      await sendAccountDeletionEmail(email, scheduledPurgeDate, gracePeriodDays);

      logger.info("Account deletion email sent successfully", {
        userId: redactUserId(userId),
        email: redactEmail(email),
      });
    });

    return {
      success: true,
      userId,
      emailSent: true,
    };
  }
);
