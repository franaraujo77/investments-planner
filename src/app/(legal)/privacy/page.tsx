/**
 * Privacy Policy Page
 *
 * Story 9.5: Terms of Service & Privacy Policy
 * AC-9.5.2: Privacy Policy page accessible at /privacy
 * AC-9.5.6: Privacy Policy includes required content sections
 *
 * Static page showing the Privacy Policy.
 * Note: This is placeholder content for MVP. Content should be reviewed by legal counsel before production.
 */

import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Database, Lock, Eye, UserCheck, Cookie, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy | Investments Planner",
  description:
    "Privacy Policy for Investments Planner - learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back to Dashboard Link */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-lg text-muted-foreground">Last updated: December 2024</p>
        </header>

        {/* Introduction */}
        <section className="mb-12">
          <div className="rounded-lg border bg-muted/50 p-6">
            <p className="text-muted-foreground">
              Your privacy is important to us. This Privacy Policy explains how Investments Planner
              collects, uses, stores, and protects your personal information. By using our Service,
              you consent to the practices described in this policy.
            </p>
          </div>
        </section>

        {/* Privacy Content */}
        <div className="prose prose-gray max-w-none dark:prose-invert space-y-8">
          {/* Section 1: Information We Collect */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">1. Information We Collect</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We collect the following types of information:
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">Account Information</h3>
            <ul className="text-muted-foreground space-y-2">
              <li>Email address (required for account creation)</li>
              <li>Name (optional, for personalization)</li>
              <li>Password (securely hashed, never stored in plain text)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Portfolio Data</h3>
            <ul className="text-muted-foreground space-y-2">
              <li>Asset holdings and quantities</li>
              <li>Investment amounts and history</li>
              <li>Portfolio allocation settings</li>
              <li>Scoring criteria and preferences</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Usage Information</h3>
            <ul className="text-muted-foreground space-y-2">
              <li>Log data (timestamps, feature usage)</li>
              <li>Device and browser information</li>
              <li>Performance and error data for service improvement</li>
            </ul>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">2. How We Use Your Information</h2>
            </div>
            <p className="text-muted-foreground mb-4">We use your information to:</p>
            <ul className="text-muted-foreground space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Calculate portfolio scores and generate investment recommendations</li>
              <li>Send important service notifications (account security, updates)</li>
              <li>Improve and optimize the Service based on usage patterns</li>
              <li>Respond to your requests and support inquiries</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>We do not:</strong> Sell your personal information to third parties, use your
              data for advertising, or share your portfolio details with other users.
            </p>
          </section>

          {/* Section 3: Data Storage and Retention */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">3. Data Storage and Retention</h2>
            </div>
            <p className="text-muted-foreground mb-4">Your data is stored securely:</p>
            <ul className="text-muted-foreground space-y-2">
              <li>Data is stored on secure cloud infrastructure with encryption at rest</li>
              <li>All data transmission uses HTTPS encryption</li>
              <li>Regular backups ensure data durability</li>
              <li>Access to production data is strictly limited to authorized personnel</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>Retention:</strong> We retain your data for as long as your account is active.
              Upon account deletion, your data is permanently removed within 30 days, except where
              retention is required by law.
            </p>
          </section>

          {/* Section 4: Data Sharing and Third Parties */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">4. Data Sharing and Third Parties</h2>
            <p className="text-muted-foreground mb-4">
              We may share your information in limited circumstances:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Service Providers:</strong> We use third-party services for hosting,
                analytics, and email delivery. These providers are contractually bound to protect
                your data.
              </li>
              <li>
                <strong>Financial Data Providers:</strong> We fetch market data from third-party
                APIs. Only asset symbols are shared; your personal information is never disclosed.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information when required by
                law, court order, or to protect our rights and safety.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We do not sell, trade, or rent your personal information to third parties for
              marketing purposes.
            </p>
          </section>

          {/* Section 5: User Rights */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">5. Your Rights</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data through account
                settings
              </li>
              <li>
                <strong>Correction:</strong> Update or correct your information at any time
              </li>
              <li>
                <strong>Deletion:</strong> Delete your account and all associated data
              </li>
              <li>
                <strong>Export:</strong> Download your portfolio data in a portable format
              </li>
              <li>
                <strong>Opt-out:</strong> Manage email preferences and notifications
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, visit your account settings or contact us at the email
              address provided below.
            </p>
          </section>

          {/* Section 6: Cookies and Tracking */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">6. Cookies and Tracking Technologies</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar technologies for:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Essential Cookies:</strong> Required for authentication and session
                management
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings and preferences
              </li>
              <li>
                <strong>Analytics:</strong> Understand how users interact with the Service to
                improve it
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can control cookie settings through your browser. Disabling essential cookies may
              affect your ability to use the Service.
            </p>
          </section>

          {/* Section 7: Security Measures */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">7. Security Measures</h2>
            <p className="text-muted-foreground mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Passwords are hashed using industry-standard algorithms</li>
              <li>All connections are encrypted using TLS/SSL</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication for all systems</li>
              <li>Monitoring for suspicious activity</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              While we take extensive measures to protect your data, no method of transmission or
              storage is 100% secure. Please use strong passwords and keep your credentials
              confidential.
            </p>
          </section>

          {/* Section 8: Changes to Policy */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">8. Changes to This Policy</h2>
            </div>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. When we make material changes, we
              will notify you by email or through a prominent notice on the Service. We encourage
              you to review this policy periodically. Your continued use of the Service after
              changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* Section 9: Contact Information */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">9. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or how we handle your data, please
              contact us:
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> privacy@investments-planner.example.com
                <br />
                <strong>Subject:</strong> Privacy Inquiry
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <footer className="border-t pt-8 mt-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            By using Investments Planner, you acknowledge that you have read and understand this
            Privacy Policy.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/terms">View Terms of Service</Link>
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
