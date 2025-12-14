/**
 * Inngest Module Index
 *
 * Story 2.8: Account Deletion
 * Story 2.1, 2.2: Email Verification
 * Story 2.5: Password Reset Flow
 * Story 8.1: Inngest Job Infrastructure
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * Exports the Inngest client and all functions.
 */

export { inngest } from "./client";
export type { Events } from "./client";
export { purgeDeletedUser } from "./functions/purge-deleted-user";
export { sendVerificationEmailJob } from "./functions/send-verification-email";
export { sendPasswordResetEmailJob } from "./functions/send-password-reset-email";
export { overnightScoringJob } from "./functions/overnight-scoring";
export { cacheWarmerJob } from "./functions/cache-warmer";

// Export all functions array for Inngest serve
import { purgeDeletedUser } from "./functions/purge-deleted-user";
import { sendVerificationEmailJob } from "./functions/send-verification-email";
import { sendPasswordResetEmailJob } from "./functions/send-password-reset-email";
import { overnightScoringJob } from "./functions/overnight-scoring";
import { cacheWarmerJob } from "./functions/cache-warmer";

export const functions = [
  purgeDeletedUser,
  sendVerificationEmailJob,
  sendPasswordResetEmailJob,
  overnightScoringJob,
  cacheWarmerJob,
];
