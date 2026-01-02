/**
 * GICS Reference Data API Route
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS Three-Tier Hierarchy
 * AC-5.7.7: Reference Data Seed
 *
 * GET /api/data/gics
 *
 * Returns GICS reference data including:
 * - All sectors (11 total)
 * - All industry groups (25 total)
 * - All industries (74+ total)
 *
 * This endpoint provides static reference data for UI components
 * such as classification dropdowns and filters.
 *
 * @module @/app/api/data/gics
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/telemetry/logger";
import { GICS_SECTORS, GICS_INDUSTRY_GROUPS, GICS_INDUSTRIES } from "@/lib/db/schema";
import type { AuthError } from "@/lib/auth/types";

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface GicsSectorData {
  id: string;
  name: string;
  description?: string;
}

interface GicsIndustryGroupData {
  id: string;
  name: string;
  sectorId: string;
  description?: string;
}

interface GicsIndustryData {
  id: string;
  name: string;
  industryGroupId: string;
  description?: string;
}

interface GicsReferenceResponse {
  data: {
    sectors: GicsSectorData[];
    industryGroups: GicsIndustryGroupData[];
    industries: GicsIndustryData[];
    stats: {
      sectorCount: number;
      industryGroupCount: number;
      industryCount: number;
    };
  };
}

// =============================================================================
// GET /api/data/gics
// =============================================================================

/**
 * GET /api/data/gics
 *
 * Fetch GICS reference data (sectors, industry groups, industries).
 * Requires authentication.
 *
 * Response:
 * - sectors: Array of all GICS sectors
 * - industryGroups: Array of all GICS industry groups
 * - industries: Array of all GICS industries
 * - stats: Counts of each category
 *
 * Data is loaded from static constants (no database call required).
 */
export const GET = withAuth<GicsReferenceResponse | AuthError>(async (_request, session) => {
  logger.info("Fetching GICS reference data", {
    userId: session.userId,
  });

  // Transform static data to response format
  // Handle TypeScript exactOptionalPropertyTypes by conditionally including description
  const sectors: GicsSectorData[] = GICS_SECTORS.map((s) => {
    const sector: GicsSectorData = { id: s.id, name: s.name };
    if (s.description !== undefined) {
      sector.description = s.description;
    }
    return sector;
  });

  const industryGroups: GicsIndustryGroupData[] = GICS_INDUSTRY_GROUPS.map((g) => {
    const group: GicsIndustryGroupData = { id: g.id, name: g.name, sectorId: g.sectorId };
    if (g.description !== undefined) {
      group.description = g.description;
    }
    return group;
  });

  const industries: GicsIndustryData[] = GICS_INDUSTRIES.map((i) => {
    const industry: GicsIndustryData = {
      id: i.id,
      name: i.name,
      industryGroupId: i.industryGroupId,
    };
    if (i.description !== undefined) {
      industry.description = i.description;
    }
    return industry;
  });

  logger.info("GICS reference data fetched successfully", {
    userId: session.userId,
    sectorCount: sectors.length,
    industryGroupCount: industryGroups.length,
    industryCount: industries.length,
  });

  return NextResponse.json<GicsReferenceResponse>({
    data: {
      sectors,
      industryGroups,
      industries,
      stats: {
        sectorCount: sectors.length,
        industryGroupCount: industryGroups.length,
        industryCount: industries.length,
      },
    },
  });
});
