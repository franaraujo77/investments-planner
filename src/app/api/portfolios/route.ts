/**
 * Portfolios API Routes
 *
 * Story 3.1: Create Portfolio
 *
 * GET /api/portfolios - List all user portfolios
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
import {
  getUserPortfolios,
  createPortfolio,
  canCreatePortfolio,
  PortfolioLimitError,
} from "@/lib/services/portfolio-service";
import { createPortfolioSchema, MAX_PORTFOLIOS_PER_USER } from "@/lib/validations/portfolio";
import type { AuthError } from "@/lib/auth/types";
import type { Portfolio } from "@/lib/db/schema";

/**
 * Response types
 */
interface PortfolioListResponse {
  data: Portfolio[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface PortfolioResponse {
  data: Portfolio;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * GET /api/portfolios
 *
 * Lists all portfolios for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-3.1.1: Used to check if user has portfolios (empty state logic)
 *
 * Response:
 * - data: Array of portfolio objects
 * - meta: Count, limit, and canCreate flag
 */
export const GET = withAuth<PortfolioListResponse | AuthError>(async (_request, session) => {
  try {
    const portfolios = await getUserPortfolios(session.userId);
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
    console.error("Error fetching portfolios:", error);
    return NextResponse.json<AuthError>(
      {
        error: "Failed to fetch portfolios",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/portfolios
 *
 * Creates a new portfolio for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-3.1.3: Portfolio is created and saved to database
 * AC-3.1.4: Enforces 5 portfolio limit
 * AC-3.1.5: Response within 500ms
 *
 * Request Body:
 * - name: string (1-50 characters)
 *
 * Response:
 * - 201: Created portfolio
 * - 400: Validation error (empty name, name too long)
 * - 409: Portfolio limit exceeded
 */
export const POST = withAuth<PortfolioResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = createPortfolioSchema.safeParse(body);

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

      console.error("Error creating portfolio:", error);
      return NextResponse.json<AuthError>(
        {
          error: "Failed to create portfolio",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
