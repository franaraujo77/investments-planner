/**
 * Asset Type Mapping Service
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.6: Gemini Integration for Asset Type
 *
 * Maps external provider asset types to canonical types and infers jurisdictions.
 *
 * @module @/lib/services/classification/asset-type-mapping-service
 */

import { logger } from "@/lib/telemetry/logger";
import { getCountryFromIsin } from "@/lib/utils/isin";
import type { CanonicalAssetType } from "@/lib/db/schema";

/**
 * Result of mapping an external asset type to canonical type
 */
export interface CanonicalTypeMapping {
  canonicalTypeId: CanonicalAssetType;
  confidence: number; // 0.0 to 1.0
  source: string; // e.g., "gemini-api", "symbol-inference"
}

/**
 * Jurisdiction code used in this system
 */
export type JurisdictionCode = "US-SEC" | "BR-CVM" | "UK-FCA" | "EU-MIFID";

/**
 * Result of jurisdiction inference
 */
export interface JurisdictionInference {
  jurisdictionCode: JurisdictionCode;
  confidence: number;
  inferenceMethod: "isin" | "symbol-suffix" | "default";
}

/**
 * Gemini asset type variations and their mappings to canonical types
 *
 * AC-5.8.6: Build mapping table for common Gemini asset type variations
 */
const GEMINI_TYPE_MAPPINGS: Record<
  string,
  { canonicalType: CanonicalAssetType; confidence: number }
> = {
  // Exact matches - confidence 1.0
  "Common Stock": { canonicalType: "COMMON_STOCK", confidence: 1.0 },
  "Preferred Stock": { canonicalType: "PREFERRED_STOCK", confidence: 1.0 },
  ADR: { canonicalType: "DEPOSITARY_RECEIPT", confidence: 1.0 },
  "American Depositary Receipt": { canonicalType: "DEPOSITARY_RECEIPT", confidence: 1.0 },
  BDR: { canonicalType: "DEPOSITARY_RECEIPT", confidence: 1.0 },
  "Brazilian Depositary Receipt": { canonicalType: "DEPOSITARY_RECEIPT", confidence: 1.0 },
  GDR: { canonicalType: "DEPOSITARY_RECEIPT", confidence: 1.0 },
  ETF: { canonicalType: "ETF", confidence: 1.0 },
  "Exchange-Traded Fund": { canonicalType: "ETF", confidence: 1.0 },
  REIT: { canonicalType: "REIT", confidence: 1.0 },
  "Real Estate Investment Trust": { canonicalType: "REIT", confidence: 1.0 },
  FII: { canonicalType: "REIT", confidence: 1.0 },
  "Fundo de Investimento Imobiliário": { canonicalType: "REIT", confidence: 1.0 },

  // Portuguese/Brazilian variations - confidence 1.0
  "Ação ON": { canonicalType: "COMMON_STOCK", confidence: 1.0 },
  "Ação Ordinária": { canonicalType: "COMMON_STOCK", confidence: 1.0 },
  "Ação PN": { canonicalType: "PREFERRED_STOCK", confidence: 1.0 },
  "Ação Preferencial": { canonicalType: "PREFERRED_STOCK", confidence: 1.0 },

  // Fuzzy matches - confidence 0.95
  "Ordinary Shares": { canonicalType: "COMMON_STOCK", confidence: 0.95 },
  "Ordinary Stock": { canonicalType: "COMMON_STOCK", confidence: 0.95 },
  Stock: { canonicalType: "COMMON_STOCK", confidence: 0.9 },
  Equity: { canonicalType: "COMMON_STOCK", confidence: 0.85 },

  // Fund types
  "Bond Fund": { canonicalType: "FIXED_INCOME_FUND", confidence: 1.0 },
  "Fixed Income Fund": { canonicalType: "FIXED_INCOME_FUND", confidence: 1.0 },
  "Fundo de Renda Fixa": { canonicalType: "FIXED_INCOME_FUND", confidence: 1.0 },
  "Money Market Fund": { canonicalType: "MONEY_MARKET_FUND", confidence: 1.0 },
  "Commodity ETF": { canonicalType: "COMMODITY_ETF", confidence: 1.0 },
  "Commodity Fund": { canonicalType: "COMMODITY_ETF", confidence: 0.9 },

  // Real estate variations
  "Real Estate": { canonicalType: "REIT", confidence: 0.8 },
  "Real Estate Fund": { canonicalType: "REIT", confidence: 0.9 },

  // Fixed income
  "Corporate Bond": { canonicalType: "CORPORATE_BOND", confidence: 1.0 },
  Debenture: { canonicalType: "CORPORATE_BOND", confidence: 0.95 },
  "Government Bond": { canonicalType: "GOVERNMENT_BOND", confidence: 1.0 },
  Treasury: { canonicalType: "GOVERNMENT_BOND", confidence: 0.9 },
  "Treasury Bond": { canonicalType: "GOVERNMENT_BOND", confidence: 1.0 },
  "Municipal Bond": { canonicalType: "MUNICIPAL_BOND", confidence: 1.0 },
  "Muni Bond": { canonicalType: "MUNICIPAL_BOND", confidence: 0.95 },

  // Derivatives
  Option: { canonicalType: "OPTION", confidence: 1.0 },
  "Stock Option": { canonicalType: "OPTION", confidence: 1.0 },
  Future: { canonicalType: "FUTURE", confidence: 1.0 },
  "Futures Contract": { canonicalType: "FUTURE", confidence: 1.0 },
  Warrant: { canonicalType: "WARRANT", confidence: 1.0 },
};

