/**
 * Exchange Rates Repository
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 *
 * Database operations for exchange rate data.
 * Provides CRUD operations with upsert support for conflict resolution.
 *
 * @module @/lib/repositories/exchange-rates-repository
 */

import { db } from "@/lib/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { exchangeRates, type ExchangeRate, type NewExchangeRate } from "@/lib/db/schema";
import type { ExchangeRateResult } from "@/lib/providers/types";
import { logger } from "@/lib/telemetry/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of upsert operation
 */
export interface ExchangeRateUpsertResult {
  inserted: number;
  updated: number;
  errors: Array<{ currency: string; error: string }>;
}

// =============================================================================
// REPOSITORY CLASS
// =============================================================================

/**
 * Exchange Rates Repository
 *
 * Handles all database operations for exchange rates.
 * Uses upsert semantics to handle unique constraint on (base_currency, target_currency, rate_date).
 *
 * @example
 * ```typescript
 * const repo = new ExchangeRatesRepository();
 *
 * // Upsert rates from provider
 * await repo.upsertRates(providerResult);
 *
 * // Query by currencies
 * const rate = await repo.getRate('USD', 'BRL');
 * ```
 */
export class ExchangeRatesRepository {
  /**
   * Upsert exchange rates data
   *
   * AC-6.4.4: Records source and fetchedAt with each rate
   *
   * Uses INSERT ... ON CONFLICT UPDATE for atomic upsert.
   * Updates all fields except id when (base, target, date) already exists.
   *
   * @param result - Exchange rate result from provider
   * @returns UpsertResult with counts and any errors
   */
  async upsertRates(result: ExchangeRateResult): Promise<ExchangeRateUpsertResult> {
    const rates = Object.entries(result.rates);

    if (rates.length === 0) {
      return { inserted: 0, updated: 0, errors: [] };
    }

    const upsertResult: ExchangeRateUpsertResult = {
      inserted: 0,
      updated: 0,
      errors: [],
    };

    const rateDateString = result.rateDate.toISOString().split("T")[0]!;

    for (const [targetCurrency, rate] of rates) {
      try {
        const record: NewExchangeRate = {
          baseCurrency: result.base.toUpperCase(),
          targetCurrency: targetCurrency.toUpperCase(),
          rate,
          source: result.source,
          fetchedAt: result.fetchedAt,
          rateDate: rateDateString,
        };

        // Check if record exists
        const existing = await db
          .select({ id: exchangeRates.id })
          .from(exchangeRates)
          .where(
            and(
              eq(exchangeRates.baseCurrency, record.baseCurrency),
              eq(exchangeRates.targetCurrency, record.targetCurrency),
              eq(exchangeRates.rateDate, record.rateDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(exchangeRates)
            .set({
              rate: record.rate,
              source: record.source,
              fetchedAt: record.fetchedAt,
              updatedAt: new Date(),
            })
            .where(eq(exchangeRates.id, existing[0]!.id));
          upsertResult.updated++;
        } else {
          // Insert new record
          await db.insert(exchangeRates).values(record);
          upsertResult.inserted++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("Failed to upsert exchange rate", {
          base: result.base,
          target: targetCurrency,
          error: errorMessage,
        });
        upsertResult.errors.push({ currency: targetCurrency, error: errorMessage });
      }
    }

    logger.info("Exchange rates upsert completed", {
      base: result.base,
      inserted: upsertResult.inserted,
      updated: upsertResult.updated,
      errorCount: upsertResult.errors.length,
    });

    return upsertResult;
  }

  /**
   * Get exchange rate for a single currency pair
   *
   * Returns the most recent rate data for the pair.
   *
   * @param base - Base currency code
   * @param target - Target currency code
   * @param date - Optional specific date to query
   * @returns Most recent rate or null if not found
   */
  async getRate(base: string, target: string, date?: Date): Promise<ExchangeRate | null> {
    const upperBase = base.toUpperCase();
    const upperTarget = target.toUpperCase();

    if (date) {
      const dateString = date.toISOString().split("T")[0]!;
      const results = await db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.baseCurrency, upperBase),
            eq(exchangeRates.targetCurrency, upperTarget),
            eq(exchangeRates.rateDate, dateString)
          )
        )
        .limit(1);

      return results[0] ?? null;
    }

    // Get most recent rate
    const results = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.baseCurrency, upperBase),
          eq(exchangeRates.targetCurrency, upperTarget)
        )
      )
      .orderBy(desc(exchangeRates.rateDate))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Get exchange rates for multiple target currencies
   *
   * Returns the most recent rate data for each currency pair.
   *
   * @param base - Base currency code
   * @param targets - Array of target currency codes
   * @param date - Optional specific date to query
   * @returns Array of rates (may be fewer than input if some not found)
   */
  async getRates(base: string, targets: string[], date?: Date): Promise<ExchangeRate[]> {
    if (targets.length === 0) {
      return [];
    }

    const upperBase = base.toUpperCase();
    const upperTargets = targets.map((t) => t.toUpperCase());

    if (date) {
      const dateString = date.toISOString().split("T")[0]!;
      return db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.baseCurrency, upperBase),
            inArray(exchangeRates.targetCurrency, upperTargets),
            eq(exchangeRates.rateDate, dateString)
          )
        );
    }

    // Get all rates for these pairs
    const allResults = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.baseCurrency, upperBase),
          inArray(exchangeRates.targetCurrency, upperTargets)
        )
      )
      .orderBy(desc(exchangeRates.rateDate));

    // Deduplicate to get most recent per target
    const latestByTarget = new Map<string, ExchangeRate>();
    for (const result of allResults) {
      if (!latestByTarget.has(result.targetCurrency)) {
        latestByTarget.set(result.targetCurrency, result);
      }
    }

    return Array.from(latestByTarget.values());
  }

  /**
   * Get all stored exchange rates (most recent per currency pair)
   *
   * Story 6.7: Data Freshness Display
   * Used for returning aggregate freshness information for exchange rates.
   *
   * @returns Array of most recent rates for each currency pair
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    // Get all rates
    const allResults = await db.select().from(exchangeRates).orderBy(desc(exchangeRates.rateDate));

    // Deduplicate to get most recent per currency pair
    const latestByPair = new Map<string, ExchangeRate>();
    for (const result of allResults) {
      const key = `${result.baseCurrency}-${result.targetCurrency}`;
      if (!latestByPair.has(key)) {
        latestByPair.set(key, result);
      }
    }

    return Array.from(latestByPair.values());
  }

  /**
   * Delete old exchange rates data
   *
   * Useful for cleanup of data beyond retention period.
   *
   * @param beforeDate - Delete records with rateDate before this date
   * @returns Number of deleted records
   */
  async deleteOldRates(beforeDate: Date): Promise<number> {
    const dateString = beforeDate.toISOString().split("T")[0]!;

    // Use raw SQL for the comparison
    const result = await db.execute(
      `DELETE FROM exchange_rates WHERE rate_date < '${dateString}' RETURNING 1`
    );

    const count = result.length;

    logger.info("Deleted old exchange rates", {
      beforeDate: dateString,
      deletedCount: count,
    });

    return count;
  }

  /**
   * Convert database record to ExchangeRateResult (single rate)
   *
   * Note: This returns a result for just one currency pair.
   * Use toExchangeRateResult for converting multiple records to a full result.
   */
  static toSingleRate(record: ExchangeRate): { target: string; rate: string } {
    return {
      target: record.targetCurrency,
      rate: record.rate,
    };
  }

  /**
   * Convert multiple database records to ExchangeRateResult
   *
   * Assumes all records have the same base currency and rate date.
   *
   * @param records - Array of exchange rate records
   * @returns ExchangeRateResult or null if empty
   */
  static toExchangeRateResult(records: ExchangeRate[]): ExchangeRateResult | null {
    if (records.length === 0) {
      return null;
    }

    const firstRecord = records[0]!;
    const rates: Record<string, string> = {};

    for (const record of records) {
      rates[record.targetCurrency] = record.rate;
    }

    return {
      base: firstRecord.baseCurrency,
      rates,
      source: firstRecord.source,
      fetchedAt: firstRecord.fetchedAt,
      rateDate: new Date(firstRecord.rateDate),
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default exchange rates repository instance
 */
export const exchangeRatesRepository = new ExchangeRatesRepository();
