"use client";

/**
 * Reset Password Form Component
 *
 * Story 2.5: Password Reset Flow
 *
 * AC-2.5.4: Reset page shows new password form with complexity requirements
 * AC-2.5.5: Session invalidation handled by API
 * AC-2.5.6: Success redirect to login with toast
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { AUTH_MESSAGES, PASSWORD_RULES } from "@/lib/auth/constants";

/**
 * Form validation schema with password confirmation
 */
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_RULES.MIN_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_SHORT)
      .max(PASSWORD_RULES.MAX_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_LONG)
      .refine((password) => /[a-z]/.test(password), {
        message: AUTH_MESSAGES.PASSWORD_MISSING_LOWERCASE,
      })
      .refine((password) => /[A-Z]/.test(password), {
        message: AUTH_MESSAGES.PASSWORD_MISSING_UPPERCASE,
      })
      .refine((password) => /\d/.test(password), {
        message: AUTH_MESSAGES.PASSWORD_MISSING_NUMBER,
      })
      .refine((password) => /[@$!%*?&]/.test(password), {
        message: AUTH_MESSAGES.PASSWORD_MISSING_SPECIAL,
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const newPassword = form.watch("newPassword");
  const isValid = form.formState.isValid;

  // Check if token is missing
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-red-600">Invalid Reset Link</h3>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid. Please request a new one.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/forgot-password")} className="mt-4">
          Request new link
        </Button>
      </div>
    );
  }

  async function onSubmit(data: ResetPasswordInput) {
    setIsSubmitting(true);
    setApiError(null);
    setErrorCode(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setApiError(result.error || "Something went wrong. Please try again.");
        setErrorCode(result.code || null);
        return;
      }

      // Success (AC-2.5.6)
      toast.success("Password reset successful! Please log in with your new password.");
      router.push("/login");
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* API Error Display */}
        {apiError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {apiError}
            {(errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_USED") && (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/forgot-password")}
                >
                  Request new link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Password Requirements */}
        <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Password requirements:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>At least 8 characters</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
            <li>At least one special character (@$!%*?&)</li>
          </ul>
        </div>

        {/* New Password Field */}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                New Password <span className="text-destructive">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-[14px]" />
              {/* Password Strength Meter */}
              {newPassword && <PasswordStrengthMeter password={newPassword} />}
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
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
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FormMessage className="text-[14px]" />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </Form>
  );
}
