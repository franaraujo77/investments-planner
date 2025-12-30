/**
 * Portfolios API Routes
 *
 * Story 2.1: Create Portfolio (Epic 2)
 * Story 3.1: Create Portfolio (Legacy)
 *
 * GET /api/portfolios - List all user portfolios with asset types
 * POST /api/portfolios - Create a new portfolio
 *
 * Returns:
 * - 200: List of portfolios (GET)
 * - 201: Created portfolio (POST)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 409: Portfolio limit exceeded
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getUserPortfoliosWithAssetTypes,
  createPortfolio,
  canCreatePortfolio,
  PortfolioLimitError,
  type PortfolioWithAssetTypes,
} from "@/lib/services/portfolio-service";
import { createPortfolioSchema, MAX_PORTFOLIOS_PER_USER } from "@/lib/validations/portfolio";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface PortfolioListResponse {
  data: PortfolioWithAssetTypes[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface PortfolioResponse {
  data: PortfolioWithAssetTypes;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * GET /api/portfolios
 *
 * Lists all portfolios for the authenticated user with accepted asset types.
 * Requires authentication via withAuth middleware.
 *
 * Story 2.1: Create Portfolio - AC-2.1.6
 * AC-3.1.1: Used to check if user has portfolios (empty state logic)
 *
 * Response:
 * - data: Array of portfolio objects with acceptedAssetTypes
 * - meta: Count, limit, and canCreate flag
 */
export const GET = withAuth<PortfolioListResponse | AuthError>(async (_request, session) => {
  try {
    const portfolios = await getUserPortfoliosWithAssetTypes(session.userId);
    const canCreate = await canCreatePortfolio(session.userId);

    return NextResponse.json<PortfolioListResponse>({
      data: portfolios,
      meta: {
        count: portfolios.length,
        limit: MAX_PORTFOLIOS_PER_USER,
        canCreate,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "list portfolios", { userId: session.userId });
    return databaseError(dbError, "portfolios");
  }
});

/**
 * Default values for quick portfolio creation (Story 3.1)
 * Applied when optional fields are not provided
 */
const PORTFOLIO_DEFAULTS = {
  baseCurrency: "USD" as const,
  industrySector: "Other" as const,
  assetTypes: ["Stocks"] as const,
};

/**
 * POST /api/portfolios
 *
 * Creates a new portfolio for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * Story 2.1: Create Portfolio (full form with all fields)
 * Story 3.1: Create Portfolio (quick modal with name only)
 *
 * AC-2.1.1: Portfolio creation with all fields
 * AC-2.1.2: Industry sector tagging
 * AC-2.1.3: Asset types selection
 * AC-2.1.5: Required field validation
 * AC-3.1.3: Portfolio is created and saved to database
 * AC-3.1.4: Enforces 5 portfolio limit
 * AC-3.1.5: Response within 500ms
 *
 * Request Body:
 * - name: string (1-50 characters) - REQUIRED
 * - baseCurrency: string (e.g., "USD", "EUR") - optional, defaults to "USD"
 * - industrySector: string (e.g., "Technology", "Healthcare") - optional, defaults to "Other"
 * - assetTypes: string[] (e.g., ["Stocks", "ETFs"]) - optional, defaults to ["Stocks"]
 *
 * Response:
 * - 201: Created portfolio with acceptedAssetTypes
 * - 400: Validation error
 * - 409: Portfolio limit exceeded
 */
export const POST = withAuth<PortfolioResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse request body and apply defaults for quick creation (Story 3.1)
      const body = await request.json();
      const bodyWithDefaults = {
        ...PORTFOLIO_DEFAULTS,
        ...body,
      };
      const validationResult = createPortfolioSchema.safeParse(bodyWithDefaults);

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

      // Create portfolio
      const portfolio = await createPortfolio(session.userId, validationResult.data);

      return NextResponse.json<PortfolioResponse>({ data: portfolio }, { status: 201 });
    } catch (error) {
      // Handle portfolio limit error
      if (error instanceof PortfolioLimitError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "LIMIT_EXCEEDED",
          },
          { status: 409 }
        );
      }

      const dbError = handleDbError(error, "create portfolio", { userId: session.userId });
      return databaseError(dbError, "portfolio");
    }
  }
);
