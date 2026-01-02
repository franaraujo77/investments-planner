/**
 * Asset Classification API Routes
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 *
 * GET /api/assets/[symbol]/classification - Get asset type classification
 *
 * Returns:
 * - 200: Asset classification with type, jurisdiction, and localization
 * - 404: Classification not found
 * - 500: Server error
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  handleDbError,
  databaseError,
  errorResponse,
  type ErrorResponseBody,
} from "@/lib/api/responses";
import { NOT_FOUND_ERRORS } from "@/lib/api/error-codes";
import { getAssetType, type FullAssetTypeInfo } from "@/lib/services/classification";

/**
 * Response types
 */
interface AssetClassificationResponse {
  data: FullAssetTypeInfo;
}

interface RouteParams {
  params: Promise<{
    symbol: string;
  }>;
}

/**
 * GET /api/assets/[symbol]/classification
 *
 * Gets the asset type classification for a symbol.
 * This is a public endpoint - classification data is cached reference data.
 *
 * AC-5.8.4: Returns canonicalTypeId, canonicalTypeName, jurisdictionCode, localTypeName, etc.
 *
 * Query params:
 * - includeLinkedAssets: boolean (default: false) - Include ISIN-linked assets
 *
 * Response:
 * - data.classification: Full type classification or null if not classified
 * - data.linkedAssets: Array of linked assets (if requested and ISIN available)
 * - data.fromCache: Boolean indicating if result was from cache
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<AssetClassificationResponse | ErrorResponseBody>> {
  try {
    const { symbol } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeLinkedAssets = searchParams.get("includeLinkedAssets") === "true";

    const result = await getAssetType(symbol.toUpperCase(), {
      includeLinkedAssets,
    });

    if (!result.classification) {
      return errorResponse(
        `No classification found for symbol '${symbol}'`,
        NOT_FOUND_ERRORS.ASSET_CLASSIFICATION_NOT_FOUND,
        404
      );
    }

    return NextResponse.json<AssetClassificationResponse>({
      data: result,
    });
  } catch (error) {
    const dbError = handleDbError(error, "get asset classification", { symbol: "unknown" });
    return databaseError(dbError, "asset classification");
  }
}
