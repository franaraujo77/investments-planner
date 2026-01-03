/**
 * Individual Alert API Routes
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.5: Snooze functionality
 * AC-9.1.3: Alert dismissible by user
 *
 * GET /api/alerts/[alertId] - Get a specific alert
 * PATCH /api/alerts/[alertId] - Update alert (read, dismiss, snooze)
 */

import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import {
  successResponse,
  validationError,
  handleDbError,
  databaseError,
  notFoundError,
} from "@/lib/api/responses";
import { alertService } from "@/lib/services/alert-service";
import { logger } from "@/lib/telemetry/logger";
import type { Alert } from "@/lib/db/schema";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for PATCH /api/alerts/[alertId]
 *
 * Story 7.6: AC-7.6.5 - Snooze functionality
 * Story 9.1: AC-9.1.3 - Dismissible alerts
 */
const updateAlertSchema = z.object({
  isRead: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
  // Story 7.6: AC-7.6.5 - Snooze until timestamp
  snoozedUntil: z.string().datetime().nullable().optional(),
});

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface AlertResponse {
  data: Alert;
}

// =============================================================================
// GET /api/alerts/[alertId]
// =============================================================================

/**
 * GET /api/alerts/[alertId]
 *
 * Returns a specific alert by ID.
 * Requires authentication and ownership verification.
 */
export const GET = withAuth<AlertResponse>(async (request, session, { params }) => {
  try {
    const resolvedParams = await params;
    const alertId = resolvedParams?.alertId as string;

    if (!alertId) {
      return notFoundError("Alert");
    }

    const alert = await alertService.getAlertById(session.userId, alertId);

    if (!alert) {
      return notFoundError("Alert");
    }

    return successResponse(alert);
  } catch (error) {
    const dbError = handleDbError(error, "fetch alert", {
      userId: session.userId,
    });
    return databaseError(dbError, "alert");
  }
});

// =============================================================================
// PATCH /api/alerts/[alertId]
// =============================================================================

/**
 * PATCH /api/alerts/[alertId]
 *
 * Updates alert status (read, dismissed, snoozed).
 * Requires authentication and ownership verification.
 *
 * Request body (all optional):
 * - isRead: boolean - Mark as read/unread
 * - isDismissed: boolean - Dismiss alert
 * - snoozedUntil: string | null - Snooze until timestamp (ISO 8601)
 *
 * Response:
 * - 200: { data: Alert } with updated alert
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Alert not found
 */
export const PATCH = withAuth<AlertResponse>(async (request, session, { params }) => {
  try {
    const resolvedParams = await params;
    const alertId = resolvedParams?.alertId as string;

    if (!alertId) {
      return notFoundError("Alert");
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateAlertSchema.safeParse(body);

    if (!parseResult.success) {
      logger.debug("Alert update validation failed", {
        userId: session.userId,
        alertId,
        errorCount: parseResult.error.issues.length,
      });
      return validationError(parseResult.error.issues);
    }

    const updates = parseResult.data;

    // Check if alert exists and belongs to user
    const existingAlert = await alertService.getAlertById(session.userId, alertId);

    if (!existingAlert) {
      return notFoundError("Alert");
    }

    logger.debug("Updating alert", {
      userId: session.userId,
      alertId,
      hasIsRead: updates.isRead !== undefined,
      hasIsDismissed: updates.isDismissed !== undefined,
      hasSnoozedUntil: updates.snoozedUntil !== undefined,
    });

    // Build update object with only defined fields
    const updatePayload: {
      isRead?: boolean;
      isDismissed?: boolean;
      snoozedUntil?: string | null;
    } = {};

    if (updates.isRead !== undefined) {
      updatePayload.isRead = updates.isRead;
    }
    if (updates.isDismissed !== undefined) {
      updatePayload.isDismissed = updates.isDismissed;
    }
    if (updates.snoozedUntil !== undefined) {
      updatePayload.snoozedUntil = updates.snoozedUntil;
    }

    // Update the alert
    const updatedAlert = await alertService.updateAlert(alertId, session.userId, updatePayload);

    if (!updatedAlert) {
      return notFoundError("Alert");
    }

    return successResponse(updatedAlert);
  } catch (error) {
    const dbError = handleDbError(error, "update alert", {
      userId: session.userId,
    });
    return databaseError(dbError, "alert");
  }
});
