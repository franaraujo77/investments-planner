/**
 * Mark Alert as Read API Route
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.3: Alert dismissible by user (read is a soft action)
 *
 * PATCH /api/alerts/[id]/read - Mark alert as read
 *
 * Returns:
 * - 200: Updated alert
 * - 400: Invalid alert ID
 * - 401: Not authenticated
 * - 404: Alert not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { errorResponse, handleDbError, databaseError } from "@/lib/api/responses";
import { VALIDATION_ERRORS, NOT_FOUND_ERRORS } from "@/lib/api/error-codes";
import { alertService } from "@/lib/services/alert-service";
import type { AuthError } from "@/lib/auth/types";
import type { Alert } from "@/lib/db/schema";

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid();

/**
 * Response type
 */
interface AlertResponse {
  data: Alert;
}

/**
 * PATCH /api/alerts/[id]/read
 *
 * Marks a specific alert as read.
 * Requires authentication via withAuth middleware.
 *
 * Path params:
 * - id: Alert UUID
 *
 * Response:
 * - data: Updated alert object
 */
export const PATCH = withAuth<AlertResponse | AuthError>(async (request, session, { params }) => {
  try {
    // Validate alert ID
    const resolvedParams = await params;
    const alertIdResult = uuidSchema.safeParse(resolvedParams?.id);

    if (!alertIdResult.success) {
      return errorResponse("Invalid alert ID format", VALIDATION_ERRORS.INVALID_UUID, 400);
    }

    const alertId = alertIdResult.data;

    // Mark alert as read
    const updated = await alertService.markAsRead(session.userId, alertId);

    if (!updated) {
      return errorResponse("Alert not found", NOT_FOUND_ERRORS.ALERT_NOT_FOUND, 404);
    }

    return NextResponse.json<AlertResponse>({
      data: updated,
    });
  } catch (error) {
    const dbError = handleDbError(error, "mark alert as read", {
      userId: session.userId,
    });
    return databaseError(dbError, "alert");
  }
});
