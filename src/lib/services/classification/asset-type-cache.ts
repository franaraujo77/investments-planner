/**
 * Asset Type Cache Service
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 *
 * Implements two-tier caching for asset type classifications:
 * 1. Hot tier: Vercel KV (fast lookups, 7-day TTL)
 * 2. Cold tier: PostgreSQL (source of truth)
 *
 * @module @/lib/services/classification/asset-type-cache
 */

import { db } from "@/lib/db";
import {
  cachedAssetTypes,
  cachedJurisdictions,
  cachedAssetTypeLocalizations,
  cachedAssetIdentifiers,
  cachedAssetAliases,
  type CachedAssetType,
  type CachedJurisdiction,
  type CachedAssetTypeLocalization,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { kv } from "@vercel/kv";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cache key prefix for asset type lookups */
const CACHE_PREFIX = "asset-type";

/** TTL for asset type cache in seconds (7 days - same as fundamentals) */
const ASSET_TYPE_TTL_SECONDS = 7 * 24 * 60 * 60;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Full asset type classification with localization
 *
 * AC-5.8.4: Classification result includes all required fields
 */
export interface FullTypeClassification {
  symbol: string;
  canonicalTypeId: string;
  canonicalTypeName: string;
  category: string;
  jurisdictionCode: string;
  localTypeName: string;
  localTypeCode: string;
  regulatoryReference?: string | null;
  isin?: string | null;
  confidence: string;
  source: string;
  lastUpdated: Date;
}

/**
 * Linked asset (same ISIN, different markets)
 *
 * AC-5.8.5: Multi-Jurisdiction Asset Linking result
 */
export interface LinkedAsset {
  symbol: string;
  jurisdictionCode: string;
  isPrimary: boolean;
}

/**
 * Cache lookup result
 */
export interface AssetTypeCacheResult {
  classification: FullTypeClassification | null;
  fromKvCache: boolean;
  fromDb: boolean;
}

// =============================================================================
// KV CACHE HELPERS
// =============================================================================

/**
 * Get cache key for asset type classification
 *
 * AC-5.8.4: Use cache key pattern: global:asset-type:{symbol}
 */
function getAssetTypeCacheKey(symbol: string): string {
  return `global:${CACHE_PREFIX}:${symbol.toUpperCase()}`;
}

/**
 * Get cache key for ISIN-linked assets
 *
 * AC-5.8.4: Use cache key pattern: global:isin-links:{isin}
 */
function getIsinLinksCacheKey(isin: string): string {
  return `global:isin-links:${isin.toUpperCase()}`;
}

/**
 * Get classification from KV cache
 */
async function getFromKvCache(symbol: string): Promise<FullTypeClassification | null> {
  try {
    const key = getAssetTypeCacheKey(symbol);
    const cached = await kv.get<FullTypeClassification>(key);
    return cached;
  } catch (error) {
    logger.warn("Asset type KV cache read error", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Set classification in KV cache
 */
async function setInKvCache(classification: FullTypeClassification): Promise<void> {
  try {
    const key = getAssetTypeCacheKey(classification.symbol);
    await kv.set(key, classification, { ex: ASSET_TYPE_TTL_SECONDS });
  } catch (error) {
    logger.warn("Asset type KV cache write error", {
      symbol: classification.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate classification in KV cache
 */
async function invalidateInKvCache(symbol: string): Promise<void> {
  try {
    const key = getAssetTypeCacheKey(symbol);
    await kv.del(key);
  } catch (error) {
    logger.warn("Asset type KV cache invalidate error", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get linked assets from KV cache
 */
async function getLinkedAssetsFromKvCache(isin: string): Promise<LinkedAsset[] | null> {
  try {
    const key = getIsinLinksCacheKey(isin);
    const cached = await kv.get<LinkedAsset[]>(key);
    return cached;
  } catch (error) {
    logger.warn("ISIN links KV cache read error", {
      isin,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Set linked assets in KV cache
 */
async function setLinkedAssetsInKvCache(isin: string, assets: LinkedAsset[]): Promise<void> {
  try {
    const key = getIsinLinksCacheKey(isin);
    await kv.set(key, assets, { ex: ASSET_TYPE_TTL_SECONDS });
  } catch (error) {
    logger.warn("ISIN links KV cache write error", {
      isin,
      count: assets.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// =============================================================================
// DATABASE HELPERS
// =============================================================================

/**
 * Get full classification from PostgreSQL with localization
 */
async function getFromDb(symbol: string): Promise<FullTypeClassification | null> {
  const upperSymbol = symbol.toUpperCase();

  const result = await db
    .select({
      // Asset identifier
      symbol: cachedAssetIdentifiers.symbol,
      isin: cachedAssetIdentifiers.isin,
      confidence: cachedAssetIdentifiers.confidence,
      source: cachedAssetIdentifiers.source,
      cacheUpdatedAt: cachedAssetIdentifiers.cacheUpdatedAt,
      // Canonical type
      canonicalTypeId: cachedAssetTypes.id,
      canonicalTypeName: cachedAssetTypes.name,
      category: cachedAssetTypes.category,
      // Jurisdiction
      jurisdictionCode: cachedJurisdictions.code,
      // Localization
      localTypeName: cachedAssetTypeLocalizations.localName,
      localTypeCode: cachedAssetTypeLocalizations.localCode,
      regulatoryReference: cachedAssetTypeLocalizations.regulatoryReference,
    })
    .from(cachedAssetIdentifiers)
    .innerJoin(cachedAssetTypes, eq(cachedAssetIdentifiers.canonicalTypeId, cachedAssetTypes.id))
    .innerJoin(
      cachedJurisdictions,
      eq(cachedAssetIdentifiers.jurisdictionCode, cachedJurisdictions.code)
    )
    .leftJoin(
      cachedAssetTypeLocalizations,
      and(
        eq(cachedAssetTypeLocalizations.canonicalTypeId, cachedAssetIdentifiers.canonicalTypeId),
        eq(cachedAssetTypeLocalizations.jurisdictionCode, cachedAssetIdentifiers.jurisdictionCode)
      )
    )
    .where(eq(cachedAssetIdentifiers.symbol, upperSymbol))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  return {
    symbol: row.symbol,
    canonicalTypeId: row.canonicalTypeId,
    canonicalTypeName: row.canonicalTypeName,
    category: row.category,
    jurisdictionCode: row.jurisdictionCode,
    localTypeName: row.localTypeName ?? row.canonicalTypeName, // Fallback to canonical name
    localTypeCode: row.localTypeCode ?? row.canonicalTypeId, // Fallback to canonical ID
    regulatoryReference: row.regulatoryReference,
    isin: row.isin,
    confidence: row.confidence,
    source: row.source,
    lastUpdated: row.cacheUpdatedAt,
  };
}

/**
 * Get linked assets from PostgreSQL by ISIN
 */
async function getLinkedAssetsFromDb(isin: string): Promise<LinkedAsset[]> {
  const upperIsin = isin.toUpperCase();

  const result = await db
    .select({
      symbol: cachedAssetAliases.symbol,
      jurisdictionCode: cachedAssetAliases.jurisdictionCode,
      isPrimary: cachedAssetAliases.isPrimary,
    })
    .from(cachedAssetAliases)
    .where(eq(cachedAssetAliases.isin, upperIsin));

  return result;
}

// =============================================================================
// PUBLIC API - CLASSIFICATION LOOKUPS
// =============================================================================

/**
 * Get asset type classification for a symbol
 *
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 *
 * Uses two-tier cache:
 * 1. Check KV cache first
 * 2. Fall back to PostgreSQL
 * 3. Populate KV on DB hit
 *
 * @param symbol - Asset symbol (e.g., "AAPL", "PETR4.SA")
 * @returns Classification with type, jurisdiction, and localization
 */
export async function getAssetTypeClassification(symbol: string): Promise<AssetTypeCacheResult> {
  const upperSymbol = symbol.toUpperCase();

  // Try KV cache first
  const kvResult = await getFromKvCache(upperSymbol);
  if (kvResult) {
    return {
      classification: kvResult,
      fromKvCache: true,
      fromDb: false,
    };
  }

  // Fall back to PostgreSQL
  const dbResult = await getFromDb(upperSymbol);
  if (dbResult) {
    // Populate KV cache
    await setInKvCache(dbResult);
    return {
      classification: dbResult,
      fromKvCache: false,
      fromDb: true,
    };
  }

  return {
    classification: null,
    fromKvCache: false,
    fromDb: false,
  };
}

/**
 * Get linked assets by ISIN
 *
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 *
 * @param isin - ISIN to find linked assets for
 * @returns Array of linked assets across jurisdictions
 */
export async function getLinkedAssets(isin: string): Promise<LinkedAsset[]> {
  if (!isin || isin.length < 12) return [];

  const upperIsin = isin.toUpperCase();

  // Try KV cache first
  const kvResult = await getLinkedAssetsFromKvCache(upperIsin);
  if (kvResult) {
    return kvResult;
  }

  // Fall back to PostgreSQL
  const dbResult = await getLinkedAssetsFromDb(upperIsin);

  // Populate KV cache if we have results
  if (dbResult.length > 0) {
    await setLinkedAssetsInKvCache(upperIsin, dbResult);
  }

  return dbResult;
}

/**
 * Get all assets of a specific canonical type
 *
 * @param canonicalTypeId - Canonical type ID (e.g., "COMMON_STOCK")
 * @param jurisdictionCode - Optional jurisdiction filter
 * @returns Array of symbols matching the type
 */
export async function getAssetsByType(
  canonicalTypeId: string,
  jurisdictionCode?: string
): Promise<string[]> {
  let query = db
    .select({ symbol: cachedAssetIdentifiers.symbol })
    .from(cachedAssetIdentifiers)
    .where(eq(cachedAssetIdentifiers.canonicalTypeId, canonicalTypeId));

  if (jurisdictionCode) {
    query = db
      .select({ symbol: cachedAssetIdentifiers.symbol })
      .from(cachedAssetIdentifiers)
      .where(
        eq(cachedAssetIdentifiers.canonicalTypeId, canonicalTypeId) &&
          eq(cachedAssetIdentifiers.jurisdictionCode, jurisdictionCode)
      );
  }

  const result = await query;
  return result.map((r) => r.symbol);
}

/**
 * Get localized type name for a canonical type and jurisdiction
 *
 * @param canonicalTypeId - Canonical type ID
 * @param jurisdictionCode - Jurisdiction code
 * @returns Localized name or canonical name if no localization exists
 */
export async function getLocalizedTypeName(
  canonicalTypeId: string,
  jurisdictionCode: string
): Promise<string> {
  const result = await db
    .select({ localName: cachedAssetTypeLocalizations.localName })
    .from(cachedAssetTypeLocalizations)
    .where(
      eq(cachedAssetTypeLocalizations.canonicalTypeId, canonicalTypeId) &&
        eq(cachedAssetTypeLocalizations.jurisdictionCode, jurisdictionCode)
    )
    .limit(1);

  if (result[0]) {
    return result[0].localName;
  }

  // Fall back to canonical type name
  const typeResult = await db
    .select({ name: cachedAssetTypes.name })
    .from(cachedAssetTypes)
    .where(eq(cachedAssetTypes.id, canonicalTypeId))
    .limit(1);

  return typeResult[0]?.name ?? canonicalTypeId;
}

// =============================================================================
// PUBLIC API - STORAGE
// =============================================================================

/**
 * Store asset type classification
 *
 * @param classification - Classification data to store
 */
export async function storeAssetTypeClassification(params: {
  symbol: string;
  canonicalTypeId: string;
  jurisdictionCode: string;
  isin?: string | null;
  confidence: string;
  source: string;
}): Promise<void> {
  const now = new Date();
  const upperSymbol = params.symbol.toUpperCase();

  await db
    .insert(cachedAssetIdentifiers)
    .values({
      symbol: upperSymbol,
      isin: params.isin ?? null,
      canonicalTypeId: params.canonicalTypeId,
      jurisdictionCode: params.jurisdictionCode,
      confidence: params.confidence,
      source: params.source,
      createdAt: now,
      cacheUpdatedAt: now,
    })
    .onConflictDoUpdate({
      target: cachedAssetIdentifiers.symbol,
      set: {
        isin: params.isin ?? null,
        canonicalTypeId: params.canonicalTypeId,
        jurisdictionCode: params.jurisdictionCode,
        confidence: params.confidence,
        source: params.source,
        cacheUpdatedAt: now,
      },
    });

  // Invalidate KV cache
  await invalidateInKvCache(upperSymbol);

  logger.debug("Asset type classification stored", {
    symbol: upperSymbol,
    canonicalTypeId: params.canonicalTypeId,
    jurisdictionCode: params.jurisdictionCode,
    confidence: params.confidence,
  });
}

/**
 * Store asset alias (ISIN linking)
 *
 * @param alias - Alias data to store
 */
export async function storeAssetAlias(params: {
  isin: string;
  symbol: string;
  jurisdictionCode: string;
  isPrimary: boolean;
}): Promise<void> {
  const now = new Date();

  await db
    .insert(cachedAssetAliases)
    .values({
      isin: params.isin.toUpperCase(),
      symbol: params.symbol.toUpperCase(),
      jurisdictionCode: params.jurisdictionCode,
      isPrimary: params.isPrimary,
      createdAt: now,
      cacheUpdatedAt: now,
    })
    .onConflictDoUpdate({
      target: [cachedAssetAliases.symbol],
      set: {
        isin: params.isin.toUpperCase(),
        jurisdictionCode: params.jurisdictionCode,
        isPrimary: params.isPrimary,
        cacheUpdatedAt: now,
      },
    });
}

// =============================================================================
// PUBLIC API - REFERENCE DATA
// =============================================================================

/**
 * Get all canonical asset types
 */
export async function getAllAssetTypes(): Promise<CachedAssetType[]> {
  return db.select().from(cachedAssetTypes).orderBy(cachedAssetTypes.category, cachedAssetTypes.id);
}

/**
 * Get all jurisdictions
 */
export async function getAllJurisdictions(): Promise<CachedJurisdiction[]> {
  return db.select().from(cachedJurisdictions).orderBy(cachedJurisdictions.code);
}

/**
 * Get all localizations for a jurisdiction
 */
export async function getLocalizationsForJurisdiction(
  jurisdictionCode: string
): Promise<CachedAssetTypeLocalization[]> {
  return db
    .select()
    .from(cachedAssetTypeLocalizations)
    .where(eq(cachedAssetTypeLocalizations.jurisdictionCode, jurisdictionCode));
}

/**
 * Check if asset type reference data is seeded
 */
export async function isAssetTypeReferenceDataSeeded(): Promise<boolean> {
  const typeCount = await db
    .select({ count: cachedAssetTypes.id })
    .from(cachedAssetTypes)
    .then((r) => r.length);

  const jurisdictionCount = await db
    .select({ count: cachedJurisdictions.code })
    .from(cachedJurisdictions)
    .then((r) => r.length);

  // We expect at least 14 canonical types and 2 jurisdictions
  return typeCount >= 14 && jurisdictionCount >= 2;
}
