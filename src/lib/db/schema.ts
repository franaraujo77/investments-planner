import {
  boolean,
  date,
  index,
  integer,
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
  defaultContribution: numeric("default_contribution", { precision: 19, scale: 4 }), // Story 7.1: AC-7.1.3, AC-7.1.4
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
// CRITERIA VERSIONS TABLE (Epic 5)
// =============================================================================

/**
 * CriterionRule interface - defines a single scoring rule
 *
 * Stored as JSONB array in criteria_versions.criteria column
 * Each rule evaluates a metric against a threshold and awards points
 */
/**
 * Available metrics for criteria evaluation
 */
export const CRITERION_METRICS = [
  "dividend_yield",
  "pe_ratio",
  "pb_ratio",
  "market_cap",
  "revenue",
  "earnings",
  "surplus_years",
  "roe",
  "roa",
  "debt_to_equity",
  "current_ratio",
  "gross_margin",
  "net_margin",
  "payout_ratio",
  "ev_ebitda",
] as const;

export type CriterionMetric = (typeof CRITERION_METRICS)[number];

/**
 * Available operators for criteria comparison
 */
export const CRITERION_OPERATORS = [
  "gt",
  "lt",
  "gte",
  "lte",
  "between",
  "equals",
  "exists",
] as const;

export type CriterionOperator = (typeof CRITERION_OPERATORS)[number];

export interface CriterionRule {
  id: string;
  name: string;
  metric: CriterionMetric;
  operator: CriterionOperator;
  value: string; // Decimal string for comparison
  value2?: string | null | undefined; // For 'between' operator
  points: number; // -100 to +100
  requiredFundamentals: string[]; // Data points needed for evaluation
  sortOrder: number;
}

/**
 * Criteria versions table - immutable scoring criteria sets
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.1: Create new criterion
 * AC-5.1.6: Criteria versioning (immutable)
 *
 * Key design decisions:
 * - Immutable versioning: Every change creates a new version for audit trail
 * - JSONB criteria array: Flexible storage for multiple criterion rules
 * - Asset type + market targeting: Criteria apply to specific asset categories
 * - Multi-tenant isolation via user_id
 */
export const criteriaVersions = pgTable(
  "criteria_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetType: varchar("asset_type", { length: 50 }).notNull(), // 'stock', 'reit', 'etf'
    targetMarket: varchar("target_market", { length: 50 }).notNull(), // 'BR_BANKS', 'US_TECH'
    name: varchar("name", { length: 100 }).notNull(),
    criteria: jsonb("criteria").notNull().$type<CriterionRule[]>(),
    version: integer("version").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("criteria_versions_user_id_idx").on(table.userId),
    index("criteria_versions_user_asset_type_idx").on(table.userId, table.assetType),
    index("criteria_versions_user_market_idx").on(table.userId, table.targetMarket),
  ]
);

// =============================================================================
// ASSET SCORES TABLE (Epic 5)
// =============================================================================

/**
 * CriterionResult interface - breakdown of a single criterion evaluation
 *
 * Story 5.8: Score Calculation Engine
 * AC-5.8.5: breakdown includes criterionId, criterionName, matched, pointsAwarded, actualValue, skippedReason
 */
export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  matched: boolean;
  pointsAwarded: number;
  actualValue?: string | null;
  skippedReason?: string | null; // 'missing_fundamental', 'data_stale', etc.
}

/**
 * Asset scores table - calculated scores for assets
 *
 * Story 5.8: Score Calculation Engine
 * AC-5.8.5: Score Storage with Audit Trail
 *
 * Key design decisions:
 * - Links to criteria_versions for audit trail
 * - Uses numeric(7,4) for score precision
 * - JSONB breakdown for flexible criterion result storage
 * - Multi-tenant isolation via user_id
 */
