/**
 * Asset Subclass [id] API Routes
 *
 * Story 4.2: Define Subclasses
 * Story 4.4: Set Allocation Ranges for Subclasses
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * GET /api/asset-subclasses/:id - Get a single subclass
 * PATCH /api/asset-subclasses/:id - Update a subclass (name, targetMin, targetMax, maxAssets, minAllocationValue)
 * DELETE /api/asset-subclasses/:id - Delete a subclass
 *
 * Returns:
 * - 200: Subclass data (GET, PATCH)
 * - 200: Success with warning (DELETE with assets)
 * - 200: Success (DELETE)
 * - 400: Validation error (includes min > max)
 * - 401: Not authenticated
 * - 404: Subclass not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getSubclassById,
  updateSubclass,
  deleteSubclass,
  getAssetCountBySubclass,
  SubclassNotFoundError,
} from "@/lib/services/asset-class-service";
import {
  updateSubclassSchema,
  deleteSubclassQuerySchema,
} from "@/lib/validations/asset-class-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { AssetSubclass } from "@/lib/db/schema";

/**
 * Response types
 */
interface SubclassResponse {
  data: AssetSubclass;
}

interface DeleteResponse {
  success: boolean;
}

interface DeleteWarningResponse {
  warning: boolean;
  assetCount: number;
  message: string;
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
 * GET /api/asset-subclasses/:id
 *
 * Gets a single subclass by ID.
 * Requires authentication via withAuth middleware.
 *
 * Response:
 * - 200: Subclass object
 * - 404: Subclass not found
 */
export const GET = withAuth<SubclassResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      const subclass = await getSubclassById(session.userId, id);

      if (!subclass) {
        return NextResponse.json<ValidationError>(
          {
            error: "Subclass not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json<SubclassResponse>({ data: subclass });
    } catch (error) {
      console.error("Error fetching subclass:", error);
      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch subclass",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/asset-subclasses/:id
 *
 * Updates a subclass by ID.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.2.3: Edit subclass name
 * AC-4.4.1: Set allocation ranges (targetMin, targetMax)
 * AC-4.4.4: Min cannot exceed max validation
 * AC-4.5.1: Set max assets limit
 * AC-4.6.1: Set minimum allocation value
 *
 * Request Body:
 * - name: string (optional, 1-50 characters)
 * - targetMin: string | null (optional, 0-100%, 2 decimal places)
 * - targetMax: string | null (optional, 0-100%, 2 decimal places)
 * - maxAssets: number | null (optional, integer 0-100, null or 0 = no limit)
 * - minAllocationValue: string | null (optional, decimal 0-1000000, null or "0" = no minimum)
 *
 * Response:
 * - 200: Updated subclass
 * - 400: Validation error (min > max returns error)
 * - 404: Subclass not found
 */
export const PATCH = withAuth<SubclassResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = updateSubclassSchema.safeParse(body);

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

      // Update subclass
      const subclass = await updateSubclass(session.userId, id, validationResult.data);

      return NextResponse.json<SubclassResponse>({ data: subclass });
    } catch (error) {
      if (error instanceof SubclassNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      console.error("Error updating subclass:", error);
      return NextResponse.json<AuthError>(
        {
          error: "Failed to update subclass",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/asset-subclasses/:id
 *
 * Deletes a subclass by ID.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.2.4: Delete subclass (no assets)
 * AC-4.2.5: Delete with warning (has assets) - requires force=true query param
 *
 * Query Params:
 * - force: boolean (optional) - Force delete even with associated assets
 *
 * Response:
 * - 200: Success with warning if has assets and force=false
 * - 200: Success (with force=true)
 * - 404: Subclass not found
 */
export const DELETE = withAuth<
  DeleteResponse | DeleteWarningResponse | ValidationError | AuthError
>(async (request, session, context) => {
  try {
    const { id } = await (context as RouteParams).params;

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const queryValidation = deleteSubclassQuerySchema.safeParse(queryParams);
    const forceDelete = queryValidation.success ? queryValidation.data.force : false;

    // Check if subclass exists and belongs to user
    const subclass = await getSubclassById(session.userId, id);

    if (!subclass) {
      return NextResponse.json<ValidationError>(
        {
          error: "Subclass not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check for associated assets
    const assetCount = await getAssetCountBySubclass(session.userId, id);

    // AC-4.2.5: Warn if has assets and force=false
    if (assetCount > 0 && !forceDelete) {
      return NextResponse.json<DeleteWarningResponse>({
        warning: true,
        assetCount,
        message: `This subclass has ${assetCount} associated asset(s). Add ?force=true to confirm deletion.`,
      });
    }

    // Delete the subclass
    await deleteSubclass(session.userId, id);

    return NextResponse.json<DeleteResponse>({ success: true });
  } catch (error) {
    if (error instanceof SubclassNotFoundError) {
      return NextResponse.json<ValidationError>(
        {
          error: error.message,
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.error("Error deleting subclass:", error);
    return NextResponse.json<AuthError>(
      {
        error: "Failed to delete subclass",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});
