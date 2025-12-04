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
  type Investment,
  type NewInvestment,
} from "@/lib/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { type InvestmentItemInput } from "@/lib/validations/portfolio";

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
