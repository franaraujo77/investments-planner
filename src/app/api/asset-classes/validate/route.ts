/**
 * Asset Class Validation API Routes
 *
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * GET /api/asset-classes/validate - Validate all allocation configurations
 *
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * Returns:
 * - 200: Validation result with warnings
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  validateAllocationRanges,
  type AllocationValidationResult,
} from "@/lib/services/asset-class-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * GET /api/asset-classes/validate
 *
 * Validates all allocation range configurations for the user.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.3.3: Returns warning (not error) when sum of minimums > 100%
 *
 * Response:
 * - 200: { valid: boolean, errors: [], warnings: [{ type, message, totalMinimums, affectedClasses }] }
 */
export const GET = withAuth<AllocationValidationResult | AuthError>(async (_request, session) => {
  try {
    const validationResult = await validateAllocationRanges(session.userId);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error("Error validating allocation ranges:", error);
    return NextResponse.json<AuthError>(
      {
        error: "Failed to validate allocation ranges",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});
