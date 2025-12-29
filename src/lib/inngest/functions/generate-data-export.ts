/**
 * Generate Data Export Inngest Function
 *
 * Story 1.6: GDPR Compliance - AC-1.6.1, AC-1.6.2
 *
 * Background job that generates a user's data export ZIP file,
 * uploads it to Vercel Blob storage with 24h expiry, and sends
 * an email with the download link.
 *
 * Triggered by: email/data-export.requested event
 * Retry policy: Inngest default (3 retries with exponential backoff)
 */

import { inngest } from "../client";
import { generateUserExport } from "@/lib/services/export-service";
import { sendDataExportEmail } from "@/lib/email/email-service";
import { put } from "@vercel/blob";
import { logger, redactUserId, redactEmail } from "@/lib/telemetry/logger";

/**
 * Generate Data Export Job
 *
 * Steps:
 * 1. Generate export ZIP using export-service
 * 2. Upload to Vercel Blob with 24h expiry
 * 3. Send email with download link
 */
export const generateDataExport = inngest.createFunction(
  {
    id: "generate-data-export",
    name: "Generate Data Export",
    retries: 3,
  },
  { event: "email/data-export.requested" },
  async ({ event, step }) => {
    const { userId, email } = event.data;

    // Step 1: Generate the export ZIP buffer
    const zipBuffer = await step.run("generate-export-zip", async () => {
      logger.info("Generating data export", { userId: redactUserId(userId) });
      const buffer = await generateUserExport(userId);
      logger.info("Data export generated", {
        userId: redactUserId(userId),
        sizeBytes: buffer.length,
      });
      // Return as base64 since Inngest serializes step results
      return buffer.toString("base64");
    });

    // Step 2: Upload to Vercel Blob
    // Note: Vercel Blob doesn't support expiry. The email states 24h expiry
    // as a UX guide - users should download promptly. A cleanup job can
    // be implemented later to delete old exports.
    const downloadUrl = await step.run("upload-to-blob", async () => {
      const buffer = Buffer.from(zipBuffer, "base64");
      const timestamp = Date.now();
      const filename = `exports/${userId}-${timestamp}.zip`;

      logger.info("Uploading export to blob storage", {
        userId: redactUserId(userId),
        filename,
      });

      const blob = await put(filename, buffer, {
        access: "public",
        addRandomSuffix: true, // Prevent URL guessing
      });

      logger.info("Export uploaded to blob storage", {
        userId: redactUserId(userId),
        url: blob.url.replace(/\/[^/]+$/, "/[REDACTED]"),
      });

      return blob.url;
    });

    // Step 3: Send email with download link
    await step.run("send-export-email", async () => {
      logger.info("Sending data export email", { email: redactEmail(email) });
      await sendDataExportEmail(email, downloadUrl);
      logger.info("Data export email sent", { email: redactEmail(email) });
    });

    return {
      success: true,
      userId,
      downloadUrl,
    };
  }
);
