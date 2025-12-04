/**
 * History Page
 *
 * Story 3.9: Investment History View
 *
 * AC-3.9.1: Show investment history timeline
 * AC-3.9.6: Show empty state for users with no investments
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { COOKIE_NAMES } from "@/lib/auth/constants";
import { getInvestmentHistory } from "@/lib/services/investment-service";
import { HistoryPageClient } from "./history-page-client";

export const metadata = {
  title: "Investment History | Investments Planner",
  description: "View your investment history and export records",
};

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export default async function HistoryPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/history");
  }

  // Fetch all investments initially (no filters)
  const initialHistory = await getInvestmentHistory(session.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Investment History</h1>
        <p className="text-muted-foreground">Track your investment decisions and export records.</p>
      </div>

      <HistoryPageClient initialHistory={initialHistory} />
    </div>
  );
}
