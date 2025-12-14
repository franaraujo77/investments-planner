/**
 * Investment Service
 *
 * Business logic for investment recording operations.
 * Story 3.8: Record Investment Amount
 *
 * AC-3.8.1: Investment Record Data Completeness
 * AC-3.8.2: Portfolio Holdings Auto-Update (atomic transaction)
 * AC-3.8.6: Recommended vs Actual Amount Tracking
 *
 * Implements:
 * - Atomic transactions (investment + quantity update)
 * - Event sourcing (INVESTMENT_RECORDED audit events)
 * - decimal.js for all monetary calculations
 * - Multi-tenant isolation via user_id verification
 */

import { db } from "@/lib/db";
import { Decimal } from "@/lib/calculations/decimal-config";
import {
  investments,
  portfolioAssets,
  calculationEvents,
  portfolios,
  recommendations,
  assetClasses,
  type Investment,
  type NewInvestment,
} from "@/lib/db/schema";
import { eq, and, sql, gte, lte, desc, inArray } from "drizzle-orm";
import { type InvestmentItemInput } from "@/lib/validations/portfolio";
import { parseDecimal, add, divide, multiply } from "@/lib/calculations/decimal-utils";
import type { InvestmentConfirmedEvent } from "@/lib/events/types";
import type { ConfirmInvestmentInput, ConfirmInvestmentResult } from "@/lib/types/recommendations";
import { invalidateUserCache } from "@/lib/cache/invalidation";
import { logger } from "@/lib/telemetry/logger";

/**
 * Custom error for asset not found or not owned
 */
export class InvestmentAssetNotFoundError extends Error {
  constructor(assetId: string) {
    super(`Asset ${assetId} not found or not owned by user`);
    this.name = "InvestmentAssetNotFoundError";
    this.assetId = assetId;
  }
  readonly assetId: string;
}

/**
 * Custom error for portfolio not found or not owned
 */
export class InvestmentPortfolioNotFoundError extends Error {
  constructor(portfolioId: string) {
    super(`Portfolio ${portfolioId} not found or not owned by user`);
    this.name = "InvestmentPortfolioNotFoundError";
    this.portfolioId = portfolioId;
  }
  readonly portfolioId: string;
}

/**
 * Custom error for investment not found
 */
export class InvestmentNotFoundError extends Error {
  constructor() {
    super("Investment not found");
    this.name = "InvestmentNotFoundError";
  }
}

/**
 * Options for getting investment history
 */
export interface GetInvestmentHistoryOptions {
  from?: Date | undefined;
  to?: Date | undefined;
  portfolioId?: string | undefined;
  assetId?: string | undefined;
}

/**
 * Calculate total amount using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 *
 * @param quantity - Quantity as string
 * @param pricePerUnit - Price per unit as string
 * @returns Total amount as string with 4 decimal places
 */
export function calculateTotalAmount(quantity: string, pricePerUnit: string): string {
  return new Decimal(quantity).times(pricePerUnit).toFixed(4);
}

/**
 * Calculate updated asset quantity using decimal.js
 * CRITICAL: Never use JavaScript arithmetic for monetary values
 *
 * @param currentQty - Current quantity as string
 * @param addedQty - Quantity to add as string
 * @returns New quantity as string with 8 decimal places
 */
export function updateAssetQuantity(currentQty: string, addedQty: string): string {
  return new Decimal(currentQty).plus(addedQty).toFixed(8);
}

/**
 * Verify portfolio ownership
 *
 * @param userId - User ID to verify ownership
 * @param portfolioId - Portfolio ID to check
 * @returns true if portfolio belongs to user, false otherwise
 */
async function verifyPortfolioOwnership(userId: string, portfolioId: string): Promise<boolean> {
  const portfolio = await db.query.portfolios.findFirst({
    where: and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)),
  });
  return portfolio !== undefined;
}

/**
 * Verify asset ownership (through portfolio)
 *
 * @param userId - User ID to verify ownership
 * @param assetId - Asset ID to check
 * @returns The asset if owned by user, null otherwise
 */