export const assetScores = pgTable(
  "asset_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").notNull(), // Reference to portfolio asset or external asset
    symbol: varchar("symbol", { length: 20 }).notNull(),
    criteriaVersionId: uuid("criteria_version_id")
      .notNull()
      .references(() => criteriaVersions.id),
    score: numeric("score", { precision: 7, scale: 4 }).notNull(),
    breakdown: jsonb("breakdown").notNull().$type<CriterionResult[]>(),
    calculatedAt: timestamp("calculated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("asset_scores_user_id_idx").on(table.userId),
    index("asset_scores_asset_id_idx").on(table.assetId),
    index("asset_scores_user_asset_idx").on(table.userId, table.assetId),
    index("asset_scores_calculated_at_idx").on(table.calculatedAt),
  ]
);

// =============================================================================
// SCORE HISTORY TABLE (Epic 5)
// =============================================================================

/**
 * Score history table - immutable historical score records
 *
 * Story 5.9: Store Historical Scores
 * AC-5.9.1: Score History Retention
 * AC-5.9.4: History Append-Only
 * AC-5.9.5: Database Indexing for Performance
 *
 * Key design decisions:
 * - Append-only: Historical scores are never updated or deleted
 * - Indexed: Composite index on (userId, assetId, calculatedAt) for < 300ms queries
 * - Multi-tenant: All queries scoped by userId
 * - Audit trail: Links to criteria_versions for reproducibility
 */
export const scoreHistory = pgTable(
  "score_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    score: numeric("score", { precision: 7, scale: 4 }).notNull(),
    criteriaVersionId: uuid("criteria_version_id")
      .notNull()
      .references(() => criteriaVersions.id),
    calculatedAt: timestamp("calculated_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    // AC-5.9.5: Composite index for efficient trend queries (< 300ms for 90-day query)
    index("score_history_user_asset_date_idx").on(table.userId, table.assetId, table.calculatedAt),
    index("score_history_user_id_idx").on(table.userId),
  ]
);

// =============================================================================
// ASSET FUNDAMENTALS TABLE (Epic 6)
// =============================================================================

/**
 * Asset fundamentals table - external fundamental data for assets
 *
 * Story 6.2: Fetch Asset Fundamentals
 * AC-6.2.1: Fundamentals Include Required Metrics (P/E, P/B, dividend yield, market cap, revenue, earnings)
 * AC-6.2.2: Data Cached with 7-Day TTL
 * AC-6.2.5: Source Attribution Recorded
 *
 * Key design decisions:
 * - Uses numeric types for all financial metrics (no float/double)
 * - Unique constraint on (symbol, data_date) to prevent duplicate daily records
 * - Index on symbol for efficient lookups
 * - Source attribution with fetchedAt timestamp for data freshness tracking
 * - NOT user-scoped: Fundamentals are shared across all users for efficiency
 */
export const assetFundamentals = pgTable(
  "asset_fundamentals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    peRatio: numeric("pe_ratio", { precision: 10, scale: 2 }), // e.g., 15.25
    pbRatio: numeric("pb_ratio", { precision: 10, scale: 2 }), // e.g., 1.85
    dividendYield: numeric("dividend_yield", { precision: 8, scale: 4 }), // e.g., 5.2500%
    marketCap: numeric("market_cap", { precision: 19, scale: 0 }), // e.g., 450000000000
    revenue: numeric("revenue", { precision: 19, scale: 2 }), // e.g., 500000000000.00
    earnings: numeric("earnings", { precision: 19, scale: 2 }), // e.g., 100000000000.00
    sector: varchar("sector", { length: 100 }), // e.g., "Energy"
    industry: varchar("industry", { length: 100 }), // e.g., "Oil & Gas"
    source: varchar("source", { length: 50 }).notNull(), // e.g., "gemini-api"
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
    dataDate: date("data_date").notNull(), // The date the fundamentals represent
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("asset_fundamentals_symbol_date_uniq").on(table.symbol, table.dataDate),
    index("asset_fundamentals_symbol_idx").on(table.symbol),
  ]
);

// =============================================================================
// ASSET PRICES TABLE (Epic 6)
// =============================================================================

