/**
 * Asset Type Classification Service
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 * AC-5.8.6: Gemini Integration for Asset Type
 *
 * High-level service for classifying assets by type, handling the full flow
 * from external data to cached classifications.
 *
 * @module @/lib/services/classification/asset-type-service
 */

import { logger } from "@/lib/telemetry/logger";
import {
  mapGeminiToCanonicalType as _mapGeminiToCanonicalType,
  inferJurisdiction as _inferJurisdiction,
  mapAssetToTypeAndJurisdiction,
  type JurisdictionCode,
} from "./asset-type-mapping-service";
import {
  getAssetTypeClassification,
  getLinkedAssets,
  storeAssetTypeClassification,
  storeAssetAlias,
  type FullTypeClassification,
  type LinkedAsset,
} from "./asset-type-cache";
import { isValidIsin, parseIsin } from "@/lib/utils/isin";
import type { FundamentalsResult } from "@/lib/providers/types";
import type { CanonicalAssetType } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of classifying an asset
 */
export interface AssetTypeClassificationResult {
  symbol: string;
  classification: FullTypeClassification | null;
  wasClassified: boolean;
  unmappedAssetType?: string | undefined;
  error?: string | undefined;
}

/**
 * Batch classification result
 */
export interface BatchAssetTypeClassificationResult {
  total: number;
  classified: number;
  alreadyCached: number;
  unmapped: number;
  errors: number;
  results: AssetTypeClassificationResult[];
  unmappedTypes: string[];
}

/**
 * Asset type query options
 */
export interface AssetTypeQueryOptions {
  includeLinkedAssets?: boolean;
  forceRefresh?: boolean;
}

/**
 * Full asset type info with linked assets
 */
export interface FullAssetTypeInfo {
  classification: FullTypeClassification | null;
  linkedAssets: LinkedAsset[];
  fromCache: boolean;
}

// =============================================================================
// SINGLE ASSET OPERATIONS
// =============================================================================

/**
 * Get complete asset type information for a symbol
 *
 * AC-5.8.4: Returns canonicalTypeId, canonicalTypeName, jurisdictionCode, localTypeName, etc.
 *
 * @param symbol - Asset symbol
 * @param options - Query options
 * @returns Full asset type info with optional linked assets
 */
export async function getAssetType(
  symbol: string,
  options: AssetTypeQueryOptions = {}
): Promise<FullAssetTypeInfo> {
  const cacheResult = await getAssetTypeClassification(symbol);

  const result: FullAssetTypeInfo = {
    classification: cacheResult.classification,
    linkedAssets: [],
    fromCache: cacheResult.fromKvCache || cacheResult.fromDb,
  };

  // Optionally fetch linked assets
  if (options.includeLinkedAssets && cacheResult.classification?.isin) {
    result.linkedAssets = await getLinkedAssets(cacheResult.classification.isin);
  }

  return result;
}

/**
 * Classify an asset based on provider data
 *
 * AC-5.8.6: Gemini Integration for Asset Type
 *
 * @param symbol - Asset symbol
 * @param assetType - Asset type string from provider (e.g., Gemini)
 * @param isin - Optional ISIN
 * @param source - Data source name
 * @returns Classification result
 */
