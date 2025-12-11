/**
 * Data Refresh Service
 *
 * Story 6.6: Force Data Refresh
 * AC-6.6.1: Refresh Button Available on Dashboard and Portfolio
 * AC-6.6.2: Loading Spinner Shown During Refresh
 * AC-6.6.3: Success Toast with Timestamp
 *
 * Orchestrates force refresh operations by:
 * - Invalidating relevant caches
 * - Fetching fresh data from provider chain
 * - Emitting audit trail events
 *
 * @module @/lib/services/data-refresh-service
 */

import { logger } from "@/lib/telemetry/logger";
import { cacheService } from "@/lib/cache";
import { eventStore, type EventStore } from "@/lib/events/event-store";
import type { DataRefreshedEvent } from "@/lib/events/types";
import {
  getPriceService,
  getExchangeRateService,
  getFundamentalsService,
  type PriceService,
  type ExchangeRateService,
  type FundamentalsService,
} from "@/lib/providers";

// =============================================================================
// TYPES
// =============================================================================

/** Types of data that can be refreshed */
export type RefreshType = "prices" | "rates" | "fundamentals" | "all";

/**
 * Input for refresh operation
 */
export interface RefreshInput {
  /** User ID requesting the refresh */
  userId: string;
  /** Type of data to refresh */
  type: RefreshType;
  /** Specific symbols to refresh (optional - defaults to all cached) */
  symbols?: string[] | undefined;
}

/**
 * Result of a refresh operation
 */
export interface RefreshResult {
  /** Whether the refresh was successful */
  success: boolean;
  /** When the refresh completed */
  refreshedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
  /** Which data types were refreshed */
  refreshedTypes: RefreshType[];
  /** Providers that served the data */
  providers: {
    prices?: string;
    rates?: string;
    fundamentals?: string;
  };
  /** Error message if any component failed */
  error?: string;
}

/**
 * Configuration for DataRefreshService
 */
export interface DataRefreshServiceConfig {
  /** Price service instance */
  priceService?: PriceService;
  /** Exchange rate service instance */
  exchangeRateService?: ExchangeRateService;
  /** Fundamentals service instance */
  fundamentalsService?: FundamentalsService;
  /** Event store for audit trail */
  eventStore?: EventStore;
  /** Whether to emit audit events (default: true) */
  emitEvents?: boolean;
}

// =============================================================================
// CACHE KEYS
// =============================================================================

/** Cache key patterns for invalidation */
const CACHE_KEY_PATTERNS = {
  prices: (symbols?: string[]) => (symbols ? symbols.map((s) => `prices:${s}:*`) : ["prices:*"]),
  rates: () => ["rates:*"],
  fundamentals: (symbols?: string[]) =>
    symbols ? symbols.map((s) => `fundamentals:${s}:*`) : ["fundamentals:*"],
};

// =============================================================================
// DEFAULT SYMBOLS FOR REFRESH
// =============================================================================

/** Default currency pairs for exchange rate refresh */
const DEFAULT_RATE_CURRENCIES = {
  base: "USD",
  targets: ["BRL", "EUR", "GBP", "JPY"],
};

// =============================================================================
// DATA REFRESH SERVICE
// =============================================================================

/**
 * DataRefreshService
 *
 * Orchestrates user-initiated data refresh operations.
 *
 * Flow:
 * 1. Invalidate relevant cache keys
 * 2. Fetch fresh data from provider chain (skipCache: true)
 * 3. Store fresh data in cache
 * 4. Emit audit trail event
 *
 * @example
 * ```typescript
 * const refreshService = new DataRefreshService();
 *
 * const result = await refreshService.refresh({
 *   userId: 'user-123',
 *   type: 'prices',
 *   symbols: ['AAPL', 'GOOGL'],
 * });
 *
 * if (result.success) {
 *   console.log(`Refreshed at ${result.refreshedAt}`);
 * }
 * ```
 */
export class DataRefreshService {
  private readonly priceService: PriceService;
  private readonly exchangeRateService: ExchangeRateService;
  private readonly fundamentalsService: FundamentalsService;
  private readonly eventStore: EventStore;
  private readonly emitEvents: boolean;

