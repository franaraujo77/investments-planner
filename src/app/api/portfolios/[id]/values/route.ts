/**
 * Portfolio Values API Route
 *
 * Story 3.6: Portfolio Overview with Values
 *
 * GET /api/portfolios/:id/values - Get portfolio with calculated values
 *
 * Returns portfolio data with:
 * - Assets with calculated native/base values
 * - Allocation percentages
 * - Total portfolio value in base currency
 * - Data freshness timestamps
 *
 * AC-3.6.1: Portfolio table displays values
 * AC-3.6.2: Native currency display
 * AC-3.6.3: Base currency conversion
 * AC-3.6.4: Total portfolio value
 * AC-3.6.7: Data freshness indicator
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getPortfolioWithValues,
  PortfolioNotFoundError,
  type PortfolioWithValues,
} from "@/lib/services/portfolio-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface PortfolioValuesResponse {
  data: PortfolioWithValues;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/portfolios/:id/values
 *
 * Gets portfolio with calculated values for all assets.
 * Requires authentication via withAuth middleware.
 *
 * This endpoint:
 * 1. Fetches all assets in the portfolio
 * 2. Gets current prices (MVP: uses purchase price as fallback)
 * 3. Gets exchange rates to user's base currency
 * 4. Calculates native and base currency values
 * 5. Calculates allocation percentages (excluding ignored assets)
 * 6. Returns total portfolio value and data freshness
 *
 * Response:
 * - data: PortfolioWithValues object containing:
 *   - portfolio: Portfolio metadata
 *   - assets: Array of AssetWithValue (includes calculated fields)
 *   - totalValueBase: Total portfolio value in base currency
 *   - totalActiveValueBase: Total of non-ignored assets
 *   - baseCurrency: User's base currency code
 *   - dataFreshness: Oldest update timestamp
 *   - assetCount, activeAssetCount, ignoredAssetCount
 */
export const GET = withAuth<PortfolioValuesResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id: portfolioId } = await (context as RouteParams).params;

      const portfolioWithValues = await getPortfolioWithValues(session.userId, portfolioId);

      return NextResponse.json<PortfolioValuesResponse>({
        data: portfolioWithValues,
      });
    } catch (error) {
      // Handle portfolio not found error
      if (error instanceof PortfolioNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: "Portfolio not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "get portfolio values");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "PORTFOLIO_VALUES");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch portfolio values",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