export async function classifyAsset(
  symbol: string,
  assetType: string | undefined,
  isin?: string,
  source: string = "gemini-api"
): Promise<AssetTypeClassificationResult> {
  try {
    // Map asset type and infer jurisdiction
    const mapping = mapAssetToTypeAndJurisdiction(symbol, assetType, isin);

    if (!mapping.canonicalTypeId) {
      return {
        symbol,
        classification: null,
        wasClassified: false,
        unmappedAssetType: mapping.unmappedAssetType,
      };
    }

    // Validate ISIN if provided
    const validIsin = isin && isValidIsin(isin) ? isin.toUpperCase() : null;

    // Store the classification
    await storeAssetTypeClassification({
      symbol,
      canonicalTypeId: mapping.canonicalTypeId,
      jurisdictionCode: mapping.jurisdictionCode,
      isin: validIsin,
      confidence: mapping.typeConfidence.toFixed(2),
      source,
    });

    // Store ISIN alias if we have a valid ISIN
    if (validIsin) {
      const parsedIsin = parseIsin(validIsin);
      const isPrimary =
        parsedIsin.countryCode === getCountryForJurisdiction(mapping.jurisdictionCode);

      await storeAssetAlias({
        isin: validIsin,
        symbol,
        jurisdictionCode: mapping.jurisdictionCode,
        isPrimary,
      });
    }

    // Fetch the stored classification
    const cacheResult = await getAssetTypeClassification(symbol);

    return {
      symbol,
      classification: cacheResult.classification,
      wasClassified: true,
    };
  } catch (error) {
    logger.error("Asset classification failed", {
      symbol,
      assetType,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      symbol,
      classification: null,
      wasClassified: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get country code for a jurisdiction
 */
function getCountryForJurisdiction(jurisdictionCode: JurisdictionCode): string {
  const mapping: Record<JurisdictionCode, string> = {
    "US-SEC": "US",
    "BR-CVM": "BR",
    "UK-FCA": "GB",
    "EU-MIFID": "EU",
  };
  return mapping[jurisdictionCode] ?? "";
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Classify multiple assets from fundamentals data
 *
 * AC-5.8.7: Process classifications during overnight job
 *
 * @param fundamentals - Array of fundamentals results
 * @returns Batch classification result
 */
export async function classifyAssetsFromFundamentals(
  fundamentals: FundamentalsResult[]
): Promise<BatchAssetTypeClassificationResult> {
  const results: AssetTypeClassificationResult[] = [];
  const unmappedTypes: Set<string> = new Set();
  let classified = 0;
  let alreadyCached = 0;
  let errors = 0;

  for (const fund of fundamentals) {
    // Check if already cached
    const existing = await getAssetTypeClassification(fund.symbol);
    if (existing.classification) {
      alreadyCached++;
      results.push({
        symbol: fund.symbol,
        classification: existing.classification,
        wasClassified: false,
      });
      continue;
    }

    // Attempt to classify
    // Note: FundamentalsResult might not have assetType field yet
    // We'll need to use sector/industry info or other heuristics
    const assetType = extractAssetTypeFromFundamentals(fund);

    const result = await classifyAsset(
      fund.symbol,
      assetType,
      undefined, // ISIN not typically in fundamentals
      "gemini-api"
    );

    results.push(result);

    if (result.wasClassified) {
      classified++;
    } else if (result.unmappedAssetType) {
      unmappedTypes.add(result.unmappedAssetType);
    } else if (result.error) {
      errors++;
    }
  }

  // Log unmapped types for review
  if (unmappedTypes.size > 0) {
    logger.warn("Unmapped asset types in batch classification", {
      unmappedTypes: Array.from(unmappedTypes).join(", "),
      count: unmappedTypes.size,
    });
  }

  return {
    total: fundamentals.length,
    classified,
    alreadyCached,
    unmapped: unmappedTypes.size,
    errors,
    results,
    unmappedTypes: Array.from(unmappedTypes),
  };
}

/**
 * Extract asset type from fundamentals data
 *
 * Heuristic approach when explicit asset type is not available
 */
function extractAssetTypeFromFundamentals(fund: FundamentalsResult): string | undefined {
  // Check if fundamentals has an assetType field (might be added later)
  if ("assetType" in fund && typeof fund.assetType === "string") {
    return fund.assetType;
  }

  // Heuristic: Use sector/industry info
  if (fund.sector) {
    // REITs typically have "Real Estate" sector
    if (fund.sector.toLowerCase().includes("real estate")) {
      return "REIT";
    }
  }

  // Default: Assume common stock for most fundamentals data
  // This is a reasonable default as most fundamentals are for stocks
  return "Common Stock";
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get all assets linked by the same ISIN
 *
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 *
 * @param isin - ISIN to search for
 * @returns Array of linked assets
 */
export async function getAssetsByIsin(isin: string): Promise<LinkedAsset[]> {
  if (!isValidIsin(isin)) {
    return [];
  }

  return getLinkedAssets(isin);
}

/**
 * Check which symbols need asset type classification refresh
 *
 * @param symbols - Symbols to check
 * @param maxAgeHours - Maximum age before refresh needed
 * @returns Symbols needing refresh
 */
export async function getSymbolsNeedingTypeRefresh(
  symbols: string[],
  maxAgeHours: number = 24 * 7 // Default 7 days
): Promise<string[]> {
  const needsRefresh: string[] = [];
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();

  for (const symbol of symbols) {
    const result = await getAssetTypeClassification(symbol);

    if (!result.classification) {
      needsRefresh.push(symbol);
      continue;
    }

    const age = now - result.classification.lastUpdated.getTime();
    if (age > maxAgeMs) {
      needsRefresh.push(symbol);
    }
  }

  return needsRefresh;
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * TypeScript type guards and helpers
 */
export function isCanonicalAssetType(value: string): value is CanonicalAssetType {
  const validTypes: CanonicalAssetType[] = [
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
  return validTypes.includes(value as CanonicalAssetType);
}

export function isJurisdictionCode(value: string): value is JurisdictionCode {
  const validCodes: JurisdictionCode[] = ["US-SEC", "BR-CVM", "UK-FCA", "EU-MIFID"];
  return validCodes.includes(value as JurisdictionCode);
}