async function verifyAssetOwnership(
  userId: string,
  assetId: string
): Promise<{ asset: typeof portfolioAssets.$inferSelect; portfolioId: string } | null> {
  const asset = await db.query.portfolioAssets.findFirst({
    where: eq(portfolioAssets.id, assetId),
    with: {
      portfolio: true,
    },
  });

  if (!asset) {
    return null;
  }

  // Verify the portfolio belongs to the user
  if (asset.portfolio.userId !== userId) {
    return null;
  }

  return { asset, portfolioId: asset.portfolioId };
}

/**
 * Record investments atomically
 *
 * Story 3.8: Record Investment Amount
 * AC-3.8.1: Creates complete investment record with all fields
 * AC-3.8.2: Updates asset quantity in same transaction (atomic)
 * AC-3.8.6: Stores recommended amount if provided
 *
 * Uses database transaction to ensure both:
 * 1. Investment record is created
 * 2. Portfolio asset quantity is updated
 * Either both succeed or both fail (atomicity)
 *
 * @param userId - User ID recording the investment
 * @param investmentInputs - Array of investments to record
 * @returns Array of created investment records
 * @throws InvestmentAssetNotFoundError if any asset is not owned
 * @throws InvestmentPortfolioNotFoundError if any portfolio is not owned
 */
export async function recordInvestments(
  userId: string,
  investmentInputs: InvestmentItemInput[]
): Promise<Investment[]> {
  // Pre-validate all assets and portfolios belong to user
  for (const inv of investmentInputs) {
    const assetOwnership = await verifyAssetOwnership(userId, inv.assetId);
    if (!assetOwnership) {
      throw new InvestmentAssetNotFoundError(inv.assetId);
    }

    // Verify portfolio matches the asset's portfolio
    if (assetOwnership.portfolioId !== inv.portfolioId) {
      throw new InvestmentPortfolioNotFoundError(inv.portfolioId);
    }
  }

  // Generate correlation ID for event sourcing
  const correlationId = crypto.randomUUID();

  // Execute all operations in a transaction
  return await db.transaction(async (tx) => {
    const records: Investment[] = [];

    for (const inv of investmentInputs) {
      // Calculate total amount using decimal.js
      const totalAmount = calculateTotalAmount(inv.quantity, inv.pricePerUnit);

      // 1. Create investment record
      const newInvestment: NewInvestment = {
        userId,
        portfolioId: inv.portfolioId,
        assetId: inv.assetId,
        symbol: inv.symbol,
        quantity: inv.quantity,
        pricePerUnit: inv.pricePerUnit,
        totalAmount,
        currency: inv.currency,
        recommendedAmount: inv.recommendedAmount ?? null,
        investedAt: new Date(),
      };

      const [record] = await tx.insert(investments).values(newInvestment).returning();

      if (!record) {
        throw new Error("Failed to create investment record");
      }

      // 2. Update portfolio asset quantity atomically
      // AC-3.8.2: new quantity = previous quantity + invested quantity
      await tx
        .update(portfolioAssets)
        .set({
          quantity: sql`(${portfolioAssets.quantity}::numeric + ${inv.quantity}::numeric)::text`,
          updatedAt: new Date(),
        })
        .where(eq(portfolioAssets.id, inv.assetId));

      records.push(record);
    }

    // 3. Emit INVESTMENT_RECORDED audit event
    // Per architecture: event sourcing for audit trail
    await tx.insert(calculationEvents).values({
      correlationId,
      userId,
      eventType: "INVESTMENT_RECORDED",
      payload: {
        investmentIds: records.map((r) => r.id),
        totalInvestments: records.length,
        totalAmount: records.reduce(
          (sum, r) => new Decimal(sum).plus(r.totalAmount).toString(),
          "0"
        ),
      },
    });

    return records;
  });
}

/**
 * Get investment history for a user
 *
 * Story 3.8: Record Investment Amount
 * Multi-tenant isolation: Only returns investments belonging to the userId
 *
 * @param userId - User ID to fetch investments for
 * @param options - Filter options (from, to, portfolioId, assetId)
 * @returns Array of investments ordered by investedAt descending
 */
