/**
 * Overnight Scoring Function
 *
 * Story 8.2: Overnight Scoring Job (full implementation)
 * Story 8.3: Recommendation Pre-Generation
 * Story 8.4: Cache Warming
 * Architecture: ADR-003 - Background Jobs Framework
 *
 * This function orchestrates the overnight scoring pipeline:
 * 1. Setup - Create correlationId, record overnight_job_run
 * 2. Fetch exchange rates - Once for data consistency
 * 3. Get active users - Query users with active portfolios
 * 4. Fetch asset prices - Batch fetch for all unique assets
 * 5. Score portfolios - Process users in batches of 50
 * 6. Generate recommendations - Pre-generate for each user (Story 8.3)
 * 7. Warm cache - Store recommendations in Vercel KV (Story 8.4)
 * 8. Finalize - Update job status with all metrics
 *
 * Uses Inngest step functions for checkpointing - each step is independently
 * retryable and results are persisted between invocations.
 *
 * Note on Cache Warming Architecture:
 * Cache warming (Step 7) is intentionally integrated into this function rather than
 * being a separate Inngest function. This ensures:
 * - Recommendations are cached immediately after generation (no race conditions)
 * - Single transaction context for audit trail consistency
 * - No need to re-fetch recommendations from database
 * For manual/ad-hoc cache warming, use the CacheWarmerService directly via API.
 *
 * AC-8.2.1: Cron Trigger Configuration
 * AC-8.2.2: Exchange Rates Fetch Once
 * AC-8.2.3: User Portfolio Processing
 * AC-8.2.4: Event Sourcing Integration
 * AC-8.2.5: Graceful Error Handling
 * AC-8.2.6: Performance Target
 * AC-8.2.7: OpenTelemetry Observability
 * AC-8.3.1: Recommendations Generated from Latest Scores
 * AC-8.3.2: Default Contribution Amount Used
 * AC-8.3.3: Criteria Version Stored for Audit
 * AC-8.3.4: Allocation Gap Calculations Included
 * AC-8.4.1: Recommendations Stored in Vercel KV
 * AC-8.4.2: Cache Key Pattern (recs:${userId})
 * AC-8.4.3: Cache TTL Configuration (24 hours)
 * AC-8.4.4: Cache Data Completeness
 * AC-8.4.5: Cache Warming Performance
 *
 * @see https://www.inngest.com/docs/functions/multi-step
 */

import { inngest } from "../client";
import { logger } from "@/lib/telemetry/logger";
import { createJobSpan, SpanStatusCode, SpanAttributes, type Span } from "@/lib/telemetry";
import {
  overnightJobService,
  JOB_TYPE,
  type JobRunMetrics,
} from "@/lib/services/overnight-job-service";
import { userQueryService, type ActiveUserForScoring } from "@/lib/services/user-query-service";
import {
  batchScoringService,
  type ExchangeRatesMap,
  type PricesMap,
} from "@/lib/services/batch-scoring-service";
import {
  batchRecommendationService,
  type GeneratedRecommendation,
} from "@/lib/services/batch-recommendation-service";
import { cacheWarmerService } from "@/lib/services/cache-warmer-service";
import { ExchangeRateService } from "@/lib/providers/exchange-rate-service";
import { PriceService } from "@/lib/providers/price-service";
import { alertDetectionService } from "@/lib/services/alert-detection-service";

/**
 * Default cron schedule for overnight scoring
 * Runs at 4 AM UTC daily (2 hours before NYSE opens at 9:30 AM ET / 14:30 UTC)
 * Can be overridden via OVERNIGHT_JOB_CRON environment variable
 */
const DEFAULT_CRON = "0 4 * * *";

/**
 * Batch size for user processing
 * AC-8.2.3: Users are processed in batches of 50 for efficiency
 */
const USER_BATCH_SIZE = 50;

// Note: Context is passed between steps via step results
// Each step returns its result which is available to subsequent steps

/**
 * Step results for type safety
 */
interface SetupResult {
  correlationId: string;
  jobRunId: string;
  startedAt: string;
}

interface ExchangeRatesResult {
  rates: ExchangeRatesMap;
  durationMs: number;
}

interface UsersResult {
  users: ActiveUserForScoring[];
  count: number;
}

interface PricesResult {
  prices: PricesMap;
  durationMs: number;
  symbolCount: number;
}

interface ScoringResult {
  usersProcessed: number;
  usersSuccess: number;
  usersFailed: number;
  assetsScored: number;
  durationMs: number;
  errors: Array<{ userId?: string; message: string; stage?: string }>;
}

