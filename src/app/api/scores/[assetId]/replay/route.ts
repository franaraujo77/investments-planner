/**
 * Score Replay API Routes
 *
 * Story 6.9: Calculation Breakdown Access
 * AC-6.9.5: Replay Produces Identical Results (Deterministic)
 *
 * POST /api/scores/[assetId]/replay - Replay a calculation and verify determinism
 *
 * Replays a previous calculation using the stored events and verifies
 * that the results are identical (deterministic).
 *
 * Returns:
 * - 200: Replay successful with verification result
 * - 400: Invalid correlation ID format
 * - 401: Not authenticated
 * - 404: No events found for correlation ID
 * - 500: Server error or non-deterministic result
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import {
  errorResponse,
  handleDbError,
  databaseError,
  type ErrorResponseBody,
} from "@/lib/api/responses";
import { VALIDATION_ERRORS, NOT_FOUND_ERRORS, INTERNAL_ERRORS } from "@/lib/api/error-codes";
import { z } from "zod";
import { verifyDeterminism } from "@/lib/events/replay";

/**
 * Zod schema for request body
 */
const replayRequestSchema = z.object({
  correlationId: z.string().uuid("Invalid correlation ID format"),
});

/**
 * Response types
 */
interface ReplayResponse {
  data: {
    /** Whether determinism was verified successfully */
    verified: boolean;
    /** Original score value */
    originalScore: string;
    /** Score from replay */
    replayScore: string;
    /** Whether original and replay match */
    matches: boolean;
    /** Correlation ID that was replayed */
    correlationId: string;
    /** Number of assets in the calculation */
    assetCount: number;
    /** Details of any discrepancies */
    discrepancies?: Array<{
      assetId: string;
      originalScore: string;
      replayScore: string;
    }>;
  };
}

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * POST /api/scores/[assetId]/replay
 *
 * Replays a calculation using stored events and verifies determinism.
 *
 * AC-6.9.5: Replay produces identical results
 *
 * Request Body:
 * - correlationId: UUID of the calculation to replay
 *
 * Response:
 * - verified: Whether the replay matched the original
 * - originalScore: Total score from original calculation
 * - replayScore: Total score from replay
 * - matches: Boolean indicating exact match
 * - discrepancies: Array of any mismatches (if any)
 */
export const POST = withAuth<ReplayResponse | ErrorResponseBody>(
  async (request, session, routeParams) => {
    try {
      // Extract assetId from params (for logging context)
      const { assetId } = await (routeParams as RouteParams).params;

      // Parse and validate request body
      const body = await (request as NextRequest).json();
      const parseResult = replayRequestSchema.safeParse(body);

      if (!parseResult.success) {
        logger.warn("Invalid replay request", {
          userId: session.userId,
          assetId,
          error: parseResult.error.issues[0]?.message,
        });

        return errorResponse(
          parseResult.error.issues[0]?.message || "Invalid correlation ID",
          VALIDATION_ERRORS.INVALID_INPUT
        );
      }

      const { correlationId } = parseResult.data;

      logger.info("Starting replay verification", {
        userId: session.userId,
        assetId,
        correlationId,
      });

      // Perform replay and verification
      const { verified, result } = await verifyDeterminism(correlationId);

      // Handle case where no events were found
      if (!result.success && result.error?.includes("No events found")) {
        logger.warn("No events found for replay", {
          userId: session.userId,
          correlationId,
        });

        return errorResponse(
          "No events found for correlation ID",
          NOT_FOUND_ERRORS.RESOURCE_NOT_FOUND
        );
      }

      // Handle other errors
      if (!result.success) {
        logger.error("Replay failed", {
          userId: session.userId,
          correlationId,
          error: result.error,
        });

        return errorResponse(result.error || "Replay failed", INTERNAL_ERRORS.INTERNAL_ERROR);
      }

      // Calculate aggregate scores for response
      const originalTotalScore = result.originalResults
        .reduce((sum, r) => sum + parseFloat(r.score), 0)
        .toFixed(4);

      const replayTotalScore = result.replayResults
        .reduce((sum, r) => sum + parseFloat(r.score), 0)
        .toFixed(4);

      logger.info("Replay verification complete", {
        userId: session.userId,
        correlationId,
        verified,
        matches: result.matches,
        assetCount: result.originalResults.length,
      });

      // Build response
      const response: ReplayResponse = {
        data: {
          verified,
          originalScore: originalTotalScore,
          replayScore: replayTotalScore,
          matches: result.matches,
          correlationId,
          assetCount: result.originalResults.length,
        },
      };

      // Include discrepancies if any
      if (result.discrepancies && result.discrepancies.length > 0) {
        response.data.discrepancies = result.discrepancies;
      }

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle database errors
      const dbError = handleDbError(error, "replay score calculation");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "replay score calculation");
      }

      // Check for non-deterministic error (thrown by replayCalculation)
      if (error instanceof Error && error.name === "NonDeterministicError") {
        logger.error("Non-deterministic calculation detected", {
          userId: session.userId,
          error: errorMessage,
        });

        return errorResponse(errorMessage, INTERNAL_ERRORS.INTERNAL_ERROR);
      }

      logger.error("Failed to replay calculation", {
        userId: session.userId,
        error: errorMessage,
      });

      return errorResponse("Failed to replay calculation", INTERNAL_ERRORS.INTERNAL_ERROR);
    }
  }
);
