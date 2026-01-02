/**
 * Asset Type Service Tests
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 * AC-5.8.6: Gemini Integration for Asset Type
 * AC-5.8.7: Integration with Overnight Job
 * Task 12.4: Test service operations
 * Task 13: Test overnight job integration
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getAssetType,
  classifyAsset,
  classifyAssetsFromFundamentals,
  getAssetsByIsin,
  getSymbolsNeedingTypeRefresh,
  isCanonicalAssetType,
  isJurisdictionCode,
} from "@/lib/services/classification/asset-type-service";
import * as assetTypeCache from "@/lib/services/classification/asset-type-cache";
import * as assetTypeMappingService from "@/lib/services/classification/asset-type-mapping-service";
import * as isinUtils from "@/lib/utils/isin";
import { logger } from "@/lib/telemetry/logger";
import type { FundamentalsResult } from "@/lib/providers/types";

// Mock dependencies
vi.mock("@/lib/services/classification/asset-type-cache", () => ({
  getAssetTypeClassification: vi.fn(),
  getLinkedAssets: vi.fn(),
  storeAssetTypeClassification: vi.fn(),
  storeAssetAlias: vi.fn(),
}));

vi.mock("@/lib/services/classification/asset-type-mapping-service", () => ({
  mapGeminiToCanonicalType: vi.fn(),
  inferJurisdiction: vi.fn(),
  mapAssetToTypeAndJurisdiction: vi.fn(),
}));

vi.mock("@/lib/utils/isin", () => ({
  isValidIsin: vi.fn(),
  parseIsin: vi.fn(),
  getCountryFromIsin: vi.fn(),
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Asset Type Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAssetType", () => {
    const mockClassification = {
      symbol: "AAPL",
      canonicalTypeId: "COMMON_STOCK",
      canonicalTypeName: "Common Stock",
      category: "EQUITY",
      jurisdictionCode: "US-SEC",
      localTypeName: "Common Stock",
      localTypeCode: "CS",
      isin: "US0378331005",
      confidence: "1.00",
      source: "gemini-api",
      lastUpdated: new Date("2024-01-01"),
    };

    it("should return classification from cache", async () => {
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: mockClassification,
        fromKvCache: true,
        fromDb: false,
      });

      const result = await getAssetType("AAPL");

      expect(result).toEqual({
        classification: mockClassification,
        linkedAssets: [],
        fromCache: true,
      });
    });

    it("should include linked assets when requested", async () => {
      const mockLinkedAssets = [
        { symbol: "AAPL", jurisdictionCode: "US-SEC", isPrimary: true },
        { symbol: "AAPL.L", jurisdictionCode: "UK-FCA", isPrimary: false },
      ];

      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: mockClassification,
        fromKvCache: true,
        fromDb: false,
      });
      vi.mocked(assetTypeCache.getLinkedAssets).mockResolvedValue(mockLinkedAssets);

      const result = await getAssetType("AAPL", { includeLinkedAssets: true });

      expect(result.linkedAssets).toEqual(mockLinkedAssets);
      expect(assetTypeCache.getLinkedAssets).toHaveBeenCalledWith("US0378331005");
    });

    it("should not fetch linked assets when no ISIN", async () => {
      const classificationNoIsin = { ...mockClassification, isin: null };

      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: classificationNoIsin,
        fromKvCache: true,
        fromDb: false,
      });

      const result = await getAssetType("AAPL", { includeLinkedAssets: true });

      expect(result.linkedAssets).toEqual([]);
      expect(assetTypeCache.getLinkedAssets).not.toHaveBeenCalled();
    });

    it("should return null classification when not found", async () => {
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: null,
        fromKvCache: false,
        fromDb: false,
      });

      const result = await getAssetType("UNKNOWN");

      expect(result.classification).toBeNull();
      expect(result.fromCache).toBe(false);
    });
  });

  describe("classifyAsset", () => {
    it("should classify asset and store in cache", async () => {
      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: "COMMON_STOCK",
        typeConfidence: 1.0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.99,
        isin: "US0378331005",
        source: "gemini-api",
      });
      vi.mocked(isinUtils.isValidIsin).mockReturnValue(true);
      vi.mocked(isinUtils.parseIsin).mockReturnValue({
        countryCode: "US",
        nsin: "037833100",
        checkDigit: "5",
        isValid: true,
      });
      vi.mocked(assetTypeCache.storeAssetTypeClassification).mockResolvedValue(undefined);
      vi.mocked(assetTypeCache.storeAssetAlias).mockResolvedValue(undefined);
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: {
          symbol: "AAPL",
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          isin: "US0378331005",
          confidence: "1.00",
          source: "gemini-api",
          lastUpdated: new Date(),
        },
        fromKvCache: false,
        fromDb: true,
      });

      const result = await classifyAsset("AAPL", "Common Stock", "US0378331005");

      expect(result.wasClassified).toBe(true);
      expect(result.classification).not.toBeNull();
      expect(assetTypeCache.storeAssetTypeClassification).toHaveBeenCalledWith({
        symbol: "AAPL",
        canonicalTypeId: "COMMON_STOCK",
        jurisdictionCode: "US-SEC",
        isin: "US0378331005",
        confidence: "1.00",
        source: "gemini-api",
      });
      expect(assetTypeCache.storeAssetAlias).toHaveBeenCalled();
    });

    it("should return unmapped asset type when mapping fails", async () => {
      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: null,
        typeConfidence: 0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.5,
        isin: null,
        source: "unknown",
        unmappedAssetType: "Cryptocurrency",
      });

      const result = await classifyAsset("BTC", "Cryptocurrency");

      expect(result.wasClassified).toBe(false);
      expect(result.unmappedAssetType).toBe("Cryptocurrency");
      expect(assetTypeCache.storeAssetTypeClassification).not.toHaveBeenCalled();
    });

    it("should not store alias when ISIN is invalid", async () => {
      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: "COMMON_STOCK",
        typeConfidence: 1.0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.5,
        isin: null,
        source: "gemini-api",
      });
      vi.mocked(isinUtils.isValidIsin).mockReturnValue(false);
      vi.mocked(assetTypeCache.storeAssetTypeClassification).mockResolvedValue(undefined);
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: {
          symbol: "AAPL",
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          isin: null,
          confidence: "1.00",
          source: "gemini-api",
          lastUpdated: new Date(),
        },
        fromKvCache: false,
        fromDb: true,
      });

      const result = await classifyAsset("AAPL", "Common Stock", "invalid-isin");

      expect(result.wasClassified).toBe(true);
      expect(assetTypeCache.storeAssetAlias).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: "COMMON_STOCK",
        typeConfidence: 1.0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.99,
        isin: null,
        source: "gemini-api",
      });
      vi.mocked(isinUtils.isValidIsin).mockReturnValue(false);
      vi.mocked(assetTypeCache.storeAssetTypeClassification).mockRejectedValue(
        new Error("Database error")
      );

      const result = await classifyAsset("AAPL", "Common Stock");

      expect(result.wasClassified).toBe(false);
      expect(result.error).toBe("Database error");
      expect(logger.error).toHaveBeenCalledWith(
        "Asset classification failed",
        expect.objectContaining({ symbol: "AAPL" })
      );
    });
  });

  describe("classifyAssetsFromFundamentals", () => {
    const mockFundamentals: FundamentalsResult[] = [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        industry: "Consumer Electronics",
        peRatio: "28.5",
        dividendYield: "0.5",
        marketCap: "2800000000000",
        fetchedAt: new Date().toISOString(),
      },
      {
        symbol: "SPG",
        name: "Simon Property Group",
        sector: "Real Estate",
        industry: "REITs",
        peRatio: "15.0",
        dividendYield: "5.0",
        marketCap: "50000000000",
        fetchedAt: new Date().toISOString(),
      },
    ];

    it("should skip already cached assets", async () => {
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: {
          symbol: "AAPL",
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          isin: null,
          confidence: "1.00",
          source: "gemini-api",
          lastUpdated: new Date(),
        },
        fromKvCache: true,
        fromDb: false,
      });

      const result = await classifyAssetsFromFundamentals([mockFundamentals[0]]);

      expect(result.alreadyCached).toBe(1);
      expect(result.classified).toBe(0);
      expect(assetTypeCache.storeAssetTypeClassification).not.toHaveBeenCalled();
    });

    it("should classify assets with sector heuristics", async () => {
      // First call returns null (not cached), second returns the stored result
      vi.mocked(assetTypeCache.getAssetTypeClassification)
        .mockResolvedValueOnce({
          classification: null,
          fromKvCache: false,
          fromDb: false,
        })
        .mockResolvedValueOnce({
          classification: {
            symbol: "SPG",
            canonicalTypeId: "REIT",
            canonicalTypeName: "Real Estate Investment Trust",
            category: "EQUITY",
            jurisdictionCode: "US-SEC",
            localTypeName: "REIT",
            localTypeCode: "REIT",
            isin: null,
            confidence: "1.00",
            source: "gemini-api",
            lastUpdated: new Date(),
          },
          fromKvCache: false,
          fromDb: true,
        });

      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: "REIT",
        typeConfidence: 1.0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.5,
        isin: null,
        source: "gemini-api",
      });
      vi.mocked(isinUtils.isValidIsin).mockReturnValue(false);
      vi.mocked(assetTypeCache.storeAssetTypeClassification).mockResolvedValue(undefined);

      const result = await classifyAssetsFromFundamentals([mockFundamentals[1]]);

      expect(result.classified).toBe(1);
    });

    it("should track unmapped types", async () => {
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: null,
        fromKvCache: false,
        fromDb: false,
      });
      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: null,
        typeConfidence: 0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.5,
        isin: null,
        source: "unknown",
        unmappedAssetType: "Unknown Type",
      });

      const result = await classifyAssetsFromFundamentals([
        { ...mockFundamentals[0], sector: "Unknown" },
      ]);

      expect(result.unmapped).toBe(1);
      expect(result.unmappedTypes).toContain("Unknown Type");
      expect(logger.warn).toHaveBeenCalledWith(
        "Unmapped asset types in batch classification",
        expect.objectContaining({ count: 1 })
      );
    });

    it("should return batch result with correct counts", async () => {
      // First symbol cached, second not cached
      vi.mocked(assetTypeCache.getAssetTypeClassification)
        .mockResolvedValueOnce({
          classification: {
            symbol: "AAPL",
            canonicalTypeId: "COMMON_STOCK",
            canonicalTypeName: "Common Stock",
            category: "EQUITY",
            jurisdictionCode: "US-SEC",
            localTypeName: "Common Stock",
            localTypeCode: "CS",
            isin: null,
            confidence: "1.00",
            source: "gemini-api",
            lastUpdated: new Date(),
          },
          fromKvCache: true,
          fromDb: false,
        })
        .mockResolvedValueOnce({
          classification: null,
          fromKvCache: false,
          fromDb: false,
        })
        .mockResolvedValueOnce({
          classification: {
            symbol: "SPG",
            canonicalTypeId: "REIT",
            canonicalTypeName: "Real Estate Investment Trust",
            category: "EQUITY",
            jurisdictionCode: "US-SEC",
            localTypeName: "REIT",
            localTypeCode: "REIT",
            isin: null,
            confidence: "1.00",
            source: "gemini-api",
            lastUpdated: new Date(),
          },
          fromKvCache: false,
          fromDb: true,
        });

      vi.mocked(assetTypeMappingService.mapAssetToTypeAndJurisdiction).mockReturnValue({
        canonicalTypeId: "REIT",
        typeConfidence: 1.0,
        jurisdictionCode: "US-SEC",
        jurisdictionConfidence: 0.5,
        isin: null,
        source: "gemini-api",
      });
      vi.mocked(isinUtils.isValidIsin).mockReturnValue(false);
      vi.mocked(assetTypeCache.storeAssetTypeClassification).mockResolvedValue(undefined);

      const result = await classifyAssetsFromFundamentals(mockFundamentals);

      expect(result.total).toBe(2);
      expect(result.alreadyCached).toBe(1);
      expect(result.classified).toBe(1);
      expect(result.results).toHaveLength(2);
    });
  });

  describe("getAssetsByIsin", () => {
    it("should return linked assets for valid ISIN", async () => {
      const mockLinkedAssets = [{ symbol: "AAPL", jurisdictionCode: "US-SEC", isPrimary: true }];

      vi.mocked(isinUtils.isValidIsin).mockReturnValue(true);
      vi.mocked(assetTypeCache.getLinkedAssets).mockResolvedValue(mockLinkedAssets);

      const result = await getAssetsByIsin("US0378331005");

      expect(result).toEqual(mockLinkedAssets);
    });

    it("should return empty array for invalid ISIN", async () => {
      vi.mocked(isinUtils.isValidIsin).mockReturnValue(false);

      const result = await getAssetsByIsin("invalid");

      expect(result).toEqual([]);
      expect(assetTypeCache.getLinkedAssets).not.toHaveBeenCalled();
    });
  });

  describe("getSymbolsNeedingTypeRefresh", () => {
    it("should return symbols without classification", async () => {
      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: null,
        fromKvCache: false,
        fromDb: false,
      });

      const result = await getSymbolsNeedingTypeRefresh(["AAPL", "MSFT"]);

      expect(result).toEqual(["AAPL", "MSFT"]);
    });

    it("should return symbols with stale classification", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: {
          symbol: "AAPL",
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          isin: null,
          confidence: "1.00",
          source: "gemini-api",
          lastUpdated: oldDate,
        },
        fromKvCache: true,
        fromDb: false,
      });

      // Default maxAgeHours is 7 days
      const result = await getSymbolsNeedingTypeRefresh(["AAPL"]);

      expect(result).toEqual(["AAPL"]);
    });

    it("should not return symbols with fresh classification", async () => {
      const recentDate = new Date(); // Now

      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: {
          symbol: "AAPL",
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          isin: null,
          confidence: "1.00",
          source: "gemini-api",
          lastUpdated: recentDate,
        },
        fromKvCache: true,
        fromDb: false,
      });

      const result = await getSymbolsNeedingTypeRefresh(["AAPL"]);

      expect(result).toEqual([]);
    });

    it("should respect custom maxAgeHours", async () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      vi.mocked(assetTypeCache.getAssetTypeClassification).mockResolvedValue({
        classification: {
          symbol: "AAPL",
          canonicalTypeId: "COMMON_STOCK",
          canonicalTypeName: "Common Stock",
          category: "EQUITY",
          jurisdictionCode: "US-SEC",
          localTypeName: "Common Stock",
          localTypeCode: "CS",
          isin: null,
          confidence: "1.00",
          source: "gemini-api",
          lastUpdated: twoHoursAgo,
        },
        fromKvCache: true,
        fromDb: false,
      });

      // With 1 hour max age, 2 hours old should need refresh
      const result = await getSymbolsNeedingTypeRefresh(["AAPL"], 1);

      expect(result).toEqual(["AAPL"]);
    });
  });

  describe("Type Guards", () => {
    describe("isCanonicalAssetType", () => {
      it("should return true for valid canonical types", () => {
        expect(isCanonicalAssetType("COMMON_STOCK")).toBe(true);
        expect(isCanonicalAssetType("PREFERRED_STOCK")).toBe(true);
        expect(isCanonicalAssetType("ETF")).toBe(true);
        expect(isCanonicalAssetType("REIT")).toBe(true);
        expect(isCanonicalAssetType("CORPORATE_BOND")).toBe(true);
      });

      it("should return false for invalid types", () => {
        expect(isCanonicalAssetType("INVALID_TYPE")).toBe(false);
        expect(isCanonicalAssetType("")).toBe(false);
        expect(isCanonicalAssetType("stock")).toBe(false);
      });
    });

    describe("isJurisdictionCode", () => {
      it("should return true for valid jurisdiction codes", () => {
        expect(isJurisdictionCode("US-SEC")).toBe(true);
        expect(isJurisdictionCode("BR-CVM")).toBe(true);
        expect(isJurisdictionCode("UK-FCA")).toBe(true);
        expect(isJurisdictionCode("EU-MIFID")).toBe(true);
      });

      it("should return false for invalid codes", () => {
        expect(isJurisdictionCode("XX-INVALID")).toBe(false);
        expect(isJurisdictionCode("")).toBe(false);
        expect(isJurisdictionCode("US")).toBe(false);
      });
    });
  });
});
