/**
 * Currency Conversion API Route
 *
 * Story 6.5: Currency Conversion Logic
 * AC-6.5.1: All Conversions Use decimal.js
 * AC-6.5.2: Conversion Formula Correctly Applied
 * AC-6.5.3: Rounding Applied Correctly
 * AC-6.5.4: Conversion Logged for Audit Trail
 * AC-6.5.5: Rate Used Is Always Stored Rate
 *
 * GET /api/data/convert?value=1000&from=BRL&to=USD
 *
 * Converts currency values using stored exchange rates.
 * Returns conversion result with full metadata.
 *
 * @module @/app/api/data/convert
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getCurrencyConverter } from "@/lib/providers";
import {
  CurrencyConversionRequestSchema,
  type CurrencyConversionError,
} from "@/lib/validations/currency-schemas";
import { CurrencyConversionError as ConversionError } from "@/lib/calculations/currency-converter";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface ConversionData {
  value: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  rateDate: string;
  rateSource: string;
  isStaleRate: boolean;
}

interface ApiResponse {
  data: ConversionData;
}

// =============================================================================
// GET /api/data/convert
// =============================================================================

/**
 * GET /api/data/convert
 *
 * Convert a currency value using stored exchange rates.
 * Requires authentication.
 *
 * Query params:
 * - value: Value to convert (required, positive decimal string)
 * - from: Source currency code (required, e.g., "BRL")
 * - to: Target currency code (required, e.g., "USD")
 * - date: Optional date for rate lookup (ISO format)
 *
 * Example: GET /api/data/convert?value=1000&from=BRL&to=USD
 */
export const GET = withAuth<ApiResponse | CurrencyConversionError | AuthError>(
  async (request, session) => {
    const { searchParams } = new URL(request.url);
    const valueParam = searchParams.get("value");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const dateParam = searchParams.get("date");

    // Validate request
    const validationResult = CurrencyConversionRequestSchema.safeParse({
      value: valueParam ?? undefined,
      from: fromParam ?? undefined,
      to: toParam ?? undefined,
      date: dateParam ?? undefined,
    });

    if (!validationResult.success) {
      logger.warn("Invalid currency conversion request", {
        userId: session.userId,
        issueCount: validationResult.error.issues.length,
      });
      return NextResponse.json<CurrencyConversionError>(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { value, from, to, date } = validationResult.data;

    logger.info("Converting currency", {
      userId: session.userId,
      value,
      from,
      to,
      date: date?.toISOString(),
    });

    try {
      // Get currency converter
      const converter = getCurrencyConverter();

      // Perform conversion
      const result = await converter.convert(value, from, to, {
        rateDate: date,
        correlationId: crypto.randomUUID(),
      });

      // Transform to API response format
      const conversionData: ConversionData = {
        value: result.value,
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency,
        rate: result.rate,
        rateDate: result.rateDate.toISOString().split("T")[0]!,
        rateSource: result.rateSource,
        isStaleRate: result.isStaleRate,
      };

      logger.info("Currency conversion completed", {
        userId: session.userId,
        from: `${value} ${from}`,
        to: `${result.value} ${to}`,
        rate: result.rate,
        isStaleRate: result.isStaleRate,
      });

      return NextResponse.json<ApiResponse>({
        data: conversionData,
      });
    } catch (error) {
      // Handle specific conversion errors
      if (error instanceof ConversionError) {
        const status = error.code === "RATE_NOT_FOUND" ? 404 : 400;
        return NextResponse.json<CurrencyConversionError>(
          {
            error: error.message,
            code: error.code,
            details: error.details,
          },
          { status }
        );
      }

      const dbError = handleDbError(error, "convert currency", { userId: session.userId });
      return databaseError(dbError, "currency conversion");
    }
  }
);
