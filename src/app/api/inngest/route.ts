/**
 * Inngest API Route Handler
 *
 * Story 2.8: Account Deletion
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * This route handles Inngest events and function invocations.
 * Inngest uses this endpoint to:
 * - Receive events sent from the application
 * - Execute scheduled functions
 * - Handle retries and failures
 *
 * @see https://www.inngest.com/docs/sdk/serve
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { purgeDeletedUser } from "@/lib/inngest/functions/purge-deleted-user";

/**
 * Inngest serve handler
 *
 * Registers all Inngest functions and exposes GET/POST/PUT handlers
 * for the Inngest platform to communicate with.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    purgeDeletedUser,
    // Add more functions here as they are created
    // (e.g., overnight scoring job in Epic 8)
  ],
});
