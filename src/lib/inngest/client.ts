/**
 * Inngest Client
 *
 * Story 2.8: Account Deletion
 * Story 8.1: Inngest Job Infrastructure
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * Inngest is used for:
 * - Scheduled hard delete after 30-day grace period
 * - Overnight scoring jobs (Epic 8)
 * - Recommendation pre-generation (Epic 8)
 *
 * Note: Cache warming is performed inline within the overnight scoring job
 * (Step 7: warm-cache) rather than as a separate triggered function.
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

  /**
   * Triggered when a verification email needs to be sent
   * Story 2.1, 2.2: User Registration & Email Verification
   */
  "email/verification.requested": {
    data: {
      userId: string;
      email: string;
      token: string;
      requestedAt: string; // ISO date string
    };
  };

  /**
   * Triggered when a password reset email needs to be sent
   * Story 2.5: Password Reset Flow
   */
  "email/password-reset.requested": {
    data: {
      userId: string;
      email: string;
      token: string;
      requestedAt: string; // ISO date string
    };
  };

  /**
   * Triggered to start overnight scoring job
   * Story 8.1, 8.2: Overnight Processing
   *
   * This event is typically triggered by a cron schedule but can also
   * be manually triggered for testing or re-runs.
   */
  "overnight/scoring.started": {
    data: {
      correlationId: string; // Unique ID for this job run
      triggeredAt: string; // ISO date string
      triggeredBy: "cron" | "manual"; // How the job was triggered
      market?: string | undefined; // Optional: specific market to score (e.g., "US", "BR")
    };
  };

  /**
   * Triggered when overnight scoring job completes
   * Story 8.2: Overnight Scoring Job
   */
  "overnight/scoring.completed": {
    data: {
      correlationId: string;
      completedAt: string; // ISO date string
      usersProcessed: number;
      assetsScored: number;
      durationMs: number;
      success: boolean;
      error?: string | undefined;
    };
  };

  /**
   * Triggered when a user requests their data export
   * Story 1.6: GDPR Compliance - AC-1.6.1, AC-1.6.2
   */
  "email/data-export.requested": {
    data: {
      userId: string;
      email: string;
    };
  };

  /**
   * Triggered when a user deletes their account
   * Story 1.6: GDPR Compliance - AC-1.6.4
   */
  "email/account-deleted.requested": {
    data: {
      userId: string;
      email: string;
      scheduledPurgeDate: string; // ISO date string
      gracePeriodDays: number;
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