/**
 * Symbol suffix patterns for jurisdiction inference
 *
 * AC-5.8.6: Use symbol suffix: ".SA" → BR-CVM, no suffix/".N"/".OQ" → US-SEC
 */
const SYMBOL_SUFFIX_MAPPINGS: Record<string, JurisdictionCode> = {
  ".SA": "BR-CVM", // São Paulo Stock Exchange (B3)
  ".N": "US-SEC", // NYSE
  ".OQ": "US-SEC", // NASDAQ
  ".O": "US-SEC", // NASDAQ alternative
  ".A": "US-SEC", // NYSE American
  ".L": "UK-FCA", // London Stock Exchange
  ".DE": "EU-MIFID", // Deutsche Börse (Germany)
  ".PA": "EU-MIFID", // Euronext Paris
  ".AS": "EU-MIFID", // Euronext Amsterdam
  ".MI": "EU-MIFID", // Borsa Italiana
  ".MC": "EU-MIFID", // Bolsa de Madrid
};

/**
 * ISIN country code to jurisdiction mappings
 */
const ISIN_JURISDICTION_MAPPINGS: Record<string, JurisdictionCode> = {
  US: "US-SEC",
  BR: "BR-CVM",
  GB: "UK-FCA",
  // EU countries
  DE: "EU-MIFID",
  FR: "EU-MIFID",
  NL: "EU-MIFID",
  IT: "EU-MIFID",
  ES: "EU-MIFID",
  PT: "EU-MIFID",
  BE: "EU-MIFID",
  AT: "EU-MIFID",
  IE: "EU-MIFID",
};

/**
 * Maps a Gemini provider asset type to canonical type
 *
 * AC-5.8.6: Implement mapGeminiToCanonicalType(assetType: string): CanonicalTypeMapping
 *
 * @param assetType - Asset type string from Gemini API
 * @returns Mapping to canonical type with confidence score
 */
export function mapGeminiToCanonicalType(assetType: string): CanonicalTypeMapping | null {
  if (!assetType || typeof assetType !== "string") {
    return null;
  }

  // Normalize input: trim whitespace
  const normalized = assetType.trim();

  // Try exact match first
  const exactMatch = GEMINI_TYPE_MAPPINGS[normalized];
  if (exactMatch) {
    return {
      canonicalTypeId: exactMatch.canonicalType,
      confidence: exactMatch.confidence,
      source: "gemini-api",
    };
  }

  // Try case-insensitive match
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(GEMINI_TYPE_MAPPINGS)) {
    if (key.toLowerCase() === lowerNormalized) {
      return {
        canonicalTypeId: value.canonicalType,
        confidence: value.confidence * 0.95, // Slight penalty for case mismatch
        source: "gemini-api",
      };
    }
  }

  // Try partial match (contains)
  for (const [key, value] of Object.entries(GEMINI_TYPE_MAPPINGS)) {
    if (
      lowerNormalized.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(lowerNormalized)
    ) {
      return {
        canonicalTypeId: value.canonicalType,
        confidence: Math.min(value.confidence * 0.8, 0.7), // Partial match penalty
        source: "gemini-api",
      };
    }
  }

  // Log unmapped type for review
  logger.warn("Unmapped asset type from Gemini", {
    assetType: normalized,
    message: "No canonical type mapping found",
  });

  return null;
}

