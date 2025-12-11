/**
 * GET /api/health/db
 *
 * Database health check endpoint.
 * Returns database connectivity status and latency.
 *
 * Use this endpoint to:
 * - Monitor database availability in production
 * - Diagnose connection issues
 * - Verify database schema is accessible
 *
 * Response:
 * - 200: { status: "healthy", latency: "Xms" }
 * - 503: { status: "unhealthy", error: { ... } }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { extractDbError, toLogContext } from "@/lib/db/errors";
import { logger } from "@/lib/telemetry/logger";

interface HealthyResponse {
  status: "healthy";
  latency: string;
  timestamp: string;
}

interface UnhealthyResponse {
  status: "unhealthy";
  error: {
    message: string;
    category: string;
    code: string | undefined;
    cause: string | undefined;
    isConnectionError: boolean;
    isTimeout: boolean;
  };
  timestamp: string;
}

/**
 * GET /api/health/db
 *
 * Performs a simple database connectivity check.
 * Returns health status with latency measurement.
 */
export async function GET(): Promise<NextResponse<HealthyResponse | UnhealthyResponse>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Execute a simple query to verify connectivity
    await db.execute(sql`SELECT 1 as health_check`);

    const latency = Date.now() - startTime;

    return NextResponse.json<HealthyResponse>(
      {
        status: "healthy",
        latency: `${latency}ms`,
        timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    const latency = Date.now() - startTime;
    const dbError = extractDbError(error);

    // Log the health check failure with full context
    logger.error("Database health check failed", {
      ...toLogContext(dbError),
      latency: `${latency}ms`,
    });

    return NextResponse.json<UnhealthyResponse>(
      {
        status: "unhealthy",
        error: {
          message: dbError.message,
          category: dbError.category,
          code: dbError.code,
          cause: dbError.cause,
          isConnectionError: dbError.isConnectionError,
          isTimeout: dbError.isTimeout,
        },
        timestamp,
      },
      { status: 503 }
    );
  }
}
