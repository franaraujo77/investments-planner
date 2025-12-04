/**
 * Reset Password Page
 *
 * Story 2.5: Password Reset Flow
 *
 * AC-2.5.4: Reset page shows new password form with complexity requirements
 * AC-2.5.6: Success redirect to login with toast
 */

import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset Password | Investments Planner",
  description: "Set your new Investments Planner password.",
};

export default function ResetPasswordPage() {
  return (
    <>
      {/* Branding / Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trusted investment portfolio advisor
        </p>
      </div>

      {/* Reset Password Card */}
      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {/* Back to login link */}
          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
