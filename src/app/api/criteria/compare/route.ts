/**
 * Criteria Compare API Route
 *
 * Story 5.6: Compare Criteria Sets
 *
 * POST /api/criteria/compare - Compare two criteria sets
 *
 * Returns:
 * - 200: Comparison result
 * - 400: Validation error (same set selected, invalid UUIDs)
 * - 401: Not authenticated
 * - 404: Criteria set not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  compareCriteriaSets,
  type ComparisonResult,
} from "@/lib/services/criteria-comparison-service";
import { CriteriaNotFoundError } from "@/lib/services/criteria-service";
import { compareCriteriaSchema } from "@/lib/validations/criteria-schemas";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface CompareResponse {
  data: ComparisonResult;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * POST /api/criteria/compare
 *
 * Compares two criteria sets and returns comprehensive comparison results.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.6.1: Select Two Criteria Sets for Comparison
 * AC-5.6.2: Side-by-Side Criteria Differences
 * AC-5.6.3: Average Scores Per Set
 * AC-5.6.4: Assets with Different Rankings Highlighted
 *
 * Request Body:
 * - setAId: string (required) - UUID of first criteria set
 * - setBId: string (required) - UUID of second criteria set
 *
 * Response:
 * - 200: ComparisonResult with setA, setB, differences, rankingChanges, sampleSize
 * - 400: Validation error (same set selected twice or invalid UUIDs)
 * - 404: Criteria set not found
 */
export const POST = withAuth<CompareResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = compareCriteriaSchema.safeParse(body);

      if (!validationResult.success) {
        const errors = validationResult.error.flatten();

        // Check for the "same set" refinement error (placed in formErrors or setBId fieldError)
        const sameSetError =
          errors.formErrors[0] ??
          (errors.fieldErrors.setBId?.find((e) => e.includes("Cannot compare")) as
            | string
            | undefined);

        if (sameSetError) {
          return NextResponse.json<ValidationError>(
            {
              error: sameSetError,
              code: "SAME_SET_ERROR",
            },
            { status: 400 }
          );
        }

        return NextResponse.json<ValidationError>(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: errors.fieldErrors,
          },
          { status: 400 }
        );
      }

      const { setAId, setBId } = validationResult.data;

      // Perform comparison
      const result = await compareCriteriaSets(session.userId, setAId, setBId);

      return NextResponse.json<CompareResponse>({ data: result }, { status: 200 });
    } catch (error) {
      // Handle criteria not found error
      if (error instanceof CriteriaNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "compare criteria", { userId: session.userId });

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "compare criteria");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to compare criteria sets",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
