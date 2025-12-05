/**
 * Asset Class Summary API Routes
 *
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * GET /api/asset-classes/summary - Get allocation summary with totals
 *
 * Returns:
 * - 200: Allocation summary
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAllocationSummary, type AllocationSummary } from "@/lib/services/asset-class-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * GET /api/asset-classes/summary
 *
 * Gets allocation summary for the user's asset classes.
 * Requires authentication via withAuth middleware.
 *
 * Response:
 * - 200: { totalMinimums, totalMaximums, unallocatedMinimum, classCount, classesWithRanges }
 */
export const GET = withAuth<AllocationSummary | AuthError>(async (_request, session) => {
  try {
    const summary = await getAllocationSummary(session.userId);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error getting allocation summary:", error);
    return NextResponse.json<AuthError>(
      {
        error: "Failed to get allocation summary",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});
