/**
 * User Settings API Routes
 *
 * Story 7.1: Enter Monthly Contribution
 * AC-7.1.3: Pre-fill default contribution
 * AC-7.1.4: Save default contribution preference
 *
 * GET /api/user/settings - Get current user settings
 * PATCH /api/user/settings - Update user settings (default contribution)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getUserSettings,
  updateDefaultContribution,
  type UserSettings,
} from "@/lib/services/user-service";
import { optionalContributionSchema } from "@/lib/validations/recommendation-schemas";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface SettingsResponse {
  data: {
    settings: UserSettings;
  };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for PATCH /api/user/settings
 */
const updateSettingsSchema = z.object({
  defaultContribution: optionalContributionSchema.nullable(),
});

// =============================================================================
// GET /api/user/settings
// =============================================================================

/**
 * GET /api/user/settings
 *
 * Returns the current user's settings including default contribution.
 * Requires authentication.
 *
 * Response:
 * - 200: { data: { settings: { defaultContribution, baseCurrency } } }
 * - 401: Not authenticated
 * - 404: User not found
 */
export const GET = withAuth<SettingsResponse>(async (_request, session) => {
  try {
    const settings = await getUserSettings(session.userId);

    if (!settings) {
      return NextResponse.json<AuthError>(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<SettingsResponse>({ data: { settings } }, { status: 200 });
  } catch (error) {
    const dbError = handleDbError(error, "fetch user settings", { userId: session.userId });
    return databaseError(dbError, "user settings");
  }
});

// =============================================================================
// PATCH /api/user/settings
// =============================================================================

/**
 * PATCH /api/user/settings
 *
 * Updates the current user's settings.
 * Requires authentication.
 *
 * Request body:
 * - defaultContribution?: string (numeric, > 0, max 2 decimal places) or null to clear
 *
 * Response:
 * - 200: { data: { settings } } with updated data
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: User not found
 */
export const PATCH = withAuth<SettingsResponse>(async (request, session) => {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = updateSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json<AuthError>(
        {
          error: firstIssue?.message || "Invalid request data",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { defaultContribution } = parseResult.data;

    // Check if there's anything to update
    if (defaultContribution === undefined) {
      return NextResponse.json<AuthError>(
        {
          error: "No fields to update",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Update user settings
    const updatedSettings = await updateDefaultContribution(session.userId, defaultContribution);

    return NextResponse.json<SettingsResponse>(
      { data: { settings: updatedSettings } },
      { status: 200 }
    );
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json<AuthError>(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const dbError = handleDbError(error, "update user settings", { userId: session.userId });
    return databaseError(dbError, "user settings");
  }
});
