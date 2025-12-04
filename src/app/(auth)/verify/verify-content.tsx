/**
 * Email Verification Content Component
 *
 * Story 2.2: Email Verification
 * AC-2.2.1: Clicking valid link activates account and redirects to login with toast
 * AC-2.2.2: Verification link expires after 24 hours with appropriate error message
 * AC-2.2.3: Link is single-use; reuse returns "Link already used" error
 *
 * Client component that handles useSearchParams for the verification page.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type VerificationState = "loading" | "success" | "expired" | "used" | "invalid" | "error";

interface VerificationResult {
  state: VerificationState;
  message: string;
}

export function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [result, setResult] = useState<VerificationResult>({
    state: "loading",
    message: "Verifying your email...",
  });

  useEffect(() => {
    async function verifyEmail() {
      // No token provided
      if (!token) {
        setResult({
          state: "invalid",
          message: "No verification token provided",
        });
        return;
      }

      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          // Success - redirect to login with toast (AC-2.2.1)
          setResult({
            state: "success",
            message: "Email verified successfully!",
          });

          toast.success("Email verified!", {
            description: "Please log in to continue.",
          });

          // Redirect after short delay for user to see success state
          setTimeout(() => {
            router.push("/login");
          }, 1500);
          return;
        }

        // Handle specific error codes
        switch (data.code) {
          case "TOKEN_EXPIRED":
            // AC-2.2.2
            setResult({
              state: "expired",
              message: "This verification link has expired",
            });
            break;

          case "TOKEN_ALREADY_USED":
            // AC-2.2.3
            setResult({
              state: "used",
              message: "This verification link has already been used",
            });
            break;

          case "INVALID_TOKEN":
            setResult({
              state: "invalid",
              message: data.error || "Invalid verification link",
            });
            break;

          default:
            setResult({
              state: "error",
              message: data.error || "An error occurred during verification",
            });
        }
      } catch {
        setResult({
          state: "error",
          message: "Failed to verify email. Please try again.",
        });
      }
    }

    verifyEmail();
  }, [token, router]);

  const getIcon = () => {
    switch (result.state) {
      case "loading":
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case "expired":
        return <Clock className="h-12 w-12 text-amber-500" />;
      case "used":
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case "invalid":
      case "error":
        return <XCircle className="h-12 w-12 text-destructive" />;
    }
  };

  const getTitle = () => {
    switch (result.state) {
      case "loading":
        return "Verifying...";
      case "success":
        return "Email Verified!";
      case "expired":
        return "Link Expired";
      case "used":
        return "Link Already Used";
      case "invalid":
        return "Invalid Link";
      case "error":
        return "Verification Failed";
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">{getIcon()}</div>
        <h2 className="text-2xl font-semibold tracking-tight">{getTitle()}</h2>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground">{result.message}</p>

        {/* Success message */}
        {result.state === "success" && (
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to login...</p>
        )}
      </CardContent>

      {/* Actions based on state */}
      <CardFooter className="flex flex-col space-y-4">
        {/* Expired or Used - show resend option */}
        {(result.state === "expired" || result.state === "used") && (
          <>
            <Link href="/verify-pending" className="w-full">
              <Button variant="default" className="w-full">
                Request New Verification Email
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </>
        )}

        {/* Invalid or Error - show login option */}
        {(result.state === "invalid" || result.state === "error") && (
          <>
            <Link href="/login" className="w-full">
              <Button variant="default" className="w-full">
                Back to Login
              </Button>
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              Need help?{" "}
              <Link
                href="/verify-pending"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Request a new verification email
              </Link>
            </p>
          </>
        )}

        {/* Success - show manual login link */}
        {result.state === "success" && (
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Go to Login Now
            </Button>
          </Link>
        )}

        {/* Loading - no actions */}
        {result.state === "loading" && (
          <p className="text-center text-sm text-muted-foreground">Please wait...</p>
        )}
      </CardFooter>
    </Card>
  );
}
