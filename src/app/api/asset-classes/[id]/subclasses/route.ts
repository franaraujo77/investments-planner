/**
 * Asset Class Subclasses API Routes
 *
 * Story 4.2: Define Subclasses
 *
 * GET /api/asset-classes/:id/subclasses - List all subclasses for an asset class
 * POST /api/asset-classes/:id/subclasses - Create a new subclass
 *
 * Returns:
 * - 200: List of subclasses (GET)
 * - 201: Created subclass (POST)
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Asset class not found
 * - 409: Subclass limit exceeded
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import {
  getSubclassesForClass,
  createSubclass,
  canCreateSubclass,
  AssetClassNotFoundError,
  SubclassLimitError,
  MAX_SUBCLASSES_PER_CLASS,
} from "@/lib/services/asset-class-service";
import { createSubclassSchema } from "@/lib/validations/asset-class-schemas";
import type { AuthError } from "@/lib/auth/types";
import type { AssetSubclass } from "@/lib/db/schema";

/**
 * Response types
 */
interface SubclassListResponse {
  data: AssetSubclass[];
  meta: {
    count: number;
    limit: number;
    canCreate: boolean;
  };
}

interface SubclassResponse {
  data: AssetSubclass;
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
 * GET /api/asset-classes/:id/subclasses
 *
 * Lists all subclasses for an asset class.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.2.1: View list of subclasses within asset class
 *
 * Response:
 * - data: Array of subclass objects
 * - meta: Count, limit, and canCreate flag
 */
export const GET = withAuth<SubclassListResponse | ValidationError | AuthError>(
  async (_request, session, context) => {
    try {
      const { id: classId } = await (context as RouteParams).params;

      const subclasses = await getSubclassesForClass(session.userId, classId);
      const canCreate = await canCreateSubclass(session.userId, classId);

      return NextResponse.json<SubclassListResponse>({
        data: subclasses,
        meta: {
          count: subclasses.length,
          limit: MAX_SUBCLASSES_PER_CLASS,
          canCreate,
        },
      });
    } catch (error) {
      if (error instanceof AssetClassNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const dbError = handleDbError(error, "list subclasses");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "subclasses");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to fetch subclasses",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/asset-classes/:id/subclasses
 *
 * Creates a new subclass for an asset class.
 * Requires authentication via withAuth middleware.
 *
 * AC-4.2.2: Create subclass with name (1-50 chars)
 *
 * Request Body:
 * - name: string (1-50 characters)
 *
 * Response:
 * - 201: Created subclass
 * - 400: Validation error
 * - 404: Asset class not found
 * - 409: Subclass limit exceeded
 */
export const POST = withAuth<SubclassResponse | ValidationError | AuthError>(
  async (request, session, context) => {
    try {
      const { id: classId } = await (context as RouteParams).params;

      // Parse and validate request body
      const body = await request.json();
      const validationResult = createSubclassSchema.safeParse(body);

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

      // Create subclass
      const subclass = await createSubclass(session.userId, classId, validationResult.data);

      return NextResponse.json<SubclassResponse>({ data: subclass }, { status: 201 });
    } catch (error) {
      // Handle asset class not found
      if (error instanceof AssetClassNotFoundError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Handle subclass limit error
      if (error instanceof SubclassLimitError) {
        return NextResponse.json<ValidationError>(
          {
            error: error.message,
            code: "LIMIT_EXCEEDED",
          },
          { status: 409 }
        );
      }

      const dbError = handleDbError(error, "create subclass");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "subclass");
      }

      return NextResponse.json<AuthError>(
        {
          error: "Failed to create subclass",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
