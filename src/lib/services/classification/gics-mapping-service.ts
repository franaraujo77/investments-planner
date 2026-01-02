/**
 * GICS Mapping Service
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.2: GICS Mapping - Map sector/industry text to GICS codes
 *
 * Provides utilities for:
 * 1. Looking up GICS codes from static reference data
 * 2. Fuzzy matching sector/industry text to GICS categories
 * 3. Deriving parent codes (sector from industry group, etc.)
 *
 * @module @/lib/services/classification/gics-mapping-service
 */

import {
  GICS_SECTORS,
  GICS_INDUSTRY_GROUPS,
  GICS_INDUSTRIES,
  type GicsSector,
  type GicsIndustryGroup,
  type GicsIndustry,
} from "@/lib/db/schema";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Full GICS classification hierarchy
 */
export interface GicsHierarchy {
  sector: GicsSector;
  industryGroup: GicsIndustryGroup;
  industry: GicsIndustry;
}

/**
 * Result of a GICS lookup or mapping
 */
export interface GicsMappingResult {
  /** The matched GICS industry */
  industry: GicsIndustry;
  /** The parent industry group */
  industryGroup: GicsIndustryGroup;
  /** The parent sector */
  sector: GicsSector;
  /** Confidence score: 1.0 = exact match, 0.8 = fuzzy, 0.5 = sector only */
  confidence: number;
  /** Match type for debugging */
  matchType: "exact" | "fuzzy" | "sector_only" | "default";
}

// =============================================================================
// REFERENCE DATA LOOKUP
// =============================================================================

/**
 * Get sector by ID
 *
 * @param sectorId - 2-digit sector code
 * @returns Sector or undefined if not found
 */
export function getSectorById(sectorId: string): GicsSector | undefined {
  return GICS_SECTORS.find((s) => s.id === sectorId);
}

/**
 * Get sector by name (case-insensitive)
 *
 * @param name - Sector name to search
 * @returns Sector or undefined if not found
 */
export function getSectorByName(name: string): GicsSector | undefined {
  const normalized = name.toLowerCase().trim();
  return GICS_SECTORS.find((s) => s.name.toLowerCase() === normalized);
}

/**
 * Get industry group by ID
 *
 * @param industryGroupId - 4-digit industry group code
 * @returns Industry group or undefined if not found
 */
export function getIndustryGroupById(industryGroupId: string): GicsIndustryGroup | undefined {
  return GICS_INDUSTRY_GROUPS.find((g) => g.id === industryGroupId);
}

/**
 * Get industry group by name (case-insensitive)
 *
 * @param name - Industry group name to search
 * @returns Industry group or undefined if not found
 */
export function getIndustryGroupByName(name: string): GicsIndustryGroup | undefined {
  const normalized = name.toLowerCase().trim();
  return GICS_INDUSTRY_GROUPS.find((g) => g.name.toLowerCase() === normalized);
}

/**
 * Get industry by ID
 *
 * @param industryId - 6-digit industry code
 * @returns Industry or undefined if not found
 */
export function getIndustryById(industryId: string): GicsIndustry | undefined {
  return GICS_INDUSTRIES.find((i) => i.id === industryId);
}

/**
 * Get industry by name (case-insensitive)
 *
 * @param name - Industry name to search
 * @returns Industry or undefined if not found
 */
export function getIndustryByName(name: string): GicsIndustry | undefined {
  const normalized = name.toLowerCase().trim();
  return GICS_INDUSTRIES.find((i) => i.name.toLowerCase() === normalized);
}

/**
 * Get full GICS hierarchy from industry ID
 *
 * @param industryId - 6-digit industry code
 * @returns Full hierarchy or undefined if not found
 */
export function getHierarchyByIndustryId(industryId: string): GicsHierarchy | undefined {
  const industry = getIndustryById(industryId);
  if (!industry) return undefined;

  const industryGroup = getIndustryGroupById(industry.industryGroupId);
  if (!industryGroup) return undefined;

  const sector = getSectorById(industryGroup.sectorId);
  if (!sector) return undefined;

  return { sector, industryGroup, industry };
}

/**
 * Get all industries for a sector
 *
 * @param sectorId - 2-digit sector code
 * @returns Array of industries in the sector
 */
export function getIndustriesBySector(sectorId: string): GicsIndustry[] {
  const industryGroups = GICS_INDUSTRY_GROUPS.filter((g) => g.sectorId === sectorId);
  const industryGroupIds = new Set(industryGroups.map((g) => g.id));
  return GICS_INDUSTRIES.filter((i) => industryGroupIds.has(i.industryGroupId));
}

/**
 * Get all industries for an industry group
 *
 * @param industryGroupId - 4-digit industry group code
 * @returns Array of industries in the group
 */
export function getIndustriesByGroup(industryGroupId: string): GicsIndustry[] {
  return GICS_INDUSTRIES.filter((i) => i.industryGroupId === industryGroupId);
}

