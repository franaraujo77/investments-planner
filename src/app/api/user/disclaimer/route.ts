/**
 * Disclaimer API Routes
 *
 * Story 9.4: Financial Disclaimers
 * AC-9.4.3: User must acknowledge disclaimer before accessing dashboard
 * AC-9.4.4: Acknowledgment timestamp stored in user record
 *
 * GET /api/user/disclaimer - Get disclaimer acknowledgment status
 * POST /api/user/disclaimer - Acknowledge the disclaimer
 */

import { withAuth } from "@/lib/auth/middleware";
import { successResponse, handleDbError, databaseError } from "@/lib/api/responses";
import { disclaimerService } from "@/lib/services/disclaimer-service";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface DisclaimerStatusResponse {
  data: {
    acknowledged: boolean;
    acknowledgedAt: string | null;
  };
}

interface DisclaimerAcknowledgeResponse {
  data: {
    acknowledgedAt: string;
  };
}

// =============================================================================
// GET /api/user/disclaimer
// =============================================================================

/**
 * GET /api/user/disclaimer
 *
 * Returns the current user's disclaimer acknowledgment status.
 * Used by client to determine if disclaimer modal should be shown.
 * Requires authentication.
 *
 * Response:
 * - 200: { data: { acknowledged: boolean, acknowledgedAt: string | null } }
 * - 401: Not authenticated
 */
export const GET = withAuth<DisclaimerStatusResponse>(async (_request, session) => {
  try {
    logger.debug("Fetching disclaimer status", { userId: session.userId });

    const status = await disclaimerService.getDisclaimerStatus(session.userId);

    return successResponse({
      acknowledged: status.acknowledged,
      acknowledgedAt: status.acknowledgedAt?.toISOString() ?? null,
    });
  } catch (error) {
    const dbError = handleDbError(error, "fetch disclaimer status", {
      userId: session.userId,
    });
    return databaseError(dbError, "disclaimer status");
  }
});

// =============================================================================
// POST /api/user/disclaimer
// =============================================================================

/**
 * POST /api/user/disclaimer
 *
 * Acknowledges the financial disclaimer for the current user.
 * Idempotent - if already acknowledged, returns existing timestamp.
 * Requires authentication.
 *
 * Request body: {} (empty, no parameters needed)
 *
 * Response:
 * - 200: { data: { acknowledgedAt: string } }
 * - 401: Not authenticated
 * - 500: Database error
 */
export const POST = withAuth<DisclaimerAcknowledgeResponse>(async (_request, session) => {
  try {
    logger.info("User acknowledging disclaimer", { userId: session.userId });

    const acknowledgedAt = await disclaimerService.acknowledgeDisclaimer(session.userId);

    return successResponse({
      acknowledgedAt: acknowledgedAt.toISOString(),
    });
  } catch (error) {
    const dbError = handleDbError(error, "acknowledge disclaimer", {
      userId: session.userId,
    });
    return databaseError(dbError, "disclaimer acknowledgment");
  }
});
