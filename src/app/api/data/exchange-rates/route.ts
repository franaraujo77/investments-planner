/**
 * Exchange Rates API Route
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.1: Rates Fetched for All Currencies in User Portfolios
 * AC-6.4.2: Rates Are Previous Trading Day Close (T-1)
 * AC-6.4.3: Open Exchange Rates Fallback if Primary Fails
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 * AC-6.4.5: Supported Currencies (USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF)
 *
 * GET /api/data/exchange-rates?base=USD&targets=BRL,EUR,GBP
 *
 * Returns exchange rate data for requested currencies including:
 * - Exchange rates for all target currencies
 * - Source attribution
 * - Freshness timestamps and stale flags
 *
 * @module @/app/api/data/exchange-rates
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getExchangeRateService } from "@/lib/providers";
import { exchangeRatesRepository } from "@/lib/repositories/exchange-rates-repository";
import {
  ExchangeRatesRequestSchema,
  SUPPORTED_CURRENCIES,
} from "@/lib/validations/exchange-rates-schemas";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface ExchangeRateData {
  base: string;
  rates: Record<string, string>;
  source: string;
  fetchedAt: string;
  rateDate: string;
  isStale?: boolean;
}

interface ExchangeRatesResponse {
  data: {
    exchangeRates: ExchangeRateData;
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
// GET /api/data/exchange-rates
// =============================================================================

/**
 * GET /api/data/exchange-rates
 *
 * Fetch exchange rate data for specified currencies.
 * Requires authentication.
 *
 * Query params:
 * - base: Base currency code (required, e.g., "USD")
 * - targets: Comma-separated list of target currency codes (optional)
 *            If not provided, returns all supported currencies
 *
 * Example: GET /api/data/exchange-rates?base=USD&targets=BRL,EUR,GBP
 */
export const GET = withAuth<ExchangeRatesResponse | ValidationError | AuthError>(
  async (request, session) => {
    const { searchParams } = new URL(request.url);
    const baseParam = searchParams.get("base");
    const targetsParam = searchParams.get("targets");

    // Validate request - convert null to undefined for optional targets
    const validationResult = ExchangeRatesRequestSchema.safeParse({
      base: baseParam ?? undefined,
      targets: targetsParam ?? undefined,
    });

    if (!validationResult.success) {
      logger.warn("Invalid exchange rates request", {
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

    const { base, targets: requestedTargets } = validationResult.data;

    // If no targets specified, use all supported currencies except base
    const targets = requestedTargets ?? SUPPORTED_CURRENCIES.filter((c) => c !== base);

    logger.info("Fetching exchange rates", {
      userId: session.userId,
      base,
      targetCount: targets.length,
      targets: targets.slice(0, 5).join(",") + (targets.length > 5 ? "..." : ""),
    });

    try {
      // Get exchange rate service
      const service = getExchangeRateService();

      // Fetch rates via service (handles caching, provider chain, etc.)
      const result = await service.getRates(base, targets);

      // Also persist to database for historical access
      if (Object.keys(result.rates.rates).length > 0) {
        await exchangeRatesRepository.upsertRates(result.rates);
      }

      // Transform to API response format
      const exchangeRates: ExchangeRateData = {
        base: result.rates.base,
        rates: result.rates.rates,
        source: result.rates.source,
        fetchedAt: result.rates.fetchedAt.toISOString(),
        rateDate: result.rates.rateDate.toISOString().split("T")[0]!,
      };

      // Add isStale only if present
      if (result.rates.isStale) {
        exchangeRates.isStale = result.rates.isStale;
      }

      logger.info("Exchange rates fetched successfully", {
        userId: session.userId,
        base,
        rateCount: Object.keys(result.rates.rates).length,
        fromCache: result.fromCache,
        provider: result.provider,
        isStale: result.freshness.isStale,
      });

      // Build freshness response
      const freshness: ExchangeRatesResponse["data"]["freshness"] = {
        source: result.freshness.source,
        fetchedAt: result.freshness.fetchedAt.toISOString(),
        isStale: result.freshness.isStale,
      };

      // Add staleSince only if present
      if (result.freshness.staleSince) {
        freshness.staleSince = result.freshness.staleSince.toISOString();
      }

      return NextResponse.json<ExchangeRatesResponse>({
        data: {
          exchangeRates,
          fromCache: result.fromCache,
          freshness,
          provider: result.provider,
        },
      });
    } catch (error) {
      const dbError = handleDbError(error, "fetch exchange rates");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "EXCHANGE_RATES");
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a provider error (has code property)
      if (error instanceof Error && "code" in error) {
        const providerError = error as Error & { code: string };
        return NextResponse.json<ValidationError>(
          {
            error: "Failed to fetch exchange rates from external provider",
            code: providerError.code,
            details: { base, targets, error: errorMessage },
          },
          { status: 502 }
        );
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch exchange rates",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
