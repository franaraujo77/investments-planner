/**
 * Prices API Route
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.1: Prices Include OHLCV Data
 * AC-6.3.2: Prices Cached with 24-Hour TTL
 * AC-6.3.3: Yahoo Finance Fallback Used if Gemini Fails
 * AC-6.3.4: Missing Prices Show Last Known Price with Stale Flag
 * AC-6.3.5: Batch Requests Limited to 50 Symbols Per Call
 *
 * GET /api/data/prices?symbols=PETR4,VALE3
 *
 * Returns price data for requested symbols including:
 * - OHLCV data (open, high, low, close, volume)
 * - Currency and source attribution
 * - Freshness timestamps and stale flags
 *
 * @module @/app/api/data/prices
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { getPriceService } from "@/lib/providers";
import { pricesRepository } from "@/lib/repositories/prices-repository";
import { PricesRequestSchema } from "@/lib/validations/prices-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { PriceResult } from "@/lib/providers/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface PriceData {
  symbol: string;
  open?: string;
  high?: string;
  low?: string;
  close: string;
  volume?: string;
  currency: string;
  source: string;
  fetchedAt: string;
  priceDate: string;
  isStale?: boolean;
}

interface PricesResponse {
  data: {
    prices: PriceData[];
    fromCache: boolean;
    freshness: {
      source: string;
      fetchedAt: string;
      isStale: boolean;
      staleSince?: string;
    };
    provider: string;
  };
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transform PriceResult to API response format
 */
function transformPriceResult(price: PriceResult): PriceData {
  const data: PriceData = {
    symbol: price.symbol,
    close: price.close,
    currency: price.currency,
    source: price.source,
    fetchedAt: price.fetchedAt.toISOString(),
    priceDate: price.priceDate.toISOString().split("T")[0]!,
  };

  // Add optional fields only if present (exactOptionalPropertyTypes compliance)
  if (price.open !== undefined) {
    data.open = price.open;
  }
  if (price.high !== undefined) {
    data.high = price.high;
  }
  if (price.low !== undefined) {
    data.low = price.low;
  }
  if (price.volume !== undefined) {
    data.volume = price.volume;
  }
  if (price.isStale !== undefined) {
    data.isStale = price.isStale;
  }

  return data;
}

// =============================================================================
// GET /api/data/prices
// =============================================================================

/**
 * GET /api/data/prices
 *
 * Fetch price data for specified symbols.
 * Requires authentication.
 *
 * Query params:
 * - symbols: Comma-separated list of asset symbols (required, max 100)
 *
 * Example: GET /api/data/prices?symbols=PETR4,VALE3,ITUB4
 */
export const GET = withAuth<PricesResponse | ValidationError | AuthError>(
  async (request, session) => {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");

    // Validate request
    const validationResult = PricesRequestSchema.safeParse({
      symbols: symbolsParam,
    });

    if (!validationResult.success) {
      logger.warn("Invalid prices request", {
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

    // Symbols are already parsed by the schema transform
    const symbols = validationResult.data.symbols;

    if (symbols.length === 0) {
      return NextResponse.json<ValidationError>(
        {
          error: "At least one symbol is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    logger.info("Fetching prices", {
      userId: session.userId,
      symbolCount: symbols.length,
      symbols: symbols.slice(0, 10).join(",") + (symbols.length > 10 ? "..." : ""),
    });

    try {
      // Get prices service
      const service = getPriceService();

      // Fetch prices via service (handles caching, provider chain, batch processing, etc.)
      const result = await service.getPrices(symbols);

      // Also persist to database for historical access
      if (result.prices.length > 0) {
        await pricesRepository.upsertPrices(result.prices);
      }

      // Transform to API response format
      const prices: PriceData[] = result.prices.map(transformPriceResult);

      logger.info("Prices fetched successfully", {
        userId: session.userId,
        symbolCount: result.prices.length,
        fromCache: result.fromCache,
        provider: result.provider,
        isStale: result.freshness.isStale,
      });

      // Build freshness response
      const freshness: PricesResponse["data"]["freshness"] = {
        source: result.freshness.source,
        fetchedAt: result.freshness.fetchedAt.toISOString(),
        isStale: result.freshness.isStale,
      };

      // Add staleSince only if present
      if (result.freshness.staleSince) {
        freshness.staleSince = result.freshness.staleSince.toISOString();
      }

      return NextResponse.json<PricesResponse>({
        data: {
          prices,
          fromCache: result.fromCache,
          freshness,
          provider: result.provider,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Failed to fetch prices", {
        userId: session.userId,
        symbols: symbols.join(","),
        error: errorMessage,
      });

      // Check if it's a provider error (has code property)
      if (error instanceof Error && "code" in error) {
        const providerError = error as Error & { code: string };
        return NextResponse.json<ValidationError>(
          {
            error: "Failed to fetch prices from external provider",
            code: providerError.code,
            details: { symbols, error: errorMessage },
          },
          { status: 502 }
        );
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch prices",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
