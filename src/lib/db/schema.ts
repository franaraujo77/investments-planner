import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Database Schema for Investments Planner
 *
 * All tables follow fintech best practices:
 * - No float/double for monetary values (AC: 2)
 * - Multi-tenant isolation via user_id foreign keys (AC: 5)
 * - Event sourcing for calculation audit trail (ADR-002)
 */

// =============================================================================
// USERS TABLE
// =============================================================================

/**
 * Users table - core user identity and preferences
 *
 * Note: No monetary fields in this table (AC: 2 compliance)
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
  emailVerified: boolean("email_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  disclaimerAcknowledgedAt: timestamp("disclaimer_acknowledged_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// REFRESH TOKENS TABLE
// =============================================================================

/**
 * Refresh tokens table - JWT refresh token storage for secure auth
 *
 * Implements:
 * - Foreign key to users with CASCADE delete (AC: 5)
 * - Index on user_id for efficient lookups
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("refresh_tokens_user_id_idx").on(table.userId)]
);

// =============================================================================
// CALCULATION EVENTS TABLE (Event Sourcing)
// =============================================================================

/**
 * Calculation events table - immutable event store for audit trail
 *
 * Implements ADR-002: Event-Sourced Calculations
 * - All calculation steps stored as immutable events
 * - correlation_id links related events for replay capability
 * - payload stores event-specific data as JSONB
 *
 * Event types: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
 */
export const calculationEvents = pgTable(
  "calculation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    correlationId: uuid("correlation_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("calculation_events_correlation_id_idx").on(table.correlationId),
    index("calculation_events_user_id_idx").on(table.userId),
  ]
);

// =============================================================================
// VERIFICATION TOKENS TABLE
// =============================================================================

/**
 * Verification tokens table - email verification tokens
 *
 * Story 2.1: User Registration Flow
 * - Single-use tokens with 24h expiry
 * - Index on token for fast lookup
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("verification_tokens_user_id_idx").on(table.userId),
    index("verification_tokens_token_idx").on(table.token),
  ]
);

// =============================================================================
// PASSWORD RESET TOKENS TABLE
// =============================================================================

/**
 * Password reset tokens table - secure password reset flow
 *
 * Story 2.5: Password Reset Flow
 * - Single-use tokens with 1h expiry
 * - Hash stored, not raw token (security)
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_id_idx").on(table.userId),
    index("password_reset_tokens_hash_idx").on(table.tokenHash),
  ]
);

// =============================================================================
// PORTFOLIOS TABLE
// =============================================================================

/**
 * Portfolios table - user investment portfolios
 *
 * Story 3.1: Create Portfolio
 * - Each user can have up to 5 portfolios (MAX_PORTFOLIOS_PER_USER)
 * - Multi-tenant isolation via user_id (AC: 5)
 * - CASCADE delete when user is deleted
 */
export const portfolios = pgTable(
  "portfolios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("portfolios_user_id_idx").on(table.userId)]
);

// =============================================================================
// PORTFOLIO ASSETS TABLE
// =============================================================================

/**
 * Portfolio assets table - individual asset holdings within portfolios
 *
 * Story 3.2: Add Asset to Portfolio
 * - Uses numeric(19,8) for quantity (supports crypto satoshis)
 * - Uses numeric(19,4) for purchase price (standard fintech precision)
 * - Unique constraint on (portfolioId, symbol) prevents duplicates
 * - Multi-tenant isolation via portfolio ownership
 * - CASCADE delete when portfolio is deleted
 */
export const portfolioAssets = pgTable(
  "portfolio_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }),
    quantity: numeric("quantity", { precision: 19, scale: 8 }).notNull(),
    purchasePrice: numeric("purchase_price", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    assetClassId: uuid("asset_class_id").references(() => assetClasses.id, {
      onDelete: "set null",
    }), // Optional, Epic 4
    subclassId: uuid("subclass_id").references(() => assetSubclasses.id, { onDelete: "set null" }), // Optional, Epic 4
    isIgnored: boolean("is_ignored").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("portfolio_assets_portfolio_symbol_uniq").on(table.portfolioId, table.symbol),
    index("portfolio_assets_portfolio_id_idx").on(table.portfolioId),
  ]
);

// =============================================================================
// ASSET CLASSES TABLE (Epic 4)
// =============================================================================

/**
 * Asset classes table - user-defined asset classification categories
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.1: View list of asset classes
 * AC-4.1.2: Create asset class with name (1-50 chars) and optional icon
 * AC-4.1.3: Edit asset class name
 * AC-4.1.4: Delete asset class (when no assets)
 * AC-4.1.5: Delete asset class with warning (when has assets)
 *
 * Tech spec: Maximum 10 asset classes per user
 * Multi-tenant isolation via user_id
 */
