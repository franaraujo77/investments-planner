/**
 * Fundamentals API Route
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.1: Fundamentals Include Required Metrics
 * AC-6.2.5: Source Attribution Recorded
 *
 * GET /api/data/fundamentals?symbols=PETR4,VALE3
 *
 * Returns fundamental data for requested symbols including:
 * - P/E ratio, P/B ratio, dividend yield, market cap
 * - Revenue, earnings, sector, industry (when available)
 * - Source attribution and freshness timestamps
 *
 * @module @/app/api/data/fundamentals
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { getFundamentalsService } from "@/lib/providers";
import { fundamentalsRepository } from "@/lib/repositories/fundamentals-repository";
import { fundamentalsRequestSchema } from "@/lib/validations/fundamentals-schemas";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface FundamentalData {
  symbol: string;
  peRatio: string | null;
  pbRatio: string | null;
  dividendYield: string | null;
  marketCap: string | null;
  revenue: string | null;
  earnings: string | null;
  sector: string | null;
  industry: string | null;
  source: string;
  fetchedAt: string;
  dataDate: string;
  isStale?: boolean;
}

interface FundamentalsResponse {
  data: {
    fundamentals: FundamentalData[];
    freshness: {
      source: string;
      fetchedAt: string;
      isStale: boolean;
    };
  };
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

// =============================================================================
// GET /api/data/fundamentals
// =============================================================================

/**
 * GET /api/data/fundamentals
 *
 * Fetch fundamental data for specified symbols.
 * Requires authentication.
 *
 * Query params:
 * - symbols: Comma-separated list of asset symbols (required)
 *
 * Example: GET /api/data/fundamentals?symbols=PETR4,VALE3,ITUB4
 */
export const GET = withAuth<FundamentalsResponse | ValidationError | AuthError>(
  async (request, session) => {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");

    // Validate request
    const validationResult = fundamentalsRequestSchema.safeParse({
      symbols: symbolsParam,
    });

    if (!validationResult.success) {
      logger.warn("Invalid fundamentals request", {
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

    logger.info("Fetching fundamentals", {
      userId: session.userId,
      symbolCount: symbols.length,
      symbols: symbols.join(","),
    });

    try {
      // Get fundamentals service
      const service = getFundamentalsService();

      // Fetch fundamentals via service (handles caching, provider chain, etc.)
      const result = await service.getFundamentals(symbols);

      // Also persist to database for historical access
      await fundamentalsRepository.upsertFundamentals(result.fundamentals);

      // Transform to API response format
      const fundamentals: FundamentalData[] = result.fundamentals.map((f) => {
        const fundamental: FundamentalData = {
          symbol: f.symbol,
          peRatio: f.peRatio ?? null,
          pbRatio: f.pbRatio ?? null,
          dividendYield: f.dividendYield ?? null,
          marketCap: f.marketCap ?? null,
          revenue: f.revenue ?? null,
          earnings: f.earnings ?? null,
          sector: f.sector ?? null,
          industry: f.industry ?? null,
          source: f.source,
          fetchedAt: f.fetchedAt.toISOString(),
          dataDate: f.dataDate.toISOString(),
        };
        if (f.isStale !== undefined) {
          fundamental.isStale = f.isStale;
        }
        return fundamental;
      });

      logger.info("Fundamentals fetched successfully", {
        userId: session.userId,
        symbolCount: result.fundamentals.length,
        fromCache: result.fromCache,
        provider: result.provider,
      });

      return NextResponse.json<FundamentalsResponse>({
        data: {
          fundamentals,
          freshness: {
            source: result.freshness.source,
            fetchedAt: result.freshness.fetchedAt.toISOString(),
            isStale: result.freshness.isStale,
          },
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Failed to fetch fundamentals", {
        userId: session.userId,
        symbols: symbols.join(","),
        error: errorMessage,
      });

      // Check if it's a provider error
      if (error instanceof Error && "code" in error) {
        return NextResponse.json<ValidationError>(
          {
            error: "Failed to fetch fundamentals from external provider",
            code: "EXTERNAL_ERROR",
            details: { symbols, error: errorMessage },
          },
          { status: 502 }
        );
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch fundamentals",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
