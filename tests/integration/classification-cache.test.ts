/**
 * Integration Tests: Classification Service Logic
 *
 * Story 5.7: Industry/Sector Classification Cache
 * Tests the classification service business logic:
 * - AC-5.7.2: GICS Mapping
 * - AC-5.7.4: Asset-to-classification mapping
 * - AC-5.7.6: Integration with overnight job
 *
 * Note: These tests focus on service logic without database/KV mocking.
 * The cache layer is tested separately in unit tests.
 */

import { describe, it, expect, vi } from "vitest";

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// GICS MAPPING INTEGRATION TESTS
// =============================================================================

describe("GICS Mapping Integration", () => {
  describe("mapToGics with various provider formats", () => {
    it("should map Yahoo Finance sector/industry format", async () => {
      const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

      // Yahoo Finance uses formats like "Technology" and "Software—Application"
      const result = mapToGics("Technology", "Software—Application");

      // Should map to Software industry in IT sector
      expect(result.sector.id).toBe("45");
      expect(result.sector.name).toBe("Information Technology");
    });

    it("should map Alpha Vantage sector/industry format", async () => {
      const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

      // Alpha Vantage uses formats like "TECHNOLOGY" and "COMPUTER & OFFICE EQUIPMENT"
      const result = mapToGics("TECHNOLOGY", "COMPUTER & OFFICE EQUIPMENT");

      expect(result.sector.id).toBe("45");
    });

    it("should map Brazilian market sector/industry", async () => {
      const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

      // Common Brazilian market classifications
      const bankResult = mapToGics("Financials", "Bancos");
      expect(bankResult.sector.id).toBe("40"); // Should still map to Financials

      // "Energia" is not an alias, so it falls to sector-only match using Energy alias
      const oilResult = mapToGics("Energy", "Petróleo e Gás");
      expect(oilResult.sector.id).toBe("10"); // Should map to Energy
    });
  });
});

// =============================================================================
// FUNDAMENTALS TO CLASSIFICATION TESTS
// =============================================================================