/**
 * Story 8.3: Recommendation generation result
 * Story 8.4: Includes recommendations map for cache warming
 */
interface RecommendationResult {
  usersWithRecommendations: number;
  totalRecommendationsGenerated: number;
  usersFailed: number;
  durationMs: number;
  errors: Array<{ userId?: string; message: string }>;
  // Story 8.4: Store recommendations for cache warming step
  // Using Record instead of Map for JSON serialization in Inngest step results
  recommendations: Record<string, GeneratedRecommendation>;
}

/**
 * Story 8.4: Cache warming result
 */
interface CacheWarmingResult {
  usersCached: number;
  cacheFailures: number;
  durationMs: number;
}

/**
 * Story 9.1: Alert detection result
 */
interface AlertDetectionResult {
  usersProcessed: number;
  alertsCreated: number;
  alertsUpdated: number;
  alertsSkipped: number;
  usersFailed: number;
  durationMs: number;
}

/**
 * Story 9.2: Drift alert detection result
 */
interface DriftAlertDetectionResult {
  usersProcessed: number;
  classesAnalyzed: number;
  alertsCreated: number;
  alertsUpdated: number;
  alertsDismissed: number;
  usersFailed: number;
  durationMs: number;
}

/**
 * Check if we're running in production mode
 * Uses NODE_ENV to determine environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Create exchange rate service (can be mocked in tests)
 *
 * In production: Returns configured service or throws if not configured
 * In development: Returns null to allow mock data usage
 */
function createExchangeRateService(): ExchangeRateService | null {
  // TODO(epic-8): Implement actual exchange rate provider initialization
  // Example: return new ExchangeRateService(process.env.EXCHANGE_RATE_API_KEY)

  // Return null for now - actual implementation pending provider setup
  return null;
}

/**
 * Create price service (can be mocked in tests)
 *
 * In production: Returns configured service or throws if not configured
 * In development: Returns null to allow mock data usage
 */
function createPriceService(): PriceService | null {
  // TODO(epic-8): Implement actual price provider initialization
  // Example: return new PriceService(process.env.PRICE_API_KEY)

  // Return null for now - actual implementation pending provider setup
  return null;
}

/**
 * Validate exchange rate service configuration for production
 * Throws error if service not configured in production environment
 */
function validateExchangeRateServiceOrThrow(
  service: ExchangeRateService | null,
  correlationId: string
): void {
  if (!service && isProduction()) {
    logger.error("Exchange rate provider not configured in production", {
      correlationId,
      environment: process.env.NODE_ENV,
    });
    throw new Error(
      "Exchange rate provider not configured. Set EXCHANGE_RATE_API_KEY environment variable."
    );
  }
}

/**
 * Validate price service configuration for production
 * Throws error if service not configured in production environment
 */
function validatePriceServiceOrThrow(service: PriceService | null, correlationId: string): void {
  if (!service && isProduction()) {
    logger.error("Price provider not configured in production", {
      correlationId,
      environment: process.env.NODE_ENV,
    });
    throw new Error("Price provider not configured. Set PRICE_API_KEY environment variable.");
  }
}

/**
 * Overnight Scoring Job
 *
 * Triggered by: Cron schedule (default: 4 AM UTC daily)
 * Behavior: Orchestrates overnight scoring pipeline with checkpointed steps
 *
 * Each step.run() call creates a checkpoint:
 * - If the function fails after a step, it resumes from the last completed step
 * - Step results are persisted and available to subsequent steps
 * - Each step can retry independently without re-running previous steps
 */
