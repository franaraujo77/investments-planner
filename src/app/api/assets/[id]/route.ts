/**
 * Individual Asset API Routes
 *
 * Story 3.3: Update Asset Holdings
 * Story 3.4: Remove Asset from Portfolio
 *
 * PATCH /api/assets/:id - Update an asset's quantity and/or purchase price
 * DELETE /api/assets/:id - Remove an asset from a portfolio
 *
 * Returns:
 * - 200: Updated asset (PATCH) or success (DELETE)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Asset not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { updateAsset, removeAsset, AssetNotFoundError } from "@/lib/services/portfolio-service";
import { updateAssetSchema } from "@/lib/validations/portfolio";
import type { AuthError } from "@/lib/auth/types";
import type { PortfolioAsset } from "@/lib/db/schema";

/**
 * Response types
 */
interface AssetResponse {
  data: PortfolioAsset;
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
 * PATCH /api/assets/:id
 *
 * Updates an asset's quantity and/or purchase price.
 * Requires authentication via withAuth middleware.
 *
 * Story 3.3: Update Asset Holdings
 * AC-3.3.2: Quantity validation (positive number)
 * AC-3.3.3: Purchase price validation (positive number)
 * AC-3.3.4: Auto-save on blur
 * AC-3.3.6: Updated timestamp recorded
 *
 * Request Body (partial update - at least one field required):
 * - quantity: string (optional, positive decimal, up to 8 decimal places)
 * - purchasePrice: string (optional, positive decimal, up to 4 decimal places)
 *
 * Response:
 * - 200: Updated asset
 * - 400: Validation error
 * - 404: Asset not found
 * - 500: Server error
 */
export const PATCH = withAuth<AssetResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id: assetId } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = updateAssetSchema.safeParse(body);

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

      // Update asset
      const asset = await updateAsset(session.userId, assetId, validationResult.data);

      return NextResponse.json<AssetResponse>({ data: asset });
    } catch (error) {
      // Handle asset not found error
      if (error instanceof AssetNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: "Asset not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      console.error("Error updating asset:", error);
      return NextResponse.json<AuthError>(
        {
          error: "Failed to update asset",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * Success response for DELETE
 */
interface DeleteSuccessResponse {
  success: boolean;
}

/**
 * DELETE /api/assets/:id
 *
 * Removes an asset from a portfolio (hard delete).
 * Requires authentication via withAuth middleware.
 *
 * Story 3.4: Remove Asset from Portfolio
 * AC-3.4.3: Hard delete asset from database
 * AC-3.4.6: Multi-tenant isolation (verify ownership)
 *
 * Response:
 * - 200: { success: true }
 * - 404: Asset not found
 * - 500: Server error
 */
export const DELETE = withAuth<DeleteSuccessResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id: assetId } = await (context as RouteParams).params;

      await removeAsset(session.userId, assetId);

      return NextResponse.json<DeleteSuccessResponse>({ success: true });
    } catch (error) {
      // Handle asset not found error
      if (error instanceof AssetNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: "Asset not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      console.error("Error deleting asset:", error);
      return NextResponse.json<AuthError>(
        {
          error: "Failed to delete asset",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
