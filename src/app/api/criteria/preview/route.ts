/**
 * Criteria Preview API Route
 *
 * Story 5.7: Criteria Preview (Impact Simulation)
 *
 * POST /api/criteria/preview - Preview criteria impact on asset scoring
 *
 * Returns:
 * - 200: Preview result with top assets and optional comparison
 * - 400: Validation error (invalid criteria format)
 * - 401: Not authenticated
 * - 404: Saved version not found (when savedVersionId provided)
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { calculatePreview, type PreviewResult } from "@/lib/calculations/quick-calc";
import { getCriteriaById, CriteriaNotFoundError } from "@/lib/services/criteria-service";
import { previewCriteriaSchema } from "@/lib/validations/criteria-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { CriterionRule } from "@/lib/db/schema";

/**
 * Response types
 */
interface PreviewResponse {
  data: PreviewResult;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * POST /api/criteria/preview
 *
 * Calculates a preview of criteria impact on sample assets.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.7.1: Preview Impact Button Available During Editing
 * AC-5.7.2: Preview Shows Top 10 Scoring Assets
 * AC-5.7.3: Preview Updates Live as Criteria Modified
 * AC-5.7.4: Shows Comparison (Improved/Worse/Same Counts)
 *
 * Request Body:
 * - criteria: CriterionRule[] (required) - Array of criteria to preview
 * - savedVersionId: string (optional) - UUID of saved version for comparison
 *
 * Response:
 * - 200: PreviewResult with topAssets, comparison (optional), calculatedAt, sampleSize
 * - 400: Validation error (invalid criteria)
 * - 404: Saved version not found
 */
export const POST = withAuth<PreviewResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = previewCriteriaSchema.safeParse(body);

      if (!validationResult.success) {
        const errors = validationResult.error.flatten();
        return NextResponse.json<ValidationError>(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: errors.fieldErrors,
          },
          { status: 400 }
        );
      }

      const { criteria, savedVersionId } = validationResult.data;

      // Convert to CriterionRule type (add any missing optional fields)
      const typedCriteria: CriterionRule[] = criteria.map((c) => ({
        ...c,
        value2: c.value2 ?? null,
      }));

      // If savedVersionId is provided, load the saved version for comparison
      let previousCriteria: CriterionRule[] | undefined;
      if (savedVersionId) {
        const savedVersion = await getCriteriaById(session.userId, savedVersionId);
        if (!savedVersion) {
          throw new CriteriaNotFoundError();
        }
        previousCriteria = savedVersion.criteria;
      }

      // Calculate preview
      const result = calculatePreview(typedCriteria, previousCriteria);

      return NextResponse.json<PreviewResponse>({ data: result }, { status: 200 });
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

      const dbError = handleDbError(error, "preview criteria", { userId: session.userId });
      return databaseError(dbError, "preview criteria");
    }
  }
);
