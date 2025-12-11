/**
 * Score Calculation Inputs API Routes
 *
 * Story 6.8: Data Source Attribution
 * Story 6.9: Calculation Breakdown Access
 *
 * GET /api/scores/[assetId]/inputs - Get input sources used in score calculation
 *
 * AC-6.8.3: Source Available in Score Breakdown
 * AC-6.9.1: View All Input Values Used
 * AC-6.9.2: View Each Criterion Evaluation Result
 * AC-6.9.3: View Criteria Version Used for Calculation
 *
 * Returns:
 * - 200: Input sources found with source attribution
 * - 401: Not authenticated
 * - 404: No score found
 * - 500: Server error
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getAssetScore } from "@/lib/services/score-service";
import { db } from "@/lib/db";
import {
  assetPrices,
  assetFundamentals,
  exchangeRates,
  criteriaVersions,
  calculationEvents,
  type CriterionRule,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { AuthError } from "@/lib/auth/types";
import { z } from "zod";
import { getProviderDisplayName } from "@/lib/types/source-attribution";
import type { CriterionOperator, CriterionThreshold } from "@/lib/types/calculation-breakdown";

/**
 * Validation schema for assetId parameter
 */
const assetIdSchema = z.string().uuid("Invalid asset ID format");

/**
 * Response types
 */
interface InputSource {
  value: string;
  source: string;
  fetchedAt: string;
}

interface PriceInputSource extends InputSource {
  currency: string;
}

interface RateInputSource extends InputSource {
  from: string;
  to: string;
}

interface FundamentalsInputSource {
  source: string;
  fetchedAt: string;
  metrics: Record<string, string | null>;
}

/**
 * Criteria version info response type
 *
 * AC-6.9.3: View criteria version used for calculation
 */
interface CriteriaVersionResponse {
  id: string;
  version: number;
  name: string;
  createdAt: string;
}

/**
 * Criterion evaluation response type
 *
 * AC-6.9.2: View each criterion evaluation result
 */
interface CriterionEvaluationResponse {
  criterionId: string;
  name: string;
  description: string | undefined;
  category: string | undefined;
  operator: CriterionOperator;
  threshold: CriterionThreshold;
  actualValue: string | null;
  passed: boolean;
  pointsAwarded: number;
  maxPoints: number;
  skippedReason: string | null;
}

/**
 * Extended response type for Story 6.9
 *
 * AC-6.9.1: View all input values used
 * AC-6.9.2: View each criterion evaluation result
 * AC-6.9.3: View criteria version used for calculation
 */
interface GetInputsResponse {
  data: {
    assetId: string;
    symbol: string;
    calculatedAt: string;
    /** Correlation ID for replay reference (AC-6.9.5) */
    correlationId: string | null;
    inputs: {
      price: PriceInputSource | null;
      exchangeRate: RateInputSource | null;
      fundamentals: FundamentalsInputSource | null;
      /** Legacy: string version display (backwards compat) */
      criteriaVersion: string;
    };
    /** AC-6.9.3: Full criteria version info */
    criteriaVersionInfo: CriteriaVersionResponse | null;
    /** AC-6.9.2: Criterion-by-criterion evaluation results */
    evaluations: CriterionEvaluationResponse[];
    /** Score result */
    score: {
      final: string;
      maxPossible: string;
      percentage: string;
    };
  };
}

interface ErrorResponse {
  error: string;
  code: string;
}

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * GET /api/scores/[assetId]/inputs
 *
 * Retrieves the input data sources used in a score calculation.
 * Includes source attribution for each input type.
 *
 * AC-6.8.3: Available in score breakdown
 * AC-6.8.1: Provider name displayed for each data point
 * AC-6.8.2: Format follows the pattern "Price from Gemini API"
 *
 * Path Parameters:
 * - assetId: UUID of the asset to get inputs for
 *
 * Response:
 * - data: Input sources with attribution
 */
