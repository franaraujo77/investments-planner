/**
 * Strategy Allocation API Route
 *
 * Story 3.6: Strategy Allocation Overview Chart
 *
 * GET /api/strategy/allocation - Get current portfolio allocation by asset class
 *
 * Returns:
 * - 200: Strategy allocation summary
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getStrategyAllocation,
  hasPortfolioAssets,
  type StrategyAllocationSummary,
} from "@/lib/services/strategy-allocation-service";
import { handleDbError, databaseError } from "@/lib/api/responses";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response type for strategy allocation endpoint
 */
interface StrategyAllocationResponse {
  data: StrategyAllocationSummary;
  meta: {
    hasAssets: boolean;
  };
}

/**
 * GET /api/strategy/allocation
 *
 * Returns current portfolio allocation breakdown by asset class.
 * Requires authentication via withAuth middleware.
 *
 * AC-3.6.2: Calculates allocation percentages based on actual portfolio values
 * AC-3.6.4: Returns empty state info when portfolio has no assets
 *
 * Response:
 * - data: StrategyAllocationSummary with allocations and totals
 * - meta: hasAssets flag for empty state handling
 */
export const GET = withAuth<StrategyAllocationResponse | AuthError>(async (_request, session) => {
  try {
    // Check if user has any assets
    const hasAssets = await hasPortfolioAssets(session.userId);

    // Get allocation summary
    const allocation = await getStrategyAllocation(session.userId);

    return NextResponse.json<StrategyAllocationResponse>({
      data: allocation,
      meta: {
        hasAssets,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "get strategy allocation", { userId: session.userId });
    return databaseError(dbError, "strategy allocation");
  }
});
