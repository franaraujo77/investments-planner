/**
 * Portfolio Assets API Routes
 *
 * Story 3.2: Add Asset to Portfolio
 *
 * GET /api/portfolios/:id/assets - List all assets in a portfolio
 * POST /api/portfolios/:id/assets - Add a new asset to a portfolio
 *
 * Returns:
 * - 200: List of assets (GET)
 * - 201: Created asset (POST)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Portfolio not found
 * - 409: Asset already exists in portfolio
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getPortfolioAssets,
  addAsset,
  PortfolioNotFoundError,
  AssetExistsError,
} from "@/lib/services/portfolio-service";
import { addAssetSchema } from "@/lib/validations/portfolio";
import type { AuthError } from "@/lib/auth/types";
import type { PortfolioAsset } from "@/lib/db/schema";

/**
 * Response types
 */
interface AssetListResponse {
  data: PortfolioAsset[];
  meta: {
    count: number;
  };
}

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
 * GET /api/portfolios/:id/assets
 *
 * Lists all assets for a portfolio.
 * Requires authentication via withAuth middleware.
 *
 * AC-3.2.1: Used to display assets in portfolio table
 *
 * Response:
 * - data: Array of asset objects
 * - meta: Count of assets
 */
export const GET = withAuth<AssetListResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id: portfolioId } = await (context as RouteParams).params;

      const assets = await getPortfolioAssets(session.userId, portfolioId);

      return NextResponse.json<AssetListResponse>({
        data: assets,
        meta: {
          count: assets.length,
        },
      });
    } catch (error) {
      // Handle portfolio not found error
      if (error instanceof PortfolioNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: "Portfolio not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "list portfolio assets");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "assets");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch assets",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/portfolios/:id/assets
 *
 * Adds a new asset to a portfolio.
 * Requires authentication via withAuth middleware.
 *
 * AC-3.2.2: Form validation (symbol, quantity, price, currency)
 * AC-3.2.3: Positive value validation
 * AC-3.2.4: Duplicate asset prevention
 * AC-3.2.5: Decimal precision support
 * AC-3.2.6: Asset creation and save
 * AC-3.2.7: Response within 500ms
 *
 * Request Body:
 * - symbol: string (1-20 characters, auto-uppercased)
 * - name: string (optional, max 100 characters)
 * - quantity: string (positive decimal, up to 8 decimal places)
 * - purchasePrice: string (positive decimal, up to 4 decimal places)
 * - currency: string (3 characters, e.g., "USD")
 *
 * Response:
 * - 201: Created asset
 * - 400: Validation error
 * - 404: Portfolio not found
 * - 409: Asset already exists in portfolio
 */
export const POST = withAuth<AssetResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id: portfolioId } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = addAssetSchema.safeParse(body);

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

      // Create asset
      const asset = await addAsset(session.userId, portfolioId, validationResult.data);

      return NextResponse.json<AssetResponse>({ data: asset }, { status: 201 });
    } catch (error) {
      // Handle portfolio not found error
      if (error instanceof PortfolioNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: "Portfolio not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Handle asset already exists error
      if (error instanceof AssetExistsError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "ASSET_EXISTS",
          },
          { status: 409 }
        );
      }

      const dbError = handleDbError(error, "add asset");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "asset");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to create asset",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
