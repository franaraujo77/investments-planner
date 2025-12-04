"use client";

/**
 * LogoutButton Component
 *
 * Story 2.4: User Logout
 *
 * AC-2.4.1: Clicking "Logout" terminates session and redirects to login
 * AC-2.4.2: JWT cookie is cleared
 * AC-2.4.3: Refresh token is invalidated in database
 * AC-2.4.4: No confirmation dialog required (immediate action)
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export interface LogoutButtonProps {
  /** Variant for different placement styles */
  variant?: "sidebar" | "menu" | "button";
  /** Show text label or icon-only */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LogoutButton - Handles user logout with loading state and redirect
 *
 * Features:
 * - Calls POST /api/auth/logout
 * - Shows loading spinner during request
 * - Redirects to /login on success
 * - Shows toast notification
 * - Handles errors gracefully (still redirects)
 * - No confirmation dialog (AC-2.4.4)
 */
export function LogoutButton({
  variant = "sidebar",
  showLabel = true,
  className,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleLogout() {
    // Prevent double-clicks
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        // Log error but still proceed to login
        console.error("Logout API error:", response.status);
      }

      // Show success toast
      toast.success("You have been logged out");

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      // Network error - still redirect to login
      console.error("Logout error:", error);
      toast.error("Logout encountered an error, but you have been signed out");
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }

  // Sidebar variant - uses SidebarMenuButton for consistent styling
  if (variant === "sidebar") {
    return (
      <SidebarMenuButton
        onClick={handleLogout}
        disabled={isLoading}
        tooltip="Logout"
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        )}
        {showLabel && <span>{isLoading ? "Logging out..." : "Logout"}</span>}
      </SidebarMenuButton>
    );
  }

  // Menu variant - for dropdown menus
  if (variant === "menu") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm disabled:opacity-50 disabled:pointer-events-none ${className || ""}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        )}
        {showLabel && <span>{isLoading ? "Logging out..." : "Logout"}</span>}
      </button>
    );
  }

  // Button variant - standard button for other placements
  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      aria-label={showLabel ? undefined : "Logout"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      {showLabel && <span>{isLoading ? "Logging out..." : "Logout"}</span>}
    </Button>
  );
}
