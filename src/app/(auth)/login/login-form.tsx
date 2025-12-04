"use client";

/**
 * Login Form Component
 *
 * Story 2.3: User Login
 *
 * AC-2.3.1: Valid credentials redirect to dashboard
 * AC-2.3.2: Login form has email, password, "Remember me" checkbox
 * AC-2.3.3: Failed login shows "Invalid credentials" (no hints)
 * AC-2.3.4: Rate limit countdown display
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { loginFormSchema, type LoginFormInput } from "@/lib/auth/validation";

// localStorage key for lockout persistence
const LOCKOUT_STORAGE_KEY = "login_lockout_until";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = React.useState<number | null>(null);
  const [countdown, setCountdown] = React.useState<number>(0);

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
    mode: "onBlur", // Validate on blur per UX spec
  });

  // Check for persisted lockout on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (stored) {
      const until = parseInt(stored, 10);
      if (until > Date.now()) {
        setLockoutUntil(until);
      } else {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      }
    }
  }, []);

  // Countdown timer effect
  React.useEffect(() => {
    if (!lockoutUntil) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        setLockoutUntil(null);
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        setApiError(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  async function onSubmit(data: LoginFormInput) {
    // Prevent submission during lockout
    if (lockoutUntil && lockoutUntil > Date.now()) {
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limiting (AC-2.3.4)
        if (response.status === 429 && result.retryAfter) {
          const until = Date.now() + result.retryAfter * 1000;
          setLockoutUntil(until);
          localStorage.setItem(LOCKOUT_STORAGE_KEY, until.toString());
          setApiError(`Too many attempts. Try again in ${formatCountdown(result.retryAfter)}`);
          return;
        }

        // Handle email not verified
        if (result.code === "EMAIL_NOT_VERIFIED") {
          setApiError(result.error);
          return;
        }

        // Generic error (invalid credentials, etc.)
        setApiError(result.error || "Login failed");
        return;
      }

      // Success (AC-2.3.1)
      const userName = result.user?.name || result.user?.email?.split("@")[0] || "User";
      toast.success(`Welcome back, ${userName}!`);
      router.push("/dashboard");
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLocked = lockoutUntil !== null && lockoutUntil > Date.now();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* API Error Display */}
        {apiError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {apiError}
          </div>
        )}

        {/* Lockout Countdown Display (AC-2.3.4) */}
        {isLocked && countdown > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <div className="font-medium">Account temporarily locked</div>
            <div className="mt-1 text-lg font-mono">{formatCountdown(countdown)}</div>
          </div>
        )}

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isLocked}
                  {...field}
                />
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
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="pr-10"
                    disabled={isLocked}
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLocked}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-[14px]" />
            </FormItem>
          )}
        />

        {/* Remember Me Checkbox (AC-2.3.2) */}
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={field.onChange}
                  disabled={isLocked}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal cursor-pointer">Remember me</FormLabel>
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting || isLocked}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : isLocked ? (
            "Please wait..."
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </Form>
  );
}
