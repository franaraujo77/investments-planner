/**
 * GICS Mapping Service Unit Tests
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.2: GICS Mapping - Map sector/industry text to GICS codes
 *
 * @module tests/unit/services/classification/gics-mapping-service.test
 */

import { describe, it, expect } from "vitest";
import {
  getSectorById,
  getSectorByName,
  getIndustryGroupById,
  getIndustryGroupByName,
  getIndustryById,
  getIndustryByName,
  getHierarchyByIndustryId,
  getIndustriesBySector,
  getIndustriesByGroup,
  findMatchingSector,
  findMatchingIndustry,
  mapToGics,
  deriveGicsHierarchy,
} from "@/lib/services/classification/gics-mapping-service";

// =============================================================================
// SECTOR LOOKUP TESTS
// =============================================================================

describe("getSectorById", () => {
  it("should return sector for valid ID", () => {
    const sector = getSectorById("45");
    expect(sector).toBeDefined();
    expect(sector?.name).toBe("Information Technology");
  });

  it("should return undefined for invalid ID", () => {
    const sector = getSectorById("99");
    expect(sector).toBeUndefined();
  });

  it("should return sector for all 11 GICS sectors", () => {
    const sectorIds = ["10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "60"];
    for (const id of sectorIds) {
      const sector = getSectorById(id);
      expect(sector).toBeDefined();
      expect(sector?.id).toBe(id);
    }
  });
});

describe("getSectorByName", () => {
  it("should return sector for exact name match", () => {
    const sector = getSectorByName("Information Technology");
    expect(sector).toBeDefined();
    expect(sector?.id).toBe("45");
  });

  it("should match case-insensitively", () => {
    const sector = getSectorByName("information technology");
    expect(sector).toBeDefined();
    expect(sector?.id).toBe("45");
  });

  it("should return undefined for non-existent name", () => {
    const sector = getSectorByName("Nonexistent Sector");
    expect(sector).toBeUndefined();
  });
});

// =============================================================================
// INDUSTRY GROUP LOOKUP TESTS
// =============================================================================

describe("getIndustryGroupById", () => {
  it("should return industry group for valid ID", () => {
    const group = getIndustryGroupById("4510");
    expect(group).toBeDefined();
    expect(group?.name).toBe("Software & Services");
  });

  it("should return undefined for invalid ID", () => {
    const group = getIndustryGroupById("9999");
    expect(group).toBeUndefined();
  });
});

describe("getIndustryGroupByName", () => {
  it("should return industry group for exact name match", () => {
    const group = getIndustryGroupByName("Banks");
    expect(group).toBeDefined();
    expect(group?.id).toBe("4010");
  });

  it("should match case-insensitively", () => {
    const group = getIndustryGroupByName("banks");
    expect(group).toBeDefined();
    expect(group?.id).toBe("4010");
  });
});

// =============================================================================
// INDUSTRY LOOKUP TESTS
// =============================================================================

describe("getIndustryById", () => {
  it("should return industry for valid ID", () => {
    const industry = getIndustryById("451030");
    expect(industry).toBeDefined();
    expect(industry?.name).toBe("Software");
  });

  it("should return undefined for invalid ID", () => {
    const industry = getIndustryById("999999");
    expect(industry).toBeUndefined();
  });
});

describe("getIndustryByName", () => {
  it("should return industry for exact name match", () => {
    const industry = getIndustryByName("Software");
    expect(industry).toBeDefined();
    expect(industry?.id).toBe("451030");
  });

  it("should match case-insensitively", () => {
    const industry = getIndustryByName("software");
    expect(industry).toBeDefined();
    expect(industry?.id).toBe("451030");
  });
});

// =============================================================================
// HIERARCHY TESTS
// =============================================================================

describe("getHierarchyByIndustryId", () => {
  it("should return full hierarchy for valid industry", () => {
    const hierarchy = getHierarchyByIndustryId("451030");
    expect(hierarchy).toBeDefined();
    expect(hierarchy?.industry.id).toBe("451030");
    expect(hierarchy?.industry.name).toBe("Software");
    expect(hierarchy?.industryGroup.id).toBe("4510");
    expect(hierarchy?.industryGroup.name).toBe("Software & Services");
    expect(hierarchy?.sector.id).toBe("45");
    expect(hierarchy?.sector.name).toBe("Information Technology");
  });

  it("should return undefined for invalid industry", () => {
    const hierarchy = getHierarchyByIndustryId("999999");
    expect(hierarchy).toBeUndefined();
  });
});

describe("getIndustriesBySector", () => {
  it("should return all industries for a sector", () => {
    const industries = getIndustriesBySector("45"); // Information Technology
    expect(industries.length).toBeGreaterThan(0);
    // All returned industries should belong to IT sector via their industry group
    for (const industry of industries) {
      const hierarchy = getHierarchyByIndustryId(industry.id);
      expect(hierarchy?.sector.id).toBe("45");
    }
  });

  it("should return empty array for invalid sector", () => {
    const industries = getIndustriesBySector("99");
    expect(industries).toEqual([]);
  });
});

describe("getIndustriesByGroup", () => {
  it("should return all industries for an industry group", () => {
    const industries = getIndustriesByGroup("4510"); // Software & Services
    expect(industries.length).toBeGreaterThan(0);
    for (const industry of industries) {
      expect(industry.industryGroupId).toBe("4510");
    }
  });

  it("should return empty array for invalid group", () => {
    const industries = getIndustriesByGroup("9999");
    expect(industries).toEqual([]);
  });
});

// =============================================================================
// FUZZY MATCHING TESTS
// =============================================================================

describe("findMatchingSector", () => {
  it("should match exact sector name", () => {
    const result = findMatchingSector("Information Technology");
    expect(result).toBeDefined();
    expect(result?.sector.id).toBe("45");
    expect(result?.confidence).toBe(1.0);
  });

  it("should match sector alias 'tech'", () => {
    const result = findMatchingSector("tech");
    expect(result).toBeDefined();
    expect(result?.sector.id).toBe("45");
    expect(result?.confidence).toBe(0.95);
  });

  it("should match sector alias 'technology'", () => {
    const result = findMatchingSector("technology");
    expect(result).toBeDefined();
    expect(result?.sector.id).toBe("45");
  });

  it("should match 'healthcare' to Health Care sector", () => {
    const result = findMatchingSector("healthcare");
    expect(result).toBeDefined();
    expect(result?.sector.id).toBe("35");
  });

  it("should match 'finance' to Financials sector", () => {
    const result = findMatchingSector("finance");
    expect(result).toBeDefined();
    expect(result?.sector.id).toBe("40");
  });

  it("should return undefined for completely unrelated text", () => {
    const result = findMatchingSector("xyzabc123");
    expect(result).toBeUndefined();
  });
});

describe("findMatchingIndustry", () => {
  it("should match exact industry name", () => {
    const result = findMatchingIndustry("Software");
    expect(result).toBeDefined();
    expect(result?.industry.id).toBe("451030");
    // "Software" matches via alias, so confidence is 0.95
    expect(result?.confidence).toBe(0.95);
  });

  it("should match industry alias 'saas'", () => {
    const result = findMatchingIndustry("saas");
    expect(result).toBeDefined();
    expect(result?.industry.id).toBe("451030"); // Software
    expect(result?.confidence).toBe(0.95);
  });

  it("should match 'banks' to Banks industry", () => {
    const result = findMatchingIndustry("banks");
    expect(result).toBeDefined();
    expect(result?.industry.id).toBe("401010");
  });

  it("should match 'pharma' to Pharmaceuticals industry", () => {
    const result = findMatchingIndustry("pharma");
    expect(result).toBeDefined();
    expect(result?.industry.id).toBe("352020");
  });

  it("should respect sector constraint when provided", () => {
    // "Software" should match when constrained to IT sector
    const resultIT = findMatchingIndustry("Software", "45");
    expect(resultIT).toBeDefined();
    expect(resultIT?.industry.id).toBe("451030");

    // "Banks" should not match when constrained to IT sector
    const resultBank = findMatchingIndustry("Banks", "45");
    // Banks is in Financials (40), not IT (45), so fuzzy match might fail
    // The function returns undefined or a different industry in this case
    if (resultBank) {
      expect(resultBank.industry.id).not.toBe("401010");
    }
  });
});

// =============================================================================
// MAIN MAPPING FUNCTION TESTS
// =============================================================================

describe("mapToGics", () => {
  it("should map exact industry to full hierarchy", () => {
    const result = mapToGics("Information Technology", "Software");
    expect(result.industry.id).toBe("451030");
    expect(result.industryGroup.id).toBe("4510");
    expect(result.sector.id).toBe("45");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.matchType).toBe("exact");
  });

  it("should map with industry alias", () => {
    const result = mapToGics("Technology", "saas");
    expect(result.industry.id).toBe("451030"); // Software
    expect(result.matchType).toBe("exact");
  });

  it("should fallback to sector-only match when industry is unknown", () => {
    const result = mapToGics("Energy", "Unknown Industry XYZ");
    expect(result.sector.id).toBe("10");
    expect(result.matchType).toBe("sector_only");
    expect(result.confidence).toBeLessThan(0.6);
  });

  it("should fallback to default when both sector and industry are unknown", () => {
    const result = mapToGics("Unknown Sector", "Unknown Industry");
    expect(result.matchType).toBe("default");
    expect(result.confidence).toBe(0);
  });

  it("should handle undefined sector and industry", () => {
    const result = mapToGics(undefined, undefined);
    expect(result.matchType).toBe("default");
    expect(result.confidence).toBe(0);
  });

  it("should map banks correctly", () => {
    const result = mapToGics("Financials", "Banks");
    expect(result.industry.id).toBe("401010");
    expect(result.sector.id).toBe("40");
  });

  it("should map pharmaceuticals correctly", () => {
    const result = mapToGics("Health Care", "Pharmaceuticals");
    expect(result.industry.id).toBe("352020");
    expect(result.sector.id).toBe("35");
  });

  it("should map semiconductors correctly", () => {
    const result = mapToGics("Information Technology", "Semiconductors");
    expect(result.industry.id).toBe("453010");
    expect(result.sector.id).toBe("45");
  });
});

// =============================================================================
// HIERARCHY DERIVATION TESTS
// =============================================================================

describe("deriveGicsHierarchy", () => {
  it("should derive industry group and sector from industry ID", () => {
    const result = deriveGicsHierarchy("451030"); // Software
    expect(result.industryGroupId).toBe("4510");
    expect(result.sectorId).toBe("45");
  });

  it("should derive correctly for different industries", () => {
    // Banks (401010)
    const banks = deriveGicsHierarchy("401010");
    expect(banks.industryGroupId).toBe("4010");
    expect(banks.sectorId).toBe("40");

    // Pharmaceuticals (352020)
    const pharma = deriveGicsHierarchy("352020");
    expect(pharma.industryGroupId).toBe("3520");
    expect(pharma.sectorId).toBe("35");
  });
});