// =============================================================================
// FUZZY MATCHING
// =============================================================================

/**
 * Common sector name aliases for fuzzy matching
 */
const SECTOR_ALIASES: Record<string, string> = {
  tech: "45",
  technology: "45",
  it: "45",
  software: "45",
  finance: "40",
  financial: "40",
  banking: "40",
  banks: "40",
  healthcare: "35",
  "health care": "35",
  pharma: "35",
  pharmaceutical: "35",
  energy: "10",
  oil: "10",
  gas: "10",
  utilities: "55",
  utility: "55",
  "real estate": "60",
  realestate: "60",
  reits: "60",
  consumer: "25",
  retail: "25",
  "consumer discretionary": "25",
  "consumer staples": "30",
  food: "30",
  beverage: "30",
  materials: "15",
  mining: "15",
  chemicals: "15",
  industrials: "20",
  industrial: "20",
  aerospace: "20",
  defense: "20",
  telecom: "50",
  telecommunications: "50",
  media: "50",
  entertainment: "50",
  communication: "50",
};

/**
 * Common industry name aliases for fuzzy matching
 */
const INDUSTRY_ALIASES: Record<string, string> = {
  // Software
  software: "451030",
  saas: "451030",
  "software development": "451030",
  // IT Services
  "it services": "451010",
  consulting: "451010",
  "tech consulting": "451010",
  // Banks
  bank: "401010",
  banking: "401010",
  banks: "401010",
  // Insurance
  insurance: "403010",
  insurer: "403010",
  // Oil & Gas
  "oil & gas": "101020",
  "oil and gas": "101020",
  petroleum: "101020",
  // Pharma
  pharmaceuticals: "352020",
  pharma: "352020",
  drugs: "352020",
  // Biotech
  biotechnology: "352010",
  biotech: "352010",
  // Semiconductors
  semiconductors: "453010",
  chips: "453010",
  semiconductor: "453010",
};

/**
 * Calculate simple similarity score between two strings
 *
 * @param a - First string
 * @param b - Second string
 * @returns Score between 0 and 1
 */
function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;

  // Check if one contains the other
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return 0.9;
  }

  // Simple word overlap score
  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));
  let matches = 0;
  for (const word of aWords) {
    if (bWords.has(word)) matches++;
  }
  const maxWords = Math.max(aWords.size, bWords.size);
  if (maxWords === 0) return 0;

  return matches / maxWords;
}

/**
 * Find best matching sector for a text description
 *
 * @param text - Text to match against sectors
 * @returns Best matching sector with confidence or undefined
 */
export function findMatchingSector(
  text: string
): { sector: GicsSector; confidence: number } | undefined {
  const normalized = text.toLowerCase().trim();

  // Check aliases first
  const aliasMatch = SECTOR_ALIASES[normalized];
  if (aliasMatch) {
    const sector = getSectorById(aliasMatch);
    if (sector) {
      return { sector, confidence: 0.95 };
    }
  }

  // Exact name match
  const exactMatch = getSectorByName(text);
  if (exactMatch) {
    return { sector: exactMatch, confidence: 1.0 };
  }

  // Fuzzy match
  let bestMatch: GicsSector | undefined;
  let bestScore = 0;

  for (const sector of GICS_SECTORS) {
    const score = stringSimilarity(text, sector.name);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = sector;
    }
  }

  if (bestMatch && bestScore >= 0.5) {
    return { sector: bestMatch, confidence: bestScore * 0.8 };
  }

  return undefined;
}

/**
 * Find best matching industry for a text description
 *
 * @param text - Text to match against industries
 * @param sectorId - Optional sector ID to limit search
 * @returns Best matching industry with confidence or undefined
 */
export function findMatchingIndustry(
  text: string,
  sectorId?: string
): { industry: GicsIndustry; confidence: number } | undefined {
  const normalized = text.toLowerCase().trim();

  // Check aliases first
  const aliasMatch = INDUSTRY_ALIASES[normalized];
  if (aliasMatch) {
    const industry = getIndustryById(aliasMatch);
    if (industry) {
      // Verify it's in the right sector if specified
      if (sectorId) {
        const hierarchy = getHierarchyByIndustryId(aliasMatch);
        if (hierarchy && hierarchy.sector.id !== sectorId) {
          // Alias doesn't match the specified sector, continue with fuzzy matching
        } else if (industry) {
          return { industry, confidence: 0.95 };
        }
      } else {
        return { industry, confidence: 0.95 };
      }
    }
  }

  // Exact name match
  const exactMatch = getIndustryByName(text);
  if (exactMatch) {
    if (sectorId) {
      const hierarchy = getHierarchyByIndustryId(exactMatch.id);
      if (hierarchy && hierarchy.sector.id === sectorId) {
        return { industry: exactMatch, confidence: 1.0 };
      }
    } else {
      return { industry: exactMatch, confidence: 1.0 };
    }
  }

  // Fuzzy match within sector (if specified)
  const searchIndustries = sectorId ? getIndustriesBySector(sectorId) : GICS_INDUSTRIES;

  let bestMatch: GicsIndustry | undefined;
  let bestScore = 0;

  for (const industry of searchIndustries) {
    const score = stringSimilarity(text, industry.name);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = industry;
    }
  }

  if (bestMatch && bestScore >= 0.4) {
    return { industry: bestMatch, confidence: bestScore * 0.8 };
  }

  return undefined;
}

