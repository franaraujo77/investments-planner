/**
 * Investments API Routes
 *
 * Story 3.8: Record Investment Amount
 *
 * GET /api/investments - List investment history
 * POST /api/investments - Record new investments
 *
 * Returns:
 * - 200: List of investments (GET)
 * - 201: Created investments (POST)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Asset or portfolio not found
 * - 500: Server error
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  recordInvestments,
  getInvestmentHistory,
  InvestmentAssetNotFoundError,
  InvestmentPortfolioNotFoundError,
} from "@/lib/services/investment-service";
import { recordInvestmentsSchema, getInvestmentsQuerySchema } from "@/lib/validations/portfolio";
import type { AuthError } from "@/lib/auth/types";
import type { Investment } from "@/lib/db/schema";

/**
 * Response types
 */
interface InvestmentListResponse {
  data: Investment[];
  meta: {
    count: number;
    from?: string | undefined;
    to?: string | undefined;
  };
}

interface InvestmentRecordResponse {
  data: Investment[];
  meta: {
    count: number;
    totalAmount: string;
  };
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * GET /api/investments
 *
 * Lists investment history for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * Query Parameters:
 * - from: ISO date string (optional) - filter investments from this date
 * - to: ISO date string (optional) - filter investments up to this date
 * - portfolioId: UUID (optional) - filter by portfolio
 * - assetId: UUID (optional) - filter by asset
 *
 * Response:
 * - data: Array of investment objects
 * - meta: Count and date range
 */
export const GET = withAuth<InvestmentListResponse | AuthError>(
  async (request: NextRequest, session) => {
    try {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const queryParams = {
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        portfolioId: searchParams.get("portfolioId") ?? undefined,
        assetId: searchParams.get("assetId") ?? undefined,
      };

      // Validate query parameters
      const validationResult = getInvestmentsQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        return NextResponse.json<ValidationError>(
          {
            error: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      // Convert string dates to Date objects if present
      const options = {
        from: validationResult.data.from ? new Date(validationResult.data.from) : undefined,
        to: validationResult.data.to ? new Date(validationResult.data.to) : undefined,
        portfolioId: validationResult.data.portfolioId,
        assetId: validationResult.data.assetId,
      };

      const investments = await getInvestmentHistory(session.userId, options);

      return NextResponse.json<InvestmentListResponse>({
        data: investments,
        meta: {
          count: investments.length,
          from: queryParams.from,
          to: queryParams.to,
        },
      });
    } catch (error) {
      const dbError = handleDbError(error, "list investments");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "investments list");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch investments",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/investments
 *
 * Records new investments for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-3.8.1: Investment record with all required fields
 * AC-3.8.2: Portfolio asset quantity update (atomic)
 * AC-3.8.6: Recommended vs actual amount storage
 *
 * Request Body:
 * - investments: Array of investment objects
 *   - portfolioId: UUID
 *   - assetId: UUID
 *   - symbol: string
 *   - quantity: string (positive decimal)
 *   - pricePerUnit: string (positive decimal)
 *   - currency: string (3 chars)
 *   - recommendedAmount?: string (optional)
 *
 * Response:
 * - 201: Created investments with count and total
 * - 400: Validation error
 * - 404: Asset or portfolio not found
 */
export const POST = withAuth<InvestmentRecordResponse | ValidationError | AuthError>(
  async (request: NextRequest, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = recordInvestmentsSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json<ValidationError>(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      // Record investments (atomic transaction)
      const createdInvestments = await recordInvestments(
        session.userId,
        validationResult.data.investments
      );

      // Calculate total amount for response
      const totalAmount = createdInvestments.reduce((sum, inv) => {
        // Using string addition since totalAmount is already calculated
        return (parseFloat(sum) + parseFloat(inv.totalAmount)).toFixed(4);
      }, "0.0000");

      return NextResponse.json<InvestmentRecordResponse>(
        {
          data: createdInvestments,
          meta: {
            count: createdInvestments.length,
            totalAmount,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      // Handle asset not found error
      if (error instanceof InvestmentAssetNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "ASSET_NOT_FOUND",
            details: { assetId: error.assetId },
          },
          { status: 404 }
        );
      }

      // Handle portfolio not found error
      if (error instanceof InvestmentPortfolioNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "PORTFOLIO_NOT_FOUND",
            details: { portfolioId: error.portfolioId },
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "record investment");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "investment record");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to record investments",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