export const overnightScoringJob = inngest.createFunction(
  {
    id: "overnight-scoring",
    name: "Overnight Scoring Job",
    retries: 3,
  },
  { cron: process.env.OVERNIGHT_JOB_CRON || DEFAULT_CRON },
  async ({ step }) => {
    const jobStartTime = Date.now();

    // Create OpenTelemetry span for the entire job
    // AC-8.2.7: OpenTelemetry Observability
    const span: Span = createJobSpan("overnight-scoring-job", {
      market: "all",
    });

    try {
      // Step 1: Setup - Create correlationId, record overnight_job_run
      // AC-8.2.1: Job triggers automatically
      const setupResult = await step.run("setup", async (): Promise<SetupResult> => {
        const correlationId = crypto.randomUUID();

        logger.info("Overnight scoring job started", {
          correlationId,
          triggeredAt: new Date().toISOString(),
          cron: process.env.OVERNIGHT_JOB_CRON || DEFAULT_CRON,
        });

        // Create job run record
        const jobRun = await overnightJobService.createJobRun({
          jobType: JOB_TYPE.SCORING,
          correlationId,
        });

        return {
          correlationId,
          jobRunId: jobRun.id,
          startedAt: new Date().toISOString(),
        };
      });

      span.setAttribute("correlation_id", setupResult.correlationId);

      // Step 2: Fetch exchange rates
      // AC-8.2.2: Rates are fetched ONCE at the beginning of the job
      const exchangeRatesResult = await step.run(
        "fetch-exchange-rates",
        async (): Promise<ExchangeRatesResult> => {
          const startMs = Date.now();
          const rates: ExchangeRatesMap = {};

          logger.info("Fetching exchange rates", {
            correlationId: setupResult.correlationId,
          });

          try {
            // Get unique currencies from all portfolios
            const currencies = await userQueryService.getUniqueCurrencies();

            if (currencies.length > 0) {
              // For now, use USD as base and get rates to all other currencies
              const baseCurrency = "USD";
              const targetCurrencies = currencies.filter((c) => c !== baseCurrency);

              if (targetCurrencies.length > 0) {
                const rateService = createExchangeRateService();

                // Validate service configuration for production
                validateExchangeRateServiceOrThrow(rateService, setupResult.correlationId);

                if (rateService) {
                  const result = await rateService.getRates(baseCurrency, targetCurrencies);
                  for (const [currency, rate] of Object.entries(result.rates.rates)) {
                    rates[`${baseCurrency}_${currency}`] = rate;
                  }
                } else {
                  // No provider configured - use mock rates for development only
                  // This code path only executes in non-production (dev/test)
                  logger.warn("Using mock exchange rates (development mode)", {
                    correlationId: setupResult.correlationId,
                    environment: process.env.NODE_ENV,
                    targetCurrencyCount: targetCurrencies.length,
                    mockRate: "1.0",
                  });
                  for (const currency of targetCurrencies) {
                    rates[`${baseCurrency}_${currency}`] = "1.0";
                  }
                }
              }
            }
          } catch (error) {
            logger.warn("Failed to fetch exchange rates, using fallback", {
              correlationId: setupResult.correlationId,
              error: error instanceof Error ? error.message : String(error),
            });
          }

          const durationMs = Date.now() - startMs;

          logger.info("Exchange rates fetched", {
            correlationId: setupResult.correlationId,
            rateCount: Object.keys(rates).length,
            durationMs,
          });

          return {
            rates,
            durationMs,
          };
        }
      );

      span.setAttribute(SpanAttributes.FETCH_RATES_MS, exchangeRatesResult.durationMs);

      // Step 3: Get active users
      // AC-8.2.3: Query users with active portfolios
      const usersResult = await step.run("get-active-users", async (): Promise<UsersResult> => {
        logger.info("Fetching active users", {
          correlationId: setupResult.correlationId,
        });

        const users = await userQueryService.getActiveUsersWithPortfolios();

        logger.info("Active users fetched", {
          correlationId: setupResult.correlationId,
          userCount: users.length,
        });

        return {
          users,
          count: users.length,
        };
      });

      span.setAttribute("users_total", usersResult.count);

      // Step 4: Fetch asset prices
      // Get prices for all unique assets across all users
      const pricesResult = await step.run("fetch-asset-prices", async (): Promise<PricesResult> => {
        const startMs = Date.now();
        const prices: PricesMap = {};

        logger.info("Fetching asset prices", {
          correlationId: setupResult.correlationId,
          userCount: usersResult.count,
        });

        try {
          // Get unique symbols from all user portfolios
          const symbols = await userQueryService.getUniqueAssetSymbols();

          if (symbols.length > 0) {
            const priceService = createPriceService();

            // Validate service configuration for production
            validatePriceServiceOrThrow(priceService, setupResult.correlationId);

            if (priceService) {
              const result = await priceService.getPrices(symbols);
              for (const price of result.prices) {
                prices[price.symbol] = {
                  price: price.close,
                  currency: price.currency,
                  fetchedAt: new Date(price.fetchedAt).toISOString(),
                  source: result.provider,
                };
              }
            } else {
              // No provider configured - skip prices for development only
              // This code path only executes in non-production (dev/test)
              logger.warn("No price provider configured (development mode)", {
                correlationId: setupResult.correlationId,
                environment: process.env.NODE_ENV,
                symbolsRequested: symbols.length,
              });
            }
          }
        } catch (error) {
          logger.warn("Failed to fetch prices", {
            correlationId: setupResult.correlationId,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        const durationMs = Date.now() - startMs;

        logger.info("Asset prices fetched", {
          correlationId: setupResult.correlationId,
          priceCount: Object.keys(prices).length,
          durationMs,
        });

        return {
          prices,
          durationMs,
          symbolCount: Object.keys(prices).length,
        };
      });

      span.setAttribute(SpanAttributes.FETCH_PRICES_MS, pricesResult.durationMs);

      // Step 5: Score portfolios
      // AC-8.2.3: Process users in batches of 50
      // AC-8.2.4: Emit 4 events per user
      // AC-8.2.5: Continue on user failure
      const scoringResult = await step.run("score-portfolios", async (): Promise<ScoringResult> => {
        const startMs = Date.now();
        let totalUsersProcessed = 0;
        let totalUsersSuccess = 0;
        let totalUsersFailed = 0;
        let totalAssetsScored = 0;
        const allErrors: Array<{ userId?: string; message: string; stage?: string }> = [];

        logger.info("Starting portfolio scoring", {
          correlationId: setupResult.correlationId,
          userCount: usersResult.count,
          batchSize: USER_BATCH_SIZE,
        });

        // Process users in batches
        // TODO(performance): Consider parallel batch processing for scale
        // Current: Sequential batches (20 batches for 1000 users @ 50/batch)
        // Potential: Parallel batches with concurrency limit (e.g., 3-5 concurrent)
        // Trade-off: Parallelism vs. database connection pool limits
        // Current target: 1000 users in <4 hours (~14 seconds/user) - sequential is sufficient for MVP
        // Consider parallelization when processing time exceeds 1 hour for typical user counts
        for (let i = 0; i < usersResult.users.length; i += USER_BATCH_SIZE) {
          const batch = usersResult.users.slice(i, i + USER_BATCH_SIZE);
          const batchNumber = Math.floor(i / USER_BATCH_SIZE) + 1;

          logger.info("Processing user batch", {
            correlationId: setupResult.correlationId,
            batchNumber,
            batchSize: batch.length,
            startIndex: i,
          });

          try {
            const result = await batchScoringService.processUserBatch(batch, {
              exchangeRates: exchangeRatesResult.rates,
              prices: pricesResult.prices,
            });

            totalUsersProcessed += result.usersProcessed;
            totalUsersSuccess += result.usersSuccess;
            totalUsersFailed += result.usersFailed;
            totalAssetsScored += result.totalAssetsScored;

            // Collect errors
            for (const r of result.results) {
              if (!r.success && r.error) {
                allErrors.push({
                  userId: r.userId,
                  message: r.error,
                  stage: "score-calculation",
                });
              }
            }

            logger.info("Batch processed", {
              correlationId: setupResult.correlationId,
              batchNumber,
              processed: result.usersProcessed,
              success: result.usersSuccess,
              failed: result.usersFailed,
            });
          } catch (error) {
            // Log batch error but continue with next batch
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("Batch processing failed", {
              correlationId: setupResult.correlationId,
              batchNumber,
              error: errorMessage,
            });

            totalUsersFailed += batch.length;
            allErrors.push({
              message: `Batch ${batchNumber} failed: ${errorMessage}`,
              stage: "batch-processing",
            });
          }
        }

        const durationMs = Date.now() - startMs;

        logger.info("Portfolio scoring completed", {
          correlationId: setupResult.correlationId,
          totalUsersProcessed,
          totalUsersSuccess,
          totalUsersFailed,
          totalAssetsScored,
          durationMs,
        });

        return {
          usersProcessed: totalUsersProcessed,
          usersSuccess: totalUsersSuccess,
          usersFailed: totalUsersFailed,
          assetsScored: totalAssetsScored,
          durationMs,
          errors: allErrors,
        };
      });

      span.setAttribute("users_success", scoringResult.usersSuccess);
      span.setAttribute("users_failed", scoringResult.usersFailed);
      span.setAttribute(SpanAttributes.ASSET_COUNT, scoringResult.assetsScored);

      // Step 5b: Detect opportunity alerts (Story 9.1)
      // AC-9.1.1: Alert triggered when better asset exists (10+ points higher)
      // Must run after scoring so we have fresh scores to compare
      // Alert detection failures should NOT fail the entire job
      const alertDetectionResult = await step.run(
        "detect-alerts",
        async (): Promise<AlertDetectionResult> => {
          const startMs = Date.now();
          let totalUsersProcessed = 0;
          let totalAlertsCreated = 0;
          let totalAlertsUpdated = 0;
          let totalAlertsSkipped = 0;
          let totalUsersFailed = 0;

          logger.info("Starting opportunity alert detection", {
            correlationId: setupResult.correlationId,
            usersToProcess: scoringResult.usersSuccess,
          });

          // Process alerts for successfully scored users
          const successfulUsers = usersResult.users.filter(
            (u) =>
              !scoringResult.errors.some(
                (e) => e.userId === u.userId && e.stage === "score-calculation"
              )
          );

          // Process in batches to avoid overwhelming the database
          for (let i = 0; i < successfulUsers.length; i += USER_BATCH_SIZE) {
            const batch = successfulUsers.slice(i, i + USER_BATCH_SIZE);
            const batchNumber = Math.floor(i / USER_BATCH_SIZE) + 1;

            logger.info("Processing alert detection batch", {
              correlationId: setupResult.correlationId,
              batchNumber,
              batchSize: batch.length,
            });

            for (const user of batch) {
              try {
                // Detect opportunities for this user's portfolio
                const result = await alertDetectionService.detectOpportunityAlerts(
                  user.userId,
                  user.portfolioId
                );

                totalUsersProcessed++;
                totalAlertsCreated += result.alertsCreated;
                totalAlertsUpdated += result.alertsUpdated;
                totalAlertsSkipped += result.alertsSkipped;

                if (result.error) {
                  totalUsersFailed++;
                  logger.warn("Alert detection failed for user", {
                    correlationId: setupResult.correlationId,
                    userId: user.userId,
                    error: result.error,
                  });
                }
              } catch (error) {
                // Don't fail entire job for alert detection errors
                totalUsersFailed++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.warn("Alert detection exception for user", {
                  correlationId: setupResult.correlationId,
                  userId: user.userId,
                  error: errorMessage,
                });
              }
            }

            logger.info("Alert detection batch processed", {
              correlationId: setupResult.correlationId,
              batchNumber,
              usersProcessed: batch.length,
            });
          }

          const durationMs = Date.now() - startMs;

          logger.info("Opportunity alert detection completed", {
            correlationId: setupResult.correlationId,
            usersProcessed: totalUsersProcessed,
            alertsCreated: totalAlertsCreated,
            alertsUpdated: totalAlertsUpdated,
            alertsSkipped: totalAlertsSkipped,
            usersFailed: totalUsersFailed,
            durationMs,
          });

          return {
            usersProcessed: totalUsersProcessed,
            alertsCreated: totalAlertsCreated,
            alertsUpdated: totalAlertsUpdated,
            alertsSkipped: totalAlertsSkipped,
            usersFailed: totalUsersFailed,
            durationMs,
          };
        }
      );

      span.setAttribute("alerts_created", alertDetectionResult.alertsCreated);
      span.setAttribute("alerts_updated", alertDetectionResult.alertsUpdated);

      // Step 5c: Detect drift alerts (Story 9.2)
      // AC-9.2.1: Alert when allocation drifts outside target range
      // AC-9.2.4: Uses user's configured drift threshold
      // AC-9.2.5: Respects driftAlertsEnabled preference
      // AC-9.2.6: Auto-dismiss when allocation returns to range
      // Must run after scoring so we have fresh allocation calculations
      // Drift detection failures should NOT fail the entire job
      const driftAlertDetectionResult = await step.run(
        "detect-drift-alerts",
        async (): Promise<DriftAlertDetectionResult> => {
          const startMs = Date.now();
          let totalUsersProcessed = 0;
          let totalClassesAnalyzed = 0;
          let totalAlertsCreated = 0;
          let totalAlertsUpdated = 0;
          let totalAlertsDismissed = 0;
          let totalUsersFailed = 0;

          logger.info("Starting drift alert detection", {
            correlationId: setupResult.correlationId,
            usersToProcess: scoringResult.usersSuccess,
          });

          // Process drift alerts for successfully scored users
          const successfulUsers = usersResult.users.filter(
            (u) =>
              !scoringResult.errors.some(
                (e) => e.userId === u.userId && e.stage === "score-calculation"
              )
          );

          // Process in batches to avoid overwhelming the database
          for (let i = 0; i < successfulUsers.length; i += USER_BATCH_SIZE) {
            const batch = successfulUsers.slice(i, i + USER_BATCH_SIZE);
            const batchNumber = Math.floor(i / USER_BATCH_SIZE) + 1;

            logger.info("Processing drift alert detection batch", {
              correlationId: setupResult.correlationId,
              batchNumber,
              batchSize: batch.length,
            });

            for (const user of batch) {
              try {
                // Detect drift for this user's portfolio
                const result = await alertDetectionService.detectDriftAlerts(
                  user.userId,
                  user.portfolioId
                );

                totalUsersProcessed++;
                totalClassesAnalyzed += result.classesAnalyzed;
                totalAlertsCreated += result.alertsCreated;
                totalAlertsUpdated += result.alertsUpdated;
                totalAlertsDismissed += result.alertsDismissed;

                if (result.error) {
                  totalUsersFailed++;
                  logger.warn("Drift alert detection failed for user", {
                    correlationId: setupResult.correlationId,
                    userId: user.userId,
                    error: result.error,
                  });
                }
              } catch (error) {
                // Don't fail entire job for drift detection errors
                totalUsersFailed++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.warn("Drift alert detection exception for user", {
                  correlationId: setupResult.correlationId,
                  userId: user.userId,
                  error: errorMessage,
                });
              }
            }

            logger.info("Drift alert detection batch processed", {
              correlationId: setupResult.correlationId,
              batchNumber,
              usersProcessed: batch.length,
            });
          }

          const durationMs = Date.now() - startMs;

          logger.info("Drift alert detection completed", {
            correlationId: setupResult.correlationId,
            usersProcessed: totalUsersProcessed,
            classesAnalyzed: totalClassesAnalyzed,
            alertsCreated: totalAlertsCreated,
            alertsUpdated: totalAlertsUpdated,
            alertsDismissed: totalAlertsDismissed,
            usersFailed: totalUsersFailed,
            durationMs,
          });

          return {
            usersProcessed: totalUsersProcessed,
            classesAnalyzed: totalClassesAnalyzed,
            alertsCreated: totalAlertsCreated,
            alertsUpdated: totalAlertsUpdated,
            alertsDismissed: totalAlertsDismissed,
            usersFailed: totalUsersFailed,
            durationMs,
          };
        }
      );

      span.setAttribute("drift_alerts_created", driftAlertDetectionResult.alertsCreated);
      span.setAttribute("drift_alerts_dismissed", driftAlertDetectionResult.alertsDismissed);

      // Step 6: Generate recommendations for each user (Story 8.3)
      // AC-8.3.1: Recommendations generated using latest scores, allocation targets, portfolio allocations
      // AC-8.3.2: Uses default contribution amount
      // AC-8.3.3: Stores criteria version for audit
      // AC-8.3.4: Includes allocation gap calculations
      // Story 8.4: Collect recommendations for cache warming step
      const recommendationResult = await step.run(
        "generate-recommendations",
        async (): Promise<RecommendationResult> => {
          const startMs = Date.now();
          const allErrors: Array<{ userId?: string; message: string }> = [];
          // Story 8.4: Collect recommendations for cache warming
          const allRecommendations: Record<string, GeneratedRecommendation> = {};

          logger.info("Starting recommendation generation", {
            correlationId: setupResult.correlationId,
            usersToProcess: scoringResult.usersSuccess,
          });

          // Only generate recommendations for users who were successfully scored
          const successfulUserIds = usersResult.users
            .filter(
              (u) =>
                // Check if user was successfully scored (not in errors)
                !scoringResult.errors.some(
                  (e) => e.userId === u.userId && e.stage === "score-calculation"
                )
            )
            .map((u) => u.userId);

          if (successfulUserIds.length === 0) {
            logger.warn("No users to generate recommendations for", {
              correlationId: setupResult.correlationId,
            });

            return {
              usersWithRecommendations: 0,
              totalRecommendationsGenerated: 0,
              usersFailed: 0,
              durationMs: Date.now() - startMs,
              errors: [],
              recommendations: {},
            };
          }

          // Process users in batches for recommendation generation
          let totalUsersWithRecs = 0;
          let totalRecsGenerated = 0;
          let totalUsersFailed = 0;

          for (let i = 0; i < successfulUserIds.length; i += USER_BATCH_SIZE) {
            const batch = successfulUserIds.slice(i, i + USER_BATCH_SIZE);
            const batchNumber = Math.floor(i / USER_BATCH_SIZE) + 1;

            logger.info("Processing recommendation batch", {
              correlationId: setupResult.correlationId,
              batchNumber,
              batchSize: batch.length,
            });

            try {
              const result = await batchRecommendationService.generateRecommendationsForUsers(
                batch,
                {
                  exchangeRates: exchangeRatesResult.rates,
                  prices: pricesResult.prices,
                  correlationId: setupResult.correlationId,
                }
              );

              totalUsersWithRecs += result.usersSuccess;
              totalRecsGenerated += result.totalRecommendationsGenerated;
              totalUsersFailed += result.usersFailed;

              // Collect errors and successful recommendations
              for (const r of result.results) {
                if (!r.success && r.error) {
                  allErrors.push({
                    userId: r.userId,
                    message: r.error,
                  });
                } else if (r.success && r.recommendations) {
                  // Story 8.4: Store recommendation for cache warming
                  allRecommendations[r.userId] = r.recommendations;
                }
              }

              logger.info("Recommendation batch processed", {
                correlationId: setupResult.correlationId,
                batchNumber,
                usersWithRecs: result.usersSuccess,
                recsGenerated: result.totalRecommendationsGenerated,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error("Recommendation batch failed", {
                correlationId: setupResult.correlationId,
                batchNumber,
                error: errorMessage,
              });

              totalUsersFailed += batch.length;
              allErrors.push({
                message: `Recommendation batch ${batchNumber} failed: ${errorMessage}`,
              });
            }
          }

          const durationMs = Date.now() - startMs;

          logger.info("Recommendation generation completed", {
            correlationId: setupResult.correlationId,
            usersWithRecommendations: totalUsersWithRecs,
            totalRecommendationsGenerated: totalRecsGenerated,
            usersFailed: totalUsersFailed,
            recommendationsCollected: Object.keys(allRecommendations).length,
            durationMs,
          });

          return {
            usersWithRecommendations: totalUsersWithRecs,
            totalRecommendationsGenerated: totalRecsGenerated,
            usersFailed: totalUsersFailed,
            durationMs,
            errors: allErrors,
            recommendations: allRecommendations,
          };
        }
      );

      span.setAttribute(
        "recommendations_generated",
        recommendationResult.totalRecommendationsGenerated
      );
      span.setAttribute(
        "users_with_recommendations",
        recommendationResult.usersWithRecommendations
      );

      // Step 7: Cache warming (Story 8.4)
      // AC-8.4.1: Store recommendations in Vercel KV
      // AC-8.4.2: Key pattern recs:${userId}
      // AC-8.4.3: TTL 24 hours
      // AC-8.4.4: Include portfolio summary and data freshness
      // AC-8.4.5: Batch processing with parallelization
      const cacheWarmingResult = await step.run(
        "warm-cache",
        async (): Promise<CacheWarmingResult> => {
          const startMs = Date.now();

          // Convert Record to Map for cache warmer service
          const recommendationsMap = new Map<string, GeneratedRecommendation>(
            Object.entries(recommendationResult.recommendations)
          );

          if (recommendationsMap.size === 0) {
            logger.info("No recommendations to cache", {
              correlationId: setupResult.correlationId,
            });

            return {
              usersCached: 0,
              cacheFailures: 0,
              durationMs: Date.now() - startMs,
            };
          }

          logger.info("Starting cache warming", {
            correlationId: setupResult.correlationId,
            usersToCache: recommendationsMap.size,
          });

          try {
            const result = await cacheWarmerService.warmCacheForUsers(
              recommendationsMap,
              setupResult.correlationId
            );

            logger.info("Cache warming completed", {
              correlationId: setupResult.correlationId,
              usersCached: result.usersCached,
              cacheFailures: result.cacheFailures,
              durationMs: result.durationMs,
            });

            return {
              usersCached: result.usersCached,
              cacheFailures: result.cacheFailures,
              durationMs: result.durationMs,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error("Cache warming failed", {
              correlationId: setupResult.correlationId,
              error: errorMessage,
            });

            // Don't fail the entire job if cache warming fails
            // Recommendations were generated successfully, just not cached
            return {
              usersCached: 0,
              cacheFailures: recommendationsMap.size,
              durationMs: Date.now() - startMs,
            };
          }
        }
      );

      span.setAttribute("users_cached", cacheWarmingResult.usersCached);
      span.setAttribute("cache_failures", cacheWarmingResult.cacheFailures);

      // Step 8: Finalize - Update job status with all metrics
      await step.run("finalize", async () => {
        const totalDurationMs = Date.now() - jobStartTime;

        const metrics: JobRunMetrics = {
          fetchRatesMs: exchangeRatesResult.durationMs,
          processUsersMs: scoringResult.durationMs,
          totalDurationMs,
          assetsScored: scoringResult.assetsScored,
          usersTotal: usersResult.count,
          // Story 8.3: Add recommendation metrics
          recommendationsGenerated: recommendationResult.totalRecommendationsGenerated,
          usersWithRecommendations: recommendationResult.usersWithRecommendations,
          recommendationDurationMs: recommendationResult.durationMs,
          // Story 8.4: Add cache warming metrics
          usersCached: cacheWarmingResult.usersCached,
          cacheFailures: cacheWarmingResult.cacheFailures,
          cacheWarmMs: cacheWarmingResult.durationMs, // AC-8.6.3
          // Story 9.1: Add alert detection metrics
          alertsCreated: alertDetectionResult.alertsCreated,
          alertsUpdated: alertDetectionResult.alertsUpdated,
          alertDetectionMs: alertDetectionResult.durationMs,
          // Story 9.2: Add drift alert detection metrics
          driftAlertsCreated: driftAlertDetectionResult.alertsCreated,
          driftAlertsUpdated: driftAlertDetectionResult.alertsUpdated,
          driftAlertsDismissed: driftAlertDetectionResult.alertsDismissed,
          driftAlertDetectionMs: driftAlertDetectionResult.durationMs,
        };

        if (scoringResult.usersFailed > 0 && scoringResult.errors.length > 0) {
          // Partial completion - errors are stored in the job run metrics
          await overnightJobService.completeJobRun(setupResult.jobRunId, {
            usersProcessed: scoringResult.usersProcessed,
            usersFailed: scoringResult.usersFailed,
            metrics,
          });

          logger.warn("Overnight job completed with failures", {
            correlationId: setupResult.correlationId,
            usersProcessed: scoringResult.usersProcessed,
            usersFailed: scoringResult.usersFailed,
            usersCached: cacheWarmingResult.usersCached,
            alertsCreated: alertDetectionResult.alertsCreated,
            driftAlertsCreated: driftAlertDetectionResult.alertsCreated,
            driftAlertsDismissed: driftAlertDetectionResult.alertsDismissed,
            totalDurationMs,
          });
        } else {
          // Full success
          await overnightJobService.completeJobRun(setupResult.jobRunId, {
            usersProcessed: scoringResult.usersProcessed,
            metrics,
          });

          logger.info("Overnight job completed successfully", {
            correlationId: setupResult.correlationId,
            usersProcessed: scoringResult.usersProcessed,
            assetsScored: scoringResult.assetsScored,
            usersCached: cacheWarmingResult.usersCached,
            alertsCreated: alertDetectionResult.alertsCreated,
            driftAlertsCreated: driftAlertDetectionResult.alertsCreated,
            driftAlertsDismissed: driftAlertDetectionResult.alertsDismissed,
            totalDurationMs,
          });
        }
      });

      const totalDurationMs = Date.now() - jobStartTime;
      span.setAttribute(SpanAttributes.TOTAL_DURATION_MS, totalDurationMs);
      span.setStatus({ code: SpanStatusCode.OK });

      return {
        success: true,
        correlationId: setupResult.correlationId,
        completedAt: new Date().toISOString(),
        durationMs: totalDurationMs,
        usersProcessed: scoringResult.usersProcessed,
        usersSuccess: scoringResult.usersSuccess,
        usersFailed: scoringResult.usersFailed,
        assetsScored: scoringResult.assetsScored,
        // Story 8.3: Add recommendation counts
        recommendationsGenerated: recommendationResult.totalRecommendationsGenerated,
        usersWithRecommendations: recommendationResult.usersWithRecommendations,
        // Story 8.4: Add cache warming counts
        usersCached: cacheWarmingResult.usersCached,
        cacheFailures: cacheWarmingResult.cacheFailures,
        // Story 9.1: Add alert detection counts
        alertsCreated: alertDetectionResult.alertsCreated,
        alertsUpdated: alertDetectionResult.alertsUpdated,
        // Story 9.2: Add drift alert detection counts
        driftAlertsCreated: driftAlertDetectionResult.alertsCreated,
        driftAlertsUpdated: driftAlertDetectionResult.alertsUpdated,
        driftAlertsDismissed: driftAlertDetectionResult.alertsDismissed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });

      logger.error("Overnight scoring job failed", {
        error: errorMessage,
      });

      throw error;
    } finally {
      span.end();
    }
  }
);
