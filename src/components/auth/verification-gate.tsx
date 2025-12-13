/**
 * Verification Gate Component
 *
 * Story 2.2: Email Verification
 * AC-2.2.4: Unverified users accessing dashboard routes redirect to "Please verify your email" page
 *
 * Story 2.3: User Login
 * Stores user data in UserContext for use by other components (e.g., sidebar)
 *
 * Client-side guard that checks emailVerified status and redirects if not verified.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser, type User } from "@/contexts/user-context";

interface VerificationGateProps {
  children: React.ReactNode;
}

type AuthState = "loading" | "verified" | "unverified" | "unauthenticated";

/**
 * Routes that unverified users can access
 */
const UNVERIFIED_ALLOWED_PATHS = ["/verify", "/verify-pending", "/logout"];

/**
 * Verification Gate
 *
 * Wraps protected content and ensures user's email is verified.
 * Redirects to /verify-pending if email is not verified.
 * Stores user data in UserContext for other components to access.
 */
export function VerificationGate({ children }: VerificationGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setIsLoading } = useUser();

  // Check if current path is allowed for unverified users (memoized)
  const isAllowedPath = useMemo(
    () =>
      UNVERIFIED_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
    [pathname]
  );

  // Set initial state based on path - if allowed, start as verified
  const [authState, setAuthState] = useState<AuthState>(() =>
    isAllowedPath ? "verified" : "loading"
  );

  useEffect(() => {
    // Skip verification check for allowed paths
    if (isAllowedPath) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Async verification check - setState only happens after awaited network call
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => {
        if (cancelled) return null;
        if (!response.ok) {
          setAuthState("unauthenticated");
          setIsLoading(false);
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled || !data) return;

        // Store user data in context for other components
        if (data.user) {
          const userData: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            baseCurrency: data.user.baseCurrency,
            emailVerified: data.user.emailVerified,
            createdAt: data.user.createdAt,
          };
          setUser(userData);
        }

        setIsLoading(false);

        if (data.user?.emailVerified) {
          setAuthState("verified");
        } else {
          setAuthState("unverified");
          // Redirect to verify-pending with email
          const email = data.user?.email;
          const verifyUrl = email
            ? `/verify-pending?email=${encodeURIComponent(email)}`
            : "/verify-pending";
          router.push(verifyUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState("unauthenticated");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAllowedPath, router, setUser, setIsLoading]);

  // Show loading state while checking
  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If unverified, don't render children (redirect in progress)
  if (authState === "unverified") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Verified or allowed path - render children
  return <>{children}</>;
}
