/**
 * Asset Types API Routes
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 *
 * GET /api/asset-types - List all canonical asset types
 *
 * Returns:
 * - 200: List of canonical asset types
 * - 500: Server error
 */

import { NextResponse, type NextRequest } from "next/server";
import { handleDbError, databaseError, type ErrorResponseBody } from "@/lib/api/responses";
import { getAllAssetTypes, getAllJurisdictions } from "@/lib/services/classification";
import type { CachedAssetType, CachedJurisdiction } from "@/lib/db/schema";

/**
 * Response types
 */
interface AssetTypesListResponse {
  data: {
    assetTypes: CachedAssetType[];
    jurisdictions: CachedJurisdiction[];
  };
  meta: {
    assetTypeCount: number;
    jurisdictionCount: number;
  };
}

/**
 * GET /api/asset-types
 *
 * Lists all canonical asset types and jurisdictions.
 * This is a public endpoint for reference data.
 *
 * AC-5.8.1: Returns all canonical asset types
 * AC-5.8.2: Returns all jurisdictions
 *
 * Response:
 * - data.assetTypes: Array of canonical asset type objects
 * - data.jurisdictions: Array of jurisdiction objects
 * - meta: Count information
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<AssetTypesListResponse | ErrorResponseBody>> {
  try {
    const [assetTypes, jurisdictions] = await Promise.all([
      getAllAssetTypes(),
      getAllJurisdictions(),
    ]);

    return NextResponse.json<AssetTypesListResponse>({
      data: {
        assetTypes,
        jurisdictions,
      },
      meta: {
        assetTypeCount: assetTypes.length,
        jurisdictionCount: jurisdictions.length,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "list asset types", {});
    return databaseError(dbError, "asset types");
  }
}
