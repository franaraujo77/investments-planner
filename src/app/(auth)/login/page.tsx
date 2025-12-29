/**
 * Login Page
 *
 * Story 1.2: User Login and Session Management
 *
 * AC-1.2.1: Login form has email, password, "Remember me" checkbox
 * AC-1.2.2: Valid credentials redirect to dashboard with JWT tokens
 * AC-1.2.3: Failed login shows "Invalid email or password" (no enumeration hints)
 * AC-1.2.4: Unverified email shows "Please verify your email" with resend option
 * AC-1.2.5: Rate limit countdown display (15min lockout after 5 attempts)
 */

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | Investments Planner",
  description: "Log in to your Investments Planner account.",
};

export default function LoginPage() {
  return (
    <>
      {/* Branding / Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trusted investment portfolio advisor
        </p>
      </div>

      {/* Login Card */}
      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your portfolio
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {/* Resend verification link (AC-2.2.5) */}
          <div className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive verification email?{" "}
            <Link
              href="/verify-pending"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Resend verification
            </Link>
          </div>

          {/* Forgot password link (AC-2.5.1) */}
          <div className="text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Create account link */}
          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
