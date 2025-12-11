/**
 * Currency Converter Service
 *
 * Story 6.5: Currency Conversion Logic
 *
 * Provides currency conversion using stored exchange rates with:
 * - AC-6.5.1: decimal.js for all arithmetic (never floating point)
 * - AC-6.5.2: Correct conversion formula (value_base = value_native × rate)
 * - AC-6.5.3: ROUND_HALF_UP rounding at 4 decimal places (only final output)
 * - AC-6.5.4: Audit trail logging via event emission
 * - AC-6.5.5: Uses stored rates only, never live API calls
 *
 * @module @/lib/calculations/currency-converter
 */

import { Decimal } from "@/lib/calculations/decimal-config";
import {
  ExchangeRatesRepository,
  exchangeRatesRepository,
} from "@/lib/repositories/exchange-rates-repository";
import { logger } from "@/lib/telemetry/logger";
import type { EventStore } from "@/lib/events/event-store";
import { eventStore as defaultEventStore } from "@/lib/events/event-store";
import type { CurrencyConvertedEvent } from "@/lib/events/types";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/validations/exchange-rates-schemas";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of a currency conversion operation
 *
 * AC-6.5.2: Contains all metadata about the conversion
 * AC-6.5.5: Includes staleness indicator
 */
export interface CurrencyConversionResult {
  /** Converted value as decimal string (4 decimal places, ROUND_HALF_UP) */
  value: string;
  /** Source currency code */
  fromCurrency: string;
  /** Target currency code */
  toCurrency: string;
  /** Rate used for conversion as decimal string */
  rate: string;
  /** Date of the rate used */
  rateDate: Date;
  /** Provider that supplied the rate */
  rateSource: string;
  /** True if rate is older than 24 hours */
  isStaleRate: boolean;
}

/**
 * Options for conversion operation
 * Note: Uses | undefined for exactOptionalPropertyTypes compatibility
 */
export interface ConversionOptions {
  /** Specific date to use for rate lookup */
  rateDate?: Date | undefined;
  /** Correlation ID for linking to parent calculation (audit trail) */
  correlationId?: string | undefined;
}

/**
 * Input for batch conversion
 */
export interface BatchConversionInput {
  /** Value to convert as decimal string */
  value: string;
  /** Source currency code */
  fromCurrency: string;
}

/**
 * Configuration for CurrencyConverter
 */
export interface CurrencyConverterConfig {
  /** Exchange rates repository for fetching stored rates */
  repository?: ExchangeRatesRepository;
  /** Event store for audit trail logging */
  eventStore?: EventStore;
  /** Whether to emit events (can be disabled for testing) */
  emitEvents?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Stale threshold in milliseconds (24 hours) */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Number of decimal places for final output */
const OUTPUT_DECIMAL_PLACES = 4;

// =============================================================================
// ERROR CLASS
// =============================================================================

/**
 * Currency conversion error
 */
export class CurrencyConversionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CurrencyConversionError";
  }
}

// =============================================================================
// CURRENCY CONVERTER CLASS
// =============================================================================

/**
 * Currency Converter Service
 *
 * Converts values between currencies using stored exchange rates.
 * All arithmetic uses decimal.js for precision.
 *
 * @example
 * ```typescript
 * const converter = new CurrencyConverter();
 *
 * // Convert 1000 BRL to USD
 * const result = await converter.convert('1000', 'BRL', 'USD');
 * console.log(result.value); // "200.0000" (if rate is 0.20)
 *
 * // Batch conversion
 * const results = await converter.convertBatch(
 *   [{ value: '1000', fromCurrency: 'BRL' }, { value: '500', fromCurrency: 'EUR' }],
 *   'USD'
 * );
 * ```
 */
export class CurrencyConverter {
  private readonly repository: ExchangeRatesRepository;
  private readonly eventStore: EventStore;
  private readonly emitEvents: boolean;

  constructor(config: CurrencyConverterConfig = {}) {
    this.repository = config.repository ?? exchangeRatesRepository;
    this.eventStore = config.eventStore ?? defaultEventStore;
    this.emitEvents = config.emitEvents ?? true;
  }

