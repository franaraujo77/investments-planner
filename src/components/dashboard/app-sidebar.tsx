"use client";

/**
 * AppSidebar Component
 *
 * Main navigation sidebar for the dashboard.
 *
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
            <div className="h-8 w-8 rounded-full bg-muted" aria-label="User avatar" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium">User</span>
              <span className="text-xs text-muted-foreground">user@example.com</span>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <LogoutButton
                variant="sidebar"
                showLabel={false}
                className="group-data-[collapsible=icon]:hidden"
              />
              <LogoutButton
                variant="sidebar"
                showLabel={false}
                className="hidden group-data-[collapsible=icon]:flex"
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