// =============================================================================
// MAIN MAPPING FUNCTION
// =============================================================================

/**
 * Map sector and industry text to GICS codes
 *
 * AC-5.7.2: GICS Mapping - Get GICS codes from sector/industry text
 *
 * Strategy:
 * 1. Try exact industry match → confidence 1.0
 * 2. Try fuzzy industry match → confidence 0.8
 * 3. Try sector match and pick first industry → confidence 0.5
 * 4. Fall back to "Other" / default → confidence 0.0
 *
 * @param sector - Sector text (e.g., "Technology", "Energy")
 * @param industry - Industry text (e.g., "Software", "Oil & Gas")
 * @returns Mapping result with confidence score
 */
export function mapToGics(sector?: string, industry?: string): GicsMappingResult {
  logger.debug("GICS mapping attempt", { sector, industry });

  // Try exact industry match first
  if (industry) {
    const industryMatch = findMatchingIndustry(industry);
    if (industryMatch && industryMatch.confidence >= 0.9) {
      const hierarchy = getHierarchyByIndustryId(industryMatch.industry.id);
      if (hierarchy) {
        logger.debug("GICS exact industry match", {
          industry: industryMatch.industry.name,
          confidence: industryMatch.confidence,
        });
        return {
          industry: hierarchy.industry,
          industryGroup: hierarchy.industryGroup,
          sector: hierarchy.sector,
          confidence: industryMatch.confidence,
          matchType: "exact",
        };
      }
    }
  }

  // Try sector-constrained fuzzy industry match
  if (sector && industry) {
    const sectorMatch = findMatchingSector(sector);
    if (sectorMatch) {
      const industryMatch = findMatchingIndustry(industry, sectorMatch.sector.id);
      if (industryMatch && industryMatch.confidence >= 0.5) {
        const hierarchy = getHierarchyByIndustryId(industryMatch.industry.id);
        if (hierarchy) {
          logger.debug("GICS fuzzy industry match within sector", {
            sector: sectorMatch.sector.name,
            industry: industryMatch.industry.name,
            confidence: industryMatch.confidence,
          });
          return {
            industry: hierarchy.industry,
            industryGroup: hierarchy.industryGroup,
            sector: hierarchy.sector,
            confidence: Math.min(sectorMatch.confidence, industryMatch.confidence) * 0.9,
            matchType: "fuzzy",
          };
        }
      }
    }
  }

  // Try just sector match and pick first industry
  if (sector) {
    const sectorMatch = findMatchingSector(sector);
    if (sectorMatch) {
      const industries = getIndustriesBySector(sectorMatch.sector.id);
      if (industries.length > 0) {
        const firstIndustry = industries[0] as GicsIndustry;
        const hierarchy = getHierarchyByIndustryId(firstIndustry.id);
        if (hierarchy) {
          logger.debug("GICS sector-only match", {
            sector: sectorMatch.sector.name,
            defaultIndustry: firstIndustry.name,
            confidence: sectorMatch.confidence * 0.5,
          });
          return {
            industry: hierarchy.industry,
            industryGroup: hierarchy.industryGroup,
            sector: hierarchy.sector,
            confidence: sectorMatch.confidence * 0.5,
            matchType: "sector_only",
          };
        }
      }
    }
  }

  // Fall back to "Other" / default (using Financials > Financial Services > Financial Services)
  logger.warn("GICS mapping failed, using default", { sector, industry });
  const defaultIndustry = getIndustryById("402010") as GicsIndustry; // Financial Services
  const defaultHierarchy = getHierarchyByIndustryId("402010") as GicsHierarchy;

  return {
    industry: defaultIndustry,
    industryGroup: defaultHierarchy.industryGroup,
    sector: defaultHierarchy.sector,
    confidence: 0,
    matchType: "default",
  };
}

/**
 * Derive GICS codes from industry ID
 *
 * @param industryId - 6-digit industry code
 * @returns Object with industryGroupId and sectorId
 */
export function deriveGicsHierarchy(industryId: string): {
  industryGroupId: string;
  sectorId: string;
} {
  // Industry ID format: SSGGII where SS=sector, GG=industry group, II=industry
  // Actually, GICS uses: SS (sector), SSGG (industry group), SSGGII (industry)
  // So industryGroupId = first 4 chars, sectorId = first 2 chars
  const industryGroupId = industryId.substring(0, 4);
  const sectorId = industryId.substring(0, 2);
  return { industryGroupId, sectorId };
}
