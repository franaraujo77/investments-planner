/**
 * Asset Class Subclass Validation API Route
 *
 * Story 4.4: Set Allocation Ranges for Subclasses
 *
 * GET /api/asset-classes/:id/validate-subclasses - Validate subclass allocations against parent
 *
 * Returns:
 * - 200: Validation result with warnings
 * - 401: Not authenticated
 * - 404: Asset class not found
 * - 500: Server error
 *
 * AC-4.4.2: Warning when subclass max exceeds parent class max
 * AC-4.4.3: Warning when sum of subclass minimums exceeds parent max
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  validateSubclassAllocationRanges,
  AssetClassNotFoundError,
  type SubclassAllocationValidationResult,
} from "@/lib/services/asset-class-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface ValidationResponse {
  data: SubclassAllocationValidationResult;
}

interface ErrorResponse {
  error: string;
  code: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/asset-classes/:id/validate-subclasses
 *
 * Validates all subclass allocation ranges against parent class constraints.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.4.2: Returns warning when subclass max exceeds parent class max
 * AC-4.4.3: Returns warning when sum of subclass minimums exceeds parent max
 *
 * Response:
 * - 200: Validation result with warnings array
 * - 404: Asset class not found
 */
export const GET = withAuth<ValidationResponse | ErrorResponse | AuthError>(
  async (_request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      const validationResult = await validateSubclassAllocationRanges(session.userId, id);

      return NextResponse.json<ValidationResponse>({ data: validationResult });
    } catch (error) {
      if (error instanceof AssetClassNotFoundError) {
        return NextResponse.json<ErrorResponse>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "validate subclasses", { userId: session.userId });
      return databaseError(dbError, "subclass validation");
    }
  }
);
