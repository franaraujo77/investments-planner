/**
 * Alerts API Routes
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.2: Alert has formatted message
 * AC-9.1.3: Alert dismissible by user
 *
 * GET /api/alerts - List user's alerts with pagination
 *
 * Returns:
 * - 200: List of alerts
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { errorResponse, handleDbError, databaseError } from "@/lib/api/responses";
import { VALIDATION_ERRORS } from "@/lib/api/error-codes";
import { alertService } from "@/lib/services/alert-service";
import type { AuthError } from "@/lib/auth/types";
import type { Alert } from "@/lib/db/schema";

/**
 * Query params validation schema
 */
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(["opportunity", "allocation_drift", "system"]).optional(),
  isRead: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  isDismissed: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

/**
 * Response types
 */
interface AlertListResponse {
  data: Alert[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * GET /api/alerts
 *
 * Lists all alerts for the authenticated user with pagination.
 * Requires authentication via withAuth middleware.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - type: Filter by alert type (optional)
 * - isRead: Filter by read status (optional)
 * - isDismissed: Filter by dismissed status (optional)
 *
 * Response:
 * - data: Array of alert objects
 * - meta: Pagination metadata
 */
export const GET = withAuth<AlertListResponse | AuthError>(async (request, session) => {
  try {
    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      isRead: searchParams.get("isRead") ?? undefined,
      isDismissed: searchParams.get("isDismissed") ?? undefined,
    });

    if (!queryResult.success) {
      return errorResponse(
        "Invalid query parameters",
        VALIDATION_ERRORS.INVALID_INPUT,
        400,
        queryResult.error.issues
      );
    }

    const { page, limit, type, isRead, isDismissed } = queryResult.data;
    const offset = (page - 1) * limit;

    // Query alerts with pagination
    const result = await alertService.getAlerts(session.userId, {
      type: type,
      isRead,
      isDismissed,
      limit,
      offset,
    });

    const totalPages = Math.ceil(result.totalCount / limit);

    return NextResponse.json<AlertListResponse>({
      data: result.alerts,
      meta: {
        page,
        limit,
        totalCount: result.totalCount,
        totalPages,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "list alerts", { userId: session.userId });
    return databaseError(dbError, "alerts");
  }
});
