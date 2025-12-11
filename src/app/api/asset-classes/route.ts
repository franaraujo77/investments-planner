/**
 * Asset Classes API Routes
 *
 * Story 4.1: Define Asset Classes
 *
 * GET /api/asset-classes - List all asset classes for authenticated user
 * POST /api/asset-classes - Create a new asset class
 *
 * Returns:
 * - 200: List of asset classes (GET)
 * - 201: Created asset class (POST)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 409: Asset class limit exceeded
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getClassesForUser,
  createClass,
  canCreateAssetClass,
  AssetClassLimitError,
  MAX_ASSET_CLASSES_PER_USER,
} from "@/lib/services/asset-class-service";
import { createAssetClassSchema } from "@/lib/validations/asset-class-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { AssetClass } from "@/lib/db/schema";

/**
 * Response types
 */
interface AssetClassListResponse {
  data: AssetClass[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface AssetClassResponse {
  data: AssetClass;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * GET /api/asset-classes
 *
 * Lists all asset classes for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.1.1: View list of asset classes
 *
 * Response:
 * - data: Array of asset class objects
 * - meta: Count, limit, and canCreate flag
 */
export const GET = withAuth<AssetClassListResponse | AuthError>(async (_request, session) => {
  try {
    const assetClasses = await getClassesForUser(session.userId);
    const canCreate = await canCreateAssetClass(session.userId);

    return NextResponse.json<AssetClassListResponse>({
      data: assetClasses,
      meta: {
        count: assetClasses.length,
        limit: MAX_ASSET_CLASSES_PER_USER,
        canCreate,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "list asset classes");

    if (dbError.isConnectionError || dbError.isTimeout) {
      return databaseError(dbError, "asset classes");
    }

    return NextResponse.json<AuthError>(
      {
        error: "Failed to fetch asset classes",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/asset-classes
 *
 * Creates a new asset class for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.1.2: Create asset class with name and optional icon
 *
 * Request Body:
 * - name: string (1-50 characters)
 * - icon: string (optional, max 10 characters for emoji)
 *
 * Response:
 * - 201: Created asset class
 * - 400: Validation error
 * - 409: Asset class limit exceeded
 */
export const POST = withAuth<AssetClassResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = createAssetClassSchema.safeParse(body);

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

      // Create asset class
      const assetClass = await createClass(session.userId, validationResult.data);

      return NextResponse.json<AssetClassResponse>({ data: assetClass }, { status: 201 });
    } catch (error) {
      // Handle asset class limit error
      if (error instanceof AssetClassLimitError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "LIMIT_EXCEEDED",
          },
          { status: 409 }
        );
      }

      const dbError = handleDbError(error, "create asset class");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "asset class");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to create asset class",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