export async function getInvestmentHistory(
  userId: string,
  options: GetInvestmentHistoryOptions = {}
): Promise<Investment[]> {
  const conditions = [eq(investments.userId, userId)];

  if (options.from) {
    conditions.push(gte(investments.investedAt, options.from));
  }

  if (options.to) {
    conditions.push(lte(investments.investedAt, options.to));
  }

  if (options.portfolioId) {
    conditions.push(eq(investments.portfolioId, options.portfolioId));
  }

  if (options.assetId) {
    conditions.push(eq(investments.assetId, options.assetId));
  }

  return db.query.investments.findMany({
    where: and(...conditions),
    orderBy: [desc(investments.investedAt)],
  });
}

/**
 * Get a single investment by ID
 *
 * Multi-tenant isolation: Only returns if investment belongs to the userId
 *
 * @param userId - User ID (for ownership verification)
 * @param investmentId - Investment ID to fetch
 * @returns Investment or null if not found/not owned by user
 */
export async function getInvestmentById(
  userId: string,
  investmentId: string
): Promise<Investment | null> {
  const investment = await db.query.investments.findFirst({
    where: and(eq(investments.id, investmentId), eq(investments.userId, userId)),
  });

  return investment ?? null;
}

/**
 * Get investments summary for a portfolio
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to get summary for
 * @returns Summary with count, total invested, and date range
 */
export async function getInvestmentSummary(
  userId: string,
  portfolioId: string
): Promise<{
  count: number;
  totalInvested: string;
  firstInvestment: Date | null;
  lastInvestment: Date | null;
}> {
  // Verify portfolio ownership
  const isOwner = await verifyPortfolioOwnership(userId, portfolioId);
  if (!isOwner) {
    throw new InvestmentPortfolioNotFoundError(portfolioId);
  }

  const portfolioInvestments = await db.query.investments.findMany({
    where: and(eq(investments.userId, userId), eq(investments.portfolioId, portfolioId)),
    orderBy: [investments.investedAt],
  });

  if (portfolioInvestments.length === 0) {
    return {
      count: 0,
      totalInvested: "0.0000",
      firstInvestment: null,
      lastInvestment: null,
    };
  }

  const totalInvested = portfolioInvestments.reduce(
    (sum, inv) => new Decimal(sum).plus(inv.totalAmount).toString(),
    "0"
  );

  const firstInvestment = portfolioInvestments[0];
  const lastInvestment = portfolioInvestments[portfolioInvestments.length - 1];

  return {
    count: portfolioInvestments.length,
    totalInvested: new Decimal(totalInvested).toFixed(4),
    firstInvestment: firstInvestment?.investedAt ?? null,
    lastInvestment: lastInvestment?.investedAt ?? null,
  };
}

// =============================================================================
// STORY 7.8/7.9: CONFIRM RECOMMENDATIONS & UPDATE PORTFOLIO
// =============================================================================

/**
 * Confirm investments from a recommendation session
 *
 * Story 7.8: Confirm Recommendations
 * AC-7.8.3: Records investments and updates portfolio
 *
 * @param userId - User ID
 * @param input - Confirmation input with amounts
 * @returns Confirmation result with before/after allocations
 */