export const GET = withAuth<GetInputsResponse | ErrorResponse | AuthError>(
  async (request, session, routeParams) => {
    try {
      // Extract and validate assetId from params
      const { assetId } = await (routeParams as RouteParams).params;

      const parseResult = assetIdSchema.safeParse(assetId);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: parseResult.error.issues[0]?.message || "Invalid asset ID",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Get the score (scoped by userId for multi-tenant isolation)
      const score = await getAssetScore(session.userId, assetId);

      if (!score) {
        return NextResponse.json(
          {
            error: "No score found for this asset",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Fetch latest price for this asset (using symbol from score)
      const [latestPrice] = await db
        .select({
          close: assetPrices.close,
          currency: assetPrices.currency,
          source: assetPrices.source,
          fetchedAt: assetPrices.fetchedAt,
        })
        .from(assetPrices)
        .where(eq(assetPrices.symbol, score.symbol))
        .orderBy(desc(assetPrices.priceDate))
        .limit(1);

      // Fetch latest fundamentals for this asset (using symbol from score)
      const [latestFundamentals] = await db
        .select({
          source: assetFundamentals.source,
          fetchedAt: assetFundamentals.fetchedAt,
          peRatio: assetFundamentals.peRatio,
          pbRatio: assetFundamentals.pbRatio,
          dividendYield: assetFundamentals.dividendYield,
          marketCap: assetFundamentals.marketCap,
          revenue: assetFundamentals.revenue,
          earnings: assetFundamentals.earnings,
        })
        .from(assetFundamentals)
        .where(eq(assetFundamentals.symbol, score.symbol))
        .orderBy(desc(assetFundamentals.dataDate))
        .limit(1);

      // Fetch latest exchange rate (if applicable - use USD/BRL as default pair)
      // TODO(epic-8): Get user's base currency for dynamic rate lookup
      const [latestRate] = await db
        .select({
          rate: exchangeRates.rate,
          baseCurrency: exchangeRates.baseCurrency,
          targetCurrency: exchangeRates.targetCurrency,
          source: exchangeRates.source,
          fetchedAt: exchangeRates.fetchedAt,
        })
        .from(exchangeRates)
        .where(and(eq(exchangeRates.baseCurrency, "USD"), eq(exchangeRates.targetCurrency, "BRL")))
        .orderBy(desc(exchangeRates.rateDate))
        .limit(1);

      // AC-6.9.3: Fetch full criteria version info
      let criteriaVersionDisplay = score.criteriaVersionId;
      let criteriaVersionInfo: CriteriaVersionResponse | null = null;
      let criteriaRules: CriterionRule[] = [];

      if (score.criteriaVersionId) {
        const [version] = await db
          .select({
            id: criteriaVersions.id,
            name: criteriaVersions.name,
            version: criteriaVersions.version,
            createdAt: criteriaVersions.createdAt,
            criteria: criteriaVersions.criteria,
          })
          .from(criteriaVersions)
          .where(eq(criteriaVersions.id, score.criteriaVersionId))
          .limit(1);

        if (version) {
          criteriaVersionDisplay = version.name;
          criteriaVersionInfo = {
            id: version.id,
            version: version.version,
            name: version.name,
            createdAt: version.createdAt?.toISOString() ?? new Date().toISOString(),
          };
          criteriaRules = (version.criteria as CriterionRule[]) || [];
        }
      }

      // AC-6.9.5: Find correlationId from calculation events
      // Look for the most recent SCORES_COMPUTED event for this user
      let correlationId: string | null = null;
      const [latestCalcEvent] = await db
        .select({
          correlationId: calculationEvents.correlationId,
        })
        .from(calculationEvents)
        .where(
          and(
            eq(calculationEvents.userId, session.userId),
            eq(calculationEvents.eventType, "SCORES_COMPUTED")
          )
        )
        .orderBy(desc(calculationEvents.createdAt))
        .limit(1);

      if (latestCalcEvent) {
        correlationId = latestCalcEvent.correlationId;
      }

      // AC-6.9.2: Build evaluations array from breakdown and criteria
      const evaluations: CriterionEvaluationResponse[] = score.breakdown.map((breakdownItem) => {
        // Find the matching criterion rule for operator and threshold info
        const criterionRule = criteriaRules.find((c) => c.id === breakdownItem.criterionId);

        // Map operator from DB format to API format
        let operator: CriterionOperator = "eq";
        if (criterionRule?.operator) {
          const opMap: Record<string, CriterionOperator> = {
            gt: "gt",
            gte: "gte",
            lt: "lt",
            lte: "lte",
            equals: "eq",
            between: "between",
            exists: "eq",
          };
          operator = opMap[criterionRule.operator] ?? "eq";
        }

        // Build threshold value
        let threshold: CriterionThreshold = criterionRule?.value ?? "0";
        if (operator === "between" && criterionRule?.value2) {
          threshold = {
            min: criterionRule.value,
            max: criterionRule.value2,
          };
        }

        return {
          criterionId: breakdownItem.criterionId,
          name: breakdownItem.criterionName,
          description: undefined, // Not stored in current schema
          category: undefined, // Not stored in current schema
          operator,
          threshold,
          actualValue: breakdownItem.actualValue ?? null,
          passed: breakdownItem.matched,
          pointsAwarded: breakdownItem.pointsAwarded,
          maxPoints: criterionRule?.points ?? breakdownItem.pointsAwarded,
          skippedReason: breakdownItem.skippedReason ?? null,
        };
      });

      // Calculate max possible score and percentage
      const maxPossible = criteriaRules.reduce((sum, c) => sum + Math.max(0, c.points), 0);
      const scoreValue = parseFloat(score.score);
      const percentage = maxPossible > 0 ? ((scoreValue / maxPossible) * 100).toFixed(2) : "0.00";

      // Build response with source attribution
      // AC-6.8.1: Use getProviderDisplayName for human-readable names
      // AC-6.9.1, AC-6.9.2, AC-6.9.3: Extended response
      const response: GetInputsResponse = {
        data: {
          assetId: score.assetId,
          symbol: score.symbol,
          calculatedAt: score.calculatedAt.toISOString(),
          correlationId,
          inputs: {
            price: latestPrice
              ? {
                  value: latestPrice.close,
                  currency: latestPrice.currency,
                  source: getProviderDisplayName(latestPrice.source),
                  fetchedAt: latestPrice.fetchedAt.toISOString(),
                }
              : null,
            exchangeRate: latestRate
              ? {
                  from: latestRate.baseCurrency,
                  to: latestRate.targetCurrency,
                  value: latestRate.rate,
                  source: getProviderDisplayName(latestRate.source),
                  fetchedAt: latestRate.fetchedAt.toISOString(),
                }
              : null,
            fundamentals: latestFundamentals
              ? {
                  source: getProviderDisplayName(latestFundamentals.source),
                  fetchedAt: latestFundamentals.fetchedAt.toISOString(),
                  metrics: {
                    peRatio: latestFundamentals.peRatio,
                    pbRatio: latestFundamentals.pbRatio,
                    dividendYield: latestFundamentals.dividendYield,
                    marketCap: latestFundamentals.marketCap,
                    revenue: latestFundamentals.revenue,
                    earnings: latestFundamentals.earnings,
                  },
                }
              : null,
            criteriaVersion: criteriaVersionDisplay,
          },
          criteriaVersionInfo,
          evaluations,
          score: {
            final: score.score,
            maxPossible: maxPossible.toFixed(4),
            percentage,
          },
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const dbError = handleDbError(error, "get score inputs");

      if (dbError.isConnectionError || dbError.isTimeout) {
        return databaseError(dbError, "get score inputs");
      }

      return NextResponse.json(
        {
          error: "Failed to retrieve calculation inputs",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
