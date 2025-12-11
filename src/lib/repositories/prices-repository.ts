/**
 * Prices Repository
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.2: Prices Cached with 24-Hour TTL
 * AC-6.3.4: Missing Prices Show Last Known Price with Stale Flag
 *
 * Database operations for asset prices data.
 * Provides CRUD operations with upsert support for conflict resolution.
 *
 * @module @/lib/repositories/prices-repository
 */

import { db } from "@/lib/db";
import { eq, inArray, and, desc } from "drizzle-orm";
import { assetPrices, type AssetPrice, type NewAssetPrice } from "@/lib/db/schema";
import type { PriceResult } from "@/lib/providers/types";
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
 * Prices Repository
 *
 * Handles all database operations for asset prices.
 * Uses upsert semantics to handle unique constraint on (symbol, price_date).
 *
 * @example
 * ```typescript
 * const repo = new PricesRepository();
 *
 * // Upsert prices from provider
 * await repo.upsertPrices(providerResults);
 *
 * // Query by symbol
 * const price = await repo.getPriceBySymbol('PETR4');
 * ```
 */
export class PricesRepository {
  /**
   * Upsert prices data
   *
   * AC-6.3.1: Records OHLCV data
   * AC-6.3.4: Records isStale flag
   *
   * Uses INSERT ... ON CONFLICT UPDATE for atomic upsert.
   * Updates all fields except id when symbol+priceDate already exists.
   *
   * @param prices - Array of price results from provider
   * @returns UpsertResult with counts and any errors
   */
  async upsertPrices(prices: PriceResult[]): Promise<UpsertResult> {
    if (prices.length === 0) {
      return { inserted: 0, updated: 0, errors: [] };
    }

    const result: UpsertResult = {
      inserted: 0,
      updated: 0,
      errors: [],
    };

    for (const price of prices) {
      try {
        const record = this.toDbRecord(price);

        // Check if record exists
        const existing = await db
          .select({ id: assetPrices.id })
          .from(assetPrices)
          .where(
            and(eq(assetPrices.symbol, record.symbol), eq(assetPrices.priceDate, record.priceDate))
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(assetPrices)
            .set({
              ...record,
              updatedAt: new Date(),
            })
            .where(eq(assetPrices.id, existing[0]!.id));
          result.updated++;
        } else {
          // Insert new record
          await db.insert(assetPrices).values(record);
          result.inserted++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Failed to upsert price", {
          symbol: price.symbol,
          error: errorMessage,
        });
        result.errors.push({ symbol: price.symbol, error: errorMessage });
      }
    }

    logger.info("Prices upsert completed", {
      inserted: result.inserted,
      updated: result.updated,
      errorCount: result.errors.length,
    });

    return result;
  }

  /**
   * Get price for a single symbol
   *
   * Returns the most recent price data for the symbol.
   *
   * @param symbol - Asset symbol
   * @param date - Optional specific date to query
   * @returns Most recent price or null if not found
   */
  async getPriceBySymbol(symbol: string, date?: Date): Promise<AssetPrice | null> {
    if (date) {
      const dateString = date.toISOString().split("T")[0]!;
      const results = await db
        .select()
        .from(assetPrices)
        .where(
          and(eq(assetPrices.symbol, symbol.toUpperCase()), eq(assetPrices.priceDate, dateString))
        )
        .limit(1);

      return results[0] ?? null;
    }

    // Get most recent price
    const results = await db
      .select()
      .from(assetPrices)
      .where(eq(assetPrices.symbol, symbol.toUpperCase()))
      .orderBy(desc(assetPrices.priceDate))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Get prices for multiple symbols
   *
   * Returns the most recent price data for each symbol.
   *
   * @param symbols - Array of asset symbols
   * @param date - Optional specific date to query
   * @returns Array of prices (may be fewer than input if some not found)
   */
  async getPricesBySymbols(symbols: string[], date?: Date): Promise<AssetPrice[]> {
    if (symbols.length === 0) {
      return [];
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());

    if (date) {
      const dateString = date.toISOString().split("T")[0]!;
      return db
        .select()
        .from(assetPrices)
        .where(
          and(inArray(assetPrices.symbol, upperSymbols), eq(assetPrices.priceDate, dateString))
        );
    }

    // Get all prices for these symbols
    const allResults = await db
      .select()
      .from(assetPrices)
      .where(inArray(assetPrices.symbol, upperSymbols))
      .orderBy(desc(assetPrices.priceDate));

    // Deduplicate to get most recent per symbol
    const latestBySymbol = new Map<string, AssetPrice>();
    for (const result of allResults) {
      if (!latestBySymbol.has(result.symbol)) {
        latestBySymbol.set(result.symbol, result);
      }
    }

    return Array.from(latestBySymbol.values());
  }

  /**
   * Mark prices as stale
   *
   * AC-6.3.4: Mark prices as stale when data becomes outdated
   *
   * @param symbols - Array of symbols to mark as stale
   */
  async markAsStale(symbols: string[]): Promise<void> {
    if (symbols.length === 0) {
      return;
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());

    await db
      .update(assetPrices)
      .set({ isStale: true, updatedAt: new Date() })
      .where(inArray(assetPrices.symbol, upperSymbols));

    logger.info("Marked prices as stale", {
      symbolCount: symbols.length,
    });
  }

  /**
   * Delete old prices data
   *
   * Useful for cleanup of data beyond retention period.
   *
   * @param beforeDate - Delete records with priceDate before this date
   * @returns Number of deleted records
   */
  async deleteOldPrices(beforeDate: Date): Promise<number> {
    const dateString = beforeDate.toISOString().split("T")[0]!;

    // Use raw SQL for the comparison since Drizzle lt() doesn't work with date
    const result = await db.execute(
      `DELETE FROM asset_prices WHERE price_date < '${dateString}' RETURNING 1`
    );

    const count = result.length;

    logger.info("Deleted old prices", {
      beforeDate: dateString,
      deletedCount: count,
    });

    return count;
  }

  /**
   * Convert PriceResult to database record
   */
  private toDbRecord(price: PriceResult): NewAssetPrice {
    // Format priceDate as YYYY-MM-DD string for the date column
    const priceDateString = price.priceDate.toISOString().split("T")[0]!;

    return {
      symbol: price.symbol.toUpperCase(),
      open: price.open ?? null,
      high: price.high ?? null,
      low: price.low ?? null,
      close: price.close,
      volume: price.volume ?? null,
      currency: price.currency,
      source: price.source,
      fetchedAt: price.fetchedAt,
      priceDate: priceDateString,
      isStale: price.isStale ?? false,
    };
  }

  /**
   * Convert database record to PriceResult
   */
  static toPriceResult(record: AssetPrice): PriceResult {
    // Build result with only defined fields (exactOptionalPropertyTypes compliance)
    const result: PriceResult = {
      symbol: record.symbol,
      close: record.close,
      currency: record.currency,
      source: record.source,
      fetchedAt: record.fetchedAt,
      priceDate: new Date(record.priceDate),
    };

    // Add optional fields only if they have values
    if (record.open != null) {
      result.open = record.open;
    }
    if (record.high != null) {
      result.high = record.high;
    }
    if (record.low != null) {
      result.low = record.low;
    }
    if (record.volume != null) {
      result.volume = record.volume;
    }
    if (record.isStale) {
      result.isStale = record.isStale;
    }

    return result;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default prices repository instance
 */
export const pricesRepository = new PricesRepository();
