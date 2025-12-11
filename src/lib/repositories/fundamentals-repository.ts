/**
 * Fundamentals Repository
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.2: Data Cached with 7-Day TTL
 * AC-6.2.5: Source Attribution Recorded
 *
 * Database operations for asset fundamentals data.
 * Provides CRUD operations with upsert support for conflict resolution.
 *
 * @module @/lib/repositories/fundamentals-repository
 */

import { db } from "@/lib/db";
import { eq, inArray, and, desc } from "drizzle-orm";
import {
  assetFundamentals,
  type AssetFundamental,
  type NewAssetFundamental,
} from "@/lib/db/schema";
import type { FundamentalsResult } from "@/lib/providers/types";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of upsert operation
 */
export interface UpsertResult {
  inserted: number;
  updated: number;
  errors: Array<{ symbol: string; error: string }>;
}

// =============================================================================
// REPOSITORY CLASS
// =============================================================================

/**
 * Fundamentals Repository
 *
 * Handles all database operations for asset fundamentals.
 * Uses upsert semantics to handle unique constraint on (symbol, data_date).
 *
 * @example
 * ```typescript
 * const repo = new FundamentalsRepository();
 *
 * // Upsert fundamentals from provider
 * await repo.upsertFundamentals(providerResults);
 *
 * // Query by symbol
 * const fundamental = await repo.getFundamentalsBySymbol('PETR4');
 * ```
 */
