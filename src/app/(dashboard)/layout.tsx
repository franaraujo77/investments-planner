"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { VerificationGate } from "@/components/auth/verification-gate";
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
 * Wraps all dashboard pages with VerificationGate to ensure email is verified.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <VerificationGate>
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
                {/* User menu placeholder */}
                <div className="h-8 w-8 rounded-full bg-muted" aria-label="User menu" />
              </div>
            </header>
            <div className="flex-1 overflow-auto p-4 lg:p-6">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </VerificationGate>
    </UserProvider>
  );
}
