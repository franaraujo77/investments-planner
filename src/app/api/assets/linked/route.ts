/**
 * Linked Assets API Routes
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 *
 * GET /api/assets/linked?isin=XX - Query assets linked by the same ISIN
 *
 * Returns:
 * - 200: List of linked assets across jurisdictions
 * - 400: Missing ISIN parameter
 * - 500: Server error
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  handleDbError,
  databaseError,
  errorResponse,
  type ErrorResponseBody,
} from "@/lib/api/responses";
import { VALIDATION_ERRORS } from "@/lib/api/error-codes";
import { getAssetsByIsin, type LinkedAsset } from "@/lib/services/classification";
import { isValidIsin } from "@/lib/utils/isin";

/**
 * Response types
 */
interface LinkedAssetsResponse {
  data: {
    isin: string;
    linkedAssets: LinkedAsset[];
  };
  meta: {
    count: number;
    primarySymbol: string | null;
  };
}

/**
 * GET /api/assets/linked?isin=XX
 *
 * Gets all assets linked by the same ISIN (same security, different markets).
 * This is a public endpoint - ISIN linking is cached reference data.
 *
 * AC-5.8.5: Returns array of LinkedAsset with symbol, jurisdictionCode, isPrimary
 *
 * Query params:
 * - isin: string (required) - ISIN to search for
 *
 * Response:
 * - data.isin: The queried ISIN
 * - data.linkedAssets: Array of linked assets
 * - meta.count: Number of linked assets found
 * - meta.primarySymbol: The primary symbol for this ISIN (if any)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<LinkedAssetsResponse | ErrorResponseBody>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isin = searchParams.get("isin");

    if (!isin) {
      return errorResponse(
        "Missing required 'isin' query parameter",
        VALIDATION_ERRORS.REQUIRED_FIELD,
        400
      );
    }

    if (!isValidIsin(isin)) {
      return errorResponse(`Invalid ISIN format: '${isin}'`, VALIDATION_ERRORS.INVALID_FORMAT, 400);
    }

    const linkedAssets = await getAssetsByIsin(isin.toUpperCase());

    // Find the primary symbol
    const primaryAsset = linkedAssets.find((a) => a.isPrimary);

    return NextResponse.json<LinkedAssetsResponse>({
      data: {
        isin: isin.toUpperCase(),
        linkedAssets,
      },
      meta: {
        count: linkedAssets.length,
        primarySymbol: primaryAsset?.symbol ?? null,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "get linked assets", {});
    return databaseError(dbError, "linked assets");
  }
}
