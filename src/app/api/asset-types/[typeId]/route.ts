/**
 * Asset Type Detail API Routes
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.2: Localization Overlay Table
 *
 * GET /api/asset-types/[typeId] - Get asset type with all localizations
 *
 * Returns:
 * - 200: Asset type with localizations
 * - 404: Asset type not found
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
import { db } from "@/lib/db";
import {
  cachedAssetTypes,
  cachedAssetTypeLocalizations,
  type CachedAssetType,
  type CachedAssetTypeLocalization,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Response types
 */
interface AssetTypeDetailResponse {
  data: {
    assetType: CachedAssetType;
    localizations: CachedAssetTypeLocalization[];
  };
}

interface RouteParams {
  params: Promise<{
    typeId: string;
  }>;
}

/**
 * GET /api/asset-types/[typeId]
 *
 * Gets a canonical asset type with all its localizations.
 * This is a public endpoint for reference data.
 *
 * AC-5.8.2: Returns asset type with jurisdiction-specific localizations
 *
 * Response:
 * - data.assetType: The canonical asset type
 * - data.localizations: Array of jurisdiction-specific localizations
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<AssetTypeDetailResponse | ErrorResponseBody>> {
  try {
    const { typeId } = await params;

    // Get the canonical asset type
    const assetTypes = await db
      .select()
      .from(cachedAssetTypes)
      .where(eq(cachedAssetTypes.id, typeId))
      .limit(1);

    const assetType = assetTypes[0];

    if (!assetType) {
      return errorResponse(
        `Asset type '${typeId}' not found`,
        NOT_FOUND_ERRORS.ASSET_TYPE_NOT_FOUND,
        404
      );
    }

    // Get all localizations for this type
    const localizations = await db
      .select()
      .from(cachedAssetTypeLocalizations)
      .where(eq(cachedAssetTypeLocalizations.canonicalTypeId, typeId));

    return NextResponse.json<AssetTypeDetailResponse>({
      data: {
        assetType,
        localizations,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "get asset type", { typeId: "unknown" });
    return databaseError(dbError, "asset type");
  }
}
