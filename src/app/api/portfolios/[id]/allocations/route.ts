/**
 * Portfolio Allocations API
 *
 * Story 3.7: Allocation Percentage View
 * AC-3.7.1 - AC-3.7.7: Allocation breakdown endpoint
 *
 * GET /api/portfolios/[id]/allocations
 * Returns allocation breakdown by asset class and subclass.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getAllocationBreakdown, formatAllocationPercent } from "@/lib/services/allocation-service";
import { PortfolioNotFoundError } from "@/lib/services/portfolio-service";
import type { AuthError } from "@/lib/auth/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AllocationResponse {
  classes: Array<{
    classId: string;
    className: string;
    value: string;
    percentage: string;
    assetCount: number;
    targetMin: string | null;
    targetMax: string | null;
    status: string;
    subclasses: Array<{
      subclassId: string;
      subclassName: string;
      value: string;
      percentageOfClass: string;
      percentageOfPortfolio: string;
      assetCount: number;
    }>;
  }>;
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  };
  totalValueBase: string;
  totalActiveValueBase: string;
  baseCurrency: string;
  dataFreshness: string;
}

interface ValidationError {
  error: string;
  code?: string;
}

/**
 * GET /api/portfolios/[id]/allocations
 *
 * Returns the allocation breakdown for a portfolio, including:
 * - Class allocations with percentages and status
 * - Subclass breakdowns within each class
 * - Unclassified assets
 * - Total values and data freshness
 */
export const GET = withAuth<AllocationResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      // Get portfolio ID from params
      const { id: portfolioId } = await (context as RouteParams).params;

      if (!portfolioId) {
        return NextResponse.json<ValidationError>(
          { error: "Portfolio ID is required", code: "MISSING_ID" },
          { status: 400 }
        );
      }

      // Get allocation breakdown
      const breakdown = await getAllocationBreakdown(session.userId, portfolioId);

      // Format percentages to 1 decimal for response
      const formattedResponse: AllocationResponse = {
        classes: breakdown.classes.map((classAlloc) => ({
          ...classAlloc,
          percentage: formatAllocationPercent(classAlloc.percentage),
          subclasses: classAlloc.subclasses.map((sub) => ({
            ...sub,
            percentageOfClass: formatAllocationPercent(sub.percentageOfClass),
            percentageOfPortfolio: formatAllocationPercent(sub.percentageOfPortfolio),
          })),
        })),
        unclassified: {
          ...breakdown.unclassified,
          percentage: formatAllocationPercent(breakdown.unclassified.percentage),
        },
        totalValueBase: breakdown.totalValueBase,
        totalActiveValueBase: breakdown.totalActiveValueBase,
        baseCurrency: breakdown.baseCurrency,
        dataFreshness: breakdown.dataFreshness.toISOString(),
      };

      return NextResponse.json<AllocationResponse>(formattedResponse);
    } catch (error) {
      // Handle specific errors
      if (error instanceof PortfolioNotFoundError) {
        return NextResponse.json<ValidationError>(
          { error: "Portfolio not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }

      // Log unexpected errors and handle database errors
      const dbError = handleDbError(error, "get allocations");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "ALLOCATIONS");
      }

      return NextResponse.json<AuthError>(
        { error: "Failed to fetch allocation breakdown", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  }
);
