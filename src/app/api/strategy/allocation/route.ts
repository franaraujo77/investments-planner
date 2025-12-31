/**
 * Strategy Allocation API Route
 *
 * Story 3.6: Strategy Allocation Overview Chart
 *
 * GET /api/strategy/allocation - Get portfolio allocation by asset class
 *
 * Query Parameters:
 * - view: "target" (default) | "current"
 *   - target: Shows configured target allocations from asset classes
 *   - current: Shows actual portfolio holdings allocation
 *
 * Returns:
 * - 200: Strategy allocation summary
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getStrategyAllocation,
  getTargetAllocation,
  hasPortfolioAssets,
  hasAssetClasses,
  type StrategyAllocationSummary,
} from "@/lib/services/strategy-allocation-service";
import { handleDbError, databaseError } from "@/lib/api/responses";
import type { AuthError } from "@/lib/auth/types";

/**
 * Valid view types for the allocation endpoint
 */
export type AllocationView = "target" | "current";

/**
 * Response type for strategy allocation endpoint
 */
interface StrategyAllocationResponse {
  data: StrategyAllocationSummary;
  meta: {
    view: AllocationView;
    hasAssets: boolean;
    hasAssetClasses: boolean;
  };
}

/**
 * GET /api/strategy/allocation
 *
 * Returns portfolio allocation breakdown by asset class.
 * Requires authentication via withAuth middleware.
 *
 * Query Parameters:
 * - view: "target" (default) | "current"
 *
 * AC-3.6.2: Calculates allocation percentages based on actual portfolio values (current view)
 * AC-3.6.4: Returns empty state info when portfolio has no assets
 *
 * Response:
 * - data: StrategyAllocationSummary with allocations and totals
 * - meta: view type, hasAssets and hasAssetClasses flags for empty state handling
 */
export const GET = withAuth<StrategyAllocationResponse | AuthError>(
  async (request: NextRequest, session) => {
    try {
      // Parse view parameter (default to "target")
      const { searchParams } = new URL(request.url);
      const viewParam = searchParams.get("view");
      const view: AllocationView = viewParam === "current" ? "current" : "target";

      // Check if user has assets and asset classes
      const [hasAssets, hasClasses] = await Promise.all([
        hasPortfolioAssets(session.userId),
        hasAssetClasses(session.userId),
      ]);

      // Get allocation based on view type
      const allocation =
        view === "current"
          ? await getStrategyAllocation(session.userId)
          : await getTargetAllocation(session.userId);

      return NextResponse.json<StrategyAllocationResponse>({
        data: allocation,
        meta: {
          view,
          hasAssets,
          hasAssetClasses: hasClasses,
        },
      });
    } catch (error) {
      const dbError = handleDbError(error, "get strategy allocation", { userId: session.userId });
      return databaseError(dbError, "strategy allocation");
    }
  }
);
