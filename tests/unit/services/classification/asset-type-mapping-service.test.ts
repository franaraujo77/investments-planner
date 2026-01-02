/**
 * Asset Type Mapping Service Tests
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.6: Gemini Integration for Asset Type
 * Task 12.2: Test asset type mapping service (exact, fuzzy, unmapped)
 * Task 12.3: Test jurisdiction inference from symbol and ISIN
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mapGeminiToCanonicalType,
  inferJurisdiction,
  mapAssetToTypeAndJurisdiction,
  getSupportedJurisdictions,
  getCanonicalAssetTypes,
} from "@/lib/services/classification/asset-type-mapping-service";
import { logger } from "@/lib/telemetry/logger";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Asset Type Mapping Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapGeminiToCanonicalType", () => {
    describe("Exact matches", () => {
      it("should map 'Common Stock' to COMMON_STOCK with confidence 1.0", () => {
        const result = mapGeminiToCanonicalType("Common Stock");
        expect(result).toEqual({
          canonicalTypeId: "COMMON_STOCK",
          confidence: 1.0,
          source: "gemini-api",
        });
      });

      it("should map 'Preferred Stock' to PREFERRED_STOCK", () => {
        const result = mapGeminiToCanonicalType("Preferred Stock");
        expect(result?.canonicalTypeId).toBe("PREFERRED_STOCK");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'ADR' to DEPOSITARY_RECEIPT", () => {
        const result = mapGeminiToCanonicalType("ADR");
        expect(result?.canonicalTypeId).toBe("DEPOSITARY_RECEIPT");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'ETF' to ETF", () => {
        const result = mapGeminiToCanonicalType("ETF");
        expect(result?.canonicalTypeId).toBe("ETF");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'REIT' to REIT", () => {
        const result = mapGeminiToCanonicalType("REIT");
        expect(result?.canonicalTypeId).toBe("REIT");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'FII' (Brazilian REIT) to REIT", () => {
        const result = mapGeminiToCanonicalType("FII");
        expect(result?.canonicalTypeId).toBe("REIT");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe("Portuguese/Brazilian variations", () => {
      it("should map 'Ação ON' to COMMON_STOCK", () => {
        const result = mapGeminiToCanonicalType("Ação ON");
        expect(result?.canonicalTypeId).toBe("COMMON_STOCK");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'Ação PN' to PREFERRED_STOCK", () => {
        const result = mapGeminiToCanonicalType("Ação PN");
        expect(result?.canonicalTypeId).toBe("PREFERRED_STOCK");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'Fundo de Investimento Imobiliário' to REIT", () => {
        const result = mapGeminiToCanonicalType("Fundo de Investimento Imobiliário");
        expect(result?.canonicalTypeId).toBe("REIT");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe("Fuzzy matches", () => {
      it("should map 'Ordinary Shares' to COMMON_STOCK with confidence 0.95", () => {
        const result = mapGeminiToCanonicalType("Ordinary Shares");
        expect(result?.canonicalTypeId).toBe("COMMON_STOCK");
        expect(result?.confidence).toBe(0.95);
      });

      it("should map 'Stock' to COMMON_STOCK with lower confidence", () => {
        const result = mapGeminiToCanonicalType("Stock");
        expect(result?.canonicalTypeId).toBe("COMMON_STOCK");
        expect(result?.confidence).toBe(0.9);
      });

      it("should map 'Real Estate' to REIT with confidence 0.8", () => {
        const result = mapGeminiToCanonicalType("Real Estate");
        expect(result?.canonicalTypeId).toBe("REIT");
        expect(result?.confidence).toBe(0.8);
      });
    });

    describe("Case insensitive matching", () => {
      it("should match regardless of case", () => {
        const result = mapGeminiToCanonicalType("common stock");
        expect(result?.canonicalTypeId).toBe("COMMON_STOCK");
        // Slight penalty for case mismatch
        expect(result?.confidence).toBe(0.95);
      });

      it("should match uppercase input", () => {
        const result = mapGeminiToCanonicalType("PREFERRED STOCK");
        expect(result?.canonicalTypeId).toBe("PREFERRED_STOCK");
      });
    });

    describe("Fixed income types", () => {
      it("should map 'Corporate Bond' to CORPORATE_BOND", () => {
        const result = mapGeminiToCanonicalType("Corporate Bond");
        expect(result?.canonicalTypeId).toBe("CORPORATE_BOND");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'Government Bond' to GOVERNMENT_BOND", () => {
        const result = mapGeminiToCanonicalType("Government Bond");
        expect(result?.canonicalTypeId).toBe("GOVERNMENT_BOND");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'Municipal Bond' to MUNICIPAL_BOND", () => {
        const result = mapGeminiToCanonicalType("Municipal Bond");
        expect(result?.canonicalTypeId).toBe("MUNICIPAL_BOND");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe("Derivative types", () => {
      it("should map 'Option' to OPTION", () => {
        const result = mapGeminiToCanonicalType("Option");
        expect(result?.canonicalTypeId).toBe("OPTION");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'Future' to FUTURE", () => {
        const result = mapGeminiToCanonicalType("Future");
        expect(result?.canonicalTypeId).toBe("FUTURE");
        expect(result?.confidence).toBe(1.0);
      });

      it("should map 'Warrant' to WARRANT", () => {
        const result = mapGeminiToCanonicalType("Warrant");
        expect(result?.canonicalTypeId).toBe("WARRANT");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe("Unmapped types", () => {
      it("should return null for unknown asset type", () => {
        const result = mapGeminiToCanonicalType("Some Unknown Type");
        expect(result).toBeNull();
      });

      it("should log warning for unmapped type", () => {
        mapGeminiToCanonicalType("Cryptocurrency");
        expect(logger.warn).toHaveBeenCalledWith(
          "Unmapped asset type from Gemini",
          expect.objectContaining({
            assetType: "Cryptocurrency",
          })
        );
      });

      it("should return null for empty string", () => {
        const result = mapGeminiToCanonicalType("");
        expect(result).toBeNull();
      });

      it("should return null for null/undefined input", () => {
        expect(mapGeminiToCanonicalType(null as unknown as string)).toBeNull();
        expect(mapGeminiToCanonicalType(undefined as unknown as string)).toBeNull();
      });
    });

    describe("Input normalization", () => {
      it("should trim whitespace", () => {
        const result = mapGeminiToCanonicalType("  Common Stock  ");
        expect(result?.canonicalTypeId).toBe("COMMON_STOCK");
        expect(result?.confidence).toBe(1.0);
      });
    });
  });

  describe("inferJurisdiction", () => {
    describe("From ISIN (Priority 1)", () => {
      it("should infer US-SEC from US ISIN", () => {
        const result = inferJurisdiction("AAPL", "US0378331005");
        expect(result).toEqual({
          jurisdictionCode: "US-SEC",
          confidence: 0.99,
          inferenceMethod: "isin",
        });
      });

      it("should infer BR-CVM from Brazilian ISIN", () => {
        const result = inferJurisdiction("PETR4.SA", "BRPETRACNOR9");
        expect(result).toEqual({
          jurisdictionCode: "BR-CVM",
          confidence: 0.99,
          inferenceMethod: "isin",
        });
      });

      it("should infer UK-FCA from GB ISIN", () => {
        const result = inferJurisdiction("BAES.L", "GB0002634946");
        expect(result).toEqual({
          jurisdictionCode: "UK-FCA",
          confidence: 0.99,
          inferenceMethod: "isin",
        });
      });

      it("should infer EU-MIFID from German ISIN", () => {
        const result = inferJurisdiction("SAP.DE", "DE0007164600");
        expect(result).toEqual({
          jurisdictionCode: "EU-MIFID",
          confidence: 0.99,
          inferenceMethod: "isin",
        });
      });

      it("should prefer ISIN over symbol suffix", () => {
        // Symbol says UK but ISIN says US
        const result = inferJurisdiction("AAPL.L", "US0378331005");
        expect(result.jurisdictionCode).toBe("US-SEC");
        expect(result.inferenceMethod).toBe("isin");
      });
    });

    describe("From symbol suffix (Priority 2)", () => {
      it("should infer BR-CVM from .SA suffix", () => {
        const result = inferJurisdiction("PETR4.SA");
        expect(result).toEqual({
          jurisdictionCode: "BR-CVM",
          confidence: 0.95,
          inferenceMethod: "symbol-suffix",
        });
      });

      it("should infer US-SEC from .N suffix (NYSE)", () => {
        const result = inferJurisdiction("IBM.N");
        expect(result.jurisdictionCode).toBe("US-SEC");
        expect(result.inferenceMethod).toBe("symbol-suffix");
      });

      it("should infer US-SEC from .OQ suffix (NASDAQ)", () => {
        const result = inferJurisdiction("MSFT.OQ");
        expect(result.jurisdictionCode).toBe("US-SEC");
        expect(result.inferenceMethod).toBe("symbol-suffix");
      });

      it("should infer UK-FCA from .L suffix", () => {
        const result = inferJurisdiction("BARC.L");
        expect(result.jurisdictionCode).toBe("UK-FCA");
        expect(result.inferenceMethod).toBe("symbol-suffix");
      });

      it("should infer EU-MIFID from .DE suffix", () => {
        const result = inferJurisdiction("BMW.DE");
        expect(result.jurisdictionCode).toBe("EU-MIFID");
        expect(result.inferenceMethod).toBe("symbol-suffix");
      });
    });

    describe("Brazilian numeric suffix pattern", () => {
      it("should infer BR-CVM from Brazilian stock pattern (4 letters + number)", () => {
        const result = inferJurisdiction("PETR4");
        expect(result).toEqual({
          jurisdictionCode: "BR-CVM",
          confidence: 0.85,
          inferenceMethod: "symbol-suffix",
        });
      });

      it("should infer BR-CVM from ITUB3 pattern", () => {
        const result = inferJurisdiction("ITUB3");
        expect(result.jurisdictionCode).toBe("BR-CVM");
      });

      it("should infer BR-CVM from VALE3 pattern", () => {
        const result = inferJurisdiction("VALE3");
        expect(result.jurisdictionCode).toBe("BR-CVM");
      });

      it("should not match pattern with .SA suffix (uses suffix matching instead)", () => {
        const result = inferJurisdiction("PETR4.SA");
        expect(result.confidence).toBe(0.95); // Suffix match is more confident
      });
    });

    describe("Default fallback (Priority 3)", () => {
      it("should default to US-SEC for unknown symbols", () => {
        const result = inferJurisdiction("UNKNOWN");
        expect(result).toEqual({
          jurisdictionCode: "US-SEC",
          confidence: 0.5,
          inferenceMethod: "default",
        });
      });

      it("should default to US-SEC for symbols without suffix", () => {
        const result = inferJurisdiction("AAPL");
        expect(result.jurisdictionCode).toBe("US-SEC");
        expect(result.inferenceMethod).toBe("default");
        expect(result.confidence).toBe(0.5);
      });
    });
  });

  describe("mapAssetToTypeAndJurisdiction", () => {
    it("should combine type and jurisdiction mapping", () => {
      const result = mapAssetToTypeAndJurisdiction("AAPL", "Common Stock", "US0378331005");

      expect(result.canonicalTypeId).toBe("COMMON_STOCK");
      expect(result.typeConfidence).toBe(1.0);
      expect(result.jurisdictionCode).toBe("US-SEC");
      expect(result.jurisdictionConfidence).toBe(0.99);
      expect(result.isin).toBe("US0378331005");
      expect(result.source).toBe("gemini-api");
    });

    it("should handle missing asset type", () => {
      const result = mapAssetToTypeAndJurisdiction("AAPL", undefined, "US0378331005");

      expect(result.canonicalTypeId).toBeNull();
      expect(result.typeConfidence).toBe(0);
      expect(result.jurisdictionCode).toBe("US-SEC");
    });

    it("should handle missing ISIN", () => {
      const result = mapAssetToTypeAndJurisdiction("PETR4.SA", "Ação ON");

      expect(result.canonicalTypeId).toBe("COMMON_STOCK");
      expect(result.jurisdictionCode).toBe("BR-CVM");
      expect(result.isin).toBeNull();
    });

    it("should include unmappedAssetType when type cannot be mapped", () => {
      const result = mapAssetToTypeAndJurisdiction("XYZ", "Unknown Type");

      expect(result.canonicalTypeId).toBeNull();
      expect(result.unmappedAssetType).toBe("Unknown Type");
    });

    it("should not include unmappedAssetType when type is mapped", () => {
      const result = mapAssetToTypeAndJurisdiction("AAPL", "Common Stock");

      expect(result.canonicalTypeId).toBe("COMMON_STOCK");
      expect(result.unmappedAssetType).toBeUndefined();
    });
  });

  describe("getSupportedJurisdictions", () => {
    it("should return all supported jurisdiction codes", () => {
      const jurisdictions = getSupportedJurisdictions();

      expect(jurisdictions).toContain("US-SEC");
      expect(jurisdictions).toContain("BR-CVM");
      expect(jurisdictions).toContain("UK-FCA");
      expect(jurisdictions).toContain("EU-MIFID");
      expect(jurisdictions).toHaveLength(4);
    });
  });

  describe("getCanonicalAssetTypes", () => {
    it("should return all canonical asset types", () => {
      const types = getCanonicalAssetTypes();

      expect(types).toContain("COMMON_STOCK");
      expect(types).toContain("PREFERRED_STOCK");
      expect(types).toContain("DEPOSITARY_RECEIPT");
      expect(types).toContain("ETF");
      expect(types).toContain("REIT");
      expect(types).toContain("FIXED_INCOME_FUND");
      expect(types).toContain("MONEY_MARKET_FUND");
      expect(types).toContain("COMMODITY_ETF");
      expect(types).toContain("CORPORATE_BOND");
      expect(types).toContain("GOVERNMENT_BOND");
      expect(types).toContain("MUNICIPAL_BOND");
      expect(types).toContain("OPTION");
      expect(types).toContain("FUTURE");
      expect(types).toContain("WARRANT");
      expect(types).toHaveLength(14);
    });
  });
});
