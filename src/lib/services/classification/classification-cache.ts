/**
 * Classification Cache Service
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.3: Two-Tier Cache - PostgreSQL + Vercel KV
 * AC-5.7.4: Asset-to-Classification Mapping
 *
 * Implements the two-tier caching strategy:
 * 1. Hot tier: Vercel KV (fast lookups, TTL-based)
 * 2. Cold tier: PostgreSQL (source of truth, longer retention)
 *
 * @module @/lib/services/classification/classification-cache
 */

import { db } from "@/lib/db";
import {
  cachedAssetClassifications,
  cachedGicsIndustries,
  cachedGicsIndustryGroups,
  cachedGicsSectors,
  type CachedGicsIndustry,
  type CachedGicsIndustryGroup,
  type CachedGicsSector,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { kv } from "@vercel/kv";
import { logger } from "@/lib/telemetry/logger";
import type { ClassificationResult } from "@/lib/providers/types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cache key prefix for KV */
const CACHE_PREFIX = "classification";

/** TTL for classification cache in seconds (7 days) */
const CLASSIFICATION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Batch size for database operations */
const BATCH_SIZE = 100;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Enriched classification with full hierarchy info
 */
export interface EnrichedClassification {
  symbol: string;
  gicsIndustryId: string;
  industryName: string;
  gicsIndustryGroupId: string;
  industryGroupName: string;
  gicsSectorId: string;
  sectorName: string;
  confidence: string;
  source: string;
  cacheUpdatedAt: Date;
}

/**
 * Cache lookup result
 */
export interface ClassificationCacheResult {
  /** The classification data */
  classification: EnrichedClassification | null;
  /** Whether data came from KV cache */
  fromKvCache: boolean;
  /** Whether data came from PostgreSQL */
  fromDb: boolean;
}

// =============================================================================
// KV CACHE HELPERS
// =============================================================================

/**
 * Get cache key for a symbol
 */
function getCacheKey(symbol: string): string {
  return `${CACHE_PREFIX}:${symbol.toUpperCase()}`;
}

/**
 * Get classification from KV cache
 */
async function getFromKvCache(symbol: string): Promise<EnrichedClassification | null> {
  try {
    const key = getCacheKey(symbol);
    const cached = await kv.get<EnrichedClassification>(key);
    return cached;
  } catch (error) {
    logger.warn("KV cache read error", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Set classification in KV cache
 */
async function setInKvCache(classification: EnrichedClassification): Promise<void> {
  try {
    const key = getCacheKey(classification.symbol);
    await kv.set(key, classification, { ex: CLASSIFICATION_TTL_SECONDS });
  } catch (error) {
    logger.warn("KV cache write error", {
      symbol: classification.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Set multiple classifications in KV cache
 */
async function setManyInKvCache(classifications: EnrichedClassification[]): Promise<void> {
  try {
    const pipeline = kv.pipeline();
    for (const classification of classifications) {
      const key = getCacheKey(classification.symbol);
      pipeline.set(key, classification, { ex: CLASSIFICATION_TTL_SECONDS });
    }
    await pipeline.exec();
  } catch (error) {
    logger.warn("KV cache batch write error", {
      count: classifications.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate classification in KV cache
 */
async function invalidateInKvCache(symbol: string): Promise<void> {
  try {
    const key = getCacheKey(symbol);
    await kv.del(key);
  } catch (error) {
    logger.warn("KV cache invalidate error", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate multiple classifications in KV cache using pipeline
 * Issue #3 fix: Use pipeline for batch invalidation instead of serial deletes
 */
async function invalidateManyInKvCache(symbols: string[]): Promise<void> {
  if (symbols.length === 0) return;

  try {
    const pipeline = kv.pipeline();
    for (const symbol of symbols) {
      const key = getCacheKey(symbol.toUpperCase());
      pipeline.del(key);
    }
    await pipeline.exec();
  } catch (error) {
    logger.warn("KV cache batch invalidate error", {
      count: symbols.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get multiple classifications from KV cache using mget
 * Issue #4 fix: Use mget for batch reads instead of serial gets
 */
async function getManyFromKvCache(
  symbols: string[]
): Promise<Map<string, EnrichedClassification | null>> {
  const results = new Map<string, EnrichedClassification | null>();

  if (symbols.length === 0) return results;

  try {
    const keys = symbols.map(getCacheKey);
    // mget returns an array of values (or null for each key)
    const cached = (await kv.mget(...keys)) as (EnrichedClassification | null)[];

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const value = cached[i];
      if (symbol !== undefined) {
        results.set(symbol, value ?? null);
      }
    }
  } catch (error) {
    logger.warn("KV cache batch read error", {
      count: symbols.length,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty results on error - will fall back to DB
    for (const symbol of symbols) {
      results.set(symbol, null);
    }
  }

  return results;
}

// =============================================================================
// DATABASE HELPERS
// =============================================================================

/**
 * Get classification from PostgreSQL with full hierarchy
 */
async function getFromDb(symbol: string): Promise<EnrichedClassification | null> {
  const result = await db
    .select({
      symbol: cachedAssetClassifications.symbol,
      gicsIndustryId: cachedAssetClassifications.gicsIndustryId,
      confidence: cachedAssetClassifications.confidence,
      source: cachedAssetClassifications.source,
      cacheUpdatedAt: cachedAssetClassifications.cacheUpdatedAt,
      industryName: cachedGicsIndustries.name,
      industryGroupId: cachedGicsIndustries.industryGroupId,
      industryGroupName: cachedGicsIndustryGroups.name,
      sectorId: cachedGicsIndustryGroups.sectorId,
      sectorName: cachedGicsSectors.name,
    })
    .from(cachedAssetClassifications)
    .innerJoin(
      cachedGicsIndustries,
      eq(cachedAssetClassifications.gicsIndustryId, cachedGicsIndustries.id)
    )
    .innerJoin(
      cachedGicsIndustryGroups,
      eq(cachedGicsIndustries.industryGroupId, cachedGicsIndustryGroups.id)
    )
    .innerJoin(cachedGicsSectors, eq(cachedGicsIndustryGroups.sectorId, cachedGicsSectors.id))
    .where(eq(cachedAssetClassifications.symbol, symbol.toUpperCase()))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  return {
    symbol: row.symbol,
    gicsIndustryId: row.gicsIndustryId,
    industryName: row.industryName,
    gicsIndustryGroupId: row.industryGroupId,
    industryGroupName: row.industryGroupName,
    gicsSectorId: row.sectorId,
    sectorName: row.sectorName,
    confidence: row.confidence,
    source: row.source,
    cacheUpdatedAt: row.cacheUpdatedAt,
  };
}

/**
 * Get multiple classifications from PostgreSQL with full hierarchy
 */
async function getManyFromDb(symbols: string[]): Promise<EnrichedClassification[]> {
  if (symbols.length === 0) return [];

  const upperSymbols = symbols.map((s) => s.toUpperCase());

  const result = await db
    .select({
      symbol: cachedAssetClassifications.symbol,
      gicsIndustryId: cachedAssetClassifications.gicsIndustryId,
      confidence: cachedAssetClassifications.confidence,
      source: cachedAssetClassifications.source,
      cacheUpdatedAt: cachedAssetClassifications.cacheUpdatedAt,
      industryName: cachedGicsIndustries.name,
      industryGroupId: cachedGicsIndustries.industryGroupId,
      industryGroupName: cachedGicsIndustryGroups.name,
      sectorId: cachedGicsIndustryGroups.sectorId,
      sectorName: cachedGicsSectors.name,
    })
    .from(cachedAssetClassifications)
    .innerJoin(
      cachedGicsIndustries,
      eq(cachedAssetClassifications.gicsIndustryId, cachedGicsIndustries.id)
    )
    .innerJoin(
      cachedGicsIndustryGroups,
      eq(cachedGicsIndustries.industryGroupId, cachedGicsIndustryGroups.id)
    )
    .innerJoin(cachedGicsSectors, eq(cachedGicsIndustryGroups.sectorId, cachedGicsSectors.id))
    .where(inArray(cachedAssetClassifications.symbol, upperSymbols));

  return result.map((row) => ({
    symbol: row.symbol,
    gicsIndustryId: row.gicsIndustryId,
    industryName: row.industryName,
    gicsIndustryGroupId: row.industryGroupId,
    industryGroupName: row.industryGroupName,
    gicsSectorId: row.sectorId,
    sectorName: row.sectorName,
    confidence: row.confidence,
    source: row.source,
    cacheUpdatedAt: row.cacheUpdatedAt,
  }));
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get classification for a single symbol
 *
 * AC-5.7.3: Two-tier cache lookup
 * 1. Check KV cache first (fast)
 * 2. Fall back to PostgreSQL (source of truth)
 * 3. Populate KV cache if found in DB
 *
 * @param symbol - Asset symbol to look up
 * @returns Cache result with classification data
 */
export async function getClassification(symbol: string): Promise<ClassificationCacheResult> {
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
    // Populate KV cache for next time
    await setInKvCache(dbResult);
    return {
      classification: dbResult,
      fromKvCache: false,
      fromDb: true,
    };
  }

  // Not found
  return {
    classification: null,
    fromKvCache: false,
    fromDb: false,
  };
}

/**
 * Get classifications for multiple symbols
 *
 * Optimized batch lookup:
 * 1. Check KV cache for all symbols using mget (Issue #4 fix)
 * 2. Query PostgreSQL for missing symbols
 * 3. Populate KV cache with DB results
 *
 * @param symbols - Array of asset symbols
 * @returns Map of symbol to classification result
 */
export async function getClassifications(
  symbols: string[]
): Promise<Map<string, ClassificationCacheResult>> {
  const results = new Map<string, ClassificationCacheResult>();
  const upperSymbols = symbols.map((s) => s.toUpperCase());

  // Issue #4 fix: Use batch mget instead of serial gets
  const kvResults = await getManyFromKvCache(upperSymbols);
  const missingFromKv: string[] = [];

  for (const symbol of upperSymbols) {
    const kvResult = kvResults.get(symbol);
    if (kvResult) {
      results.set(symbol, {
        classification: kvResult,
        fromKvCache: true,
        fromDb: false,
      });
    } else {
      missingFromKv.push(symbol);
    }
  }

  // Query PostgreSQL for missing symbols
  if (missingFromKv.length > 0) {
    const dbResults = await getManyFromDb(missingFromKv);
    const dbResultsMap = new Map(dbResults.map((r) => [r.symbol, r]));

    // Add DB results and populate KV cache
    const toCache: EnrichedClassification[] = [];
    for (const symbol of missingFromKv) {
      const dbResult = dbResultsMap.get(symbol);
      if (dbResult) {
        results.set(symbol, {
          classification: dbResult,
          fromKvCache: false,
          fromDb: true,
        });
        toCache.push(dbResult);
      } else {
        results.set(symbol, {
          classification: null,
          fromKvCache: false,
          fromDb: false,
        });
      }
    }

    // Batch populate KV cache
    if (toCache.length > 0) {
      await setManyInKvCache(toCache);
    }
  }

  return results;
}

/**
 * Store classification in both cache tiers
 *
 * AC-5.7.4: Asset-to-Classification Mapping
 *
 * @param result - Classification result from provider
 */
export async function storeClassification(result: ClassificationResult): Promise<void> {
  const now = new Date();
  const upperSymbol = result.symbol.toUpperCase();

  // Store in PostgreSQL (upsert)
  await db
    .insert(cachedAssetClassifications)
    .values({
      symbol: upperSymbol,
      gicsIndustryId: result.gicsIndustryId,
      confidence: result.confidence,
      source: result.source,
      createdAt: now,
      cacheUpdatedAt: now,
    })
    .onConflictDoUpdate({
      target: cachedAssetClassifications.symbol,
      set: {
        gicsIndustryId: result.gicsIndustryId,
        confidence: result.confidence,
        source: result.source,
        cacheUpdatedAt: now,
      },
    });

  // Invalidate KV cache (will be repopulated on next read)
  await invalidateInKvCache(upperSymbol);

  logger.debug("Classification stored", {
    symbol: upperSymbol,
    industryId: result.gicsIndustryId,
    confidence: result.confidence,
    source: result.source,
  });
}

/**
 * Store multiple classifications in both cache tiers
 *
 * Issue #2 fix: Use transaction for batch DB inserts to reduce connection overhead
 * Issue #3 fix: Use batch invalidation for KV cache
 *
 * @param results - Array of classification results
 */
export async function storeClassifications(results: ClassificationResult[]): Promise<void> {
  if (results.length === 0) return;

  const now = new Date();

  // Issue #2 fix: Use transaction for batch inserts
  // This reduces connection overhead by keeping all operations in a single transaction
  await db.transaction(async (tx) => {
    // Process in batches within the transaction
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);

      const values = batch.map((result) => ({
        symbol: result.symbol.toUpperCase(),
        gicsIndustryId: result.gicsIndustryId,
        confidence: result.confidence,
        source: result.source,
        createdAt: now,
        cacheUpdatedAt: now,
      }));

      // Upsert each record within the transaction
      for (const value of values) {
        await tx
          .insert(cachedAssetClassifications)
          .values(value)
          .onConflictDoUpdate({
            target: cachedAssetClassifications.symbol,
            set: {
              gicsIndustryId: value.gicsIndustryId,
              confidence: value.confidence,
              source: value.source,
              cacheUpdatedAt: now,
            },
          });
      }
    }
  });

  // Issue #3 fix: Use batch invalidation instead of serial deletes
  const symbols = results.map((r) => r.symbol);
  await invalidateManyInKvCache(symbols);

  logger.info("Classifications stored", { count: results.length });
}

/**
 * Seed GICS reference data into PostgreSQL
 *
 * AC-5.7.7: Reference Data Seed
 *
 * This should be called during database setup/migration.
 */
export async function seedGicsReferenceData(): Promise<void> {
  const { GICS_SECTORS, GICS_INDUSTRY_GROUPS, GICS_INDUSTRIES } = await import("@/lib/db/schema");
  const now = new Date();

  logger.info("Seeding GICS reference data...");

  // Seed sectors
  for (const sector of GICS_SECTORS) {
    await db
      .insert(cachedGicsSectors)
      .values({
        id: sector.id,
        name: sector.name,
        description: sector.description ?? null,
        createdAt: now,
        cacheUpdatedAt: now,
      })
      .onConflictDoUpdate({
        target: cachedGicsSectors.id,
        set: {
          name: sector.name,
          description: sector.description ?? null,
          cacheUpdatedAt: now,
        },
      });
  }

  // Seed industry groups
  for (const group of GICS_INDUSTRY_GROUPS) {
    await db
      .insert(cachedGicsIndustryGroups)
      .values({
        id: group.id,
        sectorId: group.sectorId,
        name: group.name,
        description: group.description ?? null,
        createdAt: now,
        cacheUpdatedAt: now,
      })
      .onConflictDoUpdate({
        target: cachedGicsIndustryGroups.id,
        set: {
          sectorId: group.sectorId,
          name: group.name,
          description: group.description ?? null,
          cacheUpdatedAt: now,
        },
      });
  }

  // Seed industries
  for (const industry of GICS_INDUSTRIES) {
    await db
      .insert(cachedGicsIndustries)
      .values({
        id: industry.id,
        industryGroupId: industry.industryGroupId,
        name: industry.name,
        description: industry.description ?? null,
        createdAt: now,
        cacheUpdatedAt: now,
      })
      .onConflictDoUpdate({
        target: cachedGicsIndustries.id,
        set: {
          industryGroupId: industry.industryGroupId,
          name: industry.name,
          description: industry.description ?? null,
          cacheUpdatedAt: now,
        },
      });
  }

  logger.info("GICS reference data seeded", {
    sectors: GICS_SECTORS.length,
    industryGroups: GICS_INDUSTRY_GROUPS.length,
    industries: GICS_INDUSTRIES.length,
  });
}

/**
 * Check if GICS reference data is seeded
 */
export async function isGicsReferenceDataSeeded(): Promise<boolean> {
  const sectorCount = await db
    .select({ count: cachedGicsSectors.id })
    .from(cachedGicsSectors)
    .then((r) => r.length);

  return sectorCount >= 11; // We have 11 GICS sectors
}

/**
 * Get all GICS sectors
 */
export async function getAllSectors(): Promise<CachedGicsSector[]> {
  return db.select().from(cachedGicsSectors).orderBy(cachedGicsSectors.id);
}

/**
 * Get all GICS industry groups
 */
export async function getAllIndustryGroups(): Promise<CachedGicsIndustryGroup[]> {
  return db.select().from(cachedGicsIndustryGroups).orderBy(cachedGicsIndustryGroups.id);
}

/**
 * Get all GICS industries
 */
export async function getAllIndustries(): Promise<CachedGicsIndustry[]> {
  return db.select().from(cachedGicsIndustries).orderBy(cachedGicsIndustries.id);
}