  constructor(config: DataRefreshServiceConfig = {}) {
    this.priceService = config.priceService ?? getPriceService();
    this.exchangeRateService = config.exchangeRateService ?? getExchangeRateService();
    this.fundamentalsService = config.fundamentalsService ?? getFundamentalsService();
    this.eventStore = config.eventStore ?? eventStore;
    this.emitEvents = config.emitEvents ?? true;
  }

  /**
   * Perform a data refresh operation
   *
   * AC-6.6.1: Implements the refresh functionality
   * AC-6.6.2: Returns result that can be used for loading states
   * AC-6.6.3: Returns timestamp for success message
   *
   * @param input - Refresh input with userId, type, and optional symbols
   * @returns Refresh result with status, timestamp, and provider info
   */
  async refresh(input: RefreshInput): Promise<RefreshResult> {
    const startedAt = new Date();
    const correlationId = this.generateCorrelationId();

    logger.info("Starting data refresh", {
      userId: input.userId,
      type: input.type,
      symbolCount: input.symbols?.length ?? 0,
      correlationId,
    });

    const providers: RefreshResult["providers"] = {};
    const refreshedTypes: RefreshType[] = [];
    let error: string | undefined;

    try {
      // Determine which data types to refresh
      const refreshPrices = input.type === "prices" || input.type === "all";
      const refreshRates = input.type === "rates" || input.type === "all";
      const refreshFundamentals = input.type === "fundamentals" || input.type === "all";

      // Execute refreshes in parallel for better performance
      const refreshPromises: Promise<void>[] = [];

      if (refreshPrices && input.symbols && input.symbols.length > 0) {
        refreshPromises.push(
          this.refreshPrices(input.symbols).then((provider) => {
            providers.prices = provider;
            refreshedTypes.push("prices");
          })
        );
      }

      if (refreshRates) {
        refreshPromises.push(
          this.refreshRates().then((provider) => {
            providers.rates = provider;
            refreshedTypes.push("rates");
          })
        );
      }

      if (refreshFundamentals && input.symbols && input.symbols.length > 0) {
        refreshPromises.push(
          this.refreshFundamentals(input.symbols).then((provider) => {
            providers.fundamentals = provider;
            refreshedTypes.push("fundamentals");
          })
        );
      }

      // Wait for all refreshes to complete
      await Promise.all(refreshPromises);

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      logger.info("Data refresh completed successfully", {
        userId: input.userId,
        type: input.type,
        durationMs,
        providersJson: JSON.stringify(providers),
        correlationId,
      });

      // Emit audit event
      if (this.emitEvents) {
        await this.emitRefreshEvent({
          correlationId,
          userId: input.userId,
          refreshType: input.type,
          symbols: input.symbols,
          startedAt,
          completedAt,
          durationMs,
          success: true,
          providers,
        });
      }

      return {
        success: true,
        refreshedAt: completedAt,
        durationMs,
        refreshedTypes,
        providers,
      };
    } catch (err) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      error = err instanceof Error ? err.message : String(err);

      logger.error("Data refresh failed", {
        userId: input.userId,
        type: input.type,
        error,
        durationMs,
        correlationId,
      });

      // Emit audit event for failure
      if (this.emitEvents) {
        await this.emitRefreshEvent({
          correlationId,
          userId: input.userId,
          refreshType: input.type,
          symbols: input.symbols,
          startedAt,
          completedAt,
          durationMs,
          success: false,
          errorMessage: error,
          providers,
        });
      }

      return {
        success: false,
        refreshedAt: completedAt,
        durationMs,
        refreshedTypes,
        providers,
        error,
      };
    }
  }

  /**
   * Refresh price data for specific symbols
   */
  private async refreshPrices(symbols: string[]): Promise<string> {
    // Invalidate cache
    await this.invalidateCacheKeys(CACHE_KEY_PATTERNS.prices(symbols));

    // Fetch fresh data with skipCache
    const result = await this.priceService.getPrices(symbols, { skipCache: true });

    logger.debug("Prices refreshed", {
      symbolCount: symbols.length,
      provider: result.provider,
      fromCache: result.fromCache,
    });

    return result.provider;
  }

  /**
   * Refresh exchange rate data
   */
  private async refreshRates(): Promise<string> {
    // Invalidate cache
    await this.invalidateCacheKeys(CACHE_KEY_PATTERNS.rates());

    // Fetch fresh data with skipCache
    const result = await this.exchangeRateService.getRates(
      DEFAULT_RATE_CURRENCIES.base,
      DEFAULT_RATE_CURRENCIES.targets,
      { skipCache: true }
    );

    logger.debug("Exchange rates refreshed", {
      base: DEFAULT_RATE_CURRENCIES.base,
      targetCount: DEFAULT_RATE_CURRENCIES.targets.length,
      provider: result.provider,
      fromCache: result.fromCache,
    });

    return result.provider;
  }

  /**
   * Refresh fundamentals data for specific symbols
   */
  private async refreshFundamentals(symbols: string[]): Promise<string> {
    // Invalidate cache
    await this.invalidateCacheKeys(CACHE_KEY_PATTERNS.fundamentals(symbols));

    // Fetch fresh data with skipCache
    const result = await this.fundamentalsService.getFundamentals(symbols, { skipCache: true });

    logger.debug("Fundamentals refreshed", {
      symbolCount: symbols.length,
      provider: result.provider,
      fromCache: result.fromCache,
    });

    return result.provider;
  }

  /**
   * Invalidate cache keys matching patterns
   *
   * Note: Vercel KV doesn't support pattern-based deletion.
   * For specific symbol invalidation, we delete exact keys.
   * For pattern deletion (e.g., "prices:*"), we rely on TTL expiration.
   */
  private async invalidateCacheKeys(patterns: string[]): Promise<void> {
    try {
      // For exact keys without wildcards, delete them
      const exactKeys = patterns.filter((p) => !p.includes("*"));

      if (exactKeys.length > 0) {
        await cacheService.delMultiple(exactKeys);
        logger.debug("Cache keys invalidated", {
          keyCount: exactKeys.length,
        });
      }

      // For pattern-based keys, we rely on skipCache option in providers
      // The providers will fetch fresh data regardless of cache
      const patternKeys = patterns.filter((p) => p.includes("*"));
      if (patternKeys.length > 0) {
        logger.debug("Using skipCache for pattern-based refresh", {
          patternsJson: JSON.stringify(patternKeys),
        });
      }
    } catch (error) {
      // Log but don't fail - cache invalidation is best-effort
      logger.warn("Failed to invalidate cache keys", {
        patternsJson: JSON.stringify(patterns),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Emit audit trail event
   */
  private async emitRefreshEvent(params: {
    correlationId: string;
    userId: string;
    refreshType: RefreshType;
    symbols?: string[] | undefined;
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
    success: boolean;
    errorMessage?: string | undefined;
    providers: RefreshResult["providers"];
  }): Promise<void> {
    try {
      const event: DataRefreshedEvent = {
        type: "DATA_REFRESHED",
        correlationId: params.correlationId,
        userId: params.userId,
        refreshType: params.refreshType,
        symbols: params.symbols,
        startedAt: params.startedAt,
        completedAt: params.completedAt,
        durationMs: params.durationMs,
        success: params.success,
        errorMessage: params.errorMessage,
        providers: params.providers,
      };

      await this.eventStore.append(params.userId, event);

      logger.debug("Refresh audit event emitted", {
        correlationId: params.correlationId,
        eventType: event.type,
      });
    } catch (error) {
      // Log but don't fail - audit trail is best-effort
      logger.warn("Failed to emit refresh audit event", {
        correlationId: params.correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate unique correlation ID for audit trail
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `refresh-${timestamp}-${random}`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default data refresh service instance
 *
 * @example
 * ```typescript
 * import { dataRefreshService } from '@/lib/services/data-refresh-service';
 *
 * const result = await dataRefreshService.refresh({
 *   userId: 'user-123',
 *   type: 'all',
 * });
 * ```
 */
export const dataRefreshService = new DataRefreshService();
