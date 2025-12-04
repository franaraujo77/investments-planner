/**
 * Forgot Password Page
 *
 * Story 2.5: Password Reset Flow
 *
 * AC-2.5.1: Forgot password form shows email input
 * AC-2.5.2: Same message shown regardless of email existence
 */

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot Password | Investments Planner",
  description: "Reset your Investments Planner password.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      {/* Branding / Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trusted investment portfolio advisor
        </p>
      </div>

      {/* Forgot Password Card */}
      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Forgot password?</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
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
