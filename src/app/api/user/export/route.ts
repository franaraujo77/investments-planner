/**
 * User Data Export API Route
 *
 * Story 1.6: GDPR Compliance - Data Export
 * Story 2.7: Data Export (original implementation, now upgraded to async)
 *
 * POST /api/user/export - Request async data export (queued via Inngest)
 *
 * Returns:
 * - 200: Export request queued successfully
 * - 401: Not authenticated
 * - 429: Rate limited (1 request per 24 hours)
 * - 500: Export request failed
 */

import { withAuth } from "@/lib/auth/middleware";
import {
  successResponse,
  errorResponse,
  handleDbError,
  databaseError,
  type SuccessResponseBody,
  type ErrorResponseBody,
} from "@/lib/api/responses";
import { RATE_LIMIT_ERRORS } from "@/lib/api/error-codes";
import { cacheService } from "@/lib/cache/service";
import { createExportRateLimitKey } from "@/lib/cache/keys";
import { EXPORT_RATE_LIMIT_WINDOW } from "@/lib/cache/config";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger, redactUserId } from "@/lib/telemetry/logger";

interface ExportRequestResponse {
  message: string;
}

/**
 * POST /api/user/export
 *
 * Requests an async data export. The export is generated in the background
 * and the user receives an email with a download link when ready.
 *
 * Story 1.6: GDPR Compliance
 * AC-1.6.1: Export request queued, email sent when ready (within 24h)
 * AC-1.6.2: Export contains all user data in JSON format
 *
 * Rate Limit: 1 request per 24 hours per user
 *
 * Response:
 * - 200: { message: "Export requested. You'll receive an email within 24 hours." }
 * - 429: Rate limited
 */
export const POST = withAuth<SuccessResponseBody<ExportRequestResponse> | ErrorResponseBody>(
  async (_request, session) => {
    try {
      const rateLimitKey = createExportRateLimitKey(session.userId);

      // Check rate limit
      const existingRequest = await cacheService.get<number>(rateLimitKey);
      if (existingRequest) {
        logger.info("Export rate limited", { userId: redactUserId(session.userId) });
        return errorResponse(
          "Export already requested. Please wait 24 hours before requesting another export.",
          RATE_LIMIT_ERRORS.RATE_LIMITED,
          429
        );
      }

      // Fetch user email for the Inngest job
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user) {
        return errorResponse("User not found", "NOT_FOUND_USER", 404);
      }

      // Set rate limit BEFORE queueing the job (prevent race conditions)
      await cacheService.set(rateLimitKey, Date.now(), EXPORT_RATE_LIMIT_WINDOW);

      // Queue the export job via Inngest
      await inngest.send({
        name: "email/data-export.requested",
        data: {
          userId: session.userId,
          email: user.email,
        },
      });

      logger.info("Data export requested", { userId: redactUserId(session.userId) });

      return successResponse<ExportRequestResponse>({
        message: "Export requested. You'll receive an email with a download link within 24 hours.",
      });
    } catch (error) {
      const dbError = handleDbError(error, "request data export", { userId: session.userId });
      return databaseError(dbError, "data export request");
    }
  }
);
