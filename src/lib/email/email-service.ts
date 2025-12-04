/**
 * Email Service
 *
 * Story 2.1: User Registration Flow - Stub implementation
 * Story 2.2: Email Verification - Resend integration
 *
 * Sends verification and password reset emails via Resend.
 * Falls back to logging in development without API key.
 */

import { Resend } from "resend";
import { logger, redactEmail } from "@/lib/telemetry/logger";

/**
 * Email configuration from environment
 */
const EMAIL_CONFIG = {
  /** Resend API key */
  apiKey: process.env.RESEND_API_KEY,
  /** From address for emails */
  fromAddress:
    process.env.EMAIL_FROM_ADDRESS ?? "Investments Planner <noreply@investmentsplanner.app>",
  /** Application name for email templates */
  appName: "Investments Planner",
  /** Base URL for verification links */
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/**
 * Resend client instance (lazy initialized)
 */
let resendClient: Resend | null = null;

/**
 * Gets the Resend client instance
 */
function getResendClient(): Resend | null {
  if (!EMAIL_CONFIG.apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(EMAIL_CONFIG.apiKey);
  }

  return resendClient;
}

/**
 * Email template for verification emails
 */
interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Generates verification email content
 *
 * @param email - Recipient email address
 * @param token - Verification token
 * @returns Email template with HTML and text content
 */
function generateVerificationEmailTemplate(email: string, token: string): EmailTemplate {
  // Use /verify route (AC-2.2.1)
  const verificationUrl = `${EMAIL_CONFIG.baseUrl}/verify?token=${token}`;

  const subject = `Verify your ${EMAIL_CONFIG.appName} account`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #0f172a; margin-bottom: 24px;">Welcome to ${EMAIL_CONFIG.appName}</h1>

  <p>Hi,</p>

  <p>Thank you for creating an account with ${EMAIL_CONFIG.appName}. To complete your registration and access your investment portfolio management features, please verify your email address.</p>

  <p style="margin: 32px 0;">
    <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Verify Email Address</a>
  </p>

  <p>Or copy and paste this link into your browser:</p>
  <p style="color: #3b82f6; word-break: break-all;">${verificationUrl}</p>

  <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
    This link will expire in 24 hours. If you didn't create an account with ${EMAIL_CONFIG.appName}, you can safely ignore this email.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

  <p style="color: #94a3b8; font-size: 12px;">
    ${EMAIL_CONFIG.appName} - Your trusted investment portfolio advisor
  </p>
</body>
</html>
  `.trim();

  const text = `
Welcome to ${EMAIL_CONFIG.appName}

Thank you for creating an account. To complete your registration, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with ${EMAIL_CONFIG.appName}, you can safely ignore this email.

---
${EMAIL_CONFIG.appName} - Your trusted investment portfolio advisor
  `.trim();

  return {
    to: email,
    subject,
    html,
    text,
  };
}

/**
 * Generates password reset email content
 *
 * @param email - Recipient email address
 * @param token - Password reset token
 * @returns Email template with HTML and text content
 */
function generatePasswordResetEmailTemplate(email: string, token: string): EmailTemplate {
  const resetUrl = `${EMAIL_CONFIG.baseUrl}/reset-password?token=${token}`;

  const subject = `Reset your ${EMAIL_CONFIG.appName} password`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #0f172a; margin-bottom: 24px;">Password Reset Request</h1>

  <p>Hi,</p>

  <p>We received a request to reset your ${EMAIL_CONFIG.appName} password. Click the button below to choose a new password:</p>

  <p style="margin: 32px 0;">
    <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Reset Password</a>
  </p>

  <p>Or copy and paste this link into your browser:</p>
  <p style="color: #3b82f6; word-break: break-all;">${resetUrl}</p>

  <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
    This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

  <p style="color: #94a3b8; font-size: 12px;">
    ${EMAIL_CONFIG.appName} - Your trusted investment portfolio advisor
  </p>
</body>
</html>
  `.trim();

  const text = `
Password Reset Request

We received a request to reset your ${EMAIL_CONFIG.appName} password. Click the link below to choose a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
${EMAIL_CONFIG.appName} - Your trusted investment portfolio advisor
  `.trim();

  return {
    to: email,
    subject,
    html,
    text,
  };
}

/**
 * Sends an email via Resend or logs to console in development
 *
 * @param template - Email template to send
 * @throws Error if Resend API call fails (in production)
 */
async function sendEmail(template: EmailTemplate): Promise<void> {
  const client = getResendClient();

  // Development fallback - log info
  if (!client) {
    logger.info("Email service in dev mode", {
      to: redactEmail(template.to),
      subject: template.subject,
      note: "Set RESEND_API_KEY to enable real email sending",
    });
    return;
  }

  // Send via Resend API
  const { error } = await client.emails.send({
    from: EMAIL_CONFIG.fromAddress,
    to: template.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (error) {
    logger.error("Email send error", { error: error.message, to: redactEmail(template.to) });
    throw new Error(`Failed to send email: ${error.message}`);
  }

  logger.info("Email sent successfully", { to: redactEmail(template.to) });
}

/**
 * Sends a verification email to the user
 *
 * Story 2.2: Email Verification
 * AC-2.2.1, AC-2.2.5
 *
 * @param email - Recipient email address
 * @param token - Verification token (JWT)
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const template = generateVerificationEmailTemplate(email, token);
  await sendEmail(template);
}

/**
 * Sends a password reset email
 *
 * Story 2.5: Password Reset Flow
 *
 * @param email - Recipient email address
 * @param token - Password reset token
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const template = generatePasswordResetEmailTemplate(email, token);
  await sendEmail(template);
}
