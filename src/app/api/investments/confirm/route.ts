/**
 * Investment Confirmation API Route
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.3: Confirm Records Investments
 * AC-7.8.4: Success Toast Notification (return data for toast)
 * AC-7.8.5: Validation Prevents Invalid Submissions
 *
 * POST /api/investments/confirm
 * - Validates input schema
 * - Validates total <= available capital
 * - Calls investment service to record investments
 * - Returns result with before/after allocations
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  successResponse,
  validationError,
  errorResponse,
  handleDbError,
  databaseError,
} from "@/lib/api/responses";
import { NOT_FOUND_ERRORS, VALIDATION_ERRORS, CONFLICT_ERRORS } from "@/lib/api/error-codes";
import {
  confirmInvestmentSchema,
  validateTotalDoesNotExceedAvailable,
  validateNoNegativeAmounts,
} from "@/lib/validations/investment-schemas";
import { confirmInvestments } from "@/lib/services/investment-service";
import { db } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import type { AuthError } from "@/lib/auth/types";
import type { ConfirmInvestmentResult } from "@/lib/types/recommendations";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface ConfirmResponseBody {
  data: ConfirmInvestmentResult;
}

interface ErrorResponseBody {
  error: string;
  code: string;
}

// =============================================================================
// POST - Confirm Investments
// =============================================================================

export const POST = withAuth<ConfirmResponseBody | ErrorResponseBody | AuthError>(
  async (request, session) => {
    try {
      const userId = session.userId;

      // 1. Parse request body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON body", VALIDATION_ERRORS.INVALID_INPUT);
      }

      // 2. Validate schema
      const result = confirmInvestmentSchema.safeParse(body);
      if (!result.success) {
        return validationError(result.error.issues);
      }

      const { recommendationId, investments } = result.data;

      // 3. Validate recommendation exists and get available capital
      const recommendation = await db.query.recommendations.findFirst({
        where: and(eq(recommendations.id, recommendationId), eq(recommendations.userId, userId)),
      });

      if (!recommendation) {
        return errorResponse(
          "Recommendation not found",
          NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND
        );
      }

      // 4. Check if already confirmed
      if (recommendation.status === "confirmed") {
        return errorResponse(
          "Recommendation has already been confirmed",
          CONFLICT_ERRORS.RESOURCE_CONFLICT
        );
      }

      // 5. Check if expired
      if (recommendation.status === "expired") {
        return errorResponse("Recommendation has expired", VALIDATION_ERRORS.INVALID_INPUT);
      }

      // 6. AC-7.8.5: Validate no negative amounts
      const negativeError = validateNoNegativeAmounts(investments);
      if (negativeError) {
        return errorResponse(negativeError, VALIDATION_ERRORS.OUT_OF_RANGE);
      }

      // 7. AC-7.8.5: Validate total <= available capital
      const totalError = validateTotalDoesNotExceedAvailable(
        investments,
        recommendation.totalInvestable
      );
      if (totalError) {
        return errorResponse(totalError, VALIDATION_ERRORS.OUT_OF_RANGE);
      }

      // 8. Confirm investments
      const confirmResult = await confirmInvestments(userId, {
        recommendationId,
        investments,
      });

      logger.info("Investments confirmed via API", {
        userId,
        recommendationId,
        investmentCount: confirmResult.investmentIds.length,
        totalInvested: confirmResult.summary.totalInvested,
      });

      // 9. Return success response
      // AC-7.8.4: Return data that can be used for toast notification
      return successResponse(confirmResult, 200);
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return NextResponse.json(
            { error: error.message, code: NOT_FOUND_ERRORS.RECOMMENDATIONS_NOT_FOUND },
            { status: 404 }
          );
        }
        if (error.message.includes("already been confirmed")) {
          return NextResponse.json(
            { error: error.message, code: CONFLICT_ERRORS.RESOURCE_CONFLICT },
            { status: 409 }
          );
        }
        if (error.message.includes("expired")) {
          return NextResponse.json(
            { error: error.message, code: VALIDATION_ERRORS.INVALID_INPUT },
            { status: 400 }
          );
        }
      }

      // Handle database errors
      const dbError = handleDbError(error, "confirm investments", {});
      return databaseError(dbError, "confirm investments");
    }
  }
);
