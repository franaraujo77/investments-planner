/**
 * Detect Drift Alerts API Route
 *
 * Story 7.5: Allocation Drift Alerts
 * AC-7.5.1: Drift detection runs on login/dashboard load
 *
 * POST /api/alerts/detect-drift - Trigger drift detection for authenticated user
 *
 * This endpoint is called on dashboard load to ensure drift alerts
 * are up-to-date without waiting for the overnight job.
 *
 * Rate limiting: Client-side via sessionStorage (once per session)
 *
 * Returns:
 * - 200: Detection completed with results
 * - 401: Not authenticated
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { alertDetectionService } from "@/lib/services/alert-detection-service";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/telemetry/logger";
import type { AuthError } from "@/lib/auth/types";
import type { DriftDetectionResult } from "@/lib/services/alert-detection-service";

/**
 * Response type for drift detection
 */
interface DetectDriftResponse {
  data: {
    detected: boolean;
    alertsCreated: number;
    alertsUpdated: number;
    alertsDismissed: number;
    classesAnalyzed: number;
    durationMs: number;
  };
}

/**
 * POST /api/alerts/detect-drift
 *
 * Triggers drift detection for the authenticated user's portfolio.
 * Called on dashboard load to ensure alerts are current.
 *
 * Response:
 * - detected: Whether any new/updated drift alerts were found
 * - alertsCreated: Number of new alerts created
 * - alertsUpdated: Number of existing alerts updated
 * - alertsDismissed: Number of alerts auto-dismissed
 * - classesAnalyzed: Number of asset classes checked
 * - durationMs: Detection duration in milliseconds
 */
export const POST = withAuth<DetectDriftResponse | AuthError>(async (_request, session) => {
  try {
    // Get user's active portfolio
    const [portfolio] = await db
      .select({ id: portfolios.id })
      .from(portfolios)
      .where(eq(portfolios.userId, session.userId))
      .limit(1);

    if (!portfolio) {
      // No portfolio - return empty result (not an error)
      return NextResponse.json<DetectDriftResponse>({
        data: {
          detected: false,
          alertsCreated: 0,
          alertsUpdated: 0,
          alertsDismissed: 0,
          classesAnalyzed: 0,
          durationMs: 0,
        },
      });
    }

    logger.info("Starting login-time drift detection", {
      userId: session.userId,
      portfolioId: portfolio.id,
    });

    // Run drift detection
    const result: DriftDetectionResult = await alertDetectionService.detectDriftAlerts(
      session.userId,
      portfolio.id
    );

    if (result.error) {
      logger.error("Drift detection failed", {
        userId: session.userId,
        portfolioId: portfolio.id,
        error: result.error,
      });
    } else {
      logger.info("Login-time drift detection completed", {
        userId: session.userId,
        portfolioId: portfolio.id,
        classesAnalyzed: result.classesAnalyzed,
        alertsCreated: result.alertsCreated,
        alertsUpdated: result.alertsUpdated,
        alertsDismissed: result.alertsDismissed,
        durationMs: result.durationMs,
      });
    }

    const detected = result.alertsCreated > 0 || result.alertsUpdated > 0;

    return NextResponse.json<DetectDriftResponse>({
      data: {
        detected,
        alertsCreated: result.alertsCreated,
        alertsUpdated: result.alertsUpdated,
        alertsDismissed: result.alertsDismissed,
        classesAnalyzed: result.classesAnalyzed,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    const dbError = handleDbError(error, "detect drift alerts", { userId: session.userId });
    return databaseError(dbError, "alerts");
  }
});
