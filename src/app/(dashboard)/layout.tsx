"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { VerificationGate } from "@/components/auth/verification-gate";
import { DisclaimerCheck } from "@/components/disclaimer/disclaimer-check";
import { AlertDropdown } from "@/components/alerts";
import { UserProvider } from "@/contexts/user-context";

/**
 * Dashboard Layout
 *
 * Story 2.2: Email Verification
 * AC-2.2.4: Unverified users accessing dashboard routes redirect to verify-pending
 *
 * Story 2.3: User Login
 * Provides UserContext for components to access authenticated user data
 *
 * Story 9.4: Financial Disclaimers
 * AC-9.4.1: Shows disclaimer modal on first dashboard visit
 * AC-9.4.3: Blocks dashboard access until disclaimer is acknowledged
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.4: AlertDropdown shows EmptyAlerts when no alerts exist
 *
 * Wraps all dashboard pages with VerificationGate (email) and DisclaimerCheck (disclaimer).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // UserProvider must wrap VerificationGate so it can populate user data
    // VerificationGate fetches user from /api/auth/me and stores it in context
    // DisclaimerCheck uses UserContext to show disclaimer modal if not acknowledged
    <UserProvider>
      <VerificationGate>
        <DisclaimerCheck>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "240px",
                "--sidebar-width-icon": "64px",
              } as React.CSSProperties
            }
          >
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:h-16">
                <SidebarTrigger className="-ml-1 md:hidden" aria-label="Toggle sidebar" />
                <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
                <div className="flex flex-1 items-center justify-end gap-2">
                  {/* Story 9.6: AlertDropdown with EmptyAlerts state (AC-9.6.4) */}
                  <AlertDropdown />
                  {/* User menu placeholder */}
                  <div className="h-8 w-8 rounded-full bg-muted" aria-label="User menu" />
                </div>
              </header>
              <div className="flex-1 overflow-auto p-4 lg:p-6">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </DisclaimerCheck>
      </VerificationGate>
    </UserProvider>
  );
}
