/**
 * User Data Export API Route
 *
 * Story 2.7: Data Export
 *
 * GET /api/user/export - Download user data as ZIP file
 *
 * Returns:
 * - 200: ZIP file containing portfolio.json, criteria.json, history.json, README.txt
 * - 401: Not authenticated
 * - 500: Export generation failed
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { generateUserExport } from "@/lib/services/export-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * GET /api/user/export
 *
 * Downloads the user's complete data export as a ZIP file.
 * Requires authentication via withAuth middleware.
 *
 * AC-2.7.1: Accessible from Settings page via "Export My Data" button
 * AC-2.7.2: Returns ZIP with portfolio.json, criteria.json, history.json, README.txt
 * AC-2.7.3: Export completes within 30 seconds
 * AC-2.7.4: JSON files are human-readable with schema version
 *
 * Response Headers:
 * - Content-Type: application/zip
 * - Content-Disposition: attachment; filename="investments-planner-export-{date}.zip"
 * - Content-Length: {buffer size}
 */
export const GET = withAuth(async (_request, session) => {
  try {
    // Generate the export ZIP buffer
    const zipBuffer = await generateUserExport(session.userId);

    // Format date for filename (YYYY-MM-DD)
    const date = new Date().toISOString().split("T")[0];

    // Return ZIP file as download response
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="investments-planner-export-${date}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json<AuthError>(
      {
        error: "Failed to generate export",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
});