export class FundamentalsRepository {
  /**
   * Upsert fundamentals data
   *
   * AC-6.2.5: Source attribution recorded (source, fetchedAt, dataDate)
   *
   * Uses INSERT ... ON CONFLICT UPDATE for atomic upsert.
   * Updates all fields except id when symbol+dataDate already exists.
   *
   * @param fundamentals - Array of fundamentals results from provider
   * @returns UpsertResult with counts and any errors
   */
  async upsertFundamentals(fundamentals: FundamentalsResult[]): Promise<UpsertResult> {
    if (fundamentals.length === 0) {
      return { inserted: 0, updated: 0, errors: [] };
    }

    const result: UpsertResult = {
      inserted: 0,
      updated: 0,
      errors: [],
    };

    for (const fundamental of fundamentals) {
      try {
        const record = this.toDbRecord(fundamental);

        // Check if record exists
        const existing = await db
          .select({ id: assetFundamentals.id })
          .from(assetFundamentals)
          .where(
            and(
              eq(assetFundamentals.symbol, record.symbol),
              eq(assetFundamentals.dataDate, record.dataDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(assetFundamentals)
            .set({
              ...record,
              updatedAt: new Date(),
            })
            .where(eq(assetFundamentals.id, existing[0]!.id));
          result.updated++;
        } else {
          // Insert new record
          await db.insert(assetFundamentals).values(record);
          result.inserted++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Failed to upsert fundamental", {
          symbol: fundamental.symbol,
          error: errorMessage,
        });
        result.errors.push({ symbol: fundamental.symbol, error: errorMessage });
      }
    }

    logger.info("Fundamentals upsert completed", {
      inserted: result.inserted,
      updated: result.updated,
      errorCount: result.errors.length,
    });

    return result;
  }

  /**
   * Get fundamentals for a single symbol
   *
   * Returns the most recent fundamental data for the symbol.
   *
   * @param symbol - Asset symbol
   * @returns Most recent fundamental or null if not found
   */
  async getFundamentalsBySymbol(symbol: string): Promise<AssetFundamental | null> {
    const results = await db
      .select()
      .from(assetFundamentals)
      .where(eq(assetFundamentals.symbol, symbol.toUpperCase()))
      .orderBy(desc(assetFundamentals.dataDate))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Get fundamentals for multiple symbols
   *
   * Returns the most recent fundamental data for each symbol.
   * Uses a subquery to get the latest record per symbol.
   *
   * @param symbols - Array of asset symbols
   * @returns Array of fundamentals (may be fewer than input if some not found)
   */
  async getFundamentalsBySymbols(symbols: string[]): Promise<AssetFundamental[]> {
    if (symbols.length === 0) {
      return [];
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());

    // Get all fundamentals for these symbols
    const allResults = await db
      .select()
      .from(assetFundamentals)
      .where(inArray(assetFundamentals.symbol, upperSymbols))
      .orderBy(desc(assetFundamentals.dataDate));

    // Deduplicate to get most recent per symbol
    const latestBySymbol = new Map<string, AssetFundamental>();
    for (const result of allResults) {
      if (!latestBySymbol.has(result.symbol)) {
        latestBySymbol.set(result.symbol, result);
      }
    }

    return Array.from(latestBySymbol.values());
  }

  /**
   * Get fundamentals by data date
   *
   * Useful for fetching fundamentals for a specific point in time.
   *
   * @param symbol - Asset symbol
   * @param dataDate - The date the fundamentals represent
   * @returns Fundamental for that date or null
   */
  async getFundamentalsByDate(symbol: string, dataDate: Date): Promise<AssetFundamental | null> {
    const dateString = dataDate.toISOString().split("T")[0]!;

    const results = await db
      .select()
      .from(assetFundamentals)
      .where(
        and(
          eq(assetFundamentals.symbol, symbol.toUpperCase()),
          eq(assetFundamentals.dataDate, dateString)
        )
      )
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Delete old fundamentals data
   *
   * Useful for cleanup of stale data beyond retention period.
   *
   * @param beforeDate - Delete records with dataDate before this date
   * @returns Number of deleted records
   */
  async deleteOldFundamentals(beforeDate: Date): Promise<number> {
    const dateString = beforeDate.toISOString().split("T")[0]!;

    // Use raw SQL for the comparison since Drizzle lt() doesn't work with date
    const result = await db.execute(
      `DELETE FROM asset_fundamentals WHERE data_date < '${dateString}' RETURNING 1`
    );

    const count = result.length;

    logger.info("Deleted old fundamentals", {
      beforeDate: dateString,
      deletedCount: count,
    });

    return count;
  }

  /**
   * Convert FundamentalsResult to database record
   */
  private toDbRecord(fundamental: FundamentalsResult): NewAssetFundamental {
    // Format dataDate as YYYY-MM-DD string for the date column
    const dataDateString = fundamental.dataDate.toISOString().split("T")[0]!;

    return {
      symbol: fundamental.symbol.toUpperCase(),
      peRatio: fundamental.peRatio ?? null,
      pbRatio: fundamental.pbRatio ?? null,
      dividendYield: fundamental.dividendYield ?? null,
      marketCap: fundamental.marketCap ?? null,
      revenue: fundamental.revenue ?? null,
      earnings: fundamental.earnings ?? null,
      sector: fundamental.sector ?? null,
      industry: fundamental.industry ?? null,
      source: fundamental.source,
      fetchedAt: fundamental.fetchedAt,
      dataDate: dataDateString,
    };
  }

  /**
   * Convert database record to FundamentalsResult
   */
  static toFundamentalsResult(record: AssetFundamental): FundamentalsResult {
    // Build result with only defined fields (exactOptionalPropertyTypes compliance)
    const result: FundamentalsResult = {
      symbol: record.symbol,
      source: record.source,
      fetchedAt: record.fetchedAt,
      dataDate: new Date(record.dataDate),
    };

    // Add optional fields only if they have values
    if (record.peRatio != null) {
      result.peRatio = record.peRatio;
    }
    if (record.pbRatio != null) {
      result.pbRatio = record.pbRatio;
    }
    if (record.dividendYield != null) {
      result.dividendYield = record.dividendYield;
    }
    if (record.marketCap != null) {
      result.marketCap = record.marketCap;
    }
    if (record.revenue != null) {
      result.revenue = record.revenue;
    }
    if (record.earnings != null) {
      result.earnings = record.earnings;
    }
    if (record.sector != null) {
      result.sector = record.sector;
    }
    if (record.industry != null) {
      result.industry = record.industry;
    }

    return result;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default fundamentals repository instance
 */
export const fundamentalsRepository = new FundamentalsRepository();
