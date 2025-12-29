/**
 * New Portfolio Page
 *
 * Story 2.1: Create Portfolio
 *
 * AC-2.1.1: Portfolio creation form with all fields
 */

import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PortfolioCreateForm } from "@/components/portfolio/portfolio-create-form";

export const metadata: Metadata = {
  title: "Create Portfolio | Investments Planner",
  description: "Create a new investment portfolio",
};

export default function NewPortfolioPage() {
  return (
    <div className="container max-w-2xl py-8">
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/portfolios" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolios
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create New Portfolio</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new portfolio to track your investments.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg border bg-card p-6">
        <PortfolioCreateForm />
      </div>
    </div>
  );
}
