/**
 * Asset Class [id] API Routes
 *
 * Story 4.1: Define Asset Classes
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.5: Set Asset Count Limits
 * Story 4.6: Set Minimum Allocation Values
 *
 * GET /api/asset-classes/:id - Get a single asset class
 * PATCH /api/asset-classes/:id - Update an asset class (name, icon, allocation ranges, maxAssets, minAllocationValue)
 * DELETE /api/asset-classes/:id - Delete an asset class
 *
 * Returns:
 * - 200: Asset class data (GET, PATCH)
 * - 200: Success with warning (DELETE with assets)
 * - 204: No content (DELETE success)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Asset class not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getAssetClassById,
  updateClass,
  deleteClass,
  getAssetCountByClass,
  AssetClassNotFoundError,
} from "@/lib/services/asset-class-service";
import {
  updateAssetClassSchema,
  deleteAssetClassQuerySchema,
} from "@/lib/validations/asset-class-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { AssetClass } from "@/lib/db/schema";

/**
 * Response types
 */
interface AssetClassResponse {
  data: AssetClass;
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
 * GET /api/asset-classes/:id
 *
 * Gets a single asset class by ID.
 * Requires authentication via withAuth middleware.
 *
 * Response:
 * - 200: Asset class object
 * - 404: Asset class not found
 */
export const GET = withAuth<AssetClassResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      const assetClass = await getAssetClassById(session.userId, id);

      if (!assetClass) {
        return NextResponse.json<ValidationError>(
          {
            error: "Asset class not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json<AssetClassResponse>({ data: assetClass });
    } catch (error) {
      const dbError = handleDbError(error, "get asset class");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "asset class");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch asset class",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/asset-classes/:id
 *
 * Updates an asset class by ID.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.1.3: Edit asset class name
 * AC-4.3.1: Set allocation ranges (targetMin, targetMax)
 * AC-4.3.2: Validation - min cannot exceed max
 * AC-4.5.1: Set max assets limit
 * AC-4.6.1: Set minimum allocation value
 *
 * Request Body:
 * - name: string (optional, 1-50 characters)
 * - icon: string (optional, max 10 characters for emoji)
 * - targetMin: string (optional, decimal 0-100 percentage, e.g., "40.00")
 * - targetMax: string (optional, decimal 0-100 percentage, e.g., "50.00")
 * - maxAssets: number | null (optional, integer 0-100, null or 0 = no limit)
 * - minAllocationValue: string | null (optional, decimal 0-1000000, null or "0" = no minimum)
 *
 * Response:
 * - 200: Updated asset class
 * - 400: Validation error (including min > max)
 * - 404: Asset class not found
 */
export const PATCH = withAuth<AssetClassResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = updateAssetClassSchema.safeParse(body);

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

      // Update asset class
      const assetClass = await updateClass(session.userId, id, validationResult.data);

      return NextResponse.json<AssetClassResponse>({ data: assetClass });
    } catch (error) {
      if (error instanceof AssetClassNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "update asset class");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "asset class");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to update asset class",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/asset-classes/:id
 *
 * Deletes an asset class by ID.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete with warning (has assets) - requires force=true query param
 *
 * Query Params:
 * - force: boolean (optional) - Force delete even with associated assets
 *
 * Response:
 * - 200: Success with warning if has assets and force=false
 * - 200: Success (with force=true)
 * - 404: Asset class not found
 */
export const DELETE = withAuth<
  DeleteResponse | DeleteWarningResponse | ValidationError | AuthError
>(async (request, session, context) => {
  try {
    const { id } = await (context as RouteParams).params;

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const queryValidation = deleteAssetClassQuerySchema.safeParse(queryParams);
    const forceDelete = queryValidation.success ? queryValidation.data.force : false;

    // Check if asset class exists and belongs to user
    const assetClass = await getAssetClassById(session.userId, id);

    if (!assetClass) {
      return NextResponse.json<ValidationError>(
        {
          error: "Asset class not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check for associated assets
    const assetCount = await getAssetCountByClass(session.userId, id);

    // AC-4.1.5: Warn if has assets and force=false
    if (assetCount > 0 && !forceDelete) {
      return NextResponse.json<DeleteWarningResponse>({
        warning: true,
        assetCount,
        message: `This class has ${assetCount} associated asset(s). Add ?force=true to confirm deletion.`,
      });
    }

    // Delete the asset class
    await deleteClass(session.userId, id);

    return NextResponse.json<DeleteResponse>({ success: true });
  } catch (error) {
    if (error instanceof AssetClassNotFoundError) {
      return NextResponse.json<ValidationError>(
        {
          error: error.message,
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const dbError = handleDbError(error, "delete asset class");

    if (dbError.isConnectionError || dbError.isTimeout) {
      return databaseError(dbError, "asset class");
    }

    return NextResponse.json<AuthError>(
      {
        error: "Failed to delete asset class",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});
