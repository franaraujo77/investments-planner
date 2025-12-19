/**
 * Disclaimer Service
 *
 * Story 9.4: Financial Disclaimers
 * AC-9.4.3: User must acknowledge disclaimer before accessing dashboard
 * AC-9.4.4: Acknowledgment timestamp stored in user record
 *
 * Provides methods to check and record disclaimer acknowledgment.
 *
 * Key design decisions:
 * - Uses existing users.disclaimerAcknowledgedAt field (no schema change needed)
 * - Tenant isolation via userId (all queries scoped to user)
 * - Idempotent acknowledgment (doesn't overwrite existing timestamp)
 */

import { db, type Database } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Disclaimer Service
 *
 * Manages user financial disclaimer acknowledgment.
 *
 * @example
 * ```typescript
 * const disclaimerService = new DisclaimerService();
 *
 * // Check if user has acknowledged
 * const hasAcknowledged = await disclaimerService.hasAcknowledgedDisclaimer(userId);
 *
 * // Record acknowledgment
 * const timestamp = await disclaimerService.acknowledgeDisclaimer(userId);
 * ```
 */
export class DisclaimerService {
  constructor(private database: Database = db) {}

  /**
   * Check if user has acknowledged the financial disclaimer
   *
   * AC-9.4.1: Check for modal display decision
   * AC-9.4.3: Determine if user can access dashboard
   *
   * @param userId - User ID (tenant isolation)
   * @returns true if user has acknowledged disclaimer (timestamp is not null)
   */
  async hasAcknowledgedDisclaimer(userId: string): Promise<boolean> {
    const [user] = await this.database
      .select({ disclaimerAcknowledgedAt: users.disclaimerAcknowledgedAt })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      logger.warn("User not found when checking disclaimer status", { userId });
      return false;
    }

    return user.disclaimerAcknowledgedAt !== null;
  }

  /**
   * Get disclaimer acknowledgment timestamp for a user
   *
   * AC-9.4.4: Retrieve stored timestamp
   *
   * @param userId - User ID (tenant isolation)
   * @returns Acknowledgment timestamp or null if not acknowledged
   */
  async getDisclaimerStatus(userId: string): Promise<{
    acknowledged: boolean;
    acknowledgedAt: Date | null;
  }> {
    const [user] = await this.database
      .select({ disclaimerAcknowledgedAt: users.disclaimerAcknowledgedAt })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      logger.warn("User not found when getting disclaimer status", { userId });
      return { acknowledged: false, acknowledgedAt: null };
    }

    return {
      acknowledged: user.disclaimerAcknowledgedAt !== null,
      acknowledgedAt: user.disclaimerAcknowledgedAt,
    };
  }

  /**
   * Record user's disclaimer acknowledgment
   *
   * AC-9.4.3: Record acknowledgment with timestamp
   * AC-9.4.4: Store disclaimerAcknowledgedAt in users table
   *
   * This method is idempotent - if the user has already acknowledged,
   * the existing timestamp is preserved and returned.
   *
   * @param userId - User ID (tenant isolation)
   * @returns The acknowledgment timestamp (existing or newly set)
   * @throws Error if user not found or update fails
   */
  async acknowledgeDisclaimer(userId: string): Promise<Date> {
    // First check if already acknowledged (idempotent)
    const [existingUser] = await this.database
      .select({ disclaimerAcknowledgedAt: users.disclaimerAcknowledgedAt })
      .from(users)
      .where(eq(users.id, userId));

    if (!existingUser) {
      throw new Error("User not found");
    }

    // If already acknowledged, return existing timestamp (idempotent)
    if (existingUser.disclaimerAcknowledgedAt !== null) {
      logger.info("Disclaimer already acknowledged, returning existing timestamp", {
        userId,
        acknowledgedAt: existingUser.disclaimerAcknowledgedAt.toISOString(),
      });
      return existingUser.disclaimerAcknowledgedAt;
    }

    // Set acknowledgment timestamp
    const now = new Date();
    const [updatedUser] = await this.database
      .update(users)
      .set({
        disclaimerAcknowledgedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning({ disclaimerAcknowledgedAt: users.disclaimerAcknowledgedAt });

    if (!updatedUser?.disclaimerAcknowledgedAt) {
      throw new Error("Failed to acknowledge disclaimer");
    }

    logger.info("Disclaimer acknowledged successfully", {
      userId,
      acknowledgedAt: updatedUser.disclaimerAcknowledgedAt.toISOString(),
    });

    return updatedUser.disclaimerAcknowledgedAt;
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default disclaimer service instance
 */
export const disclaimerService = new DisclaimerService();
