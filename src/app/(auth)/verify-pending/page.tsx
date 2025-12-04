/**
 * Verification Pending Page
 *
 * Story 2.2: Email Verification
 * AC-2.2.4: Unverified users accessing dashboard redirect to "Please verify your email" page
 * AC-2.2.5: "Resend verification email" link available
 */

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VerifyPendingContent } from "./verify-pending-content";

export const metadata = {
  title: "Verify Your Email | Investments Planner",
  description: "Please verify your email address to access your account.",
};

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function VerifyPendingPage() {
  return (
    <>
      {/* Branding / Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trusted investment portfolio advisor
        </p>
      </div>

      {/* Verification Pending Card - wrapped in Suspense for useSearchParams */}
      <Suspense fallback={<LoadingFallback />}>
        <VerifyPendingContent />
      </Suspense>
    </>
  );
}
