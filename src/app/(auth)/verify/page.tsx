/**
 * Email Verification Page
 *
 * Story 2.2: Email Verification
 * AC-2.2.1: Clicking valid link activates account and redirects to login with toast
 * AC-2.2.2: Verification link expires after 24 hours with appropriate error message
 * AC-2.2.3: Link is single-use; reuse returns "Link already used" error
 */

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VerifyContent } from "./verify-content";

export const metadata = {
  title: "Verify Email | Investments Planner",
  description: "Verify your email address to activate your account.",
};

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <>
      {/* Branding / Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trusted investment portfolio advisor
        </p>
      </div>

      {/* Verification Card - wrapped in Suspense for useSearchParams */}
      <Suspense fallback={<LoadingFallback />}>
        <VerifyContent />
      </Suspense>
    </>
  );
}