export async function confirmInvestments(
  userId: string,
  input: ConfirmInvestmentInput
): Promise<ConfirmInvestmentResult> {
  const correlationId = crypto.randomUUID();
  const { recommendationId, investments: investmentInputs } = input;

  // 1. Verify user owns the recommendation and get details
  const recommendation = await db.query.recommendations.findFirst({
    where: and(eq(recommendations.id, recommendationId), eq(recommendations.userId, userId)),
    with: {
      items: true,
    },
  });

  if (!recommendation) {
    throw new Error("Recommendation not found or access denied");
  }

  if (recommendation.status === "confirmed") {
    throw new Error("Recommendation has already been confirmed");
  }

  if (recommendation.status === "expired") {
    throw new Error("Recommendation has expired");
  }

  // 2. Get portfolio assets for validation and update
  const assetIds = investmentInputs.map((i) => i.assetId);
  const assets = await db
    .select()
    .from(portfolioAssets)
    .where(
      and(
        inArray(portfolioAssets.id, assetIds),
        eq(portfolioAssets.portfolioId, recommendation.portfolioId)
      )
    );

  // Validate all assets exist
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  for (const inv of investmentInputs) {
    if (!assetMap.has(inv.assetId)) {
      throw new Error(`Asset ${inv.assetId} not found in portfolio`);
    }
  }

  // 3. Calculate before allocations
  const beforeAllocations = await calculateAllocations(userId, recommendation.portfolioId);

  // 4. Execute transaction: create investments + update quantities + mark confirmed
  const investmentIds: string[] = [];
  const now = new Date();

  await db.transaction(async (tx) => {
    // Create investment records
    for (const inv of investmentInputs) {
      const asset = assetMap.get(inv.assetId)!;
      const actualAmount = parseDecimal(inv.actualAmount);
      const pricePerUnit = parseDecimal(inv.pricePerUnit);

      // Skip zero amounts
      if (actualAmount.isZero()) {
        continue;
      }

      // Calculate quantity
      const quantity = divide(actualAmount, pricePerUnit);

      // Find recommended amount from recommendation items
      const recItem = recommendation.items.find((item) => item.assetId === inv.assetId);

      const newInvestment: NewInvestment = {
        userId,
        portfolioId: recommendation.portfolioId,
        assetId: inv.assetId,
        symbol: inv.ticker,
        quantity: quantity.toFixed(8),
        pricePerUnit: inv.pricePerUnit,
        totalAmount: inv.actualAmount,
        currency: recommendation.baseCurrency,
        recommendedAmount: recItem?.recommendedAmount ?? null,
        investedAt: now,
      };

      const [inserted] = await tx
        .insert(investments)
        .values(newInvestment)
        .returning({ id: investments.id });

      if (inserted) {
        investmentIds.push(inserted.id);
      }

      // Update portfolio asset quantity
      const currentQuantity = parseDecimal(asset.quantity);
      const newQuantity = add(currentQuantity, quantity);

      await tx
        .update(portfolioAssets)
        .set({
          quantity: newQuantity.toFixed(8),
          updatedAt: now,
        })
        .where(eq(portfolioAssets.id, inv.assetId));
    }

    // Mark recommendation as confirmed
    await tx
      .update(recommendations)
      .set({
        status: "confirmed",
        updatedAt: now,
      })
      .where(eq(recommendations.id, recommendationId));
  });

  // 5. Calculate after allocations
  const afterAllocations = await calculateAllocations(userId, recommendation.portfolioId);

  // 6. Calculate total invested
  let totalInvested = new Decimal(0);
  for (const inv of investmentInputs) {
    totalInvested = add(totalInvested, parseDecimal(inv.actualAmount));
  }

  // 7. Emit INVESTMENT_CONFIRMED event
  await emitInvestmentConfirmed(
    userId,
    correlationId,
    recommendationId,
    recommendation.portfolioId,
    totalInvested.toFixed(4),
    investmentIds,
    investmentInputs,
    recommendation.items,
    beforeAllocations,
    afterAllocations
  );

  // 8. Invalidate cache (AC-7.9.3: invalidate recs, portfolio, and allocation keys)
  await invalidateUserCache(userId);

  logger.info("Investments confirmed", {
    userId,
    recommendationId,
    investmentCount: investmentIds.length,
    totalInvested: totalInvested.toFixed(4),
    correlationId,
  });

  return {
    success: true,
    investmentIds,
    summary: {
      totalInvested: totalInvested.toFixed(4),
      assetsUpdated: investmentIds.length,
    },
    allocations: {
      before: beforeAllocations,
      after: afterAllocations,
    },
  };
}

/**
 * Calculate current allocation percentages by asset class
 */
