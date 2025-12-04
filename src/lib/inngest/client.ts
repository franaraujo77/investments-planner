/**
 * Inngest Client
 *
 * Story 2.8: Account Deletion
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * Inngest is used for:
 * - Scheduled hard delete after 30-day grace period
 * - Overnight scoring jobs (Epic 8)
 * - Recommendation pre-generation (Epic 8)
 *
 * @see https://www.inngest.com/docs/quick-start
 */

import { Inngest } from "inngest";

/**
 * Event types for the application
 *
 * Define all Inngest events here for type safety.
 */
export type Events = {
  /**
   * Triggered when a user deletes their account
   * Schedules hard delete after 30-day grace period
   */
  "user/deletion.scheduled": {
    data: {
      userId: string;
      scheduledPurgeDate: string; // ISO date string
      deletedAt: string; // ISO date string
    };
  };
};

/**
 * Inngest client instance
 *
 * Used to send events and define functions.
 */
export const inngest = new Inngest({
  id: "investments-planner",
  schemas: new Map() as never, // Type workaround for Inngest v3
});
