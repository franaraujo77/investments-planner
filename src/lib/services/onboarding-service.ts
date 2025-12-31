/**
 * Onboarding Service
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.3: Tip Dismissal Persistence
 * AC-3.5.4: Reset Onboarding Tips Option
 *
 * Provides database operations for managing user onboarding tip preferences.
 *
 * Key design decisions:
 * - Primary storage in database (users.onboarding_tips_dismissed)
 * - Optimistic updates supported via localStorage in client
 * - Tenant isolation via userId
 */

import { db, type Database } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import { ONBOARDING_TIPS, type OnboardingTip } from "@/lib/constants/onboarding-tips";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of getting dismissed tips for a user
 */
export interface DismissedTipsResult {
  tipsDismissed: string[];
  completedAt: Date | null;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Onboarding Service
 *
 * Manages onboarding tip preferences for users.
 *
 * @example
 * ```typescript
 * const service = new OnboardingService();
 *
 * // Get dismissed tips
 * const { tipsDismissed } = await service.getDismissedTips(userId);
 *
 * // Dismiss a tip
 * await service.dismissTip(userId, "pie-chart-interaction");
 *
 * // Reset all tips
 * await service.resetAllTips(userId);
 * ```
 */
export class OnboardingService {
  constructor(private database: Database = db) {}

  /**
   * Get dismissed tips for a user
   *
   * @param userId - User ID (tenant isolation)
   * @returns Array of dismissed tip IDs and completion timestamp
   */
  async getDismissedTips(userId: string): Promise<DismissedTipsResult> {
    const [user] = await this.database
      .select({
        tipsDismissed: users.onboardingTipsDismissed,
        completedAt: users.onboardingCompletedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      logger.warn("User not found when getting dismissed tips", { userId });
      return { tipsDismissed: [], completedAt: null };
    }

    // Handle null or undefined tipsDismissed (default to empty array)
    const tipsDismissed = Array.isArray(user.tipsDismissed) ? user.tipsDismissed : [];

    return {
      tipsDismissed,
      completedAt: user.completedAt,
    };
  }

  /**
   * Dismiss a single tip for a user
   *
   * Idempotent - dismissing an already dismissed tip is a no-op.
   *
   * @param userId - User ID (tenant isolation)
   * @param tipId - The tip ID to dismiss
   */
  async dismissTip(userId: string, tipId: string): Promise<void> {
    // Get current dismissed tips
    const { tipsDismissed } = await this.getDismissedTips(userId);

    // Check if already dismissed (idempotent)
    if (tipsDismissed.includes(tipId)) {
      logger.debug("Tip already dismissed", { userId, tipId });
      return;
    }

    // Add to dismissed list
    const newDismissedTips = [...tipsDismissed, tipId];

    // Check if all tips are now dismissed
    const allTipsCount = ONBOARDING_TIPS.length;
    const isComplete = newDismissedTips.length >= allTipsCount;

    // Update user record
    await this.database
      .update(users)
      .set({
        onboardingTipsDismissed: newDismissedTips,
        onboardingCompletedAt: isComplete ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info("Onboarding tip dismissed", {
      userId,
      tipId,
      totalDismissed: newDismissedTips.length,
      isComplete,
    });
  }

  /**
   * Reset all tips for a user
   *
   * Clears all dismissed tips, allowing the user to see onboarding again.
   *
   * @param userId - User ID (tenant isolation)
   */
  async resetAllTips(userId: string): Promise<void> {
    await this.database
      .update(users)
      .set({
        onboardingTipsDismissed: [],
        onboardingCompletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info("All onboarding tips reset for user", { userId });
  }

  /**
   * Check if a user should see a specific tip
   *
   * @param userId - User ID (tenant isolation)
   * @param tipId - The tip ID to check
   * @returns true if the tip should be shown (not dismissed)
   */
  async shouldShowTip(userId: string, tipId: string): Promise<boolean> {
    const { tipsDismissed } = await this.getDismissedTips(userId);
    return !tipsDismissed.includes(tipId);
  }

  /**
   * Get all tips that should be shown for a user
   *
   * @param userId - User ID (tenant isolation)
   * @returns Array of tips that have not been dismissed
   */
  async getActiveTips(userId: string): Promise<OnboardingTip[]> {
    const { tipsDismissed } = await this.getDismissedTips(userId);
    return ONBOARDING_TIPS.filter((tip) => !tipsDismissed.includes(tip.id));
  }

  /**
   * Check if onboarding is complete for a user
   *
   * @param userId - User ID (tenant isolation)
   * @returns true if all tips have been dismissed
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const { tipsDismissed } = await this.getDismissedTips(userId);
    return tipsDismissed.length >= ONBOARDING_TIPS.length;
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default onboarding service instance
 */
export const onboardingService = new OnboardingService();
