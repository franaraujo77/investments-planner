/**
 * Unread Alert Count API Route
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.2: Alert has formatted message (count for notification badge)
 *
 * GET /api/alerts/unread/count - Get unread alert count
 *
 * Returns:
 * - 200: Unread count
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { alertService } from "@/lib/services/alert-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response type
 */
interface UnreadCountResponse {
  data: {
    count: number;
  };
}

/**
 * GET /api/alerts/unread/count
 *
 * Returns the count of unread, non-dismissed alerts.
 * Useful for notification badges.
 * Requires authentication via withAuth middleware.
 *
 * Response:
 * - data: Object with count
 */
export const GET = withAuth<UnreadCountResponse | AuthError>(async (_request, session) => {
  try {
    // Get unread count (efficient COUNT query)
    const count = await alertService.getUnreadCount(session.userId);

    return NextResponse.json<UnreadCountResponse>({
      data: {
        count,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "get unread alert count", {
      userId: session.userId,
    });
    return databaseError(dbError, "alerts");
  }
});
