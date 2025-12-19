/**
 * Alert Preferences API Routes
 *
 * Story 9.3: Alert Preferences
 * AC-9.3.1-9.3.5: User can configure alert notification preferences
 * AC-9.3.7: Preferences UI accessible from Settings page
 *
 * GET /api/user/alert-preferences - Get current alert preferences
 * PATCH /api/user/alert-preferences - Update alert preferences
 */

import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import {
  successResponse,
  validationError,
  handleDbError,
  databaseError,
} from "@/lib/api/responses";
import { alertPreferencesService } from "@/lib/services/alert-preferences-service";
import { logger } from "@/lib/telemetry/logger";
import type { AlertPreference } from "@/lib/db/schema";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface AlertPreferencesResponse {
  data: AlertPreference;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for PATCH /api/user/alert-preferences
 *
 * Story 9.3: Alert Preferences
 * - AC-9.3.1: opportunityAlertsEnabled toggle
 * - AC-9.3.2: driftAlertsEnabled toggle
 * - AC-9.3.3: driftThreshold (1-20%)
 * - AC-9.3.4: alertFrequency (realtime/daily/weekly)
 * - AC-9.3.5: emailNotifications toggle
 */
const updateAlertPreferencesSchema = z
  .object({
    opportunityAlertsEnabled: z.boolean().optional(),
    driftAlertsEnabled: z.boolean().optional(),
    driftThreshold: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 1 && num <= 20;
        },
        { message: "Drift threshold must be between 1% and 20%" }
      )
      .optional(),
    alertFrequency: z.enum(["realtime", "daily", "weekly"]).optional(),
    emailNotifications: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// =============================================================================
// GET /api/user/alert-preferences
// =============================================================================

/**
 * GET /api/user/alert-preferences
 *
 * Returns the current user's alert preferences.
 * Creates default preferences if none exist.
 * Requires authentication.
 *
 * Response:
 * - 200: { data: AlertPreference }
 * - 401: Not authenticated
 */
export const GET = withAuth<AlertPreferencesResponse>(async (_request, session) => {
  try {
    logger.debug("Fetching alert preferences", { userId: session.userId });

    // getPreferences creates defaults if none exist
    const preferences = await alertPreferencesService.getPreferences(session.userId);

    return successResponse(preferences);
  } catch (error) {
    const dbError = handleDbError(error, "fetch alert preferences", {
      userId: session.userId,
    });
    return databaseError(dbError, "alert preferences");
  }
});

// =============================================================================
// PATCH /api/user/alert-preferences
// =============================================================================

/**
 * PATCH /api/user/alert-preferences
 *
 * Updates the current user's alert preferences.
 * Requires authentication.
 *
 * Request body (all optional, at least one required):
 * - opportunityAlertsEnabled: boolean - Enable/disable opportunity alerts
 * - driftAlertsEnabled: boolean - Enable/disable drift alerts
 * - driftThreshold: string - Drift threshold percentage (1-20%)
 * - alertFrequency: "realtime" | "daily" | "weekly" - Alert frequency
 * - emailNotifications: boolean - Enable/disable email notifications
 *
 * Response:
 * - 200: { data: AlertPreference } with updated preferences
 * - 400: Validation error
 * - 401: Not authenticated
 */
export const PATCH = withAuth<AlertPreferencesResponse>(async (request, session) => {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = updateAlertPreferencesSchema.safeParse(body);

    if (!parseResult.success) {
      logger.debug("Alert preferences validation failed", {
        userId: session.userId,
        errorCount: parseResult.error.issues.length,
      });
      return validationError(parseResult.error.issues);
    }

    const updates = parseResult.data;

    // Build update object with only defined fields
    const serviceUpdates: Parameters<typeof alertPreferencesService.updatePreferences>[1] = {};

    if (updates.opportunityAlertsEnabled !== undefined) {
      serviceUpdates.opportunityAlertsEnabled = updates.opportunityAlertsEnabled;
    }
    if (updates.driftAlertsEnabled !== undefined) {
      serviceUpdates.driftAlertsEnabled = updates.driftAlertsEnabled;
    }
    if (updates.driftThreshold !== undefined) {
      serviceUpdates.driftThreshold = updates.driftThreshold;
    }
    if (updates.alertFrequency !== undefined) {
      serviceUpdates.alertFrequency = updates.alertFrequency;
    }
    if (updates.emailNotifications !== undefined) {
      serviceUpdates.emailNotifications = updates.emailNotifications;
    }

    logger.debug("Updating alert preferences", {
      userId: session.userId,
      fieldCount: Object.keys(serviceUpdates).length,
    });

    // Update preferences
    const updatedPreferences = await alertPreferencesService.updatePreferences(
      session.userId,
      serviceUpdates
    );

    return successResponse(updatedPreferences);
  } catch (error) {
    const dbError = handleDbError(error, "update alert preferences", {
      userId: session.userId,
    });
    return databaseError(dbError, "alert preferences");
  }
});
