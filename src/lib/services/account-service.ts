/**
 * Account Service
 *
 * Business logic for account management operations.
 * Story 2.8: Account Deletion
 *
 * Implements soft delete with 30-day purge window per GDPR requirements.
 * - Soft delete: Sets deletedAt timestamp on user record
 * - Hard delete: Complete data removal after 30-day grace period
 */

import { db } from "@/lib/db";
import {
  users,
  refreshTokens,
  verificationTokens,
  passwordResetTokens,
  calculationEvents,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateUserCache } from "@/lib/cache/invalidation";
import { inngest } from "@/lib/inngest/client";

/**
 * Result of account deletion operation
 */
export interface AccountDeletionResult {
  success: boolean;
  scheduledPurgeDate: Date;
  deletedAt: Date;
}

/**
 * Number of days before hard delete (GDPR compliance)
 */
export const PURGE_DELAY_DAYS = 30;

/**
 * Soft deletes a user account
 *
 * Story 2.8: Account Deletion
 * AC-2.8.3: Cascade data deletion (soft delete user, hard delete tokens)
 * AC-2.8.4: Soft delete with 30-day purge window
 * AC-2.8.5: Logout and redirect after deletion
 *
 * Operations performed:
 * 1. Set deletedAt timestamp on user record (soft delete)
 * 2. Hard delete all refresh tokens (immediate session termination)
 * 3. Hard delete all verification tokens
 * 4. Hard delete all password reset tokens
 * 5. Clear user cache
 *
 * @param userId - User ID to delete
 * @returns Deletion result with scheduled purge date
 * @throws Error if user not found or deletion fails
 */
export async function deleteUserAccount(userId: string): Promise<AccountDeletionResult> {
  // Verify user exists
  const [existingUser] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new Error("User not found");
  }

  if (existingUser.deletedAt) {
    throw new Error("User account is already deleted");
  }

  const deletedAt = new Date();
  const scheduledPurgeDate = new Date(deletedAt.getTime() + PURGE_DELAY_DAYS * 24 * 60 * 60 * 1000);

  // Perform soft delete on user record
  await db
    .update(users)
    .set({
      deletedAt,
      updatedAt: deletedAt,
    })
    .where(eq(users.id, userId));

  // Hard delete all tokens immediately (security requirement)
  // These are deleted immediately, not soft-deleted, for security
  await Promise.all([
    // Delete all refresh tokens (terminates all sessions)
    db.delete(refreshTokens).where(eq(refreshTokens.userId, userId)),
    // Delete all verification tokens
    db.delete(verificationTokens).where(eq(verificationTokens.userId, userId)),
    // Delete all password reset tokens
    db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)),
  ]);

  // Clear user cache (fire and forget - don't fail deletion if cache fails)
  try {
    await invalidateUserCache(userId);
  } catch (cacheError) {
    console.error("Failed to invalidate user cache during deletion:", cacheError);
    // Continue - cache will expire naturally
  }

  // Schedule hard delete via Inngest (30-day grace period)
  // AC-2.8.4: Background job scheduled for hard delete
  try {
    await inngest.send({
      name: "user/deletion.scheduled",
      data: {
        userId,
        scheduledPurgeDate: scheduledPurgeDate.toISOString(),
        deletedAt: deletedAt.toISOString(),
      },
    });
  } catch (inngestError) {
    // Log but don't fail - soft delete is the critical operation
    // The data is marked as deleted and inaccessible even without hard delete
    console.error("Failed to schedule hard delete via Inngest:", inngestError);
  }

  return {
    success: true,
    scheduledPurgeDate,
    deletedAt,
  };
}

/**
 * Hard deletes all user data permanently
 *
 * Story 2.8: Account Deletion
 * AC-2.8.4: Called by scheduled Inngest job after 30-day grace period
 *
 * This function completely removes all user data from the database.
 * Should only be called by the scheduled purge job after the grace period.
 *
 * Tables deleted (if they exist):
 * - users (hard delete)
 * - calculation_events
 * - portfolios (future - Epic 3)
 * - portfolio_assets (future - Epic 3)
 * - scoring_criteria (future - Epic 5)
 * - etc.
 *
 * @param userId - User ID to permanently delete
 * @throws Error if deletion fails
 */
export async function hardDeleteUserData(userId: string): Promise<void> {
  // Verify user is actually soft-deleted before hard delete
  const [user] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    // User already hard-deleted or doesn't exist
    console.log(`User ${userId} not found - may already be deleted`);
    return;
  }

  if (!user.deletedAt) {
    throw new Error("Cannot hard delete a user that is not soft-deleted");
  }

  // Delete calculation events (no cascade, manual delete)
  await db.delete(calculationEvents).where(eq(calculationEvents.userId, userId));

  // Delete any remaining tokens (should be gone from soft delete, but ensure cleanup)
  await Promise.all([
    db.delete(refreshTokens).where(eq(refreshTokens.userId, userId)),
    db.delete(verificationTokens).where(eq(verificationTokens.userId, userId)),
    db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)),
  ]);

  // Future: Delete portfolio-related data when Epic 3 is implemented
  // await db.delete(portfolios).where(eq(portfolios.userId, userId));

  // Future: Delete criteria-related data when Epic 5 is implemented
  // await db.delete(scoringCriteria).where(eq(scoringCriteria.userId, userId));

  // Finally, delete the user record
  await db.delete(users).where(eq(users.id, userId));

  // Clear cache one more time to be thorough
  try {
    await invalidateUserCache(userId);
  } catch {
    // Ignore cache errors during hard delete
  }

  console.log(`User ${userId} permanently deleted`);
}