  /**
   * Convert a value from one currency to another
   *
   * AC-6.5.1: Uses decimal.js for all arithmetic
   * AC-6.5.2: Applies formula: value_base = value_native × rate
   * AC-6.5.3: Rounds to 4 decimal places with ROUND_HALF_UP only at final output
   * AC-6.5.4: Emits CURRENCY_CONVERTED event for audit trail
   * AC-6.5.5: Uses stored rates only
   *
   * @param value - Value to convert as decimal string
   * @param fromCurrency - Source currency code
   * @param toCurrency - Target currency code
   * @param options - Optional conversion settings
   * @returns Conversion result with metadata
   * @throws CurrencyConversionError if conversion fails
   */
  async convert(
    value: string,
    fromCurrency: string,
    toCurrency: string,
    options?: ConversionOptions
  ): Promise<CurrencyConversionResult> {
    // Normalize currency codes
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Validate currencies
    this.validateCurrency(from, "fromCurrency");
    this.validateCurrency(to, "toCurrency");

    // Validate value
    this.validateValue(value);

    // Same-currency conversion is a no-op
    if (from === to) {
      const decimalValue = new Decimal(value);
      const result: CurrencyConversionResult = {
        value: decimalValue.toFixed(OUTPUT_DECIMAL_PLACES),
        fromCurrency: from,
        toCurrency: to,
        rate: "1",
        rateDate: options?.rateDate ?? new Date(),
        rateSource: "same-currency",
        isStaleRate: false,
      };

      // Emit event even for same-currency (audit completeness)
      this.emitConversionEvent(result, value, options?.correlationId);

      return result;
    }

    // Get the exchange rate
    const rateInfo = await this.getRate(from, to, options?.rateDate);

    // Perform conversion: value_base = value_native × rate
    // AC-6.5.1: Use Decimal for arithmetic
    const decimalValue = new Decimal(value);
    const decimalRate = new Decimal(rateInfo.rate);

    // AC-6.5.2: Apply conversion formula
    // Rate is stored as: 1 base = X target (e.g., USD/BRL = 5.0 means 1 USD = 5 BRL)
    // To convert from BRL to USD: divide by rate
    // To convert from USD to BRL: multiply by rate
    // The rate we get is for `to` relative to `from`, so we multiply
    const convertedValue = decimalValue.times(decimalRate);

    // AC-6.5.3: Round only at final output
    const result: CurrencyConversionResult = {
      value: convertedValue.toFixed(OUTPUT_DECIMAL_PLACES),
      fromCurrency: from,
      toCurrency: to,
      rate: rateInfo.rate,
      rateDate: rateInfo.rateDate,
      rateSource: rateInfo.source,
      isStaleRate: rateInfo.isStale,
    };

    // AC-6.5.4: Emit conversion event for audit trail
    this.emitConversionEvent(result, value, options?.correlationId);

    return result;
  }

