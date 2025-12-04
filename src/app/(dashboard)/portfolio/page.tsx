/**
 * Portfolio Page
 *
 * Story 3.1: Create Portfolio
 * Story 3.6: Portfolio Overview with Values
 *
 * AC-3.1.1: Show empty state for users with no portfolios
 * AC-3.1.3: Show portfolio list when portfolios exist
 * AC-3.6.1: Portfolio table displays values
 * AC-3.6.4: Total portfolio value in base currency
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { COOKIE_NAMES } from "@/lib/auth/constants";
import { getUserPortfolios, canCreatePortfolio } from "@/lib/services/portfolio-service";
import { getUserProfile } from "@/lib/services/user-service";
import { PortfolioPageClient } from "./portfolio-page-client";

export const metadata = {
  title: "Portfolio | Investments Planner",
  description: "Manage your investment portfolios",
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

export default async function PortfolioPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/portfolio");
  }

  const [portfolios, canCreate, user] = await Promise.all([
    getUserPortfolios(session.userId),
    canCreatePortfolio(session.userId),
    getUserProfile(session.userId),
  ]);

  // Get user's base currency (default to USD)
  const baseCurrency = user?.baseCurrency ?? "USD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Portfolio</h1>
          <p className="text-muted-foreground">Manage your investment portfolios.</p>
        </div>
      </div>

      <PortfolioPageClient
        initialPortfolios={portfolios}
        canCreate={canCreate}
        baseCurrency={baseCurrency}
      />
    </div>
  );
}
