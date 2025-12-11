/**
 * Data Freshness API Route
 *
 * Story 6.7: Data Freshness Display
 * AC-6.7.1: DataFreshnessBadge Shows Timestamp and Freshness Indicator
 * AC-6.7.3: Hover Shows Exact Timestamp and Source
 *
 * GET /api/data/freshness?type=prices&symbols=PETR4,VALE3
 *
 * Returns freshness information (source, timestamp, isStale) for data points.
 *
 * Query parameters:
 * - type (required): "prices" | "rates" | "fundamentals"
 * - symbols (optional): Comma-separated list of symbols
 *
 * Success response (200):
 * {
 *   "data": {
 *     "PETR4": {
 *       "source": "Gemini API",
 *       "fetchedAt": "2025-12-10T14:30:00Z",
 *       "isStale": false
 *     },
 *     "VALE3": {
 *       "source": "Gemini API",
 *       "fetchedAt": "2025-12-10T14:30:00Z",
 *       "isStale": false
 *     }
 *   }
 * }
 *
 * @module @/app/api/data/freshness
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { pricesRepository } from "@/lib/repositories/prices-repository";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import { fundamentalsRepository } from "@/lib/repositories/fundamentals-repository";
import {
  parseFreshnessQuery,
  buildFreshnessResponse,
  type FreshnessSuccessResponse,
  type FreshnessDataType,
} from "@/lib/validations/freshness-schemas";
import { errorResponse, handleDbError, databaseError } from "@/lib/api/responses";
import type { AuthError } from "@/lib/auth/types";
import type { ErrorResponseBody } from "@/lib/api/responses";

// =============================================================================
// TYPES
// =============================================================================

interface FreshnessItem {
  source: string;
  fetchedAt: Date;
  isStale: boolean;
  staleSince?: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate if data is stale based on fetchedAt timestamp
 *
 * @param fetchedAt - When the data was fetched
 * @param ttlHours - TTL in hours (24 for prices/rates, 168 for fundamentals)
 * @returns Whether the data is considered stale
 */
function isDataStale(fetchedAt: Date, ttlHours: number): boolean {
  const now = Date.now();
  const ageMs = now - fetchedAt.getTime();
  const ttlMs = ttlHours * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

/**
 * Get freshness data for prices
 */
async function getPricesFreshness(symbols?: string[]): Promise<Record<string, FreshnessItem>> {
  const freshnessMap: Record<string, FreshnessItem> = {};

  if (symbols && symbols.length > 0) {
    const prices = await pricesRepository.getPricesBySymbols(symbols);

    for (const price of prices) {
      const stale = price.isStale || isDataStale(price.fetchedAt, 24);
      const item: FreshnessItem = {
        source: price.source,
        fetchedAt: price.fetchedAt,
        isStale: stale,
      };
      if (stale && price.updatedAt) {
        item.staleSince = price.updatedAt;
      }
      freshnessMap[price.symbol] = item;
    }
  } else {
    // Return empty map if no symbols specified
    // (could be enhanced to return aggregate freshness)
    logger.warn("No symbols provided for prices freshness query");
  }

  return freshnessMap;
}

/**
 * Get freshness data for exchange rates
 */
async function getRatesFreshness(_symbols?: string[]): Promise<Record<string, FreshnessItem>> {
  const freshnessMap: Record<string, FreshnessItem> = {};

  // For exchange rates, return freshness for all stored pairs
  // Since exchange rates are global (not per-user), we return the latest
  const rates = await exchangeRatesRepository.getAllRates();

  for (const rate of rates) {
    const key = `${rate.baseCurrency}-${rate.targetCurrency}`;
    const stale = isDataStale(rate.fetchedAt, 24); // 24 hour TTL for rates
    const item: FreshnessItem = {
      source: rate.source,
      fetchedAt: rate.fetchedAt,
      isStale: stale,
    };
    if (stale && rate.updatedAt) {
      item.staleSince = rate.updatedAt;
    }
    freshnessMap[key] = item;
  }

  return freshnessMap;
}

/**
 * Get freshness data for fundamentals
 */
async function getFundamentalsFreshness(
  symbols?: string[]
): Promise<Record<string, FreshnessItem>> {
  const freshnessMap: Record<string, FreshnessItem> = {};

  if (symbols && symbols.length > 0) {
    const fundamentals = await fundamentalsRepository.getFundamentalsBySymbols(symbols);

    for (const fund of fundamentals) {
      const stale = isDataStale(fund.fetchedAt, 168); // 7 day (168 hour) TTL for fundamentals
      const item: FreshnessItem = {
        source: fund.source,
        fetchedAt: fund.fetchedAt,
        isStale: stale,
      };
      if (stale && fund.updatedAt) {
        item.staleSince = fund.updatedAt;
      }
      freshnessMap[fund.symbol] = item;
    }
  } else {
    logger.warn("No symbols provided for fundamentals freshness query");
  }

  return freshnessMap;
}

/**
 * Get freshness data based on type
 */
async function getFreshnessData(
  type: FreshnessDataType,
  symbols?: string[]
): Promise<Record<string, FreshnessItem>> {
  switch (type) {
    case "prices":
      return getPricesFreshness(symbols);
    case "rates":
      return getRatesFreshness(symbols);
    case "fundamentals":
      return getFundamentalsFreshness(symbols);
  }
}

// =============================================================================
// GET /api/data/freshness
// =============================================================================

/**
 * GET /api/data/freshness
 *
 * Returns freshness information for specified data type and optional symbols.
 *
 * AC-6.7.1: Returns timestamp and source for data points
 * AC-6.7.3: Provides data for tooltip display
 */
export const GET = withAuth<FreshnessSuccessResponse | ErrorResponseBody | AuthError>(
  async (request: NextRequest, _session) => {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const parseResult = parseFreshnessQuery(searchParams);

    if (!parseResult.success) {
      logger.warn("Invalid freshness query", {
        error: parseResult.error,
      });
      return errorResponse(parseResult.error, "VALIDATION_INVALID_INPUT", 400);
    }

    const { type, symbols } = parseResult.data;

    logger.info("Freshness query", {
      type,
      symbolCount: symbols?.length ?? 0,
    });

    try {
      // Get freshness data
      const freshnessMap = await getFreshnessData(type, symbols);

      // Build and return response
      const response = buildFreshnessResponse(freshnessMap);
      return NextResponse.json<FreshnessSuccessResponse>(response, { status: 200 });
    } catch (error) {
      const dbError = handleDbError(error, "check data freshness");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "data freshness");
      }

      return errorResponse("Failed to retrieve freshness data", "INTERNAL_ERROR", 500);
    }
  }
);
