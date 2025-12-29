/**
 * Portfolio Edit Page
 *
 * Story 2.3: Edit Portfolio
 *
 * AC-2.3.1: Edit form access with pre-filled data
 * AC-2.3.9: Navigation back to portfolio detail after save
 */

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { COOKIE_NAMES } from "@/lib/auth/constants";
import {
  getPortfolioWithAssetTypes,
  PortfolioNotFoundError,
} from "@/lib/services/portfolio-service";
import { PortfolioEditForm } from "@/components/portfolio/portfolio-edit-form";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/telemetry/logger";

interface PortfolioEditPageProps {
  params: Promise<{ portfolioId: string }>;
}

export async function generateMetadata({ params }: PortfolioEditPageProps) {
  const { portfolioId } = await params;
  return {
    title: `Edit Portfolio | Investments Planner`,
    description: `Edit portfolio ${portfolioId} settings`,
  };
}

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

/**
 * Fetch portfolio data with error handling
 */
async function fetchPortfolioData(userId: string, portfolioId: string) {
  try {
    const portfolio = await getPortfolioWithAssetTypes(userId, portfolioId);

    if (!portfolio) {
      logger.warn("Portfolio not found or unauthorized for edit", {
        userId,
        portfolioId,
      });
      return null;
    }

    return portfolio;
  } catch (error) {
    if (error instanceof PortfolioNotFoundError) {
      logger.warn("Portfolio not found or unauthorized for edit", {
        userId,
        portfolioId,
      });
      return null;
    }

    throw error;
  }
}

export default async function PortfolioEditPage({ params }: PortfolioEditPageProps) {
  const { portfolioId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?redirect=/portfolio/${portfolioId}/edit`);
  }

  const portfolio = await fetchPortfolioData(session.userId, portfolioId);

  if (!portfolio) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb Navigation */}
      <nav
        className="flex items-center gap-2 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          href="/portfolio"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Portfolios
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/portfolio/${portfolioId}`}
          className="hover:text-foreground transition-colors"
        >
          {portfolio.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Edit</span>
      </nav>

      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Edit Portfolio</h1>
            <p className="text-muted-foreground">Update your portfolio settings and preferences.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/portfolio/${portfolioId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portfolio
            </Link>
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="rounded-lg border bg-card p-6">
        <PortfolioEditForm portfolio={portfolio} />
      </div>
    </div>
  );
}
