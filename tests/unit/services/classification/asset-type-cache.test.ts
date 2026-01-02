/**
 * Asset Type Cache Service Tests
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 * Task 12.4: Test cache service (KV hit/miss, DB fallback, store operations)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getAssetTypeClassification,
  getLinkedAssets,
  storeAssetTypeClassification,
  storeAssetAlias,
  getAssetsByType,
  getLocalizedTypeName,
  getAllAssetTypes,
  getAllJurisdictions,
  getLocalizationsForJurisdiction,
  isAssetTypeReferenceDataSeeded,
} from "@/lib/services/classification/asset-type-cache";
import { kv } from "@vercel/kv";
import { db } from "@/lib/db";
import { logger } from "@/lib/telemetry/logger";

// Mock dependencies
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Asset Type Cache Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAssetTypeClassification", () => {
    const mockClassification = {
      symbol: "AAPL",
      canonicalTypeId: "COMMON_STOCK",
      canonicalTypeName: "Common Stock",
      category: "EQUITY",
      jurisdictionCode: "US-SEC",
      localTypeName: "Common Stock",
      localTypeCode: "CS",
      regulatoryReference: "Securities Act 1933",
      isin: "US0378331005",
      confidence: "1.00",
      source: "gemini-api",
      lastUpdated: new Date("2024-01-01"),
    };

    it("should return classification from KV cache when available", async () => {
      vi.mocked(kv.get).mockResolvedValue(mockClassification);

      const result = await getAssetTypeClassification("AAPL");

      expect(result).toEqual({
        classification: mockClassification,
        fromKvCache: true,
        fromDb: false,
      });
      expect(kv.get).toHaveBeenCalledWith("global:asset-type:AAPL");
    });

    it("should normalize symbol to uppercase for cache key", async () => {
      vi.mocked(kv.get).mockResolvedValue(mockClassification);

      await getAssetTypeClassification("aapl");

      expect(kv.get).toHaveBeenCalledWith("global:asset-type:AAPL");
    });

    it("should fall back to database when KV cache miss", async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      // Mock DB query chain
      const mockDbResult = [
        {
          symbol: "AAPL",
          isin: "US0378331005",
          confidence: "1.00",
          source: "gemini-api",
          cacheUpdatedAt: new Date("2024-01-01"),
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          regulatoryReference: "Securities Act 1933",
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue(mockDbResult);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockLeftJoin3 = vi.fn().mockReturnValue({ where: mockWhere });
      const mockInnerJoin2 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin3 });
      const mockInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin2 });
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin1 });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAssetTypeClassification("AAPL");

      expect(result.fromKvCache).toBe(false);
      expect(result.fromDb).toBe(true);
      expect(result.classification).not.toBeNull();
      expect(kv.set).toHaveBeenCalled(); // Should warm KV cache
    });

    it("should return null classification when not found in either cache", async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockLeftJoin3 = vi.fn().mockReturnValue({ where: mockWhere });
      const mockInnerJoin2 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin3 });
      const mockInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin2 });
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin1 });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAssetTypeClassification("UNKNOWN");

      expect(result).toEqual({
        classification: null,
        fromKvCache: false,
        fromDb: false,
      });
    });

    it("should handle KV cache read errors gracefully", async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error("KV connection error"));

      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockLeftJoin3 = vi.fn().mockReturnValue({ where: mockWhere });
      const mockInnerJoin2 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin3 });
      const mockInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin2 });
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin1 });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAssetTypeClassification("AAPL");

      expect(logger.warn).toHaveBeenCalledWith(
        "Asset type KV cache read error",
        expect.objectContaining({ symbol: "AAPL" })
      );
      expect(result.fromKvCache).toBe(false);
    });
  });

  describe("getLinkedAssets", () => {
    const mockLinkedAssets = [
      { symbol: "AAPL", jurisdictionCode: "US-SEC", isPrimary: true },
      { symbol: "AAPL.L", jurisdictionCode: "UK-FCA", isPrimary: false },
    ];

    it("should return linked assets from KV cache when available", async () => {
      vi.mocked(kv.get).mockResolvedValue(mockLinkedAssets);

      const result = await getLinkedAssets("US0378331005");

      expect(result).toEqual(mockLinkedAssets);
      expect(kv.get).toHaveBeenCalledWith("global:isin-links:US0378331005");
    });

    it("should return empty array for invalid ISIN (too short)", async () => {
      const result = await getLinkedAssets("US037");

      expect(result).toEqual([]);
      expect(kv.get).not.toHaveBeenCalled();
    });

    it("should return empty array for empty ISIN", async () => {
      const result = await getLinkedAssets("");

      expect(result).toEqual([]);
    });

    it("should fall back to database when KV cache miss", async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      const mockWhere = vi.fn().mockResolvedValue(mockLinkedAssets);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getLinkedAssets("US0378331005");

      expect(result).toEqual(mockLinkedAssets);
      expect(kv.set).toHaveBeenCalled(); // Should warm cache
    });

    it("should normalize ISIN to uppercase", async () => {
      vi.mocked(kv.get).mockResolvedValue(mockLinkedAssets);

      await getLinkedAssets("us0378331005");

      expect(kv.get).toHaveBeenCalledWith("global:isin-links:US0378331005");
    });
  });

  describe("storeAssetTypeClassification", () => {
    it("should insert classification and invalidate KV cache", async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ symbol: "AAPL" }]);
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      vi.mocked(db.insert).mockImplementation(mockInsert);
      vi.mocked(kv.del).mockResolvedValue(1);

      await storeAssetTypeClassification({
        symbol: "AAPL",
        canonicalTypeId: "COMMON_STOCK",
        jurisdictionCode: "US-SEC",
        isin: "US0378331005",
        confidence: "1.00",
        source: "gemini-api",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(kv.del).toHaveBeenCalledWith("global:asset-type:AAPL");
      expect(logger.debug).toHaveBeenCalledWith(
        "Asset type classification stored",
        expect.objectContaining({ symbol: "AAPL" })
      );
    });

    it("should normalize symbol to uppercase", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({});
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      await storeAssetTypeClassification({
        symbol: "aapl",
        canonicalTypeId: "COMMON_STOCK",
        jurisdictionCode: "US-SEC",
        confidence: "1.00",
        source: "gemini-api",
      });

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ symbol: "AAPL" }));
    });

    it("should handle null ISIN", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({});
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      await storeAssetTypeClassification({
        symbol: "AAPL",
        canonicalTypeId: "COMMON_STOCK",
        jurisdictionCode: "US-SEC",
        confidence: "1.00",
        source: "gemini-api",
        isin: null,
      });

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ isin: null }));
    });
  });

  describe("storeAssetAlias", () => {
    it("should insert alias with normalized values", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({});
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      await storeAssetAlias({
        isin: "us0378331005",
        symbol: "aapl",
        jurisdictionCode: "US-SEC",
        isPrimary: true,
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isin: "US0378331005",
          symbol: "AAPL",
          jurisdictionCode: "US-SEC",
          isPrimary: true,
        })
      );
    });
  });

  describe("getAssetsByType", () => {
    it("should return symbols for a canonical type", async () => {
      const mockSymbols = [{ symbol: "AAPL" }, { symbol: "MSFT" }];

      // The query returns a thenable (Promise-like) object
      const mockQueryResult = {
        then: (resolve: (value: typeof mockSymbols) => void) => {
          resolve(mockSymbols);
          return mockQueryResult;
        },
      };
      const mockWhere = vi.fn().mockReturnValue(mockQueryResult);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAssetsByType("COMMON_STOCK");

      expect(result).toEqual(["AAPL", "MSFT"]);
    });

    it("should filter by jurisdiction when provided", async () => {
      const mockSymbols = [{ symbol: "PETR4" }];

      const mockQueryResult = {
        then: (resolve: (value: typeof mockSymbols) => void) => {
          resolve(mockSymbols);
          return mockQueryResult;
        },
      };
      const mockWhere = vi.fn().mockReturnValue(mockQueryResult);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAssetsByType("COMMON_STOCK", "BR-CVM");

      expect(result).toEqual(["PETR4"]);
    });
  });

  describe("getLocalizedTypeName", () => {
    it("should return localized name when found", async () => {
      const mockLimit = vi.fn().mockResolvedValue([{ localName: "Ação Ordinária" }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getLocalizedTypeName("COMMON_STOCK", "BR-CVM");

      expect(result).toBe("Ação Ordinária");
    });

    it("should fall back to canonical type name when no localization", async () => {
      // First query returns no localization
      const mockLimit1 = vi.fn().mockResolvedValue([]);
      const mockWhere1 = vi.fn().mockReturnValue({ limit: mockLimit1 });
      const mockFrom1 = vi.fn().mockReturnValue({ where: mockWhere1 });

      // Second query returns canonical type name
      const mockLimit2 = vi.fn().mockResolvedValue([{ name: "Common Stock" }]);
      const mockWhere2 = vi.fn().mockReturnValue({ limit: mockLimit2 });
      const mockFrom2 = vi.fn().mockReturnValue({ where: mockWhere2 });

      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockFrom1 } as ReturnType<typeof db.select>;
        }
        return { from: mockFrom2 } as ReturnType<typeof db.select>;
      });

      const result = await getLocalizedTypeName("COMMON_STOCK", "XX-UNKNOWN");

      expect(result).toBe("Common Stock");
    });

    it("should return canonicalTypeId when no type found at all", async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getLocalizedTypeName("UNKNOWN_TYPE", "US-SEC");

      expect(result).toBe("UNKNOWN_TYPE");
    });
  });

  describe("getAllAssetTypes", () => {
    it("should return all asset types ordered by category and id", async () => {
      const mockTypes = [
        { id: "COMMON_STOCK", name: "Common Stock", category: "EQUITY" },
        { id: "ETF", name: "Exchange-Traded Fund", category: "FUND" },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockTypes);
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAllAssetTypes();

      expect(result).toEqual(mockTypes);
    });
  });

  describe("getAllJurisdictions", () => {
    it("should return all jurisdictions ordered by code", async () => {
      const mockJurisdictions = [
        { code: "BR-CVM", name: "Brazil", countryIso: "BR" },
        { code: "US-SEC", name: "United States", countryIso: "US" },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockJurisdictions);
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getAllJurisdictions();

      expect(result).toEqual(mockJurisdictions);
    });
  });

  describe("getLocalizationsForJurisdiction", () => {
    it("should return localizations for a jurisdiction", async () => {
      const mockLocalizations = [
        { canonicalTypeId: "COMMON_STOCK", localName: "Common Stock", localCode: "CS" },
        { canonicalTypeId: "ETF", localName: "Exchange-Traded Fund", localCode: "ETF" },
      ];

      const mockWhere = vi.fn().mockResolvedValue(mockLocalizations);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getLocalizationsForJurisdiction("US-SEC");

      expect(result).toEqual(mockLocalizations);
    });
  });

  describe("isAssetTypeReferenceDataSeeded", () => {
    it("should return true when sufficient reference data exists", async () => {
      // Create chainable mock for types query
      const mockTypesResult = {
        then: (callback: (r: unknown[]) => number) =>
          Promise.resolve(callback(Array(14).fill({ count: "x" }))),
      };
      const mockTypesFrom = vi.fn().mockReturnValue(mockTypesResult);

      // Create chainable mock for jurisdictions query
      const mockJurisdictionsResult = {
        then: (callback: (r: unknown[]) => number) =>
          Promise.resolve(callback(Array(4).fill({ count: "x" }))),
      };
      const mockJurisdictionsFrom = vi.fn().mockReturnValue(mockJurisdictionsResult);

      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockTypesFrom } as ReturnType<typeof db.select>;
        }
        return { from: mockJurisdictionsFrom } as ReturnType<typeof db.select>;
      });

      const result = await isAssetTypeReferenceDataSeeded();

      expect(result).toBe(true);
    });

    it("should return false when insufficient reference data", async () => {
      // Create chainable mock for types query - only 5 types
      const mockTypesResult = {
        then: (callback: (r: unknown[]) => number) =>
          Promise.resolve(callback(Array(5).fill({ count: "x" }))),
      };
      const mockTypesFrom = vi.fn().mockReturnValue(mockTypesResult);

      // Create chainable mock for jurisdictions query - only 1 jurisdiction
      const mockJurisdictionsResult = {
        then: (callback: (r: unknown[]) => number) => Promise.resolve(callback([{ count: "x" }])),
      };
      const mockJurisdictionsFrom = vi.fn().mockReturnValue(mockJurisdictionsResult);

      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockTypesFrom } as ReturnType<typeof db.select>;
        }
        return { from: mockJurisdictionsFrom } as ReturnType<typeof db.select>;
      });

      const result = await isAssetTypeReferenceDataSeeded();

      expect(result).toBe(false);
    });
  });
});
