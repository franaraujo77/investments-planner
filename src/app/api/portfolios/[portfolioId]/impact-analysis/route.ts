/**
 * Portfolio Impact Analysis API Route
 *
 * Story 2.3: Edit Portfolio
 *
 * POST /api/portfolios/:portfolioId/impact-analysis - Analyze impact of proposed changes
 *
 * AC-2.3.3: Industry sector change impact
 * AC-2.3.4: Asset type removal impact
 */

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  successResponse,
  validationError,
  notFoundError,
  handleDbError,
  databaseError,
} from "@/lib/api/responses";
import { NOT_FOUND_ERRORS } from "@/lib/api/error-codes";
import {
  getImpactedAssets,
  PortfolioNotFoundError,
  type ImpactAnalysisResult,
} from "@/lib/services/portfolio-service";
import { impactAnalysisSchema } from "@/lib/validations/portfolio";
import { logger } from "@/lib/telemetry/logger";
import type { AuthError } from "@/lib/auth/types";
import type { SuccessResponseBody, ErrorResponseBody } from "@/lib/api/responses";

/**
 * Route params type
 */
interface RouteParams {
  params: Promise<{ portfolioId: string }>;
}

/**
 * POST /api/portfolios/:portfolioId/impact-analysis
 *
 * Analyzes the impact of proposed portfolio changes.
 * Returns a list of assets that would be removed if the changes are applied.
 *
 * Request body:
 * - industrySector?: string (optional, new industry sector)
 * - assetTypes?: string[] (optional, new asset types)
 *
 * Response:
 * - data: ImpactAnalysisResult with assetsToRemove, removedAssetCount, hasImpact
 *
 * Note: Currently, impact analysis for asset type changes is not implemented
 * because the portfolio_assets table does not have an asset_type column.
 * This endpoint returns empty impact for now.
 */
export const POST = withAuth<
  SuccessResponseBody<ImpactAnalysisResult> | ErrorResponseBody | AuthError
>(async (request: NextRequest, session, context) => {
  try {
    const { portfolioId } = await (context as RouteParams).params;

    // Parse and validate request body
    const body = await request.json();
    const result = impactAnalysisSchema.safeParse(body);

    if (!result.success) {
      return validationError(result.error.issues);
    }

    const { assetTypes } = result.data;

    // Get impacted assets
    const impactResult = await getImpactedAssets(session.userId, portfolioId, assetTypes);

    logger.info("Impact analysis completed", {
      userId: session.userId,
      portfolioId,
      hasImpact: impactResult.hasImpact,
      removedAssetCount: impactResult.removedAssetCount,
    });

    return successResponse(impactResult);
  } catch (error) {
    // Handle portfolio not found error
    if (error instanceof PortfolioNotFoundError) {
      logger.warn("Portfolio not found for impact analysis", {
        userId: session.userId,
      });
      return notFoundError("Portfolio", NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND);
    }

    const dbError = handleDbError(error, "impact analysis", { userId: session.userId });
    return databaseError(dbError, "impact analysis");
  }
});