/**
 * Asset prices table - external daily price data for assets
 *
 * Story 6.3: Fetch Daily Prices
 * AC-6.3.1: Prices Include OHLCV Data (open, high, low, close, volume)
 * AC-6.3.4: Missing Prices Show Last Known Price with Stale Flag
 *
 * Key design decisions:
 * - Uses numeric(19,4) for OHLCV price values (standard fintech precision)
 * - Uses numeric(19,0) for volume (whole numbers)
 * - Unique constraint on (symbol, price_date) to prevent duplicate daily records
 * - Index on symbol for efficient lookups
 * - Index on fetched_at for freshness queries
 * - Source attribution with fetchedAt timestamp for data freshness tracking
 * - isStale flag for marking stale cached data
 * - NOT user-scoped: Prices are shared across all users for efficiency
 */
export const assetPrices = pgTable(
  "asset_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    open: numeric("open", { precision: 19, scale: 4 }), // Opening price (optional)
    high: numeric("high", { precision: 19, scale: 4 }), // High price (optional)
    low: numeric("low", { precision: 19, scale: 4 }), // Low price (optional)
    close: numeric("close", { precision: 19, scale: 4 }).notNull(), // Closing price (required)
    volume: numeric("volume", { precision: 19, scale: 0 }), // Trading volume (optional)
    currency: varchar("currency", { length: 3 }).notNull(), // e.g., "BRL", "USD"
    source: varchar("source", { length: 50 }).notNull(), // e.g., "gemini-api", "yahoo-finance"
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
    priceDate: date("price_date").notNull(), // The date the prices represent
    isStale: boolean("is_stale").default(false), // AC-6.3.4: Stale flag
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("asset_prices_symbol_date_uniq").on(table.symbol, table.priceDate),
    index("asset_prices_symbol_idx").on(table.symbol),
    index("asset_prices_fetched_at_idx").on(table.fetchedAt),
  ]
);

// =============================================================================
// EXCHANGE RATES TABLE (Epic 6)
// =============================================================================

/**
 * Exchange rates table - external currency exchange rate data
 *
 * Story 6.4: Fetch Exchange Rates
 * AC-6.4.1: Rates Fetched for All Currencies in User Portfolios
 * AC-6.4.2: Rates Are Previous Trading Day Close (T-1)
 * AC-6.4.4: Rate Source and Timestamp Stored with Rate
 * AC-6.4.5: Supported Currencies (USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF)
 *
 * Key design decisions:
 * - Uses numeric(19,8) for exchange rate precision (supports 8 decimal places)
 * - Unique constraint on (base_currency, target_currency, rate_date) to prevent duplicates
 * - Index on (base_currency, target_currency) for efficient lookups
 * - Source attribution with fetchedAt timestamp for data freshness tracking
 * - NOT user-scoped: Exchange rates are shared across all users for efficiency
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(), // e.g., "USD"
    targetCurrency: varchar("target_currency", { length: 3 }).notNull(), // e.g., "BRL"
    rate: numeric("rate", { precision: 19, scale: 8 }).notNull(), // e.g., "5.01234567"
    source: varchar("source", { length: 50 }).notNull(), // e.g., "exchangerate-api", "open-exchange-rates"
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
    rateDate: date("rate_date").notNull(), // The date the rates represent (T-1)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("exchange_rates_currencies_date_uniq").on(
      table.baseCurrency,
      table.targetCurrency,
      table.rateDate
    ),
    index("exchange_rates_currencies_idx").on(table.baseCurrency, table.targetCurrency),
  ]
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
// RECOMMENDATIONS TABLE (Epic 7)
// =============================================================================

/**
 * RecommendationItemBreakdown interface - detailed breakdown for a single recommendation
 *
 * Story 7.4: Generate Investment Recommendations
 * Stores the calculation details for audit and display
 */
export interface RecommendationItemBreakdown {
  classId: string | null;
  className: string | null;
  subclassId: string | null;
  subclassName: string | null;
  currentValue: string; // Asset's current value in base currency
  targetMidpoint: string; // Target allocation midpoint percentage
  priority: string; // Calculated priority (gap × score/100)
  redistributedFrom: string | null; // Amount redistributed from other assets
}

