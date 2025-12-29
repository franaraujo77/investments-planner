/**
 * Portfolio Name Check API Route
 *
 * Story 2.1: Create Portfolio - AC-2.1.4
 *
 * POST /api/portfolios/check-name - Check for similar portfolio names
 *
 * Returns:
 * - 200: Array of similar portfolios (empty if no matches)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  checkSimilarPortfolioName,
  type SimilarPortfolioResult,
} from "@/lib/services/portfolio-service";
import { checkPortfolioNameSchema } from "@/lib/validations/portfolio";
import type { AuthError } from "@/lib/auth/types";

/**
 * Response types
 */
interface CheckNameResponse {
  data: {
    similarPortfolios: SimilarPortfolioResult[];
    hasSimilar: boolean;
    hasExact: boolean;
  };
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * POST /api/portfolios/check-name
 *
 * Checks if a portfolio name is similar to existing portfolios.
 * Requires authentication via withAuth middleware.
 *
 * Story 2.1: Create Portfolio - AC-2.1.4
 * Debounced call (300ms) from client to check for duplicates
 *
 * Request Body:
 * - name: string (the name to check)
 * - excludePortfolioId?: string (optional, for edit scenarios)
 *
 * Response:
 * - 200: Check result with similar portfolios
 * - 400: Validation error
 */
export const POST = withAuth<CheckNameResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = checkPortfolioNameSchema.safeParse(body);

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

      // Optional: Get excludePortfolioId for edit scenarios
      const excludePortfolioId =
        typeof body.excludePortfolioId === "string" ? body.excludePortfolioId : undefined;

      // Check for similar names
      const similarPortfolios = await checkSimilarPortfolioName(
        session.userId,
        validationResult.data.name,
        excludePortfolioId
      );

      // Determine if there are exact or similar matches
      const hasExact = similarPortfolios.some((p) => p.similarity === "exact");
      const hasSimilar = similarPortfolios.length > 0;

      return NextResponse.json<CheckNameResponse>({
        data: {
          similarPortfolios,
          hasSimilar,
          hasExact,
        },
      });
    } catch (error) {
      const dbError = handleDbError(error, "check portfolio name", { userId: session.userId });
      return databaseError(dbError, "portfolios");
    }
  }
);
