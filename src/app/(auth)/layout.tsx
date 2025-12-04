/**
 * Auth Layout
 *
 * Story 2.1: User Registration Flow
 * Centered layout for authentication pages (login, register, etc.)
 * No sidebar, responsive design.
 */

import * as React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">{children}</div>
    </div>
  );
}
