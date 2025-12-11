/**
 * Account Management API Route
 *
 * Story 2.8: Account Deletion
 *
 * DELETE /api/user/account - Delete user account (soft delete)
 *
 * Request body: { confirmation: "DELETE" }
 *
 * Returns:
 * - 200: Account scheduled for deletion with purge date
 * - 400: Invalid confirmation string
 * - 401: Not authenticated
 * - 500: Deletion failed
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError, type ErrorResponseBody } from "@/lib/api/responses";
import { deleteUserAccount, PURGE_DELAY_DAYS } from "@/lib/services/account-service";
import type { AuthError } from "@/lib/auth/types";

/**
 * Request schema for account deletion
 * AC-2.8.2: Requires typing "DELETE" to confirm
 */
const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

/**
 * Success response type
 */
interface DeleteAccountResponse {
  success: true;
  message: string;
  scheduledPurgeDate: string;
  gracePeriodDays: number;
}

/**
 * DELETE /api/user/account
 *
 * Soft deletes the authenticated user's account.
 * Requires typing "DELETE" as confirmation to prevent accidental deletion.
 *
 * AC-2.8.1: Accessible from Settings page
 * AC-2.8.2: Confirmation required (must type "DELETE")
 * AC-2.8.3: Cascade data deletion (soft delete + token cleanup)
 * AC-2.8.4: 30-day purge window
 * AC-2.8.5: Returns success response for logout/redirect
 *
 * @param request - NextRequest with JSON body { confirmation: "DELETE" }
 * @param session - User session from withAuth middleware
 * @returns JSON response with deletion status
 */
export const DELETE = withAuth<DeleteAccountResponse | ErrorResponseBody>(
  async (request: NextRequest, session) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = deleteAccountSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json<AuthError>(
          {
            error: 'You must type "DELETE" to confirm account deletion',
            code: "INVALID_CONFIRMATION",
          },
          { status: 400 }
        );
      }

      // Perform account deletion
      const result = await deleteUserAccount(session.userId);

      // Return success response
      // Client should clear cookies and redirect to homepage
      return NextResponse.json<DeleteAccountResponse>(
        {
          success: true,
          message: "Your account has been scheduled for deletion",
          scheduledPurgeDate: result.scheduledPurgeDate.toISOString(),
          gracePeriodDays: PURGE_DELAY_DAYS,
        },
        { status: 200 }
      );
    } catch (error) {
      const dbError = handleDbError(error, "delete user account");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "user account");
      }

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === "User not found") {
          return NextResponse.json<AuthError>(
            { error: "User not found", code: "USER_NOT_FOUND" },
            { status: 404 }
          );
        }
        if (error.message === "User account is already deleted") {
          return NextResponse.json<AuthError>(
            { error: "Account is already deleted", code: "ALREADY_DELETED" },
            { status: 400 }
          );
        }
      }

      // Generic error
      return NextResponse.json<AuthError>(
        { error: "Failed to delete account", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  }
);
