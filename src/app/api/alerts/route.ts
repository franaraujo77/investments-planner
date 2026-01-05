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
import { alertService, type AlertGroup } from "@/lib/services/alert-service";
import type { AuthError } from "@/lib/auth/types";
import type { Alert } from "@/lib/db/schema";

/**
 * Query params validation schema
 *
 * Story 7.12: AC-7.12.4 - Added `grouped` query parameter for backward compatibility
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
  /**
   * Story 7.12: AC-7.12.2 - Server-side grouping flag
   * When true, returns grouped format; when false/absent, returns flat list (backward compatible)
   */
  grouped: z
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
 * Story 7.12: AC-7.12.3 - Grouped alerts response format
 * Returned when ?grouped=true query parameter is present
 */
interface GroupedAlertListResponse {
  data: {
    groups: AlertGroup[];
    ungrouped: Alert[];
  };
  meta: {
    totalCount: number;
    totalGroups: number;
  };
}

/**
 * GET /api/alerts
 *
 * Lists all alerts for the authenticated user with pagination.
 * Requires authentication via withAuth middleware.
 *
 * Story 7.12: AC-7.12.4 - Supports both grouped and ungrouped formats
 *
 * Query params:
 * - page: Page number (default: 1) - not used with grouped=true
 * - limit: Items per page (default: 50, max: 100) - not used with grouped=true
 * - type: Filter by alert type (optional)
 * - isRead: Filter by read status (optional)
 * - isDismissed: Filter by dismissed status (optional)
 * - grouped: Return grouped format (default: false for backward compatibility)
 *
 * Response (ungrouped - default):
 * - data: Array of alert objects
 * - meta: Pagination metadata
 *
 * Response (grouped=true):
 * - data.groups: Array of alert groups by asset class
 * - data.ungrouped: Alerts without asset class
 * - meta.totalCount: Total number of alerts
 * - meta.totalGroups: Number of asset class groups
 */
export const GET = withAuth<AlertListResponse | GroupedAlertListResponse | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate query params
      const { searchParams } = new URL(request.url);
      const queryResult = querySchema.safeParse({
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        type: searchParams.get("type") ?? undefined,
        isRead: searchParams.get("isRead") ?? undefined,
        isDismissed: searchParams.get("isDismissed") ?? undefined,
        grouped: searchParams.get("grouped") ?? undefined,
      });

      if (!queryResult.success) {
        return errorResponse(
          "Invalid query parameters",
          VALIDATION_ERRORS.INVALID_INPUT,
          400,
          queryResult.error.issues
        );
      }

      const { page, limit, type, isRead, isDismissed, grouped } = queryResult.data;

      // Story 7.12: AC-7.12.2, AC-7.12.4 - Return grouped format when requested
      if (grouped) {
        // Calculate offset for pagination (grouped results use same limit/offset)
        const offset = (page - 1) * limit;

        const result = await alertService.getAlertsGrouped(session.userId, {
          type,
          isRead,
          isDismissed,
          limit,
          offset,
        });

        // Story 7.14: AC-7.14.1 - Add X-Query-Time header
        return NextResponse.json<GroupedAlertListResponse>(
          {
            data: {
              groups: result.groups,
              ungrouped: result.ungrouped,
            },
            meta: {
              totalCount: result.totalCount,
              totalGroups: result.totalGroups,
            },
          },
          {
            headers: {
              "X-Query-Time": result.executionTimeMs.toString(),
            },
          }
        );
      }

      // AC-7.12.4: Default ungrouped format (backward compatible)
      const offset = (page - 1) * limit;

      const result = await alertService.getAlerts(session.userId, {
        type: type,
        isRead,
        isDismissed,
        limit,
        offset,
      });

      const totalPages = Math.ceil(result.totalCount / limit);

      // Story 7.14: AC-7.14.1 - Add X-Query-Time header
      return NextResponse.json<AlertListResponse>(
        {
          data: result.alerts,
          meta: {
            page,
            limit,
            totalCount: result.totalCount,
            totalPages,
          },
        },
        {
          headers: {
            "X-Query-Time": result.executionTimeMs.toString(),
          },
        }
      );
    } catch (error) {
      const dbError = handleDbError(error, "list alerts", { userId: session.userId });
      return databaseError(dbError, "alerts");
    }
  }
);
