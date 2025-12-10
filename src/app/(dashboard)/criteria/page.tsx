import { Metadata } from "next";
import { CriteriaPageClient } from "./criteria-page-client";

export const metadata: Metadata = {
  title: "Scoring Criteria",
  description: "Define criteria to evaluate and score assets based on your investment philosophy.",
};

/**
 * Criteria Page
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Server component that renders the criteria management interface.
 * AC-5.1.1: Create new criterion
 * AC-5.1.3: Criteria organized by market/asset type tabs
 * AC-5.1.4: CriteriaBlock interactions (CRUD, reorder)
 *
 * This page allows users to:
 * - View all their criteria sets organized by asset type
 * - Create new criteria sets
 * - Add, edit, and delete criteria within sets
 * - Reorder criteria via drag and drop
 * - See scoring points with color-coded indicators
 */
export default function CriteriaPage() {
  return <CriteriaPageClient />;
}
