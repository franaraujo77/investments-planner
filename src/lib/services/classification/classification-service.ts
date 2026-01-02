/**
 * Classification Service
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.4: Asset-to-Classification Mapping
 * AC-5.7.5: Classification API
 *
 * Main service for asset classification operations:
 * 1. Get classification for assets (from cache or fetch)
 * 2. Classify new assets using GICS mapping
 * 3. Refresh stale classifications
 *
 * @module @/lib/services/classification/classification-service
 */

import { logger } from "@/lib/telemetry/logger";
import type { ClassificationResult, FundamentalsResult } from "@/lib/providers/types";
import {
  getClassification,
  getClassifications,
  storeClassification,
  storeClassifications,
  type EnrichedClassification,
} from "./classification-cache";
import { mapToGics, getHierarchyByIndustryId } from "./gics-mapping-service";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum age for classification data before considering refresh (7 days) */
const MAX_CLASSIFICATION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Default source for mapped classifications */
const MAPPED_SOURCE = "gics-mapping";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Classification query result
 */
export interface ClassificationQueryResult {
  symbol: string;
  classification: EnrichedClassification | null;
  /** Whether classification is available */
  found: boolean;
  /** Whether classification came from cache */
  fromCache: boolean;
  /** Whether classification is stale and should be refreshed */
  isStale: boolean;
}

/**
 * Batch classification result
 */
