/**
 * Criteria API Routes
 *
 * Story 5.1: Define Scoring Criteria
 *
 * GET /api/criteria - List all criteria sets for authenticated user
 * POST /api/criteria - Create a new criteria set
 *
 * Returns:
 * - 200: List of criteria sets (GET)
 * - 201: Created criteria set (POST)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 409: Criteria set limit exceeded
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import {
  getCriteriaSetsForUser,
  createCriteriaSet,
  canCreateCriteriaSet,
  CriteriaSetLimitError,
} from "@/lib/services/criteria-service";
import {
  createCriteriaSetSchema,
  queryCriteriaSchema,
  MAX_CRITERIA_SETS_PER_USER,
} from "@/lib/validations/criteria-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { CriteriaVersion } from "@/lib/db/schema";

/**
 * Response types
 */
interface CriteriaListResponse {
  data: CriteriaVersion[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface CriteriaResponse {
  data: CriteriaVersion;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * GET /api/criteria
 *
 * Lists all criteria sets for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.1.3: Criteria organized by market/asset type
 *
 * Query Parameters:
 * - assetType: string (optional) - Filter by asset type
 * - targetMarket: string (optional) - Filter by target market
 * - isActive: boolean (optional) - Filter by active status (default: true)
 *
 * Response:
 * - data: Array of criteria set objects
 * - meta: Count, limit, and canCreate flag
 */
export const GET = withAuth<CriteriaListResponse | AuthError>(async (request, session) => {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const queryValidation = queryCriteriaSchema.safeParse(queryParams);

    // Build filters object, excluding undefined values for exactOptionalPropertyTypes
    let filters: { assetType?: string; targetMarket?: string; isActive?: boolean } | undefined;
    if (queryValidation.success) {
      const { assetType, targetMarket, isActive } = queryValidation.data;
      filters = {};
      if (assetType !== undefined) filters.assetType = assetType;
      if (targetMarket !== undefined) filters.targetMarket = targetMarket;
      if (isActive !== undefined) filters.isActive = isActive;
      if (Object.keys(filters).length === 0) filters = undefined;
    }

    const criteriaSets = await getCriteriaSetsForUser(session.userId, filters);
    const canCreate = await canCreateCriteriaSet(session.userId);

    return NextResponse.json<CriteriaListResponse>({
      data: criteriaSets,
      meta: {
        count: criteriaSets.length,
        limit: MAX_CRITERIA_SETS_PER_USER,
        canCreate,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch criteria sets", {
      errorMessage: error instanceof Error ? error.message : String(error),
      userId: session.userId,
    });
    return NextResponse.json<AuthError>(
      {
        error: "Failed to fetch criteria sets",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/criteria
 *
 * Creates a new criteria set for the authenticated user.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.1.1: Create new criterion set
 * AC-5.1.6: Creates version 1 with immutable versioning
 *
 * Request Body:
 * - assetType: string (e.g., "stock", "reit", "etf")
 * - targetMarket: string (e.g., "BR_BANKS", "US_TECH")
 * - name: string (1-100 characters)
 * - criteria: array of criterion rules
 *
 * Response:
 * - 201: Created criteria set
 * - 400: Validation error
 * - 409: Criteria set limit exceeded
 */
export const POST = withAuth<CriteriaResponse | ValidationError | AuthError>(
  async (request, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validationResult = createCriteriaSetSchema.safeParse(body);

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

      // Create criteria set
      const criteriaSet = await createCriteriaSet(session.userId, validationResult.data);

      return NextResponse.json<CriteriaResponse>({ data: criteriaSet }, { status: 201 });
    } catch (error) {
      // Handle criteria set limit error
      if (error instanceof CriteriaSetLimitError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "LIMIT_EXCEEDED",
          },
          { status: 409 }
        );
      }

      logger.error("Failed to create criteria set", {
        errorMessage: error instanceof Error ? error.message : String(error),
        userId: session.userId,
      });
      return NextResponse.json<AuthError>(
        {
          error: "Failed to create criteria set",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
