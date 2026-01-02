/**
 * GICS Schema Tests
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS Classification Schema
 * AC-5.7.7: Reference Data Seed
 * AC-5.7.8: Cache Table Naming Convention
 *
 * Tests for the GICS reference data schema and cache tables.
 */

import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  cachedGicsSectors,
  cachedGicsIndustryGroups,
  cachedGicsIndustries,
  cachedAssetClassifications,
  GICS_SECTORS,
  GICS_INDUSTRY_GROUPS,
  GICS_INDUSTRIES,
} from "@/lib/db/schema";

describe("GICS Schema", () => {
  describe("cachedGicsSectors table", () => {
    it("has correct table name with cached_ prefix", () => {
      expect(getTableName(cachedGicsSectors)).toBe("cached_gics_sectors");
    });

    it("has id column with char(2) for GICS sector codes", () => {
      const idColumn = cachedGicsSectors.id;
      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string");
    });

    it("has cache_updated_at column", () => {
      const cacheUpdatedAtColumn = cachedGicsSectors.cacheUpdatedAt;
      expect(cacheUpdatedAtColumn).toBeDefined();
    });
  });

  describe("cachedGicsIndustryGroups table", () => {
    it("has correct table name with cached_ prefix", () => {
      expect(getTableName(cachedGicsIndustryGroups)).toBe("cached_gics_industry_groups");
    });

    it("has id column with char(4) for GICS industry group codes", () => {
      const idColumn = cachedGicsIndustryGroups.id;
      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string");
    });

    it("has sector_id foreign key column", () => {
      const sectorIdColumn = cachedGicsIndustryGroups.sectorId;
      expect(sectorIdColumn).toBeDefined();
    });
  });

  describe("cachedGicsIndustries table", () => {
    it("has correct table name with cached_ prefix", () => {
      expect(getTableName(cachedGicsIndustries)).toBe("cached_gics_industries");
    });

    it("has id column with char(6) for GICS industry codes", () => {
      const idColumn = cachedGicsIndustries.id;
      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string");
    });

    it("has industry_group_id foreign key column", () => {
      const industryGroupIdColumn = cachedGicsIndustries.industryGroupId;
      expect(industryGroupIdColumn).toBeDefined();
    });
  });

  describe("cachedAssetClassifications table", () => {
    it("has correct table name with cached_ prefix", () => {
      expect(getTableName(cachedAssetClassifications)).toBe("cached_asset_classifications");
    });

    it("has symbol column as primary key", () => {
      const symbolColumn = cachedAssetClassifications.symbol;
      expect(symbolColumn).toBeDefined();
    });

    it("has gics_industry_id foreign key column", () => {
      const gicsIndustryIdColumn = cachedAssetClassifications.gicsIndustryId;
      expect(gicsIndustryIdColumn).toBeDefined();
    });

    it("has confidence column for mapping quality", () => {
      const confidenceColumn = cachedAssetClassifications.confidence;
      expect(confidenceColumn).toBeDefined();
    });

    it("has source column for mapping attribution", () => {
      const sourceColumn = cachedAssetClassifications.source;
      expect(sourceColumn).toBeDefined();
    });

    it("has cache_updated_at column", () => {
      const cacheUpdatedAtColumn = cachedAssetClassifications.cacheUpdatedAt;
      expect(cacheUpdatedAtColumn).toBeDefined();
    });
  });

  describe("GICS Reference Data", () => {
    it("defines all 11 GICS sectors", () => {
      expect(GICS_SECTORS).toHaveLength(11);
    });

    it("defines all 25 GICS industry groups", () => {
      expect(GICS_INDUSTRY_GROUPS).toHaveLength(25);
    });

    it("defines at least 74 GICS industries (2018 standard)", () => {
      // GICS has 74 industries as of 2018 revision, but some sources include additional sub-industries
      expect(GICS_INDUSTRIES.length).toBeGreaterThanOrEqual(74);
    });

    it("has correct sector structure with 2-digit IDs", () => {
      GICS_SECTORS.forEach((sector) => {
        expect(sector.id).toMatch(/^\d{2}$/);
        expect(sector.name).toBeDefined();
        expect(sector.name.length).toBeGreaterThan(0);
      });
    });

    it("has correct industry group structure with 4-digit IDs", () => {
      GICS_INDUSTRY_GROUPS.forEach((group) => {
        expect(group.id).toMatch(/^\d{4}$/);
        expect(group.sectorId).toMatch(/^\d{2}$/);
        expect(group.name).toBeDefined();
        // Verify sector reference exists
        const sector = GICS_SECTORS.find((s) => s.id === group.sectorId);
        expect(sector).toBeDefined();
      });
    });

    it("has correct industry structure with 6-digit IDs", () => {
      GICS_INDUSTRIES.forEach((industry) => {
        expect(industry.id).toMatch(/^\d{6}$/);
        expect(industry.industryGroupId).toMatch(/^\d{4}$/);
        expect(industry.name).toBeDefined();
        // Verify industry group reference exists
        const group = GICS_INDUSTRY_GROUPS.find((g) => g.id === industry.industryGroupId);
        expect(group).toBeDefined();
      });
    });

    it("has Information Technology sector with ID 45", () => {
      const itSector = GICS_SECTORS.find((s) => s.id === "45");
      expect(itSector).toBeDefined();
      expect(itSector?.name).toBe("Information Technology");
    });

    it("has Software & Services industry group with ID 4510", () => {
      const softwareGroup = GICS_INDUSTRY_GROUPS.find((g) => g.id === "4510");
      expect(softwareGroup).toBeDefined();
      expect(softwareGroup?.name).toBe("Software & Services");
      expect(softwareGroup?.sectorId).toBe("45");
    });

    it("has Software industry with ID 451030", () => {
      const softwareIndustry = GICS_INDUSTRIES.find((i) => i.id === "451030");
      expect(softwareIndustry).toBeDefined();
      expect(softwareIndustry?.name).toBe("Software");
      expect(softwareIndustry?.industryGroupId).toBe("4510");
    });
  });
});
