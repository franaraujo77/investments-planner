/**
 * Verification Pending Content Component
 *
 * Story 2.2: Email Verification
 * AC-2.2.4: Unverified users accessing dashboard redirect to "Please verify your email" page
 * AC-2.2.5: "Resend verification email" link available
 *
 * Client component that handles useSearchParams for the verification pending page.
 */

"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ResendState = "idle" | "loading" | "success" | "error" | "rate-limited";

interface ResendResult {
  state: ResendState;
  message?: string;
  retryAfter?: number;
}

/**
 * Mask email for display (e.g., "t***@example.com")
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const maskedLocal = local.length > 1 ? local[0] + "*".repeat(local.length - 1) : local;

  return `${maskedLocal}@${domain}`;
}

export function VerifyPendingContent() {
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get("email");

  const [email, setEmail] = useState(emailFromParams || "");
  const [resendResult, setResendResult] = useState<ResendResult>({
    state: "idle",
  });

  // Memoize masked email to avoid recalculating on every render
  const maskedEmail = useMemo(() => {
    return emailFromParams ? maskEmail(emailFromParams) : null;
  }, [emailFromParams]);

  /**
   * Handle resend verification email
   */
  async function handleResend(e: React.FormEvent) {
    e.preventDefault();

    const emailToUse = emailFromParams || email;
    if (!emailToUse) return;

    setResendResult({ state: "loading" });

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setResendResult({
          state: "rate-limited",
          message: data.error,
          retryAfter: data.retryAfter,
        });
      } else if (response.ok) {
        setResendResult({
          state: "success",
          message: data.message,
        });
      } else {
        setResendResult({
          state: "error",
          message: data.error || "Failed to send verification email",
        });
      }
    } catch {
      setResendResult({
        state: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verify Your Email</CardTitle>
        <CardDescription>
          {maskedEmail ? (
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{maskedEmail}</span>
            </>
          ) : (
            "Please verify your email address to continue"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success State */}
        {resendResult.state === "success" && (
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Verification email sent! Please check your inbox.</AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {resendResult.state === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{resendResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Rate Limited State */}
        {resendResult.state === "rate-limited" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {resendResult.message}
              {resendResult.retryAfter && (
                <span className="block mt-1 text-sm">
                  Please wait {Math.ceil(resendResult.retryAfter / 60)} minutes before trying again.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Resend Form */}
        <form onSubmit={handleResend} className="space-y-4">
          {!emailFromParams && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={resendResult.state === "loading"}
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              resendResult.state === "loading" ||
              resendResult.state === "rate-limited" ||
              (!emailFromParams && !email)
            }
          >
            {resendResult.state === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendResult.state === "success" ? (
              "Resend Verification Email"
            ) : (
              "Send Verification Email"
            )}
          </Button>
        </form>

        {/* Tips */}
        <div className="rounded-lg bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium">Didn&apos;t receive the email?</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email</li>
            <li>• Wait a few minutes and try again</li>
          </ul>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col gap-2 text-center text-sm">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Back to Login
          </Link>
          <span className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Create account
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
