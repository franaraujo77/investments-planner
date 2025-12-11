/**
 * Criteria [id] API Routes
 *
 * Story 5.1: Define Scoring Criteria
 *
 * GET /api/criteria/:id - Get a single criteria set
 * PATCH /api/criteria/:id - Update a criteria set (creates new version)
 * DELETE /api/criteria/:id - Soft delete a criteria set
 *
 * Returns:
 * - 200: Criteria set data (GET, PATCH)
 * - 200: Success (DELETE)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Criteria set not found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getCriteriaById,
  updateCriteriaSet,
  deleteCriteriaSet,
  CriteriaNotFoundError,
} from "@/lib/services/criteria-service";
import { updateCriteriaSetSchema } from "@/lib/validations/criteria-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { CriteriaVersion } from "@/lib/db/schema";

/**
 * Response types
 */
interface CriteriaResponse {
  data: CriteriaVersion;
}

interface DeleteResponse {
  success: boolean;
}

interface ValidationError {
  error: string;
  code: string;
  details?: unknown;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/criteria/:id
 *
 * Gets a single criteria set by ID.
 * Requires authentication via withAuth middleware.
 *
 * Response:
 * - 200: Criteria set object
 * - 404: Criteria set not found
 */
export const GET = withAuth<CriteriaResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      const criteriaSet = await getCriteriaById(session.userId, id);

      if (!criteriaSet) {
        return NextResponse.json<ValidationError>(
          {
            error: "Criteria set not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json<CriteriaResponse>({ data: criteriaSet });
    } catch (error) {
      const dbError = handleDbError(error, "get criteria", { userId: session.userId });

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "get criteria");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch criteria set",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/criteria/:id
 *
 * Updates a criteria set by ID.
 * Creates a new version (immutable versioning) for content changes.
 * Requires authentication via withAuth middleware.
 *
 * AC-5.1.4: Edit any field
 * AC-5.1.6: Creates new version for content changes
 *
 * Request Body:
 * - name: string (optional, 1-100 characters)
 * - targetMarket: string (optional)
 * - criteria: array (optional, full criteria array replacement)
 * - isActive: boolean (optional, for soft delete/restore)
 *
 * Response:
 * - 200: Updated criteria set (new version if content changed)
 * - 400: Validation error
 * - 404: Criteria set not found
 */
export const PATCH = withAuth<CriteriaResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = updateCriteriaSetSchema.safeParse(body);

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

      // Update criteria set
      const criteriaSet = await updateCriteriaSet(session.userId, id, validationResult.data);

      return NextResponse.json<CriteriaResponse>({ data: criteriaSet });
    } catch (error) {
      if (error instanceof CriteriaNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "update criteria", { userId: session.userId });

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "update criteria");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to update criteria set",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/criteria/:id
 *
 * Soft deletes a criteria set by ID (marks as inactive).
 * Requires authentication via withAuth middleware.
 *
 * Response:
 * - 200: Success
 * - 404: Criteria set not found
 */
export const DELETE = withAuth<DeleteResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id } = await (context as RouteParams).params;

      // Delete the criteria set (soft delete)
      await deleteCriteriaSet(session.userId, id);

      return NextResponse.json<DeleteResponse>({ success: true });
    } catch (error) {
      if (error instanceof CriteriaNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "delete criteria", { userId: session.userId });

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "delete criteria");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to delete criteria set",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