/**
 * Recommendations table - stores recommendation generation sessions
 *
 * Story 7.4: Generate Investment Recommendations
 * AC-7.4.3: Total Recommendations Equal Total Investable
 * AC-7.4.5: Event Sourcing for Audit Trail
 *
 * Key design decisions:
 * - Uses numeric(19,4) for monetary values (fintech precision)
 * - Links to portfolio and user for multi-tenant isolation
 * - Status tracks lifecycle: pending, active, confirmed, expired
 * - correlationId links to calculation events for audit trail
 */
export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    contribution: numeric("contribution", { precision: 19, scale: 4 }).notNull(),
    dividends: numeric("dividends", { precision: 19, scale: 4 }).notNull(),
    totalInvestable: numeric("total_investable", { precision: 19, scale: 4 }).notNull(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    correlationId: uuid("correlation_id").notNull(), // Links to calculation_events
    status: varchar("status", { length: 20 }).notNull().default("active"), // pending, active, confirmed, expired
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(), // 24h TTL per ADR-004
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("recommendations_user_id_idx").on(table.userId),
    index("recommendations_portfolio_id_idx").on(table.portfolioId),
    index("recommendations_correlation_id_idx").on(table.correlationId),
    index("recommendations_status_idx").on(table.status),
  ]
);

// =============================================================================
// RECOMMENDATION ITEMS TABLE (Epic 7)
// =============================================================================

/**
 * Recommendation items table - individual asset recommendations
 *
 * Story 7.4: Generate Investment Recommendations
 * AC-7.4.1: Priority Ranking by Allocation Gap × Score
 * AC-7.4.2: Under-Allocated Classes Favor High Scorers
 * AC-7.4.4: Minimum Allocation Values Enforced
 *
 * Key design decisions:
 * - Uses numeric(19,4) for monetary values (fintech precision)
 * - Uses numeric(7,4) for percentages and scores
 * - JSONB breakdown for flexible calculation detail storage
 * - isOverAllocated flag for zero-buy signal (Story 7.6)
 */
export const recommendationItems = pgTable(
  "recommendation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => portfolioAssets.id),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    score: numeric("score", { precision: 7, scale: 4 }).notNull(), // From scoring engine
    currentAllocation: numeric("current_allocation", { precision: 7, scale: 4 }).notNull(), // Current %
    targetAllocation: numeric("target_allocation", { precision: 7, scale: 4 }).notNull(), // Target midpoint %
    allocationGap: numeric("allocation_gap", { precision: 7, scale: 4 }).notNull(), // target - current
    recommendedAmount: numeric("recommended_amount", { precision: 19, scale: 4 }).notNull(), // $ to invest
    isOverAllocated: boolean("is_over_allocated").notNull().default(false), // AC-7.4.2
    breakdown: jsonb("breakdown").notNull().$type<RecommendationItemBreakdown>(),
    sortOrder: integer("sort_order").notNull(), // Display order by priority
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("recommendation_items_recommendation_id_idx").on(table.recommendationId),
    index("recommendation_items_asset_id_idx").on(table.assetId),
  ]
);

// =============================================================================
// OVERNIGHT JOB RUNS TABLE (Epic 8)
// =============================================================================

/**
 * Overnight job runs table - tracks execution history of overnight jobs
 *
 * Story 8.2: Overnight Scoring Job
 * AC-8.2.5: Graceful Error Handling (job logs errors, counts failures)
 * AC-8.2.6: Performance Target (track metrics for monitoring)
 * AC-8.2.7: OpenTelemetry Observability (metrics stored)
 *
 * Key design decisions:
 * - Tracks job execution for monitoring and debugging
 * - JSONB metrics for flexible timing and count storage
 * - correlationId links to calculation_events for audit trail
 */
