/**
 * Classification Service Unit Tests
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.4: Asset-to-Classification Mapping
 * AC-5.7.5: Classification API
 *
 * @module tests/unit/services/classification/classification-service.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fundamentalsToClassification,
  createClassificationFromMapping,
  getGicsHierarchy,
} from "@/lib/services/classification/classification-service";
import type { FundamentalsResult } from "@/lib/providers/types";

// Mock the classification cache
vi.mock("@/lib/services/classification/classification-cache", () => ({
  getClassification: vi.fn(),
  getClassifications: vi.fn(),
  storeClassification: vi.fn(),
  storeClassifications: vi.fn(),
}));

// =============================================================================
// FUNDAMENTALS TO CLASSIFICATION TESTS
// =============================================================================

describe("fundamentalsToClassification", () => {
  it("should convert fundamentals with exact sector/industry match", () => {
    const fundamentals: FundamentalsResult = {
      symbol: "MSFT",
      peRatio: "30.5",
      pbRatio: "12.3",
      dividendYield: "0.8",
      marketCap: "2500000000000",
      sector: "Information Technology",
      industry: "Software",
      source: "test-provider",
      fetchedAt: new Date("2024-01-15"),
      dataDate: new Date("2024-01-15"),
    };

    const result = fundamentalsToClassification(fundamentals);

    expect(result.symbol).toBe("MSFT");
    expect(result.gicsIndustryId).toBe("451030"); // Software
    expect(result.gicsIndustryGroupId).toBe("4510"); // Software & Services
    expect(result.gicsSectorId).toBe("45"); // Information Technology
    expect(result.industryName).toBe("Software");
    expect(result.industryGroupName).toBe("Software & Services");
    expect(result.sectorName).toBe("Information Technology");
    expect(result.source).toBe("test-provider");
    expect(parseFloat(result.confidence)).toBeGreaterThanOrEqual(0.9);
  });

  it("should convert fundamentals with fuzzy match", () => {
    const fundamentals: FundamentalsResult = {
      symbol: "JPM",
      peRatio: "10.5",
      pbRatio: "1.3",
      dividendYield: "2.5",
      marketCap: "500000000000",
      sector: "Financial",
      industry: "Banking",
      source: "test-provider",
      fetchedAt: new Date("2024-01-15"),
      dataDate: new Date("2024-01-15"),
    };

    const result = fundamentalsToClassification(fundamentals);

    expect(result.symbol).toBe("JPM");
    expect(result.gicsSectorId).toBe("40"); // Financials
    // Should match to banks or similar
    expect(result.gicsIndustryId).toBeTruthy();
  });

  it("should preserve isStale flag when defined", () => {
    const fundamentals: FundamentalsResult = {
      symbol: "TEST",
      sector: "Technology",
      industry: "Software",
      source: "test-provider",
      fetchedAt: new Date("2024-01-15"),
      dataDate: new Date("2024-01-15"),
      isStale: true,
    };

    const result = fundamentalsToClassification(fundamentals);

    expect(result.isStale).toBe(true);
  });

  it("should not include isStale when undefined", () => {
    const fundamentals: FundamentalsResult = {
      symbol: "TEST",
      sector: "Technology",
      industry: "Software",
      source: "test-provider",
      fetchedAt: new Date("2024-01-15"),
      dataDate: new Date("2024-01-15"),
    };

    const result = fundamentalsToClassification(fundamentals);

    expect("isStale" in result).toBe(false);
  });
});

// =============================================================================
// CREATE CLASSIFICATION FROM MAPPING TESTS
// =============================================================================

describe("createClassificationFromMapping", () => {
  it("should create classification with exact match", () => {
    const result = createClassificationFromMapping("AAPL", "Information Technology", "Software");

    expect(result.symbol).toBe("AAPL");
    expect(result.gicsIndustryId).toBe("451030");
    expect(result.gicsIndustryGroupId).toBe("4510");
    expect(result.gicsSectorId).toBe("45");
    expect(result.source).toBe("gics-mapping");
    expect(result.isStale).toBe(false);
  });

  it("should use custom source when provided", () => {
    const result = createClassificationFromMapping(
      "AAPL",
      "Technology",
      "Software",
      "custom-source"
    );

    expect(result.source).toBe("custom-source");
  });

  it("should handle undefined sector/industry with default mapping", () => {
    const result = createClassificationFromMapping("UNKNOWN");

    expect(result.symbol).toBe("UNKNOWN");
    expect(result.gicsIndustryId).toBeTruthy();
    expect(parseFloat(result.confidence)).toBe(0); // Default mapping has 0 confidence
  });

  it("should set fetchedAt to current time", () => {
    const before = new Date();
    const result = createClassificationFromMapping("TEST", "Technology", "Software");
    const after = new Date();

    expect(result.fetchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.fetchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// =============================================================================
// GET GICS HIERARCHY TESTS
// =============================================================================

describe("getGicsHierarchy", () => {
  it("should return full hierarchy for valid industry ID", () => {
    const result = getGicsHierarchy("451030");

    expect(result).not.toBeNull();
    expect(result?.sectorId).toBe("45");
    expect(result?.sectorName).toBe("Information Technology");
    expect(result?.industryGroupId).toBe("4510");
    expect(result?.industryGroupName).toBe("Software & Services");
    expect(result?.industryId).toBe("451030");
    expect(result?.industryName).toBe("Software");
  });

  it("should return null for invalid industry ID", () => {
    const result = getGicsHierarchy("999999");

    expect(result).toBeNull();
  });

  it("should work for various industries", () => {
    // Banks
    const banks = getGicsHierarchy("401010");
    expect(banks?.sectorName).toBe("Financials");
    expect(banks?.industryName).toBe("Banks");

    // Pharmaceuticals
    const pharma = getGicsHierarchy("352020");
    expect(pharma?.sectorName).toBe("Health Care");
    expect(pharma?.industryName).toBe("Pharmaceuticals");

    // Semiconductors
    const semis = getGicsHierarchy("453010");
    expect(semis?.sectorName).toBe("Information Technology");
    expect(semis?.industryName).toBe("Semiconductors & Semiconductor Equipment");
  });
});

// =============================================================================
// BATCH OPERATIONS TESTS
// =============================================================================

describe("Classification batch operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle multiple fundamentals consistently", () => {
    const fundamentalsList: FundamentalsResult[] = [
      {
        symbol: "MSFT",
        sector: "Information Technology",
        industry: "Software",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
      {
        symbol: "JPM",
        sector: "Financials",
        industry: "Banks",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
      {
        symbol: "JNJ",
        sector: "Health Care",
        industry: "Pharmaceuticals",
        source: "test",
        fetchedAt: new Date(),
        dataDate: new Date(),
      },
    ];

    const results = fundamentalsList.map((f) => fundamentalsToClassification(f));

    expect(results).toHaveLength(3);
    expect(results[0]?.gicsSectorId).toBe("45"); // IT
    expect(results[1]?.gicsSectorId).toBe("40"); // Financials
    expect(results[2]?.gicsSectorId).toBe("35"); // Health Care
  });
});
