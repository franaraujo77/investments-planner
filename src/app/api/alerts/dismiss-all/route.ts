/**
 * Dismiss All Alerts API Route
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.3: Alert dismissible by user
 *
 * DELETE /api/alerts/dismiss-all - Dismiss all alerts
 *
 * Returns:
 * - 200: Count of dismissed alerts
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { errorResponse, handleDbError, databaseError } from "@/lib/api/responses";
import { VALIDATION_ERRORS } from "@/lib/api/error-codes";
import { alertService, type AlertType } from "@/lib/services/alert-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Query params validation schema
 */
const querySchema = z.object({
  type: z.enum(["opportunity", "allocation_drift", "system"]).optional(),
});

/**
 * Response type
 */
interface DismissAllResponse {
  data: {
    dismissedCount: number;
  };
}

/**
 * DELETE /api/alerts/dismiss-all
 *
 * Dismisses all alerts for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * Query params:
 * - type: Optional filter by alert type
 *
 * Response:
 * - data: Object with dismissedCount
 */
export const DELETE = withAuth<DismissAllResponse | AuthError>(async (request, session) => {
  try {
    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = querySchema.safeParse({
      type: searchParams.get("type") ?? undefined,
    });

    if (!queryResult.success) {
      return errorResponse(
        "Invalid query parameters",
        VALIDATION_ERRORS.INVALID_INPUT,
        400,
        queryResult.error.issues
      );
    }

    const { type } = queryResult.data;

    // Dismiss all alerts
    const dismissedCount = await alertService.dismissAllAlerts(
      session.userId,
      type as AlertType | undefined
    );

    return NextResponse.json<DismissAllResponse>({
      data: {
        dismissedCount,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "dismiss all alerts", {
      userId: session.userId,
    });
    return databaseError(dbError, "alerts");
  }
});