export const assetClasses = pgTable(
  "asset_classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    icon: varchar("icon", { length: 10 }), // Optional emoji icon
    targetMin: numeric("target_min", { precision: 5, scale: 2 }), // e.g., 40.00%
    targetMax: numeric("target_max", { precision: 5, scale: 2 }), // e.g., 50.00%
    maxAssets: numeric("max_assets", { precision: 10, scale: 0 }), // null = no limit
    minAllocationValue: numeric("min_allocation_value", { precision: 19, scale: 4 }), // in base currency
    sortOrder: numeric("sort_order", { precision: 10, scale: 0 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("asset_classes_user_id_idx").on(table.userId)]
);

// =============================================================================
// ASSET SUBCLASSES TABLE (Epic 4)
// =============================================================================

/**
 * Asset subclasses table - subdivisions within asset classes
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.1: Create subclass within a class
 * AC-4.2.2: Edit subclass name
 * AC-4.2.3: Delete subclass
 * AC-4.2.4: Cascade delete when parent class deleted
 *
 * Note: Created in Story 4.1 to establish foreign key relationships
 */
export const assetSubclasses = pgTable(
  "asset_subclasses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => assetClasses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    targetMin: numeric("target_min", { precision: 5, scale: 2 }),
    targetMax: numeric("target_max", { precision: 5, scale: 2 }),
    maxAssets: numeric("max_assets", { precision: 10, scale: 0 }),
    minAllocationValue: numeric("min_allocation_value", { precision: 19, scale: 4 }),
    sortOrder: numeric("sort_order", { precision: 10, scale: 0 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("asset_subclasses_class_id_idx").on(table.classId)]
);

// =============================================================================
// INVESTMENTS TABLE
// =============================================================================

/**
 * Investments table - records of actual investment transactions
 *
 * Story 3.8: Record Investment Amount
 * - Uses numeric(19,8) for quantity (supports crypto satoshis)
 * - Uses numeric(19,4) for prices and amounts (standard fintech precision)
 * - Stores both recommended and actual amounts for comparison
 * - Multi-tenant isolation via user_id
 * - Links to portfolio and asset for ownership verification
 */
export const investments = pgTable(
  "investments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => portfolioAssets.id),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    quantity: numeric("quantity", { precision: 19, scale: 8 }).notNull(),
    pricePerUnit: numeric("price_per_unit", { precision: 19, scale: 4 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    recommendedAmount: numeric("recommended_amount", { precision: 19, scale: 4 }),
    investedAt: timestamp("invested_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("investments_user_id_idx").on(table.userId),
    index("investments_invested_at_idx").on(table.investedAt),
  ]
);

// =============================================================================
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  calculationEvents: many(calculationEvents),
  verificationTokens: many(verificationTokens),
  passwordResetTokens: many(passwordResetTokens),
  portfolios: many(portfolios),
  investments: many(investments),
  assetClasses: many(assetClasses),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  assets: many(portfolioAssets),
  investments: many(investments),
}));

export const portfolioAssetsRelations = relations(portfolioAssets, ({ one, many }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioAssets.portfolioId],
    references: [portfolios.id],
  }),
  investments: many(investments),
}));

export const investmentsRelations = relations(investments, ({ one }) => ({
  user: one(users, {
    fields: [investments.userId],
    references: [users.id],
  }),
  portfolio: one(portfolios, {
    fields: [investments.portfolioId],
    references: [portfolios.id],
  }),
  asset: one(portfolioAssets, {
    fields: [investments.assetId],
    references: [portfolioAssets.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const calculationEventsRelations = relations(calculationEvents, ({ one }) => ({
  user: one(users, {
    fields: [calculationEvents.userId],
    references: [users.id],
  }),
}));

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [verificationTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const assetClassesRelations = relations(assetClasses, ({ one, many }) => ({
  user: one(users, {
    fields: [assetClasses.userId],
    references: [users.id],
  }),
  subclasses: many(assetSubclasses),
}));

export const assetSubclassesRelations = relations(assetSubclasses, ({ one }) => ({
  assetClass: one(assetClasses, {
    fields: [assetSubclasses.classId],
    references: [assetClasses.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type CalculationEvent = typeof calculationEvents.$inferSelect;
export type NewCalculationEvent = typeof calculationEvents.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;

export type PortfolioAsset = typeof portfolioAssets.$inferSelect;
export type NewPortfolioAsset = typeof portfolioAssets.$inferInsert;

export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;

export type AssetClass = typeof assetClasses.$inferSelect;
export type NewAssetClass = typeof assetClasses.$inferInsert;

export type AssetSubclass = typeof assetSubclasses.$inferSelect;
export type NewAssetSubclass = typeof assetSubclasses.$inferInsert;