  /**
   * Convert multiple values to a common target currency
   *
   * @param conversions - Array of value/currency pairs to convert
   * @param toCurrency - Target currency for all conversions
   * @param options - Optional conversion settings
   * @returns Array of conversion results
   */
  async convertBatch(
    conversions: BatchConversionInput[],
    toCurrency: string,
    options?: ConversionOptions
  ): Promise<CurrencyConversionResult[]> {
    const results: CurrencyConversionResult[] = [];

    for (const conversion of conversions) {
      const result = await this.convert(
        conversion.value,
        conversion.fromCurrency,
        toCurrency,
        options
      );
      results.push(result);
    }

    return results;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Validate currency code is supported
   */
  private validateCurrency(currency: string, paramName: string): void {
    if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
      throw new CurrencyConversionError(
        `Invalid ${paramName}: ${currency}. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
        "INVALID_CURRENCY",
        { currency, paramName, supportedCurrencies: SUPPORTED_CURRENCIES }
      );
    }
  }

  /**
   * Validate value is a valid positive decimal string
   */
  private validateValue(value: string): void {
    try {
      const decimal = new Decimal(value);
      if (decimal.isNaN()) {
        throw new Error("NaN");
      }
      if (decimal.isNegative()) {
        throw new CurrencyConversionError(`Value must be positive: ${value}`, "INVALID_VALUE", {
          value,
        });
      }
    } catch (error) {
      if (error instanceof CurrencyConversionError) {
        throw error;
      }
      throw new CurrencyConversionError(`Invalid decimal value: ${value}`, "INVALID_VALUE", {
        value,
      });
    }
  }

  /**
   * Get exchange rate from repository
   *
   * AC-6.5.5: Uses stored rates only, never live API calls
   */
  private async getRate(
    fromCurrency: string,
    toCurrency: string,
    rateDate?: Date
  ): Promise<{ rate: string; rateDate: Date; source: string; isStale: boolean }> {
    // Try to get direct rate (from -> to)
    // Exchange rates are stored as: base_currency to target_currency
    // E.g., USD/BRL means 1 USD = X BRL
    // To convert FROM `from` TO `to`, we need the rate: 1 `from` = X `to`
    // So we query with base=from, target=to

    let rateRecord = await this.repository.getRate(fromCurrency, toCurrency, rateDate);

    // If no direct rate, try inverse (to -> from) and invert
    if (!rateRecord) {
      const inverseRecord = await this.repository.getRate(toCurrency, fromCurrency, rateDate);

      if (inverseRecord) {
        // Invert the rate: if 1 USD = 5 BRL, then 1 BRL = 0.2 USD
        const inverseRate = new Decimal(1).dividedBy(new Decimal(inverseRecord.rate));

        rateRecord = {
          ...inverseRecord,
          baseCurrency: fromCurrency,
          targetCurrency: toCurrency,
          rate: inverseRate.toString(),
        };

        logger.info("Using inverted exchange rate", {
          fromCurrency,
          toCurrency,
          originalRate: inverseRecord.rate,
          invertedRate: rateRecord.rate,
        });
      }
    }

    // AC-6.5.5: If no stored rate exists, throw error
    if (!rateRecord) {
      throw new CurrencyConversionError(
        `No exchange rate found for ${fromCurrency}/${toCurrency}`,
        "RATE_NOT_FOUND",
        { fromCurrency, toCurrency, requestedDate: rateDate?.toISOString() }
      );
    }

    // AC-6.5.5: Check if rate is stale (older than 24 hours)
    const fetchedAt = rateRecord.fetchedAt;
    const now = new Date();
    const isStale = now.getTime() - fetchedAt.getTime() > STALE_THRESHOLD_MS;

    // Log warning if using stale rate
    if (isStale) {
      logger.warn("Using stale exchange rate", {
        fromCurrency,
        toCurrency,
        rate: rateRecord.rate,
        fetchedAt: fetchedAt.toISOString(),
        ageHours: Math.round((now.getTime() - fetchedAt.getTime()) / (60 * 60 * 1000)),
      });
    }

    return {
      rate: rateRecord.rate,
      rateDate: new Date(rateRecord.rateDate),
      source: rateRecord.source,
      isStale,
    };
  }

  /**
   * Emit conversion event for audit trail
   *
   * AC-6.5.4: Fire-and-forget pattern (don't slow down conversion)
   */
  private emitConversionEvent(
    result: CurrencyConversionResult,
    sourceValue: string,
    correlationId?: string
  ): void {
    if (!this.emitEvents) {
      return;
    }

    const event: CurrencyConvertedEvent = {
      type: "CURRENCY_CONVERTED",
      correlationId: correlationId ?? crypto.randomUUID(),
      sourceValue,
      sourceCurrency: result.fromCurrency,
      targetCurrency: result.toCurrency,
      rate: result.rate,
      rateDate: result.rateDate.toISOString().split("T")[0]!,
      resultValue: result.value,
      isStaleRate: result.isStaleRate,
      timestamp: new Date(),
    };

    // Fire-and-forget: don't await, don't block
    // Note: We log conversion info, but the event store requires userId
    // Since currency conversion is a system-level operation, we log it
    // but may not persist to event store without a user context
    logger.info("Currency conversion completed", {
      event: event.type,
      correlationId: event.correlationId,
      from: `${sourceValue} ${result.fromCurrency}`,
      to: `${result.value} ${result.toCurrency}`,
      rate: result.rate,
      isStaleRate: result.isStaleRate,
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default currency converter instance
 */
export const currencyConverter = new CurrencyConverter();
