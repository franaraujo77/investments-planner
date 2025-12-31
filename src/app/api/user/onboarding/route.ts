/**
 * Onboarding API Routes
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.3: Tip Dismissal Persistence
 * AC-3.5.4: Reset Onboarding Tips Option
 *
 * GET /api/user/onboarding - Get dismissed tips array
 * POST /api/user/onboarding - Dismiss a tip
 * DELETE /api/user/onboarding - Reset all tips
 */

import { withAuth } from "@/lib/auth/middleware";
import {
  successResponse,
  validationError,
  handleDbError,
  databaseError,
} from "@/lib/api/responses";
import { onboardingService } from "@/lib/services/onboarding-service";
import { dismissTipRequestSchema } from "@/lib/validations/onboarding";
import { ONBOARDING_TIPS } from "@/lib/constants/onboarding-tips";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Data shape for GET /api/user/onboarding
 */
interface OnboardingData {
  tipsDismissed: string[];
  completedAt: string | null;
  totalTips: number;
}

/**
 * Data shape for POST /api/user/onboarding
 */
interface DismissTipData {
  success: boolean;
  tipId: string;
  tipsDismissed: string[];
}

/**
 * Data shape for DELETE /api/user/onboarding
 */
interface ResetTipsData {
  success: boolean;
  message: string;
}

/**
 * Wrapped response types for withAuth
 */
interface OnboardingResponse {
  data: OnboardingData;
}

interface DismissTipResponse {
  data: DismissTipData;
}

interface ResetTipsResponse {
  data: ResetTipsData;
}

// =============================================================================
// GET /api/user/onboarding
// =============================================================================

/**
 * GET /api/user/onboarding
 *
 * Returns the current user's dismissed onboarding tips.
 * Requires authentication.
 *
 * Response:
 * - 200: { tipsDismissed: string[], completedAt: string | null, totalTips: number }
 * - 401: Not authenticated
 */
export const GET = withAuth<OnboardingResponse>(async (_request, session) => {
  try {
    logger.debug("Fetching onboarding preferences", { userId: session.userId });

    const result = await onboardingService.getDismissedTips(session.userId);

    return successResponse({
      tipsDismissed: result.tipsDismissed,
      completedAt: result.completedAt?.toISOString() ?? null,
      totalTips: ONBOARDING_TIPS.length,
    });
  } catch (error) {
    const dbError = handleDbError(error, "fetch onboarding preferences", {
      userId: session.userId,
    });
    return databaseError(dbError, "onboarding preferences");
  }
});

// =============================================================================
// POST /api/user/onboarding
// =============================================================================

/**
 * POST /api/user/onboarding
 *
 * Dismisses a single onboarding tip for the current user.
 * Requires authentication.
 *
 * Request body:
 * - tipId: string - The ID of the tip to dismiss
 *
 * Response:
 * - 200: { success: true, tipId: string, tipsDismissed: string[] }
 * - 400: Validation error
 * - 401: Not authenticated
 */
export const POST = withAuth<DismissTipResponse>(async (request, session) => {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = dismissTipRequestSchema.safeParse(body);

    if (!parseResult.success) {
      logger.debug("Dismiss tip validation failed", {
        userId: session.userId,
        errorCount: parseResult.error.issues.length,
      });
      return validationError(parseResult.error.issues);
    }

    const { tipId } = parseResult.data;

    logger.debug("Dismissing onboarding tip", { userId: session.userId, tipId });

    // Dismiss the tip
    await onboardingService.dismissTip(session.userId, tipId);

    // Get updated dismissed tips
    const result = await onboardingService.getDismissedTips(session.userId);

    return successResponse({
      success: true,
      tipId,
      tipsDismissed: result.tipsDismissed,
    });
  } catch (error) {
    const dbError = handleDbError(error, "dismiss onboarding tip", {
      userId: session.userId,
    });
    return databaseError(dbError, "onboarding tip dismissal");
  }
});

// =============================================================================
// DELETE /api/user/onboarding
// =============================================================================

/**
 * DELETE /api/user/onboarding
 *
 * Resets all onboarding tips for the current user.
 * After reset, all tips will be shown again.
 * Requires authentication.
 *
 * Response:
 * - 200: { success: true, message: string }
 * - 401: Not authenticated
 */
export const DELETE = withAuth<ResetTipsResponse>(async (_request, session) => {
  try {
    logger.debug("Resetting onboarding tips", { userId: session.userId });

    await onboardingService.resetAllTips(session.userId);

    return successResponse({
      success: true,
      message: "Onboarding tips have been reset. You will see them again on relevant pages.",
    });
  } catch (error) {
    const dbError = handleDbError(error, "reset onboarding tips", {
      userId: session.userId,
    });
    return databaseError(dbError, "onboarding reset");
  }
});
