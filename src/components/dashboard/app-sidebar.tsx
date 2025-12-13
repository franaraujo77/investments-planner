"use client";

/**
 * AppSidebar Component
 *
 * Main navigation sidebar for the dashboard.
 *
 * Story 2.3: User Login - Display user name and email in footer
 * Story 2.4: User Logout - Added LogoutButton to footer
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ListChecks,
  History,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/user-context";
import { getDisplayName, getUserInitials } from "@/lib/utils/user";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase },
  { label: "Strategy", path: "/strategy", icon: Target },
  { label: "Criteria", path: "/criteria", icon: ListChecks },
  { label: "History", path: "/history", icon: History },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  return (
    <Sidebar collapsible="icon" aria-label="Main navigation">
      <SidebarHeader className="border-b">
        <div className="flex h-12 items-center px-2">
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Investments
          </span>
          <span className="hidden text-lg font-semibold group-data-[collapsible=icon]:block">
            IP
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.path} aria-current={isActive ? "page" : undefined}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-2">
            {/* User Avatar */}
            {isLoading ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
                aria-label="User avatar"
              >
                {user ? getUserInitials(user) : "?"}
              </div>
            )}
            {/* User Info */}
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </>
              ) : user ? (
                <>
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {getDisplayName(user)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {user.email}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Not logged in</span>
                  <span className="text-xs text-muted-foreground">-</span>
                </>
              )}
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <LogoutButton variant="sidebar" showLabel={false} />
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
