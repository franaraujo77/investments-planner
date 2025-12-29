"use client";

/**
 * Registration Form Component
 *
 * Story 1.1: User Registration with Email
 *
 * AC-1.1.3: Email validation (RFC 5322) and password
 * AC-1.1.4: Password complexity requirements
 * AC-1.1.5: Confirm password must match password
 * AC-1.1.6: Financial disclaimer checkbox required
 * AC-1.1.9: Success message on registration
 * AC-1.1.11: Inline validation errors
 *
 * Additional Features:
 * - Password strength meter (visual feedback)
 * - Submit button disabled until form valid
 * - Terms of Service & Privacy Policy links
 */

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { registerFormSchema, type RegisterFormInput } from "@/lib/auth/validation";

interface RegistrationFormProps {
  /** Called on successful registration */
  onSuccess?: (data: { userId: string; email: string }) => void;
}

export function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const form = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      disclaimerAcknowledged: false,
    },
    // Use "all" mode to validate on both blur AND change events
    // This ensures isValid updates correctly for checkboxes (which don't blur on click)
    // while still showing errors primarily on blur for text fields
    mode: "all",
  });

  const password = form.watch("password");
  const isValid = form.formState.isValid;

  async function onSubmit(data: RegisterFormInput) {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      // Exclude confirmPassword from API call - backend doesn't need it
      const { confirmPassword: _confirmPassword, ...registrationData } = data;

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle field-specific errors (AC4)
        if (result.fields) {
          for (const [field, message] of Object.entries(result.fields)) {
            form.setError(field as keyof RegisterFormInput, {
              type: "server",
              message: message as string,
            });
          }
        }
        setApiError(result.error || "Registration failed");
        return;
      }

      // Success (AC8)
      setSuccessMessage(result.message);
      form.reset();
      onSuccess?.({ userId: result.user.id, email: result.user.email });
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // If registration was successful, show success message
  if (successMessage) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
        <div className="mb-2 text-2xl">&#x2705;</div>
        <h3 className="mb-2 font-semibold text-green-800 dark:text-green-200">
          Registration Successful
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* API Error Display */}
        {apiError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {apiError}
          </div>
        )}

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Email <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage className="text-[14px]" />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Password <span className="text-destructive">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label="Toggle visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-[14px]" />
              {/* Password Strength Meter (AC3) */}
              {password && <PasswordStrengthMeter password={password} />}
            </FormItem>
          )}
        />

        {/* Confirm Password Field (AC-1.1.5) */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Confirm Password <span className="text-destructive">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label="Toggle visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-[14px]" />
            </FormItem>
          )}
        />

        {/* Name Field (Optional) */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Your name (optional)"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[14px]" />
            </FormItem>
          )}
        />

        {/* Financial Disclaimer Checkbox (AC7) */}
        <FormField
          control={form.control}
          name="disclaimerAcknowledged"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  I acknowledge that this application provides educational information only and does
                  not constitute financial advice. Investment decisions should be made with
                  professional consultation. <span className="text-destructive">*</span>
                </FormLabel>
                <FormMessage className="text-[14px]" />
              </div>
            </FormItem>
          )}
        />

        {/* Legal Links - Story 9.5: AC-9.5.3 */}
        <p className="text-center text-sm text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>

        {/* Submit Button (AC5 - disabled until valid) */}
        <Button type="submit" className="w-full" disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </Form>
  );
}
