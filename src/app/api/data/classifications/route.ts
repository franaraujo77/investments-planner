/**
 * Classifications API Route
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.5: Classification API
 *
 * GET /api/data/classifications?symbols=PETR4,VALE3
 *
 * Returns GICS classification data for requested symbols including:
 * - Sector, Industry Group, Industry (three-tier GICS hierarchy)
 * - GICS codes (2-digit sector, 4-digit group, 6-digit industry)
 * - Confidence score and source attribution
 *
 * @module @/app/api/data/classifications
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getAssetClassifications } from "@/lib/services/classification";
import { classificationsRequestSchema } from "@/lib/validations/classification-schemas";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface ClassificationData {
  symbol: string;
  gicsIndustryId: string;
  gicsIndustryGroupId: string;
  gicsSectorId: string;
  industryName: string;
  industryGroupName: string;
  sectorName: string;
  confidence: string;
  source: string;
  fetchedAt: string;
  isStale?: boolean;
}

interface ClassificationsResponse {
  data: {
    classifications: ClassificationData[];
    stats: {
      total: number;
      found: number;
      fromCache: number;
      fromProvider: number;
      stale: number;
      failed: number;
    };
    failed: string[];
  };
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// GET /api/data/classifications
// =============================================================================

/**
 * GET /api/data/classifications
 *
 * Fetch GICS classification data for specified symbols.
 * Requires authentication.
 *
 * Query params:
 * - symbols: Comma-separated list of asset symbols (required)
 *
 * Example: GET /api/data/classifications?symbols=PETR4,VALE3,ITUB4
 *
 * Response:
 * - classifications: Array of classification objects with GICS hierarchy
 * - stats: Query statistics (found, cached, stale, etc.)
 * - failed: Array of symbols that couldn't be classified
 */
export const GET = withAuth<ClassificationsResponse | ValidationError | AuthError>(
  async (request, session) => {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");

    // Validate request
    const validationResult = classificationsRequestSchema.safeParse({
      symbols: symbolsParam,
    });

    if (!validationResult.success) {
      logger.warn("Invalid classifications request", {
        userId: session.userId,
        issueCount: validationResult.error.issues.length,
      });
      return NextResponse.json<ValidationError>(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Parse symbols from comma-separated string
    const symbols = validationResult.data.symbols
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    if (symbols.length === 0) {
      return NextResponse.json<ValidationError>(
        {
          error: "At least one symbol is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    logger.info("Fetching classifications", {
      userId: session.userId,
      symbolCount: symbols.length,
      symbols: symbols.join(","),
    });

    try {
      // Get classifications from service (handles cache lookup)
      const result = await getAssetClassifications(symbols);

      // Transform to API response format
      const classifications: ClassificationData[] = [];

      for (const [symbol, classification] of result.classifications.entries()) {
        const classificationData: ClassificationData = {
          symbol,
          gicsIndustryId: classification.gicsIndustryId,
          gicsIndustryGroupId: classification.gicsIndustryGroupId,
          gicsSectorId: classification.gicsSectorId,
          industryName: classification.industryName,
          industryGroupName: classification.industryGroupName,
          sectorName: classification.sectorName,
          confidence: classification.confidence,
          source: classification.source,
          fetchedAt: classification.cacheUpdatedAt.toISOString(),
        };

        // Only add isStale if explicitly stale
        const age = Date.now() - classification.cacheUpdatedAt.getTime();
        const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (age > MAX_AGE_MS) {
          classificationData.isStale = true;
        }

        classifications.push(classificationData);
      }

      logger.info("Classifications fetched successfully", {
        userId: session.userId,
        total: symbols.length,
        found: result.stats.found,
        fromCache: result.stats.fromCache,
        failed: result.stats.failed,
      });

      return NextResponse.json<ClassificationsResponse>({
        data: {
          classifications,
          stats: result.stats,
          failed: result.failed,
        },
      });
    } catch (error) {
      const dbError = handleDbError(error, "fetch classifications", { userId: session.userId });
      return databaseError(dbError, "classifications");
    }
  }
);