describe("Fundamentals to Classification Integration", () => {
  it("should convert real-world fundamentals response", async () => {
    const { fundamentalsToClassification } =
      await import("@/lib/services/classification/classification-service");

    // Simulating a real fundamentals response
    const fundamentals = {
      symbol: "PETR4",
      peRatio: "5.2",
      pbRatio: "1.1",
      dividendYield: "12.5",
      marketCap: "450000000000",
      sector: "Energy",
      industry: "Oil & Gas",
      source: "brapi-provider",
      fetchedAt: new Date("2024-01-15T10:00:00Z"),
      dataDate: new Date("2024-01-15"),
    };

    const result = fundamentalsToClassification(fundamentals);

    expect(result.symbol).toBe("PETR4");
    expect(result.gicsSectorId).toBe("10"); // Energy
    expect(result.sectorName).toBe("Energy");
    expect(result.source).toBe("brapi-provider");
  });

  it("should handle multiple fundamentals in batch", async () => {
    const { fundamentalsToClassification } =
      await import("@/lib/services/classification/classification-service");

    const fundamentalsList = [
      {
        symbol: "ITUB4",
        sector: "Financials",
        industry: "Banks",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
      {
        symbol: "PETR4",
        sector: "Energy",
        industry: "Oil & Gas",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
      {
        symbol: "VALE3",
        sector: "Materials",
        industry: "Mining",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
      {
        symbol: "WEGE3",
        sector: "Industrials",
        industry: "Machinery",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
    ];

    const results = fundamentalsList.map((f) => fundamentalsToClassification(f));

    expect(results).toHaveLength(4);
    expect(results[0]?.gicsSectorId).toBe("40"); // Financials
    expect(results[1]?.gicsSectorId).toBe("10"); // Energy
    expect(results[2]?.gicsSectorId).toBe("15"); // Materials
    expect(results[3]?.gicsSectorId).toBe("20"); // Industrials
  });
});

// =============================================================================
// GICS HIERARCHY TESTS
// =============================================================================

describe("GICS Hierarchy Integration", () => {
  it("should correctly derive hierarchy from industry code", async () => {
    const { getGicsHierarchy } =
      await import("@/lib/services/classification/classification-service");

    // Test several industries
    const testCases = [
      { industryId: "451030", expectedSectorId: "45", expectedGroupId: "4510" },
      { industryId: "401010", expectedSectorId: "40", expectedGroupId: "4010" },
      { industryId: "352020", expectedSectorId: "35", expectedGroupId: "3520" },
      { industryId: "101020", expectedSectorId: "10", expectedGroupId: "1010" },
    ];

    for (const tc of testCases) {
      const result = getGicsHierarchy(tc.industryId);
      expect(result).not.toBeNull();
      expect(result?.sectorId).toBe(tc.expectedSectorId);
      expect(result?.industryGroupId).toBe(tc.expectedGroupId);
    }
  });

  it("should maintain parent-child relationships in hierarchy", async () => {
    const { getHierarchyByIndustryId } =
      await import("@/lib/services/classification/gics-mapping-service");

    const hierarchy = getHierarchyByIndustryId("451030"); // Software

    expect(hierarchy).toBeDefined();
    expect(hierarchy?.industry.industryGroupId).toBe(hierarchy?.industryGroup.id);
    expect(hierarchy?.industryGroup.sectorId).toBe(hierarchy?.sector.id);
  });
});

// =============================================================================
// CONFIDENCE SCORE TESTS
// =============================================================================

describe("Classification Confidence Scores", () => {
  it("should return high confidence for exact matches", async () => {
    const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

    const result = mapToGics("Information Technology", "Software");

    expect(parseFloat(String(result.confidence))).toBeGreaterThanOrEqual(0.9);
    expect(result.matchType).toBe("exact");
  });

  it("should return lower confidence for sector-only matches", async () => {
    const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

    // When industry can't be matched, falls back to sector-only
    const result = mapToGics("Tech", "SaaS Applications");

    expect(result.matchType).toBe("sector_only");
    expect(parseFloat(String(result.confidence))).toBeLessThan(0.9);
    expect(parseFloat(String(result.confidence))).toBeGreaterThan(0);
  });

  it("should return zero confidence for default fallback", async () => {
    const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

    const result = mapToGics("Unknown Sector XYZ", "Unknown Industry ABC");

    expect(result.matchType).toBe("default");
    expect(result.confidence).toBe(0);
  });
});

// =============================================================================
// SECTOR COVERAGE TESTS
// =============================================================================

describe("GICS Sector Coverage", () => {
  it("should map to all 11 GICS sectors", async () => {
    const { mapToGics } = await import("@/lib/services/classification/gics-mapping-service");

    const sectorMappings = [
      { sector: "Energy", expectedId: "10" },
      { sector: "Materials", expectedId: "15" },
      { sector: "Industrials", expectedId: "20" },
      { sector: "Consumer Discretionary", expectedId: "25" },
      { sector: "Consumer Staples", expectedId: "30" },
      { sector: "Health Care", expectedId: "35" },
      { sector: "Financials", expectedId: "40" },
      { sector: "Information Technology", expectedId: "45" },
      { sector: "Communication Services", expectedId: "50" },
      { sector: "Utilities", expectedId: "55" },
      { sector: "Real Estate", expectedId: "60" },
    ];

    for (const mapping of sectorMappings) {
      const result = mapToGics(mapping.sector, undefined);
      expect(result.sector.id).toBe(mapping.expectedId);
    }
  });
});

// =============================================================================
// CREATE CLASSIFICATION FROM MAPPING TESTS
// =============================================================================

describe("createClassificationFromMapping", () => {
  it("should create complete classification result", async () => {
    const { createClassificationFromMapping } =
      await import("@/lib/services/classification/classification-service");

    const result = createClassificationFromMapping("MSFT", "Information Technology", "Software");

    expect(result.symbol).toBe("MSFT");
    expect(result.gicsIndustryId).toBe("451030");
    expect(result.gicsIndustryGroupId).toBe("4510");
    expect(result.gicsSectorId).toBe("45");
    expect(result.industryName).toBe("Software");
    expect(result.industryGroupName).toBe("Software & Services");
    expect(result.sectorName).toBe("Information Technology");
    expect(result.source).toBe("gics-mapping");
    expect(result.isStale).toBe(false);
    expect(result.fetchedAt).toBeInstanceOf(Date);
  });

  it("should use custom source when provided", async () => {
    const { createClassificationFromMapping } =
      await import("@/lib/services/classification/classification-service");

    const result = createClassificationFromMapping(
      "AAPL",
      "Technology",
      "Hardware",
      "custom-source"
    );

    expect(result.source).toBe("custom-source");
  });
});
