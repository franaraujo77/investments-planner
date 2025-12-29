/**
 * Portfolio Detail Page
 *
 * Story 2.2: View Portfolio and Holdings
 *
 * AC-2.2.1: Holdings list display with asset name, quantity, price, value
 * AC-2.2.2: Base currency display with allocation percentages
 * AC-2.2.3: Empty state with "Add your first asset" CTA
 * AC-2.2.4: Holding detail navigation on row click
 */

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { COOKIE_NAMES } from "@/lib/auth/constants";
import {
  getPortfolioWithValues,
  getPortfolioWithAssetTypes,
  PortfolioNotFoundError,
} from "@/lib/services/portfolio-service";
import { PortfolioDetailClient } from "./portfolio-detail-client";
import { logger } from "@/lib/telemetry/logger";

interface PortfolioDetailPageProps {
  params: Promise<{ portfolioId: string }>;
}

export async function generateMetadata({ params }: PortfolioDetailPageProps) {
  const { portfolioId } = await params;
  return {
    title: `Portfolio | Investments Planner`,
    description: `View portfolio ${portfolioId} holdings and values`,
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
 * Separated from component to avoid JSX in try/catch
 */
async function fetchPortfolioData(userId: string, portfolioId: string) {
  try {
    // Fetch portfolio with values and asset types in parallel
    const [portfolioWithValues, portfolioWithAssetTypes] = await Promise.all([
      getPortfolioWithValues(userId, portfolioId),
      getPortfolioWithAssetTypes(userId, portfolioId),
    ]);

    // If portfolio not found (null from getPortfolioWithAssetTypes), return null
    if (!portfolioWithAssetTypes) {
      logger.warn("Portfolio not found or unauthorized", {
        userId,
        portfolioId,
      });
      return null;
    }

    return {
      portfolioWithValues,
      acceptedAssetTypes: portfolioWithAssetTypes.acceptedAssetTypes,
    };
  } catch (error) {
    // Handle portfolio not found error
    if (error instanceof PortfolioNotFoundError) {
      logger.warn("Portfolio not found or unauthorized", {
        userId,
        portfolioId,
      });
      return null;
    }

    // Re-throw other errors to be caught by error boundary
    throw error;
  }
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { portfolioId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?redirect=/portfolio/${portfolioId}`);
  }

  const portfolioData = await fetchPortfolioData(session.userId, portfolioId);

  // If portfolio data is null, show 404
  if (!portfolioData) {
    notFound();
  }

  return (
    <PortfolioDetailClient
      portfolioWithValues={portfolioData.portfolioWithValues}
      acceptedAssetTypes={portfolioData.acceptedAssetTypes}
    />
  );
}
