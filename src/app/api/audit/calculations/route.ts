/**
 * Audit Calculations API Route
 *
 * Story 8.6: Calculation Audit Trail
 *
 * GET /api/audit/calculations - Query calculation history for an asset
 *
 * AC-8.6.4: Users can query "Show all calculations for asset X"
 * - Returns calculation date, score, criteria version, breakdown
 * - Sorted by date descending
 * - Enforces tenant isolation
 *
 * Query Parameters:
 * - assetId (required): UUID of the asset to query
 * - startDate (optional): ISO date string, start of date range
 * - endDate (optional): ISO date string, end of date range
 * - limit (optional): Number of results (default: 50, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Returns:
 * - 200: Calculation history retrieved successfully
 * - 400: Invalid query parameters
 * - 401: Not authenticated
 * - 500: Server error
 */

import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import {
  successResponse,
  validationError,
  internalError,
  type ErrorResponseBody,
} from "@/lib/api/responses";
import { auditService, type CalculationHistoryResult } from "@/lib/services/audit-service";
import type { AuthError } from "@/lib/auth/types";
import { z } from "zod";

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Query parameter validation schema
 *
 * AC-8.6.4: Validate inputs with Zod schema
 */
const querySchema = z.object({
  assetId: z.string().uuid({ message: "assetId must be a valid UUID" }),
  startDate: z
    .string()
    .datetime({ message: "startDate must be a valid ISO date" })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .datetime({ message: "endDate must be a valid ISO date" })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50;
      const num = parseInt(val, 10);
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100);
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 0;
      const num = parseInt(val, 10);
      return isNaN(num) ? 0 : Math.max(num, 0);
    }),
});

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Calculation history API response body
 */
interface CalculationHistoryResponseBody {
  data: {
    calculations: CalculationHistoryResult["calculations"];
    totalCount: number;
    metadata: CalculationHistoryResult["metadata"];
  };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/audit/calculations
 *
 * Retrieves calculation history for a specific asset.
 *
 * AC-8.6.4: Users can query calculation history by asset
 * - Returns calculation date, score, criteria version, breakdown
 * - Sorted by date descending
 * - Enforces tenant isolation (user can only see their own data)
 *
 * Query Parameters:
 * - assetId (required): UUID of the asset to query
 * - startDate (optional): ISO date string, start of date range
 * - endDate (optional): ISO date string, end of date range
 * - limit (optional): Number of results (default: 50, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Response:
 * - 200: { data: { calculations, totalCount, metadata } }
 * - 400: Validation error (invalid assetId, dates, etc.)
 * - 401: Not authenticated
 * - 500: Server error
 */
export const GET = withAuth<CalculationHistoryResponseBody | ErrorResponseBody | AuthError>(
  async (request, session) => {
    const startTime = Date.now();

    try {
      // Extract query parameters
      const { searchParams } = new URL(request.url);
      const queryParams = {
        assetId: searchParams.get("assetId") || "",
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        limit: searchParams.get("limit") || undefined,
        offset: searchParams.get("offset") || undefined,
      };

      // Validate query parameters
      const validationResult = querySchema.safeParse(queryParams);

      if (!validationResult.success) {
        logger.debug("Audit calculations validation failed", {
          userId: session.userId,
          errorCount: validationResult.error.issues.length,
        });
        return validationError(validationResult.error.issues);
      }

      const { assetId, startDate, endDate, limit, offset } = validationResult.data;

      logger.info("Audit calculations request", {
        userId: session.userId,
        assetId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        limit,
        offset,
      });

      // Call audit service
      const result = await auditService.getCalculationHistory(session.userId, assetId, {
        startDate,
        endDate,
        limit,
        offset,
      });

      const durationMs = Date.now() - startTime;

      logger.info("Audit calculations retrieved", {
        userId: session.userId,
        assetId,
        calculationsFound: result.calculations.length,
        totalCount: result.totalCount,
        durationMs,
      });

      return successResponse({
        calculations: result.calculations,
        totalCount: result.totalCount,
        metadata: result.metadata,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;

      logger.error("Audit calculations error", {
        userId: session.userId,
        error: errorMessage,
        durationMs,
      });

      return internalError("Failed to retrieve calculation history");
    }
  }
);
