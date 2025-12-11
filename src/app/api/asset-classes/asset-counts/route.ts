/**
 * Asset Count Status API Route
 *
 * Story 4.5: Set Asset Count Limits
 *
 * GET /api/asset-classes/asset-counts - Get asset count status for all classes and subclasses
 *
 * Returns:
 * - 200: Array of asset count status for all user's classes
 * - 401: Not authenticated
 * - 500: Server error
 *
 * Response format:
 * {
 *   data: [
 *     {
 *       classId: string,
 *       className: string,
 *       currentCount: number,
 *       maxAssets: number | null,
 *       isOverLimit: boolean,
 *       subclasses: [
 *         {
 *           subclassId: string,
 *           subclassName: string,
 *           currentCount: number,
 *           maxAssets: number | null,
 *           isOverLimit: boolean
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getAssetCountStatus, type AssetCountStatus } from "@/lib/services/asset-class-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface AssetCountStatusResponse {
  data: AssetCountStatus[];
}

interface ErrorResponse {
  error: string;
  code: string;
}

/**
 * GET /api/asset-classes/asset-counts
 *
 * Gets asset count status for all user's asset classes and subclasses.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.5.2: Display warning when asset count exceeds limit
 * AC-4.5.4: Asset count display for classes
 * AC-4.5.5: Asset count display for subclasses
 *
 * Response:
 * - 200: Array of asset count status
 */
export const GET = withAuth<AssetCountStatusResponse | ErrorResponse | AuthError>(
  async (_request, session) => {
    try {
      const assetCountStatus = await getAssetCountStatus(session.userId);

      return NextResponse.json<AssetCountStatusResponse>({ data: assetCountStatus });
    } catch (error) {
      const dbError = handleDbError(error, "get asset counts");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "asset count status");
      }

      return NextResponse.json<ErrorResponse>(
        {
          error: "Failed to fetch asset count status",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
