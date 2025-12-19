/**
 * Terms of Service Page
 *
 * Story 9.5: Terms of Service & Privacy Policy
 * AC-9.5.1: Terms of Service page accessible at /terms
 * AC-9.5.5: ToS includes required content sections
 *
 * Static page showing the Terms of Service.
 * Note: This is placeholder content for MVP. Content should be reviewed by legal counsel before production.
 */

import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Scale, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service | Investments Planner",
  description:
    "Terms of Service for Investments Planner - understand your rights and responsibilities when using our platform.",
};

export default function TermsPage() {
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-lg text-muted-foreground">Last updated: December 2024</p>
        </header>

        {/* Important Notice */}
        <section className="mb-12">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800 dark:text-amber-200">
                Please read these terms carefully before using Investments Planner. By using our
                service, you agree to be bound by these terms.
              </p>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <div className="prose prose-gray max-w-none dark:prose-invert space-y-8">
          {/* Section 1: Acceptance of Terms */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Scale className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold m-0">1. Acceptance of Terms</h2>
            </div>
            <p className="text-muted-foreground">
              By accessing or using Investments Planner (&quot;the Service&quot;), you agree to be
              bound by these Terms of Service. If you do not agree to these terms, please do not use
              the Service. We reserve the right to modify these terms at any time, and your
              continued use of the Service constitutes acceptance of any modifications.
            </p>
          </section>

          {/* Section 2: Description of Service */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              Investments Planner is a portfolio management tool that helps users:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Track investment portfolios and asset allocations</li>
              <li>Define personal scoring criteria for assets</li>
              <li>Receive calculated investment suggestions based on user-defined criteria</li>
              <li>Monitor portfolio performance and allocation drift</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              The Service provides <strong>informational tools only</strong> and does not provide
              financial, investment, tax, or legal advice.
            </p>
          </section>

          {/* Section 3: User Responsibilities */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">
              3. User Responsibilities and Acceptable Use
            </h2>
            <p className="text-muted-foreground mb-4">As a user of the Service, you agree to:</p>
            <ul className="text-muted-foreground space-y-2">
              <li>Provide accurate and complete information when creating an account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to gain unauthorized access to any part of the Service</li>
              <li>Not use the Service to violate any applicable laws or regulations</li>
              <li>Not share your account with others or create multiple accounts</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You are solely responsible for all activity that occurs under your account.
            </p>
          </section>

          {/* Section 4: Data Usage and Limitations */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">4. Data Usage and Limitations</h2>
            <p className="text-muted-foreground mb-4">
              The Service uses financial data from third-party providers. While we strive to provide
              accurate information:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                Data may be delayed or incomplete depending on market conditions and provider
                availability
              </li>
              <li>We do not guarantee the accuracy, completeness, or timeliness of any data</li>
              <li>
                You should verify any information independently before making investment decisions
              </li>
              <li>Historical data and past performance do not guarantee future results</li>
            </ul>
          </section>

          {/* Section 5: Liability Limitation */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">5. Liability Limitation and Disclaimers</h2>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50 mb-4">
              <p className="text-amber-800 dark:text-amber-200 font-semibold text-center">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
              </p>
            </div>
            <p className="text-muted-foreground mb-4">To the maximum extent permitted by law:</p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                We disclaim all warranties, express or implied, including merchantability and
                fitness for a particular purpose
              </li>
              <li>
                We are not liable for any direct, indirect, incidental, special, or consequential
                damages arising from your use of the Service
              </li>
              <li>
                We are not responsible for any investment losses or decisions made based on
                information provided by the Service
              </li>
              <li>
                The recommendations generated are mathematical calculations, not professional
                investment advice
              </li>
            </ul>
          </section>

          {/* Section 6: Account Termination */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">6. Account Termination</h2>
            <p className="text-muted-foreground mb-4">
              We reserve the right to suspend or terminate your account at any time if:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>You violate these Terms of Service</li>
              <li>You engage in fraudulent or illegal activity</li>
              <li>Your use of the Service poses a security risk</li>
              <li>Required by law or regulation</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You may terminate your account at any time through the account settings. Upon
              termination, your data will be handled according to our Privacy Policy.
            </p>
          </section>

          {/* Section 7: Modifications to Terms */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">7. Modifications to Terms</h2>
            <p className="text-muted-foreground">
              We may modify these Terms of Service at any time. When we make material changes, we
              will notify you by email or through the Service. Your continued use of the Service
              after such modifications constitutes your acceptance of the updated terms. We
              encourage you to review these terms periodically.
            </p>
          </section>

          {/* Section 8: Governing Law */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">8. Governing Law and Jurisdiction</h2>
            <p className="text-muted-foreground">
              These Terms of Service shall be governed by and construed in accordance with
              applicable laws. Any disputes arising from these terms or your use of the Service
              shall be resolved through appropriate legal channels. You agree to submit to the
              jurisdiction of the courts in the applicable jurisdiction for the resolution of any
              disputes.
            </p>
          </section>

          {/* Section 9: Contact Information */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">9. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> legal@investments-planner.example.com
                <br />
                <strong>Subject:</strong> Terms of Service Inquiry
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <footer className="border-t pt-8 mt-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            By using Investments Planner, you acknowledge that you have read and agree to these
            Terms of Service.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/privacy">View Privacy Policy</Link>
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