/**
 * Infers jurisdiction from symbol and/or ISIN
 *
 * AC-5.8.6: Implement inferJurisdiction(symbol: string, isin?: string): JurisdictionCode
 *
 * Priority:
 * 1. ISIN country code (most reliable)
 * 2. Symbol suffix pattern
 * 3. Default to US-SEC for international assets
 *
 * @param symbol - Asset symbol (e.g., "PETR4.SA", "AAPL")
 * @param isin - Optional ISIN for more reliable inference
 * @returns Jurisdiction inference with confidence
 */
export function inferJurisdiction(symbol: string, isin?: string): JurisdictionInference {
  // Priority 1: ISIN country code (most reliable)
  if (isin && isin.length >= 2) {
    const countryCode = getCountryFromIsin(isin);
    const jurisdiction = ISIN_JURISDICTION_MAPPINGS[countryCode];

    if (jurisdiction) {
      return {
        jurisdictionCode: jurisdiction,
        confidence: 0.99,
        inferenceMethod: "isin",
      };
    }
  }

  // Priority 2: Symbol suffix pattern
  if (symbol) {
    for (const [suffix, jurisdiction] of Object.entries(SYMBOL_SUFFIX_MAPPINGS)) {
      if (symbol.toUpperCase().endsWith(suffix)) {
        return {
          jurisdictionCode: jurisdiction,
          confidence: 0.95,
          inferenceMethod: "symbol-suffix",
        };
      }
    }

    // Brazilian numeric suffix pattern (e.g., PETR4, ITUB3)
    if (/[A-Z]{4}\d{1,2}$/.test(symbol.toUpperCase()) && !symbol.includes(".")) {
      return {
        jurisdictionCode: "BR-CVM",
        confidence: 0.85,
        inferenceMethod: "symbol-suffix",
      };
    }
  }

  // Priority 3: Default to US-SEC for international assets
  return {
    jurisdictionCode: "US-SEC",
    confidence: 0.5,
    inferenceMethod: "default",
  };
}

/**
 * Combined asset type and jurisdiction mapping result
 */
export interface FullAssetTypeMapping {
  canonicalTypeId: CanonicalAssetType | null;
  typeConfidence: number;
  jurisdictionCode: JurisdictionCode;
  jurisdictionConfidence: number;
  isin: string | null;
  source: string;
  unmappedAssetType?: string | undefined;
}

/**
 * Maps asset to both canonical type and jurisdiction
 *
 * @param symbol - Asset symbol
 * @param assetType - Asset type string from provider
 * @param isin - Optional ISIN
 * @returns Complete mapping result
 */
export function mapAssetToTypeAndJurisdiction(
  symbol: string,
  assetType?: string,
  isin?: string
): FullAssetTypeMapping {
  const typeMapping = assetType ? mapGeminiToCanonicalType(assetType) : null;
  const jurisdictionInference = inferJurisdiction(symbol, isin);

  return {
    canonicalTypeId: typeMapping?.canonicalTypeId ?? null,
    typeConfidence: typeMapping?.confidence ?? 0,
    jurisdictionCode: jurisdictionInference.jurisdictionCode,
    jurisdictionConfidence: jurisdictionInference.confidence,
    isin: isin || null,
    source: typeMapping?.source ?? "unknown",
    unmappedAssetType: !typeMapping && assetType ? assetType : undefined,
  };
}

/**
 * Returns all supported jurisdiction codes
 */
export function getSupportedJurisdictions(): JurisdictionCode[] {
  return ["US-SEC", "BR-CVM", "UK-FCA", "EU-MIFID"];
}

/**
 * Returns all canonical asset type IDs
 */
export function getCanonicalAssetTypes(): CanonicalAssetType[] {
  return [
    "COMMON_STOCK",
    "PREFERRED_STOCK",
    "DEPOSITARY_RECEIPT",
    "ETF",
    "REIT",
    "FIXED_INCOME_FUND",
    "MONEY_MARKET_FUND",
    "COMMODITY_ETF",
    "CORPORATE_BOND",
    "GOVERNMENT_BOND",
    "MUNICIPAL_BOND",
    "OPTION",
    "FUTURE",
    "WARRANT",
  ];
}