export const overnightJobRuns = pgTable(
  "overnight_job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobType: varchar("job_type", { length: 50 }).notNull(), // 'scoring', 'recommendations', 'cache-warm'
    status: varchar("status", { length: 20 }).notNull(), // 'started', 'completed', 'failed', 'partial'
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    usersProcessed: integer("users_processed").default(0),
    usersFailed: integer("users_failed").default(0),
    correlationId: uuid("correlation_id").notNull(),
    errorDetails: jsonb("error_details").$type<{
      errors: Array<{
        userId?: string;
        message: string;
        stage?: string;
      }>;
    }>(),
    metrics: jsonb("metrics").$type<{
      fetchRatesMs?: number;
      processUsersMs?: number;
      totalDurationMs?: number;
      assetsScored?: number;
      usersTotal?: number;
      // Story 8.3: Recommendation metrics
      recommendationsGenerated?: number;
      usersWithRecommendations?: number;
      recommendationDurationMs?: number;
      // Story 8.4: Cache warming metrics
      usersCached?: number;
      cacheFailures?: number;
      cacheWarmMs?: number;
    }>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("overnight_job_runs_correlation_id_idx").on(table.correlationId),
    index("overnight_job_runs_status_idx").on(table.status),
    index("overnight_job_runs_started_at_idx").on(table.startedAt),
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
  criteriaVersions: many(criteriaVersions),
  assetScores: many(assetScores),
  scoreHistory: many(scoreHistory),
  recommendations: many(recommendations),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  assets: many(portfolioAssets),
  investments: many(investments),
  recommendations: many(recommendations),
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

export const criteriaVersionsRelations = relations(criteriaVersions, ({ one, many }) => ({
  user: one(users, {
    fields: [criteriaVersions.userId],
    references: [users.id],
  }),
  assetScores: many(assetScores),
  scoreHistory: many(scoreHistory),
}));

export const assetScoresRelations = relations(assetScores, ({ one }) => ({
  user: one(users, {
    fields: [assetScores.userId],
    references: [users.id],
  }),
  criteriaVersion: one(criteriaVersions, {
    fields: [assetScores.criteriaVersionId],
    references: [criteriaVersions.id],
  }),
}));

export const scoreHistoryRelations = relations(scoreHistory, ({ one }) => ({
  user: one(users, {
    fields: [scoreHistory.userId],
    references: [users.id],
  }),
  criteriaVersion: one(criteriaVersions, {
    fields: [scoreHistory.criteriaVersionId],
    references: [criteriaVersions.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one, many }) => ({
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id],
  }),
  portfolio: one(portfolios, {
    fields: [recommendations.portfolioId],
    references: [portfolios.id],
  }),
  items: many(recommendationItems),
}));

export const recommendationItemsRelations = relations(recommendationItems, ({ one }) => ({
  recommendation: one(recommendations, {
    fields: [recommendationItems.recommendationId],
    references: [recommendations.id],
  }),
  asset: one(portfolioAssets, {
    fields: [recommendationItems.assetId],
    references: [portfolioAssets.id],
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

export type CriteriaVersion = typeof criteriaVersions.$inferSelect;
export type NewCriteriaVersion = typeof criteriaVersions.$inferInsert;

export type AssetScore = typeof assetScores.$inferSelect;
export type NewAssetScore = typeof assetScores.$inferInsert;

export type ScoreHistory = typeof scoreHistory.$inferSelect;
export type NewScoreHistory = typeof scoreHistory.$inferInsert;

export type AssetFundamental = typeof assetFundamentals.$inferSelect;
export type NewAssetFundamental = typeof assetFundamentals.$inferInsert;

export type AssetPrice = typeof assetPrices.$inferSelect;
export type NewAssetPrice = typeof assetPrices.$inferInsert;

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;

export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;

export type RecommendationItem = typeof recommendationItems.$inferSelect;
export type NewRecommendationItem = typeof recommendationItems.$inferInsert;

export type OvernightJobRun = typeof overnightJobRuns.$inferSelect;
export type NewOvernightJobRun = typeof overnightJobRuns.$inferInsert;
