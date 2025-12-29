/**
 * Portfolio API Route
 *
 * Story 2.3: Edit Portfolio
 * Story 2.4: Delete Portfolio
 *
 * GET /api/portfolios/:portfolioId - Get portfolio details
 * PUT /api/portfolios/:portfolioId - Update portfolio
 * DELETE /api/portfolios/:portfolioId - Delete portfolio
 *
 * AC-2.3.1: Edit form access with pre-filled data
 * AC-2.3.2: Update portfolio name with success response
 * AC-2.3.5: Remove incompatible assets when confirmed
 * AC-2.3.7: Currency change handling
 * AC-2.4.4: Successful deletion with cascade
 * AC-2.4.5: Cache invalidation
 * AC-2.4.7: Multi-tenant isolation
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
  getPortfolioWithAssetTypes,
  updatePortfolio,
  deletePortfolio,
  PortfolioNotFoundError,
  type PortfolioWithAssetTypes,
  type UpdatePortfolioResult,
} from "@/lib/services/portfolio-service";
import { updatePortfolioSchema, type UpdatePortfolioInput } from "@/lib/validations/portfolio";
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
 * PUT request body type
 */
interface UpdatePortfolioBody extends UpdatePortfolioInput {
  assetIdsToRemove?: string[];
}

/**
 * GET /api/portfolios/:portfolioId
 *
 * Gets portfolio with asset types for edit form pre-fill.
 * Requires authentication via withAuth middleware.
 *
 * AC-2.3.1: Pre-fill edit form with current data
 */
export const GET = withAuth<
  SuccessResponseBody<PortfolioWithAssetTypes> | ErrorResponseBody | AuthError
>(async (_request, session, context) => {
  try {
    const { portfolioId } = await (context as RouteParams).params;

    const portfolio = await getPortfolioWithAssetTypes(session.userId, portfolioId);

    if (!portfolio) {
      logger.warn("Portfolio not found for GET", {
        userId: session.userId,
        portfolioId,
      });
      return notFoundError("Portfolio", NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND);
    }

    return successResponse(portfolio);
  } catch (error) {
    const dbError = handleDbError(error, "get portfolio", { userId: session.userId });
    return databaseError(dbError, "portfolio");
  }
});

/**
 * PUT /api/portfolios/:portfolioId
 *
 * Updates a portfolio with the provided data.
 * Requires authentication via withAuth middleware.
 *
 * AC-2.3.2: Update portfolio name with success toast
 * AC-2.3.5: Remove incompatible assets if assetIdsToRemove provided
 * AC-2.3.7: Currency change handling
 *
 * Request body:
 * - name?: string (1-50 chars)
 * - baseCurrency?: string (supported currency code)
 * - industrySector?: string (valid industry sector)
 * - assetTypes?: string[] (valid asset types, min 1)
 * - assetIdsToRemove?: string[] (optional, for confirmed destructive changes)
 */
export const PUT = withAuth<
  SuccessResponseBody<UpdatePortfolioResult> | ErrorResponseBody | AuthError
>(async (request: NextRequest, session, context) => {
  try {
    const { portfolioId } = await (context as RouteParams).params;

    // Parse and validate request body
    const body = await request.json();
    const { assetIdsToRemove, ...updateData } = body as UpdatePortfolioBody;

    // Check if there's any update data
    if (
      Object.keys(updateData).length === 0 &&
      (!assetIdsToRemove || assetIdsToRemove.length === 0)
    ) {
      return validationError([
        {
          code: "custom",
          path: [],
          message: "At least one field must be provided for update",
        },
      ]);
    }

    // Validate update data if provided
    let validatedData: UpdatePortfolioInput | undefined;
    if (Object.keys(updateData).length > 0) {
      const result = updatePortfolioSchema.safeParse(updateData);

      if (!result.success) {
        return validationError(result.error.issues);
      }

      validatedData = result.data;
    }

    // Update portfolio
    const updateResult = await updatePortfolio(
      session.userId,
      portfolioId,
      validatedData || {},
      assetIdsToRemove
    );

    logger.info("Portfolio updated successfully", {
      userId: session.userId,
      portfolioId,
      removedAssetCount: updateResult.removedAssetCount,
    });

    return successResponse(updateResult);
  } catch (error) {
    // Handle portfolio not found error
    if (error instanceof PortfolioNotFoundError) {
      logger.warn("Portfolio not found for update", {
        userId: session.userId,
      });
      return notFoundError("Portfolio", NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND);
    }

    const dbError = handleDbError(error, "update portfolio", { userId: session.userId });
    return databaseError(dbError, "portfolio update");
  }
});

/**
 * DELETE response type
 */
interface DeletePortfolioResponse {
  success: boolean;
  message: string;
}

/**
 * DELETE /api/portfolios/:portfolioId
 *
 * Deletes a portfolio and all its holdings (via cascade).
 * Requires authentication via withAuth middleware.
 *
 * Story 2.4: Delete Portfolio
 * AC-2.4.4: Successful deletion with cascade
 * AC-2.4.5: Cache invalidation (future: when caching is implemented)
 * AC-2.4.7: Multi-tenant isolation - only owner can delete
 */
export const DELETE = withAuth<
  SuccessResponseBody<DeletePortfolioResponse> | ErrorResponseBody | AuthError
>(async (_request, session, context) => {
  try {
    const { portfolioId } = await (context as RouteParams).params;

    // AC-2.4.7: deletePortfolio includes ownership verification
    const deleted = await deletePortfolio(session.userId, portfolioId);

    if (!deleted) {
      logger.warn("Portfolio not found for deletion", {
        userId: session.userId,
        portfolioId,
      });
      return notFoundError("Portfolio", NOT_FOUND_ERRORS.PORTFOLIO_NOT_FOUND);
    }

    // AC-2.4.5: Cache invalidation
    // TODO(epic-5): Invalidate cached recommendations when caching is implemented
    // For now, no caching exists so no invalidation needed

    logger.info("Portfolio deleted via API", {
      userId: session.userId,
      portfolioId,
    });

    return successResponse({
      success: true,
      message: "Portfolio deleted successfully",
    });
  } catch (error) {
    const dbError = handleDbError(error, "delete portfolio", { userId: session.userId });
    return databaseError(dbError, "portfolio deletion");
  }
});
