/**
 * Purge Deleted User Function
 *
 * Story 2.8: Account Deletion
 * AC-2.8.4: Hard delete after 30-day grace period
 *
 * This Inngest function handles the scheduled hard delete of user data
 * after the 30-day grace period following account deletion.
 *
 * Flow:
 * 1. User deletes account → soft delete + event sent
 * 2. Inngest receives event and sleeps until purge date
 * 3. After 30 days, hard deletes all user data
 */

import { inngest } from "../client";
import { hardDeleteUserData } from "@/lib/services/account-service";

/**
 * Purge Deleted User Function
 *
 * Triggered by: user/deletion.scheduled event
 * Behavior: Sleeps until scheduled purge date, then hard deletes user data
 *
 * Uses Inngest's step.sleepUntil for durable scheduling that survives
 * server restarts and deployments.
 */
export const purgeDeletedUser = inngest.createFunction(
  {
    id: "purge-deleted-user",
    name: "Purge Deleted User Data",
    retries: 3, // Retry on failure
  },
  { event: "user/deletion.scheduled" },
  async ({ event, step }) => {
    const { userId, scheduledPurgeDate, deletedAt } = event.data;

    // Log the scheduling
    console.log(
      `User ${userId} scheduled for purge. Deleted at: ${deletedAt}, Purge date: ${scheduledPurgeDate}`
    );

    // Sleep until the scheduled purge date
    // Inngest handles this durably - survives restarts
    await step.sleepUntil("wait-for-purge-date", new Date(scheduledPurgeDate));

    // Perform the hard delete
    await step.run("hard-delete-user-data", async () => {
      console.log(`Starting hard delete for user ${userId}`);
      await hardDeleteUserData(userId);
      console.log(`Completed hard delete for user ${userId}`);
    });

    return {
      success: true,
      userId,
      deletedAt,
      purgedAt: new Date().toISOString(),
    };
  }
);
