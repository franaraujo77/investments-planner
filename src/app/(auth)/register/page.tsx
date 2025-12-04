/**
 * Registration Page
 *
 * Story 2.1: User Registration Flow
 * Public page for new user registration.
 */

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata = {
  title: "Create Account | Investments Planner",
  description: "Create your Investments Planner account to manage your investment portfolio.",
};

export default function RegisterPage() {
  return (
    <>
      {/* Branding / Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trusted investment portfolio advisor
        </p>
      </div>

      {/* Registration Card */}
      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Create an account</h2>
          <p className="text-sm text-muted-foreground">
            Enter your details to get started with portfolio management
          </p>
        </CardHeader>
        <CardContent>
          <RegistrationForm />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