async function calculateAllocations(
  userId: string,
  portfolioId: string
): Promise<Record<string, string>> {
  // Get all assets with their classes
  const assets = await db
    .select({
      id: portfolioAssets.id,
      quantity: portfolioAssets.quantity,
      purchasePrice: portfolioAssets.purchasePrice,
      assetClassId: portfolioAssets.assetClassId,
      isIgnored: portfolioAssets.isIgnored,
    })
    .from(portfolioAssets)
    .where(eq(portfolioAssets.portfolioId, portfolioId));

  // Get asset class names
  const classIds = assets
    .filter((a) => a.assetClassId && !a.isIgnored)
    .map((a) => a.assetClassId!)
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const classes =
    classIds.length > 0
      ? await db
          .select({ id: assetClasses.id, name: assetClasses.name })
          .from(assetClasses)
          .where(and(inArray(assetClasses.id, classIds), eq(assetClasses.userId, userId)))
      : [];

  const classNameMap = new Map(classes.map((c) => [c.id, c.name]));

  // Calculate total portfolio value
  let totalValue = new Decimal(0);
  for (const asset of assets) {
    if (asset.isIgnored) continue;
    const quantity = parseDecimal(asset.quantity);
    const price = parseDecimal(asset.purchasePrice);
    totalValue = add(totalValue, multiply(quantity, price));
  }

  if (totalValue.isZero()) {
    return {};
  }

  // Calculate allocation per class
  const classValues = new Map<string, Decimal>();
  for (const asset of assets) {
    if (asset.isIgnored) continue;
    const classId = asset.assetClassId;
    const className = classId ? classNameMap.get(classId) : null;
    const key = className ?? "Unclassified";

    const quantity = parseDecimal(asset.quantity);
    const price = parseDecimal(asset.purchasePrice);
    const value = multiply(quantity, price);

    const current = classValues.get(key) ?? new Decimal(0);
    classValues.set(key, add(current, value));
  }

  // Convert to percentages
  const allocations: Record<string, string> = {};
  for (const [className, value] of classValues) {
    const percentage = divide(value, totalValue).times(100);
    allocations[className] = `${percentage.toFixed(1)}%`;
  }

  return allocations;
}

/**
 * Emit INVESTMENT_CONFIRMED event for audit trail
 */
async function emitInvestmentConfirmed(
  userId: string,
  correlationId: string,
  recommendationId: string,
  portfolioId: string,
  totalInvested: string,
  investmentIds: string[],
  investmentInputs: ConfirmInvestmentInput["investments"],
  recommendationItems: Array<{
    assetId: string;
    symbol: string;
    recommendedAmount: string;
  }>,
  beforeAllocations: Record<string, string>,
  afterAllocations: Record<string, string>
): Promise<void> {
  const recItemMap = new Map(recommendationItems.map((r) => [r.assetId, r.recommendedAmount]));

  const event: InvestmentConfirmedEvent = {
    type: "INVESTMENT_CONFIRMED",
    correlationId,
    recommendationId,
    userId,
    portfolioId,
    totalInvested,
    investmentCount: investmentIds.length,
    investments: investmentInputs
      .filter((inv) => parseFloat(inv.actualAmount) > 0)
      .map((inv, index) => {
        const pricePerUnit = parseDecimal(inv.pricePerUnit);
        const actualAmount = parseDecimal(inv.actualAmount);
        const quantity = divide(actualAmount, pricePerUnit);

        return {
          investmentId: investmentIds[index] ?? "",
          assetId: inv.assetId,
          symbol: inv.ticker,
          quantity: quantity.toFixed(8),
          pricePerUnit: inv.pricePerUnit,
          totalAmount: inv.actualAmount,
          recommendedAmount: recItemMap.get(inv.assetId) ?? "0",
        };
      }),
    allocations: {
      before: beforeAllocations,
      after: afterAllocations,
    },
    timestamp: new Date(),
  };

  await db.insert(calculationEvents).values({
    correlationId,
    userId,
    eventType: "INVESTMENT_CONFIRMED",
    payload: event,
  });
}