export interface BatchClassificationResult {
  /** Successful classifications */
  classifications: Map<string, EnrichedClassification>;
  /** Symbols that couldn't be classified */
  failed: string[];
  /** Statistics */
  stats: {
    total: number;
    found: number;
    fromCache: number;
    fromProvider: number;
    stale: number;
    failed: number;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a classification is stale
 */
function isClassificationStale(classification: EnrichedClassification): boolean {
  const age = Date.now() - classification.cacheUpdatedAt.getTime();
  return age > MAX_CLASSIFICATION_AGE_MS;
}

/**
 * Convert fundamentals result to classification result
 *
 * Uses GICS mapping service to convert sector/industry text to GICS codes
 */
export function fundamentalsToClassification(
  fundamentals: FundamentalsResult
): ClassificationResult {
  const mappingResult = mapToGics(fundamentals.sector, fundamentals.industry);

  const result: ClassificationResult = {
    symbol: fundamentals.symbol,
    gicsIndustryId: mappingResult.industry.id,
    gicsIndustryGroupId: mappingResult.industryGroup.id,
    gicsSectorId: mappingResult.sector.id,
    industryName: mappingResult.industry.name,
    industryGroupName: mappingResult.industryGroup.name,
    sectorName: mappingResult.sector.name,
    confidence: String(mappingResult.confidence.toFixed(2)),
    source: fundamentals.source,
    fetchedAt: fundamentals.fetchedAt,
  };

  if (fundamentals.isStale !== undefined) {
    result.isStale = fundamentals.isStale;
  }

  return result;
}

/**
 * Create classification result from GICS mapping
 */
export function createClassificationFromMapping(
  symbol: string,
  sector?: string,
  industry?: string,
  source: string = MAPPED_SOURCE
): ClassificationResult {
  const mappingResult = mapToGics(sector, industry);

  return {
    symbol,
    gicsIndustryId: mappingResult.industry.id,
    gicsIndustryGroupId: mappingResult.industryGroup.id,
    gicsSectorId: mappingResult.sector.id,
    industryName: mappingResult.industry.name,
    industryGroupName: mappingResult.industryGroup.name,
    sectorName: mappingResult.sector.name,
    confidence: String(mappingResult.confidence.toFixed(2)),
    source,
    fetchedAt: new Date(),
    isStale: false,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get classification for a single symbol
 *
 * @param symbol - Asset symbol
 * @returns Classification query result
 */
export async function getAssetClassification(symbol: string): Promise<ClassificationQueryResult> {
  const result = await getClassification(symbol);

  if (!result.classification) {
    return {
      symbol: symbol.toUpperCase(),
      classification: null,
      found: false,
      fromCache: false,
      isStale: false,
    };
  }

  return {
    symbol: symbol.toUpperCase(),
    classification: result.classification,
    found: true,
    fromCache: result.fromKvCache,
    isStale: isClassificationStale(result.classification),
  };
}

/**
 * Get classifications for multiple symbols
 *
 * @param symbols - Array of asset symbols
 * @returns Batch classification result
 */
export async function getAssetClassifications(
  symbols: string[]
): Promise<BatchClassificationResult> {
  const results = await getClassifications(symbols);

  const classifications = new Map<string, EnrichedClassification>();
  const failed: string[] = [];
  let fromCache = 0;
  let fromProvider = 0;
  let stale = 0;

  for (const [symbol, result] of results.entries()) {
    if (result.classification) {
      classifications.set(symbol, result.classification);
      if (result.fromKvCache) {
        fromCache++;
      } else if (result.fromDb) {
        fromProvider++;
      }
      if (isClassificationStale(result.classification)) {
        stale++;
      }
    } else {
      failed.push(symbol);
    }
  }

  return {
    classifications,
    failed,
    stats: {
      total: symbols.length,
      found: classifications.size,
      fromCache,
      fromProvider,
      stale,
      failed: failed.length,
    },
  };
}

/**
 * Classify an asset and store in cache
 *
 * Uses sector/industry text to map to GICS codes.
 *
 * @param symbol - Asset symbol
 * @param sector - Sector text (e.g., "Technology")
 * @param industry - Industry text (e.g., "Software")
 * @param source - Source of the classification
 * @returns The classification result
 */
export async function classifyAsset(
  symbol: string,
  sector?: string,
  industry?: string,
  source: string = MAPPED_SOURCE
): Promise<ClassificationResult> {
  const classification = createClassificationFromMapping(symbol, sector, industry, source);

  await storeClassification(classification);

  logger.info("Asset classified", {
    symbol: classification.symbol,
    industryId: classification.gicsIndustryId,
    confidence: classification.confidence,
    source: classification.source,
  });

  return classification;
}

/**
 * Classify multiple assets and store in cache
 *
 * @param assets - Array of { symbol, sector, industry }
 * @param source - Source of the classifications
 * @returns Array of classification results
 */
export async function classifyAssets(
  assets: Array<{ symbol: string; sector?: string; industry?: string }>,
  source: string = MAPPED_SOURCE
): Promise<ClassificationResult[]> {
  const classifications = assets.map((asset) =>
    createClassificationFromMapping(asset.symbol, asset.sector, asset.industry, source)
  );

  await storeClassifications(classifications);

  logger.info("Assets classified", {
    count: classifications.length,
    source,
  });

  return classifications;
}

/**
 * Process fundamentals and extract/store classifications
 *
 * AC-5.7.6: Integration with overnight job
 *
 * @param fundamentalsResults - Array of fundamentals results
 * @returns Array of classification results
 */
export async function processClassificationsFromFundamentals(
  fundamentalsResults: FundamentalsResult[]
): Promise<ClassificationResult[]> {
  const classifications = fundamentalsResults
    .filter((f) => f.sector || f.industry) // Only process if we have sector/industry info
    .map((f) => fundamentalsToClassification(f));

  if (classifications.length > 0) {
    await storeClassifications(classifications);

    logger.info("Classifications extracted from fundamentals", {
      total: fundamentalsResults.length,
      classified: classifications.length,
    });
  }

  return classifications;
}

/**
 * Get full GICS hierarchy for an industry ID
 *
 * @param industryId - 6-digit GICS industry ID
 * @returns Hierarchy info or null if not found
 */
export function getGicsHierarchy(industryId: string): {
  sectorId: string;
  sectorName: string;
  industryGroupId: string;
  industryGroupName: string;
  industryId: string;
  industryName: string;
} | null {
  const hierarchy = getHierarchyByIndustryId(industryId);
  if (!hierarchy) return null;

  return {
    sectorId: hierarchy.sector.id,
    sectorName: hierarchy.sector.name,
    industryGroupId: hierarchy.industryGroup.id,
    industryGroupName: hierarchy.industryGroup.name,
    industryId: hierarchy.industry.id,
    industryName: hierarchy.industry.name,
  };
}

/**
 * Get symbols that need classification refresh
 *
 * Returns symbols where classification is stale or missing.
 *
 * @param symbols - Array of symbols to check
 * @returns Array of symbols needing refresh
 */
export async function getSymbolsNeedingRefresh(symbols: string[]): Promise<string[]> {
  const results = await getClassifications(symbols);
  const needsRefresh: string[] = [];

  for (const [symbol, result] of results.entries()) {
    if (!result.classification || isClassificationStale(result.classification)) {
      needsRefresh.push(symbol);
    }
  }

  return needsRefresh;
}
