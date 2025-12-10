/**
 * Criteria [id]/reorder API Routes
 *
 * Story 5.1: Define Scoring Criteria
 *
 * PATCH /api/criteria/:id/reorder - Reorder criteria within a set
 *
 * Returns:
 * - 200: Updated criteria set with new sort order
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Criteria set not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import {
  reorderCriteria,
  CriteriaNotFoundError,
  CriterionNotFoundError,
} from "@/lib/services/criteria-service";
import { reorderCriteriaSchema } from "@/lib/validations/criteria-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { CriteriaVersion } from "@/lib/db/schema";

/**
 * Response types
 */
interface CriteriaResponse {
  data: CriteriaVersion;
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
 * PATCH /api/criteria/:id/reorder
 *
 * Reorders criteria within a set.
 * Creates a new version with updated sort orders.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.1.4: Drag handle for reordering
 * AC-5.1.6: Creates new version with updated sort orders
 *
 * Request Body:
 * - criterionIds: array of UUID strings in desired order
 *
 * Response:
 * - 200: Updated criteria set with new version
 * - 400: Validation error
 * - 404: Criteria set or criterion not found
 */
export const PATCH = withAuth<CriteriaResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = reorderCriteriaSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json<ValidationError>(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      // Reorder criteria
      const criteriaSet = await reorderCriteria(
        session.userId,
        id,
        validationResult.data.criterionIds
      );

      return NextResponse.json<CriteriaResponse>({ data: criteriaSet });
    } catch (error) {
      if (error instanceof CriteriaNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (error instanceof CriterionNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "CRITERION_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      logger.error("Failed to reorder criteria", {
        errorMessage: error instanceof Error ? error.message : String(error),
        userId: session.userId,
      });
      return NextResponse.json<AuthError>(
        {
          error: "Failed to reorder criteria",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
