/**
 * Onboarding Validation Schemas
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.3: Tip Dismissal Persistence
 * AC-3.5.4: Reset Onboarding Tips Option
 *
 * Provides Zod schemas for onboarding preferences and tip management.
 */

import { z } from "zod";

/**
 * Valid onboarding tip IDs
 * Must match the tip IDs defined in onboarding-tips.ts constants
 *
 * Story 3.5: Onboarding Tips
 * - pie-chart-interaction: Portfolio summary and allocation display
 * - allocation-indicator: Allocation status indicator
 * - allocation-validation: Holdings editing guidance
 */
export const VALID_TIP_IDS = [
  "pie-chart-interaction",
  "allocation-indicator",
  "allocation-validation",
] as const;

export type OnboardingTipId = (typeof VALID_TIP_IDS)[number];

/**
 * Schema for a single dismissed tip record
 *
 * Note: We store just the tip ID string in the database array,
 * but this schema is for the full record if needed for future use.
 */
export const onboardingTipSchema = z.object({
  tipId: z.string().min(1, "Tip ID is required"),
  dismissedAt: z.string().datetime("Invalid datetime format"),
});

export type OnboardingTip = z.infer<typeof onboardingTipSchema>;

/**
 * Schema for onboarding preferences
 */
export const onboardingPreferencesSchema = z.object({
  tipsDismissed: z.array(z.string()).default([]),
  completedAt: z.string().datetime().nullable(),
});

export type OnboardingPreferences = z.infer<typeof onboardingPreferencesSchema>;

/**
 * Schema for dismissing a tip via API
 */
export const dismissTipRequestSchema = z.object({
  tipId: z.string().min(1, "Tip ID is required"),
});

export type DismissTipRequest = z.infer<typeof dismissTipRequestSchema>;

/**
 * Schema for the list of dismissed tip IDs stored in the database
 */
export const dismissedTipsArraySchema = z.array(z.string()).default([]);

export type DismissedTipsArray = z.infer<typeof dismissedTipsArraySchema>;

/**
 * Validates that a tip ID is one of the known valid tip IDs
 *
 * @param tipId - The tip ID to validate
 * @returns true if the tip ID is valid
 */
export function isValidTipId(tipId: string): tipId is OnboardingTipId {
  return VALID_TIP_IDS.includes(tipId as OnboardingTipId);
}

/**
 * Schema for validating a tip ID strictly against known tips
 */
export const strictTipIdSchema = z.enum(VALID_TIP_IDS);
