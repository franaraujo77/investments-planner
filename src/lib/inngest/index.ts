/**
 * Inngest Module Index
 *
 * Story 2.8: Account Deletion
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * Exports the Inngest client and all functions.
 */

export { inngest } from "./client";
export { purgeDeletedUser } from "./functions/purge-deleted-user";
