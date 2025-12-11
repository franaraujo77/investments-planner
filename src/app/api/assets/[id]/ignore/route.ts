/**
 * Toggle Asset Ignored API Route
 *
 * Story 3.5: Mark Asset as Ignored
 *
 * PATCH /api/assets/:id/ignore - Toggle an asset's ignored status
 *
 * Returns:
 * - 200: Updated asset with new isIgnored state
 * - 401: Not authenticated
 * - 404: Asset not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { toggleAssetIgnored, AssetNotFoundError } from "@/lib/services/portfolio-service";
import type { AuthError } from "@/lib/auth/types";
import type { PortfolioAsset } from "@/lib/db/schema";

/**
 * Response types
 */
interface AssetResponse {
  data: PortfolioAsset;
}

interface ErrorResponse {
  error: string;
  code: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/assets/:id/ignore
 *
 * Toggles an asset's ignored status.
 * Requires authentication via withAuth middleware.
 *
 * Story 3.5: Mark Asset as Ignored
 * AC-3.5.5: Instant toggle (no confirmation needed)
 * AC-3.5.7: Multi-tenant isolation (verify ownership)
 *
 * Response:
 * - 200: Updated asset with new isIgnored state
 * - 404: Asset not found
 * - 500: Server error
 */
export const PATCH = withAuth<AssetResponse | ErrorResponse | AuthError>(
  async (request, session, context) => {
    try {
      const { id: assetId } = await (context as RouteParams).params;

      // Toggle the asset's ignored status
      const asset = await toggleAssetIgnored(session.userId, assetId);

      return NextResponse.json<AssetResponse>({ data: asset });
    } catch (error) {
      // Handle asset not found error
      if (error instanceof AssetNotFoundError) {
        return NextResponse.json<ErrorResponse>(
          {
            error: "Asset not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      logger.error("Error toggling asset ignored status", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json<AuthError>(
        {
          error: "Failed to toggle asset ignored status",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
