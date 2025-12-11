/**
 * Criteria Copy API Route
 *
 * Story 5.5: Copy Criteria Set
 *
 * POST /api/criteria/:id/copy - Copy a criteria set
 *
 * Returns:
 * - 201: Created copied criteria set
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Source criteria set not found
 * - 409: Criteria set limit exceeded
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  copyCriteriaSet,
  CriteriaNotFoundError,
  CriteriaSetLimitError,
  type CopyCriteriaResult,
} from "@/lib/services/criteria-service";
import { copyCriteriaSchema } from "@/lib/validations/criteria-schemas";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface CopyResponse {
  data: CopyCriteriaResult;
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
 * POST /api/criteria/:id/copy
 *
 * Copies a criteria set to create a new variation.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.5.1: Copy action available
 * AC-5.5.2: Target market selection (optional)
 * AC-5.5.3: Copied criteria naming with (Copy) suffix
 * AC-5.5.4: New UUIDs assigned, sortOrder preserved
 *
 * Request Body:
 * - name: string (optional) - Custom name for copied set
 * - targetMarket: string (optional) - Target market (defaults to source market)
 *
 * Response:
 * - 201: Created with { criteriaVersion, copiedCount }
 * - 400: Validation error
 * - 404: Source criteria set not found
 * - 409: Criteria set limit exceeded
 */
export const POST = withAuth<CopyResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = copyCriteriaSchema.safeParse(body);

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

      // Copy criteria set
      const result = await copyCriteriaSet(session.userId, id, validationResult.data);

      return NextResponse.json<CopyResponse>({ data: result }, { status: 201 });
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

      // Handle criteria set limit error
      if (error instanceof CriteriaSetLimitError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "LIMIT_EXCEEDED",
          },
          { status: 409 }
        );
      }

      const dbError = handleDbError(error, "copy criteria", { userId: session.userId });
      return databaseError(dbError, "copy criteria");
    }
  }
);
