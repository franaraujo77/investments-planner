/**
 * Inngest API Route Handler
 *
 * Story 2.8: Account Deletion
 * Story 2.1, 2.2: Email Verification
 * Story 2.5: Password Reset Flow
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
import { inngest, functions } from "@/lib/inngest";

/**
 * Inngest serve handler
 *
 * Registers all Inngest functions and exposes GET/POST/PUT handlers
 * for the Inngest platform to communicate with.
 *
 * Functions include:
 * - purgeDeletedUser: Hard delete after 30-day grace period
 * - sendVerificationEmailJob: Verification emails with retries
 * - sendPasswordResetEmailJob: Password reset emails with retries
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
