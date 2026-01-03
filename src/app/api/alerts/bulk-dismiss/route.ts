/**
 * Bulk Dismiss Alerts API Route
 *
 * Story 7.8: Opportunity Alerts Enhancements
 * AC-7.8.1: Dismiss All in Group Action
 *
 * POST /api/alerts/bulk-dismiss - Dismiss multiple alerts at once
 *
 * Request body:
 * - alertIds: string[] - Array of alert IDs to dismiss
 *
 * Returns:
 * - 200: { data: { success: true, dismissedCount, errors? } }
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { validationError, handleDbError, databaseError } from "@/lib/api/responses";
import { alertService } from "@/lib/services/alert-service";
import { logger } from "@/lib/telemetry/logger";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for POST /api/alerts/bulk-dismiss
 *
 * Story 7.8: AC-7.8.1 - Bulk dismiss accepts array of alert IDs
 */
const bulkDismissSchema = z.object({
  alertIds: z
    .array(z.string().uuid())
    .min(1, "At least one alert ID is required")
    .max(100, "Maximum 100 alerts can be dismissed at once"),
});

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface BulkDismissData {
  success: boolean;
  dismissedCount: number;
  errors?: Array<{ alertId: string; error: string }>;
}

interface BulkDismissResponse {
  data: BulkDismissData;
}

// =============================================================================
// POST /api/alerts/bulk-dismiss
// =============================================================================

/**
 * POST /api/alerts/bulk-dismiss
 *
 * Dismisses multiple alerts at once.
 * Records dismissed pairs for opportunity alerts to prevent re-alerting.
 *
 * Request body:
 * - alertIds: string[] - Array of alert IDs to dismiss (max 100)
 *
 * Response:
 * - 200: { data: { success: true, dismissedCount, errors? } }
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */
export const POST = withAuth<BulkDismissResponse | AuthError>(async (request, session) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = bulkDismissSchema.safeParse(body);

    if (!parseResult.success) {
      logger.debug("Bulk dismiss validation failed", {
        userId: session.userId,
        errorCount: parseResult.error.issues.length,
      });
      return validationError(parseResult.error.issues);
    }

    const { alertIds } = parseResult.data;

    logger.info("Bulk dismiss request received", {
      userId: session.userId,
      alertCount: alertIds.length,
    });

    // Dismiss all specified alerts
    const result = await alertService.dismissMultipleAlerts(session.userId, alertIds);

    const response: BulkDismissResponse = {
      data: {
        success: true,
        dismissedCount: result.dismissedCount,
      },
    };

    // Only include errors if there are any
    if (result.errors.length > 0) {
      response.data.errors = result.errors;
    }

    return NextResponse.json(response);
  } catch (error) {
    const dbError = handleDbError(error, "bulk dismiss alerts", {
      userId: session.userId,
    });
    return databaseError(dbError, "alerts");
  }
});
