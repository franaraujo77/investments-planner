/**
 * User Service
 *
 * Business logic for user profile operations.
 * Story 2.6: Profile Settings & Base Currency
 */

import { db } from "@/lib/db";
import { logger, redactUserId } from "@/lib/telemetry/logger";
import { users, type User } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateRecommendations } from "@/lib/cache/recommendations";

/**
 * Supported currencies for base currency setting
 * Must match the validation in the API route
 */
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Profile update data
 */
export interface UpdateProfileData {
  name?: string;
  baseCurrency?: string;
}

/**
 * Updates a user's profile
 *
 * Story 2.6: Profile Settings & Base Currency
 *
 * AC-2.6.3: Invalidates recommendation cache when currency changes
 * AC-2.6.5: Validates name length (max 100 chars)
 *
 * @param userId - User ID to update
 * @param data - Profile data to update
 * @returns Updated user record
 * @throws Error if user not found or validation fails
 */
export async function updateUserProfile(userId: string, data: UpdateProfileData): Promise<User> {
  // Fetch current user to check for currency change
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Validate name length if provided
  if (data.name !== undefined && data.name.length > 100) {
    throw new Error("Name must be 100 characters or less");
  }

  // Validate currency if provided
  if (data.baseCurrency !== undefined) {
    if (!SUPPORTED_CURRENCIES.includes(data.baseCurrency as SupportedCurrency)) {
      throw new Error("Invalid currency");
    }
  }

  // Build update object only with provided fields
  const updateData: Partial<User> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name.trim() || null;
  }

  if (data.baseCurrency !== undefined) {
    updateData.baseCurrency = data.baseCurrency;
  }

  // Perform update
  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new Error("Failed to update user profile");
  }

  // AC-2.6.3: Invalidate cache if currency changed
  if (data.baseCurrency !== undefined && data.baseCurrency !== currentUser.baseCurrency) {
    try {
      await invalidateRecommendations(userId);
    } catch (cacheError) {
      // Log but don't fail the update if cache invalidation fails
      logger.warn("Failed to invalidate recommendations cache", {
        userId: redactUserId(userId),
        errorMessage: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
    }
  }

  return updatedUser;
}

/**
 * Gets a user's profile by ID
 *
 * @param userId - User ID to fetch
 * @returns User record or null if not found
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return user ?? null;
}

// =============================================================================
// USER SETTINGS (Story 7.1)
// =============================================================================

/**
 * User settings data structure
 *
 * Story 7.1: Enter Monthly Contribution
 */
export interface UserSettings {
  defaultContribution: string | null;
  baseCurrency: string;
}

/**
 * Gets a user's settings
 *
 * Story 7.1: AC-7.1.3 - Pre-fill default contribution
 *
 * @param userId - User ID to fetch settings for
 * @returns User settings or null if user not found
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const [user] = await db
    .select({
      defaultContribution: users.defaultContribution,
      baseCurrency: users.baseCurrency,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return {
    defaultContribution: user.defaultContribution,
    baseCurrency: user.baseCurrency,
  };
}

/**
 * Updates a user's default contribution
 *
 * Story 7.1: AC-7.1.4 - Save default contribution preference
 *
 * @param userId - User ID to update
 * @param defaultContribution - New default contribution value (numeric string or null to clear)
 * @returns Updated user settings
 * @throws Error if user not found
 */
export async function updateDefaultContribution(
  userId: string,
  defaultContribution: string | null
): Promise<UserSettings> {
  // Verify user exists
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Update the default contribution
  const [updatedUser] = await db
    .update(users)
    .set({
      defaultContribution: defaultContribution,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      defaultContribution: users.defaultContribution,
      baseCurrency: users.baseCurrency,
    });

  if (!updatedUser) {
    throw new Error("Failed to update default contribution");
  }

  logger.info("Updated default contribution", {
    userId: redactUserId(userId),
    hasContribution: !!defaultContribution,
  });

  return {
    defaultContribution: updatedUser.defaultContribution,
    baseCurrency: updatedUser.baseCurrency,
  };
}
