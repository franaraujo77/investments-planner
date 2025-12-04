/**
 * Inngest Module Index
 *
 * Story 2.8: Account Deletion
 * Story 2.1, 2.2: Email Verification
 * Story 2.5: Password Reset Flow
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * Exports the Inngest client and all functions.
 */

export { inngest } from "./client";
export { purgeDeletedUser } from "./functions/purge-deleted-user";
export { sendVerificationEmailJob } from "./functions/send-verification-email";
export { sendPasswordResetEmailJob } from "./functions/send-password-reset-email";

// Export all functions array for Inngest serve
import { purgeDeletedUser } from "./functions/purge-deleted-user";
import { sendVerificationEmailJob } from "./functions/send-verification-email";
import { sendPasswordResetEmailJob } from "./functions/send-password-reset-email";

export const functions = [purgeDeletedUser, sendVerificationEmailJob, sendPasswordResetEmailJob];
