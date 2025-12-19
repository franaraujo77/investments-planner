/**
 * Alert Preferences Service
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.6: Alert respects user preferences (opportunityAlertsEnabled)
 *
 * Story 9.3: Alert Preferences (future story)
 * Provides CRUD operations for user alert preferences.
 *
 * Key design decisions:
 * - One record per user (unique constraint on userId)
 * - Default preferences created automatically when first accessed
 * - All alert types enabled by default
 * - Tenant isolation via userId
 */

import { db, type Database } from "@/lib/db";
import { alertPreferences, type AlertPreference, type NewAlertPreference } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Alert preferences update fields
 */
export interface AlertPreferencesUpdate {
  opportunityAlertsEnabled?: boolean;
  driftAlertsEnabled?: boolean;
  driftThreshold?: string;
  alertFrequency?: "realtime" | "daily" | "weekly";
  emailNotifications?: boolean;
}

/**
 * Default alert preferences for new users
 */
export const DEFAULT_ALERT_PREFERENCES: Omit<NewAlertPreference, "userId" | "id"> = {
  opportunityAlertsEnabled: true,
  driftAlertsEnabled: true,
  driftThreshold: "5.00",
  alertFrequency: "daily",
  emailNotifications: false,
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Alert Preferences Service
 *
 * Manages user alert notification settings.
 *
 * @example
 * ```typescript
 * const prefsService = new AlertPreferencesService();
 *
 * // Get or create preferences
 * const prefs = await prefsService.getPreferences(userId);
 *
 * // Check if opportunity alerts enabled
 * if (await prefsService.isOpportunityAlertsEnabled(userId)) {
 *   // Create alerts
 * }
 * ```
 */
export class AlertPreferencesService {
  constructor(private database: Database = db) {}

  /**
   * Get alert preferences for a user
   *
   * Creates default preferences if none exist.
   *
   * @param userId - User ID (tenant isolation)
   * @returns User's alert preferences
   */
  async getPreferences(userId: string): Promise<AlertPreference> {
    // Try to find existing preferences
    const [existing] = await this.database
      .select()
      .from(alertPreferences)
      .where(eq(alertPreferences.userId, userId));

    if (existing) {
      return existing;
    }

    // Create default preferences
    logger.info("Creating default alert preferences for user", { userId });
    return this.createDefaultPreferences(userId);
  }

  /**
   * Create default alert preferences for a new user
   *
   * @param userId - User ID (tenant isolation)
   * @returns Created preferences with defaults
   */
  async createDefaultPreferences(userId: string): Promise<AlertPreference> {
    const newPrefs: NewAlertPreference = {
      userId,
      ...DEFAULT_ALERT_PREFERENCES,
    };

    const result = await this.database.insert(alertPreferences).values(newPrefs).returning();

    const created = result[0];

    if (!created) {
      throw new Error("Failed to create alert preferences");
    }

    logger.info("Default alert preferences created", {
      userId,
      opportunityAlertsEnabled: created.opportunityAlertsEnabled,
      driftAlertsEnabled: created.driftAlertsEnabled,
    });

    return created;
  }

  /**
   * Ensure alert preferences exist for a user
   *
   * Story 9.3: Alert Preferences
   * Creates default preferences if none exist.
   *
   * @param userId - User ID (tenant isolation)
   * @returns User's alert preferences (existing or newly created)
   */
  async ensurePreferencesExist(userId: string): Promise<AlertPreference> {
    return this.getPreferences(userId);
  }

  /**
   * Update alert preferences
   *
   * Story 9.3: Alert Preferences
   * AC-9.3.1-9.3.5: Update individual preference fields
   *
   * Only updates fields that are explicitly provided (not undefined).
   * Always updates the `updatedAt` timestamp.
   *
   * @param userId - User ID (tenant isolation)
   * @param updates - Fields to update (partial - only provided fields are updated)
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: string,
    updates: AlertPreferencesUpdate
  ): Promise<AlertPreference> {
    // Ensure preferences exist first
    await this.ensurePreferencesExist(userId);

    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.opportunityAlertsEnabled !== undefined) {
      updateData.opportunityAlertsEnabled = updates.opportunityAlertsEnabled;
    }
    if (updates.driftAlertsEnabled !== undefined) {
      updateData.driftAlertsEnabled = updates.driftAlertsEnabled;
    }
    if (updates.driftThreshold !== undefined) {
      updateData.driftThreshold = updates.driftThreshold;
    }
    if (updates.alertFrequency !== undefined) {
      updateData.alertFrequency = updates.alertFrequency;
    }
    if (updates.emailNotifications !== undefined) {
      updateData.emailNotifications = updates.emailNotifications;
    }

    const result = await this.database
      .update(alertPreferences)
      .set(updateData)
      .where(eq(alertPreferences.userId, userId))
      .returning();

    const updated = result[0];

    if (!updated) {
      throw new Error("Failed to update alert preferences");
    }

    logger.info("Alert preferences updated", {
      userId,
      updatedFieldCount: Object.keys(updates).filter(
        (key) => updates[key as keyof AlertPreferencesUpdate] !== undefined
      ).length,
    });

    return updated;
  }

  /**
   * Check if opportunity alerts are enabled for a user
   *
   * AC-9.1.6: Alert respects user preferences
   * Helper method for quick checks during alert detection.
   *
   * @param userId - User ID (tenant isolation)
   * @returns true if opportunity alerts are enabled
   */
  async isOpportunityAlertsEnabled(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.opportunityAlertsEnabled;
  }

  /**
   * Check if drift alerts are enabled for a user
   *
   * Story 9.2: Allocation Drift Alert (future story)
   *
   * @param userId - User ID (tenant isolation)
   * @returns true if drift alerts are enabled
   */
  async isDriftAlertsEnabled(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.driftAlertsEnabled;
  }

  /**
   * Get drift threshold for a user
   *
   * Story 9.2: Allocation Drift Alert (future story)
   *
   * @param userId - User ID (tenant isolation)
   * @returns Drift threshold percentage as string (e.g., "5.00")
   */
  async getDriftThreshold(userId: string): Promise<string> {
    const prefs = await this.getPreferences(userId);
    return prefs.driftThreshold;
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default alert preferences service instance
 */
export const alertPreferencesService = new AlertPreferencesService();
