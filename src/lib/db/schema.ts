import {
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
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
  locale: varchar("locale", { length: 10 }).notNull().default("en-US"),
  onboardingTipsDismissed: jsonb("onboarding_tips_dismissed").default([]).$type<string[]>(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
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
 * Industry sectors for portfolio classification
 * Story 2.1: Create Portfolio - AC-2.1.2
 */
export const INDUSTRY_SECTORS = [
  "Insurance",
  "Banking",
  "Software",
  "Aerospace & Defense",
  "Energy",
  "Healthcare",
  "Consumer Goods",
  "Real Estate",
  "Technology",
  "Financial Services",
  "Utilities",
  "Other",
] as const;

export type IndustrySector = (typeof INDUSTRY_SECTORS)[number];

/**
 * Asset types for portfolio filtering
 * Story 2.1: Create Portfolio - AC-2.1.3
 */
export const ASSET_TYPES = [
  "Stocks",
  "ETFs",
  "REITs",
  "Bonds",
  "Crypto",
  "Funds",
  "Options",
  "Other",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

/**
 * Supported currencies for portfolios
 * AC-6.4.5 from architecture
 */
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Portfolios table - user investment portfolios
 *
 * Story 2.1: Create Portfolio
 * - Each user can have up to 5 portfolios (MAX_PORTFOLIOS_PER_USER)
 * - Multi-tenant isolation via user_id (AC: 5)
 * - CASCADE delete when user is deleted
 * - AC-2.1.1: portfolio name, base currency, industry sector
 * - AC-2.1.2: industry sector tagging
 */
export const portfolios = pgTable(
  "portfolios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
    industrySector: varchar("industry_sector", { length: 50 }).notNull().default("Other"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("portfolios_user_id_idx").on(table.userId)]
);

/**
 * Portfolio asset types junction table
 *
 * Story 2.1: Create Portfolio - AC-2.1.3
 * - Many-to-many relationship between portfolios and accepted asset types
 * - CASCADE delete when portfolio is deleted
 */
export const portfolioAcceptedAssetTypes = pgTable(
  "portfolio_accepted_asset_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    assetType: varchar("asset_type", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("portfolio_accepted_asset_types_portfolio_id_idx").on(table.portfolioId),
    unique("portfolio_accepted_asset_types_uniq").on(table.portfolioId, table.assetType),
  ]
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
 * Story 4.6: Historical Surplus Scoring
 * AC-5.8.5: breakdown includes criterionId, criterionName, matched, pointsAwarded, actualValue, skippedReason
 * AC-4.6.3: surplusDetails for surplus scoring breakdown
 */

/**
 * Valid reasons for skipping criterion evaluation
 *
 * IMPORTANT: This type is used within CriterionResult interface, which is stored
 * as JSONB in the assetScores.breakdown column (see line ~546). This is NOT a
 * separate database column - it's part of the structured JSON breakdown data.
 *
 * The JSONB storage approach allows flexible criterion result storage without
 * requiring schema migrations when adding new skip reasons.
 *
 * Must match Zod enum in score-schemas.ts for API validation.
 *
 * Values:
 * - missing_fundamental: Required data point not available for evaluation
 * - data_stale: Fundamental data is too old (exceeds freshness threshold)
 * - invalid_value: Data exists but is invalid (e.g., negative P/E ratio)
 * - evaluation_error: Runtime error during criterion evaluation
 */
export type SkippedReason =
  | "missing_fundamental"
  | "data_stale"
  | "invalid_value"
  | "evaluation_error";

export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  matched: boolean;
  pointsAwarded: number;
  actualValue?: string | null;
  skippedReason?: SkippedReason | null;
  // Story 4.6: Surplus scoring details for breakdown display
  surplusDetails?: {
    yearsOfData: number;
    consecutiveYears: number;
    bonusApplied: number;
    penaltyApplied: number;
  } | null;
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
 * RecommendationAlerts interface - higher-scoring asset alerts
 *
 * Story 6.2 AC-6.2.3: Higher-Scoring Asset Alert
 * When portfolio is at capacity for an asset class but higher-scoring
 * assets exist outside the portfolio, an alert is generated.
 */
export interface RecommendationAlerts {
  higherScoring: Array<{
    assetClassId: string;
    assetClassName: string;
    currentLowestScore: string;
    currentLowestSymbol: string;
    higherScoringAssets: Array<{
      symbol: string;
      name: string;
      score: string;
      scoreDifference: string;
    }>;
  }>;
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
    alerts: jsonb("alerts").$type<RecommendationAlerts>(), // Higher-scoring asset alerts (AC-6.2.3)
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

export const usersRelations = relations(users, ({ many, one }) => ({
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
  alerts: many(alerts),
  alertPreferences: one(alertPreferences),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  assets: many(portfolioAssets),
  investments: many(investments),
  recommendations: many(recommendations),
  acceptedAssetTypes: many(portfolioAcceptedAssetTypes),
}));

export const portfolioAcceptedAssetTypesRelations = relations(
  portfolioAcceptedAssetTypes,
  ({ one }) => ({
    portfolio: one(portfolios, {
      fields: [portfolioAcceptedAssetTypes.portfolioId],
      references: [portfolios.id],
    }),
  })
);

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

export type PortfolioAcceptedAssetType = typeof portfolioAcceptedAssetTypes.$inferSelect;
export type NewPortfolioAcceptedAssetType = typeof portfolioAcceptedAssetTypes.$inferInsert;

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

// =============================================================================
// ALERT METADATA INTERFACES (Epic 9)
// =============================================================================

/**
 * OpportunityAlertMetadata - metadata for opportunity alerts
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.1: Alert metadata includes all required fields for asset comparison
 * AC-9.1.3: Contains assetIds for deep linking to score breakdowns
 */
export interface OpportunityAlertMetadata {
  currentAssetId: string;
  currentAssetSymbol: string;
  currentScore: string;
  betterAssetId: string;
  betterAssetSymbol: string;
  betterScore: string;
  scoreDifference: string;
  assetClassId: string;
  assetClassName: string;
}

/**
 * DriftAlertMetadata - metadata for allocation drift alerts
 *
 * Story 9.2: Allocation Drift Alert (future story)
 */
export interface DriftAlertMetadata {
  assetClassId: string;
  assetClassName: string;
  currentAllocation: string;
  targetMin: string;
  targetMax: string;
  driftAmount: string;
  direction: "over" | "under";
}

/**
 * AlertMetadata union type - all possible alert metadata types
 */
export type AlertMetadata = OpportunityAlertMetadata | DriftAlertMetadata | Record<string, unknown>;

// =============================================================================
// ALERTS TABLE (Epic 9)
// =============================================================================

/**
 * Alerts table - user notifications for portfolio events
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * Story 9.2: Allocation Drift Alert
 *
 * Key design decisions:
 * - JSONB metadata for flexible alert-specific data
 * - Soft delete via is_dismissed flag
 * - expires_at for time-sensitive alerts
 * - Multi-tenant isolation via user_id
 *
 * AC-9.1.1: Alert triggered when better asset exists
 * AC-9.1.2: Alert includes both asset details
 * AC-9.1.4: Deduplication via unique constraint check in service layer
 * AC-9.1.5: Auto-clear via isDismissed flag
 */
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // 'opportunity', 'allocation_drift', 'system'
    title: varchar("title", { length: 200 }).notNull(),
    message: varchar("message", { length: 2000 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("info"), // 'info', 'warning', 'critical'
    metadata: jsonb("metadata").notNull().$type<AlertMetadata>(),
    isRead: boolean("is_read").notNull().default(false),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    // Story 7.6: AC-7.6.5 - Snooze functionality
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at"),
    readAt: timestamp("read_at"),
    dismissedAt: timestamp("dismissed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("alerts_user_id_idx").on(table.userId),
    index("alerts_type_idx").on(table.type),
    index("alerts_created_at_idx").on(table.createdAt),
    // Story 7.6: AC-7.6.5 - Index for snooze queries
    index("alerts_snoozed_until_idx").on(table.snoozedUntil),
    // GIN index for JSONB metadata queries added via migration 0014
    // (drizzle-orm doesn't directly support GIN indexes, added via raw SQL)
  ]
);

// =============================================================================
// ALERT PREFERENCES TABLE (Epic 9)
// =============================================================================

/**
 * Alert preferences table - user notification settings
 *
 * Story 9.3: Alert Preferences
 * Story 9.1: AC-9.1.6 - Alert respects user preferences (opportunityAlertsEnabled)
 *
 * Key design decisions:
 * - One record per user (unique constraint on userId)
 * - Default preferences created when first accessed
 * - All alert types enabled by default
 */
export const alertPreferences = pgTable(
  "alert_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    opportunityAlertsEnabled: boolean("opportunity_alerts_enabled").notNull().default(true),
    driftAlertsEnabled: boolean("drift_alerts_enabled").notNull().default(true),
    // Story 7.6: AC-7.6.3 - Data freshness warnings toggle
    dataFreshnessWarningsEnabled: boolean("data_freshness_warnings_enabled")
      .notNull()
      .default(true),
    driftThreshold: numeric("drift_threshold", { precision: 5, scale: 2 })
      .notNull()
      .default("5.00"),
    alertFrequency: varchar("alert_frequency", { length: 20 }).notNull().default("daily"), // 'realtime', 'daily', 'weekly'
    emailNotifications: boolean("email_notifications").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("alert_preferences_user_id_idx").on(table.userId)]
);

// =============================================================================
// ALERT RELATIONS
// =============================================================================

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
}));

export const alertPreferencesRelations = relations(alertPreferences, ({ one }) => ({
  user: one(users, {
    fields: [alertPreferences.userId],
    references: [users.id],
  }),
}));

// =============================================================================
// ALERT TYPE EXPORTS
// =============================================================================

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

export type AlertPreference = typeof alertPreferences.$inferSelect;
export type NewAlertPreference = typeof alertPreferences.$inferInsert;

// =============================================================================
// DISMISSED OPPORTUNITY PAIRS (Story 7.6)
// =============================================================================

/**
 * Dismissed Opportunity Pairs Table
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.6: Dismissal Memory - prevents re-alerting for dismissed opportunities
 *
 * Key design:
 * - Tracks dismissed current/better asset pairs per user
 * - Stores score difference at dismissal time
 * - Re-alerts only if score difference increases by >10 points
 * - Pairs older than 90 days are eligible for cleanup
 */
export const dismissedOpportunityPairs = pgTable(
  "dismissed_opportunity_pairs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentAssetId: uuid("current_asset_id").notNull(),
    betterAssetId: uuid("better_asset_id").notNull(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }).defaultNow().notNull(),
    lastScoreDifference: numeric("last_score_difference", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("dismissed_pairs_user_idx").on(table.userId),
    uniqueIndex("dismissed_pairs_unique_idx").on(
      table.userId,
      table.currentAssetId,
      table.betterAssetId
    ),
  ]
);

export const dismissedOpportunityPairsRelations = relations(
  dismissedOpportunityPairs,
  ({ one }) => ({
    user: one(users, {
      fields: [dismissedOpportunityPairs.userId],
      references: [users.id],
    }),
  })
);

export type DismissedOpportunityPair = typeof dismissedOpportunityPairs.$inferSelect;
export type NewDismissedOpportunityPair = typeof dismissedOpportunityPairs.$inferInsert;

// =============================================================================
// GICS REFERENCE DATA (Story 5.7)
// =============================================================================

/**
 * GICS Sector interface - 2-digit sector codes
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS three-tier hierarchy (Sector → Industry Group → Industry)
 */
export interface GicsSector {
  id: string; // 2-digit code (e.g., "45")
  name: string; // e.g., "Information Technology"
  description?: string;
}

/**
 * GICS Industry Group interface - 4-digit codes
 */
export interface GicsIndustryGroup {
  id: string; // 4-digit code (e.g., "4510")
  sectorId: string; // Parent sector ID
  name: string; // e.g., "Software & Services"
  description?: string;
}

/**
 * GICS Industry interface - 6-digit codes
 */
export interface GicsIndustry {
  id: string; // 6-digit code (e.g., "451030")
  industryGroupId: string; // Parent industry group ID
  name: string; // e.g., "Software"
  description?: string;
}

/**
 * All 11 GICS Sectors
 * AC-5.7.1: All 11 GICS Sectors defined
 */
export const GICS_SECTORS: GicsSector[] = [
  {
    id: "10",
    name: "Energy",
    description: "Companies involved in the exploration, production, and refining of oil and gas",
  },
  {
    id: "15",
    name: "Materials",
    description:
      "Companies that manufacture chemicals, construction materials, glass, paper, and related products",
  },
  {
    id: "20",
    name: "Industrials",
    description: "Companies that provide industrial goods and services",
  },
  {
    id: "25",
    name: "Consumer Discretionary",
    description: "Companies that provide goods and services considered non-essential",
  },
  {
    id: "30",
    name: "Consumer Staples",
    description:
      "Companies that provide essential products like food, beverages, and household items",
  },
  {
    id: "35",
    name: "Health Care",
    description: "Companies that provide medical services, manufacture medical equipment or drugs",
  },
  { id: "40", name: "Financials", description: "Companies that provide financial services" },
  {
    id: "45",
    name: "Information Technology",
    description: "Companies that provide technology products and services",
  },
  {
    id: "50",
    name: "Communication Services",
    description:
      "Companies that facilitate communication and offer related content and information",
  },
  { id: "55", name: "Utilities", description: "Companies that provide utility services" },
  {
    id: "60",
    name: "Real Estate",
    description: "Companies that own, develop, and manage real estate",
  },
];

/**
 * All 25 GICS Industry Groups
 * AC-5.7.1: All 25 Industry Groups defined
 */
export const GICS_INDUSTRY_GROUPS: GicsIndustryGroup[] = [
  // Energy (10)
  { id: "1010", sectorId: "10", name: "Energy" },
  // Materials (15)
  { id: "1510", sectorId: "15", name: "Materials" },
  // Industrials (20)
  { id: "2010", sectorId: "20", name: "Capital Goods" },
  { id: "2020", sectorId: "20", name: "Commercial & Professional Services" },
  { id: "2030", sectorId: "20", name: "Transportation" },
  // Consumer Discretionary (25)
  { id: "2510", sectorId: "25", name: "Automobiles & Components" },
  { id: "2520", sectorId: "25", name: "Consumer Durables & Apparel" },
  { id: "2530", sectorId: "25", name: "Consumer Services" },
  { id: "2550", sectorId: "25", name: "Consumer Discretionary Distribution & Retail" },
  // Consumer Staples (30)
  { id: "3010", sectorId: "30", name: "Consumer Staples Distribution & Retail" },
  { id: "3020", sectorId: "30", name: "Food, Beverage & Tobacco" },
  { id: "3030", sectorId: "30", name: "Household & Personal Products" },
  // Health Care (35)
  { id: "3510", sectorId: "35", name: "Health Care Equipment & Services" },
  { id: "3520", sectorId: "35", name: "Pharmaceuticals, Biotechnology & Life Sciences" },
  // Financials (40)
  { id: "4010", sectorId: "40", name: "Banks" },
  { id: "4020", sectorId: "40", name: "Financial Services" },
  { id: "4030", sectorId: "40", name: "Insurance" },
  // Information Technology (45)
  { id: "4510", sectorId: "45", name: "Software & Services" },
  { id: "4520", sectorId: "45", name: "Technology Hardware & Equipment" },
  { id: "4530", sectorId: "45", name: "Semiconductors & Semiconductor Equipment" },
  // Communication Services (50)
  { id: "5010", sectorId: "50", name: "Telecommunication Services" },
  { id: "5020", sectorId: "50", name: "Media & Entertainment" },
  // Utilities (55)
  { id: "5510", sectorId: "55", name: "Utilities" },
  // Real Estate (60)
  { id: "6010", sectorId: "60", name: "Equity Real Estate Investment Trusts (REITs)" },
  { id: "6020", sectorId: "60", name: "Real Estate Management & Development" },
];

/**
 * All 74 GICS Industries
 * AC-5.7.1: All 74 Industries defined
 */
export const GICS_INDUSTRIES: GicsIndustry[] = [
  // Energy (1010)
  { id: "101010", industryGroupId: "1010", name: "Energy Equipment & Services" },
  { id: "101020", industryGroupId: "1010", name: "Oil, Gas & Consumable Fuels" },
  // Materials (1510)
  { id: "151010", industryGroupId: "1510", name: "Chemicals" },
  { id: "151020", industryGroupId: "1510", name: "Construction Materials" },
  { id: "151030", industryGroupId: "1510", name: "Containers & Packaging" },
  { id: "151040", industryGroupId: "1510", name: "Metals & Mining" },
  { id: "151050", industryGroupId: "1510", name: "Paper & Forest Products" },
  // Capital Goods (2010)
  { id: "201010", industryGroupId: "2010", name: "Aerospace & Defense" },
  { id: "201020", industryGroupId: "2010", name: "Building Products" },
  { id: "201030", industryGroupId: "2010", name: "Construction & Engineering" },
  { id: "201040", industryGroupId: "2010", name: "Electrical Equipment" },
  { id: "201050", industryGroupId: "2010", name: "Industrial Conglomerates" },
  { id: "201060", industryGroupId: "2010", name: "Machinery" },
  { id: "201070", industryGroupId: "2010", name: "Trading Companies & Distributors" },
  // Commercial & Professional Services (2020)
  { id: "202010", industryGroupId: "2020", name: "Commercial Services & Supplies" },
  { id: "202020", industryGroupId: "2020", name: "Professional Services" },
  // Transportation (2030)
  { id: "203010", industryGroupId: "2030", name: "Air Freight & Logistics" },
  { id: "203020", industryGroupId: "2030", name: "Passenger Airlines" },
  { id: "203030", industryGroupId: "2030", name: "Marine Transportation" },
  { id: "203040", industryGroupId: "2030", name: "Ground Transportation" },
  { id: "203050", industryGroupId: "2030", name: "Transportation Infrastructure" },
  // Automobiles & Components (2510)
  { id: "251010", industryGroupId: "2510", name: "Automobile Components" },
  { id: "251020", industryGroupId: "2510", name: "Automobiles" },
  // Consumer Durables & Apparel (2520)
  { id: "252010", industryGroupId: "2520", name: "Household Durables" },
  { id: "252020", industryGroupId: "2520", name: "Leisure Products" },
  { id: "252030", industryGroupId: "2520", name: "Textiles, Apparel & Luxury Goods" },
  // Consumer Services (2530)
  { id: "253010", industryGroupId: "2530", name: "Hotels, Restaurants & Leisure" },
  { id: "253020", industryGroupId: "2530", name: "Diversified Consumer Services" },
  // Consumer Discretionary Distribution & Retail (2550)
  { id: "255010", industryGroupId: "2550", name: "Distributors" },
  { id: "255020", industryGroupId: "2550", name: "Internet & Direct Marketing Retail" },
  { id: "255030", industryGroupId: "2550", name: "Broadline Retail" },
  { id: "255040", industryGroupId: "2550", name: "Specialty Retail" },
  // Consumer Staples Distribution & Retail (3010)
  { id: "301010", industryGroupId: "3010", name: "Consumer Staples Distribution & Retail" },
  // Food, Beverage & Tobacco (3020)
  { id: "302010", industryGroupId: "3020", name: "Beverages" },
  { id: "302020", industryGroupId: "3020", name: "Food Products" },
  { id: "302030", industryGroupId: "3020", name: "Tobacco" },
  // Household & Personal Products (3030)
  { id: "303010", industryGroupId: "3030", name: "Household Products" },
  { id: "303020", industryGroupId: "3030", name: "Personal Care Products" },
  // Health Care Equipment & Services (3510)
  { id: "351010", industryGroupId: "3510", name: "Health Care Equipment & Supplies" },
  { id: "351020", industryGroupId: "3510", name: "Health Care Providers & Services" },
  { id: "351030", industryGroupId: "3510", name: "Health Care Technology" },
  // Pharmaceuticals, Biotechnology & Life Sciences (3520)
  { id: "352010", industryGroupId: "3520", name: "Biotechnology" },
  { id: "352020", industryGroupId: "3520", name: "Pharmaceuticals" },
  { id: "352030", industryGroupId: "3520", name: "Life Sciences Tools & Services" },
  // Banks (4010)
  { id: "401010", industryGroupId: "4010", name: "Banks" },
  // Financial Services (4020)
  { id: "402010", industryGroupId: "4020", name: "Financial Services" },
  { id: "402020", industryGroupId: "4020", name: "Consumer Finance" },
  { id: "402030", industryGroupId: "4020", name: "Capital Markets" },
  { id: "402040", industryGroupId: "4020", name: "Mortgage Real Estate Investment Trusts (REITs)" },
  // Insurance (4030)
  { id: "403010", industryGroupId: "4030", name: "Insurance" },
  // Software & Services (4510)
  { id: "451010", industryGroupId: "4510", name: "IT Services" },
  { id: "451020", industryGroupId: "4510", name: "Internet Services & Infrastructure" },
  { id: "451030", industryGroupId: "4510", name: "Software" },
  // Technology Hardware & Equipment (4520)
  { id: "452010", industryGroupId: "4520", name: "Communications Equipment" },
  { id: "452020", industryGroupId: "4520", name: "Technology Hardware, Storage & Peripherals" },
  { id: "452030", industryGroupId: "4520", name: "Electronic Equipment, Instruments & Components" },
  // Semiconductors & Semiconductor Equipment (4530)
  { id: "453010", industryGroupId: "4530", name: "Semiconductors & Semiconductor Equipment" },
  // Telecommunication Services (5010)
  { id: "501010", industryGroupId: "5010", name: "Diversified Telecommunication Services" },
  { id: "501020", industryGroupId: "5010", name: "Wireless Telecommunication Services" },
  // Media & Entertainment (5020)
  { id: "502010", industryGroupId: "5020", name: "Media" },
  { id: "502020", industryGroupId: "5020", name: "Entertainment" },
  { id: "502030", industryGroupId: "5020", name: "Interactive Media & Services" },
  // Utilities (5510)
  { id: "551010", industryGroupId: "5510", name: "Electric Utilities" },
  { id: "551020", industryGroupId: "5510", name: "Gas Utilities" },
  { id: "551030", industryGroupId: "5510", name: "Multi-Utilities" },
  { id: "551040", industryGroupId: "5510", name: "Water Utilities" },
  {
    id: "551050",
    industryGroupId: "5510",
    name: "Independent Power and Renewable Electricity Producers",
  },
  // Equity Real Estate Investment Trusts (REITs) (6010)
  { id: "601010", industryGroupId: "6010", name: "Diversified REITs" },
  { id: "601025", industryGroupId: "6010", name: "Industrial REITs" },
  { id: "601030", industryGroupId: "6010", name: "Hotel & Resort REITs" },
  { id: "601040", industryGroupId: "6010", name: "Office REITs" },
  { id: "601050", industryGroupId: "6010", name: "Health Care REITs" },
  { id: "601060", industryGroupId: "6010", name: "Residential REITs" },
  { id: "601070", industryGroupId: "6010", name: "Retail REITs" },
  { id: "601080", industryGroupId: "6010", name: "Specialized REITs" },
  // Real Estate Management & Development (6020)
  { id: "602010", industryGroupId: "6020", name: "Real Estate Management & Development" },
];

// =============================================================================
// CACHED GICS TABLES (Story 5.7)
// =============================================================================

/**
 * Cached GICS Sectors table - stores GICS sector reference data
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS three-tier hierarchy - Sector level (2-digit)
 * AC-5.7.8: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - Uses char(2) for sector ID per GICS standard
 * - cache_updated_at tracks last refresh
 * - NOT user-scoped: Reference data shared across all users
 */
export const cachedGicsSectors = pgTable(
  "cached_gics_sectors",
  {
    id: char("id", { length: 2 }).primaryKey(), // e.g., "45"
    name: varchar("name", { length: 100 }).notNull(), // e.g., "Information Technology"
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [index("cached_gics_sectors_name_idx").on(table.name)]
);

/**
 * Cached GICS Industry Groups table - stores GICS industry group reference data
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS three-tier hierarchy - Industry Group level (4-digit)
 * AC-5.7.8: Cache table naming convention with cached_ prefix
 */
export const cachedGicsIndustryGroups = pgTable(
  "cached_gics_industry_groups",
  {
    id: char("id", { length: 4 }).primaryKey(), // e.g., "4510"
    sectorId: char("sector_id", { length: 2 })
      .notNull()
      .references(() => cachedGicsSectors.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(), // e.g., "Software & Services"
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_gics_industry_groups_sector_id_idx").on(table.sectorId),
    index("cached_gics_industry_groups_name_idx").on(table.name),
  ]
);

/**
 * Cached GICS Industries table - stores GICS industry reference data
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.1: GICS three-tier hierarchy - Industry level (6-digit)
 * AC-5.7.8: Cache table naming convention with cached_ prefix
 */
export const cachedGicsIndustries = pgTable(
  "cached_gics_industries",
  {
    id: char("id", { length: 6 }).primaryKey(), // e.g., "451030"
    industryGroupId: char("industry_group_id", { length: 4 })
      .notNull()
      .references(() => cachedGicsIndustryGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(), // e.g., "Software"
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_gics_industries_industry_group_id_idx").on(table.industryGroupId),
    index("cached_gics_industries_name_idx").on(table.name),
  ]
);

/**
 * Cached Asset Classifications table - maps assets to GICS industries
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.4: Asset-to-Classification Mapping
 * AC-5.7.8: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - Uses symbol as primary key (unique per asset)
 * - References industry (6-digit) which links up the hierarchy
 * - confidence score indicates mapping quality (1.0 = exact, 0.8 = fuzzy, 0.5 = sector-only)
 * - source tracks where classification came from
 */
export const cachedAssetClassifications = pgTable(
  "cached_asset_classifications",
  {
    symbol: varchar("symbol", { length: 20 }).primaryKey(), // e.g., "AAPL", "PETR4"
    gicsIndustryId: char("gics_industry_id", { length: 6 })
      .notNull()
      .references(() => cachedGicsIndustries.id),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(), // 0.00 to 1.00
    source: varchar("source", { length: 50 }).notNull(), // "gemini-api", "manual", "b3-mapping"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_asset_classifications_gics_industry_id_idx").on(table.gicsIndustryId),
    index("cached_asset_classifications_source_idx").on(table.source),
  ]
);

// =============================================================================
// GICS RELATIONS
// =============================================================================

export const cachedGicsSectorsRelations = relations(cachedGicsSectors, ({ many }) => ({
  industryGroups: many(cachedGicsIndustryGroups),
}));

export const cachedGicsIndustryGroupsRelations = relations(
  cachedGicsIndustryGroups,
  ({ one, many }) => ({
    sector: one(cachedGicsSectors, {
      fields: [cachedGicsIndustryGroups.sectorId],
      references: [cachedGicsSectors.id],
    }),
    industries: many(cachedGicsIndustries),
  })
);

export const cachedGicsIndustriesRelations = relations(cachedGicsIndustries, ({ one, many }) => ({
  industryGroup: one(cachedGicsIndustryGroups, {
    fields: [cachedGicsIndustries.industryGroupId],
    references: [cachedGicsIndustryGroups.id],
  }),
  assetClassifications: many(cachedAssetClassifications),
}));

export const cachedAssetClassificationsRelations = relations(
  cachedAssetClassifications,
  ({ one }) => ({
    industry: one(cachedGicsIndustries, {
      fields: [cachedAssetClassifications.gicsIndustryId],
      references: [cachedGicsIndustries.id],
    }),
  })
);

// =============================================================================
// GICS TYPE EXPORTS
// =============================================================================

export type CachedGicsSector = typeof cachedGicsSectors.$inferSelect;
export type NewCachedGicsSector = typeof cachedGicsSectors.$inferInsert;

export type CachedGicsIndustryGroup = typeof cachedGicsIndustryGroups.$inferSelect;
export type NewCachedGicsIndustryGroup = typeof cachedGicsIndustryGroups.$inferInsert;

export type CachedGicsIndustry = typeof cachedGicsIndustries.$inferSelect;
export type NewCachedGicsIndustry = typeof cachedGicsIndustries.$inferInsert;

export type CachedAssetClassification = typeof cachedAssetClassifications.$inferSelect;
export type NewCachedAssetClassification = typeof cachedAssetClassifications.$inferInsert;

// =============================================================================
// ASSET TYPE CLASSIFICATION SYSTEM (Story 5.8)
// =============================================================================

/**
 * Asset category enum for classification
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.1: Categories group canonical asset types
 */
export const ASSET_CATEGORIES = [
  "EQUITY",
  "FIXED_INCOME",
  "FUND",
  "COMMODITY",
  "DERIVATIVE",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/**
 * Canonical asset types - jurisdiction-agnostic instrument classifications
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.1: Universal asset types that work across all markets
 */
export const CANONICAL_ASSET_TYPES = [
  // EQUITY
  "COMMON_STOCK",
  "PREFERRED_STOCK",
  "DEPOSITARY_RECEIPT",
  // FUND
  "ETF",
  "REIT",
  "FIXED_INCOME_FUND",
  "MONEY_MARKET_FUND",
  "COMMODITY_ETF",
  // FIXED_INCOME
  "CORPORATE_BOND",
  "GOVERNMENT_BOND",
  "MUNICIPAL_BOND",
  // DERIVATIVE
  "OPTION",
  "FUTURE",
  "WARRANT",
] as const;

export type CanonicalAssetType = (typeof CANONICAL_ASSET_TYPES)[number];

/**
 * Cached Asset Types table - canonical (universal) asset type definitions
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.1: Canonical Asset Type Schema
 * AC-5.8.9: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - Uses varchar for ID (allows descriptive codes like "COMMON_STOCK")
 * - cache_updated_at tracks last refresh
 * - NOT user-scoped: Reference data shared across all users
 */
export const cachedAssetTypes = pgTable(
  "cached_asset_types",
  {
    id: varchar("id", { length: 30 }).primaryKey(), // e.g., "COMMON_STOCK"
    name: varchar("name", { length: 100 }).notNull(), // e.g., "Common Stock"
    category: varchar("category", { length: 20 }).notNull(), // e.g., "EQUITY"
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_asset_types_category_idx").on(table.category),
    index("cached_asset_types_name_idx").on(table.name),
  ]
);

/**
 * Cached Jurisdictions table - regulatory jurisdiction registry
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.2: Localization Overlay Table (jurisdiction is a key component)
 * AC-5.8.8: Extensible Jurisdiction Support
 * AC-5.8.9: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - Uses format "COUNTRY-REGULATOR" (e.g., "US-SEC", "BR-CVM")
 * - Designed for extensibility (EU-MiFID, UK-FCA, etc.)
 * - NOT user-scoped: Reference data shared across all users
 */
export const cachedJurisdictions = pgTable(
  "cached_jurisdictions",
  {
    code: varchar("code", { length: 10 }).primaryKey(), // e.g., "US-SEC", "BR-CVM"
    name: varchar("name", { length: 100 }).notNull(), // e.g., "United States"
    countryIso: varchar("country_iso", { length: 2 }).notNull(), // e.g., "US", "BR"
    regulatoryBody: varchar("regulatory_body", { length: 50 }).notNull(), // e.g., "SEC", "CVM"
    currencyDefault: varchar("currency_default", { length: 3 }).notNull(), // e.g., "USD", "BRL"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_jurisdictions_country_idx").on(table.countryIso),
    index("cached_jurisdictions_name_idx").on(table.name),
  ]
);

/**
 * Cached Asset Type Localizations table - maps canonical types to local nomenclature
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.2: Localization Overlay Table
 * AC-5.8.9: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - Composite primary key (canonical_type_id, jurisdiction_code)
 * - Stores local names, codes, and regulatory references
 * - Enables jurisdiction-specific display while maintaining universal underlying model
 */
export const cachedAssetTypeLocalizations = pgTable(
  "cached_asset_type_localizations",
  {
    canonicalTypeId: varchar("canonical_type_id", { length: 30 })
      .notNull()
      .references(() => cachedAssetTypes.id, { onDelete: "cascade" }),
    jurisdictionCode: varchar("jurisdiction_code", { length: 10 })
      .notNull()
      .references(() => cachedJurisdictions.code, { onDelete: "cascade" }),
    localName: varchar("local_name", { length: 100 }).notNull(), // e.g., "Ação Ordinária"
    localCode: varchar("local_code", { length: 10 }).notNull(), // e.g., "ON"
    regulatoryReference: varchar("regulatory_reference", { length: 100 }), // e.g., "Lei 6.404"
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite primary key
    unique("cached_asset_type_localizations_pk").on(table.canonicalTypeId, table.jurisdictionCode),
    index("cached_asset_type_localizations_type_idx").on(table.canonicalTypeId),
    index("cached_asset_type_localizations_jurisdiction_idx").on(table.jurisdictionCode),
  ]
);

/**
 * Cached Asset Identifiers table - maps symbols to asset types with ISIN
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.3: ISIN as Universal Key
 * AC-5.8.4: Asset-to-Type Mapping with Jurisdiction
 * AC-5.8.9: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - Symbol as primary key (one entry per symbol)
 * - ISIN stored for cross-market linking (ISO 6166 format)
 * - Confidence score indicates mapping quality
 * - NOT user-scoped: Shared classification cache
 */
export const cachedAssetIdentifiers = pgTable(
  "cached_asset_identifiers",
  {
    symbol: varchar("symbol", { length: 20 }).primaryKey(), // e.g., "AAPL", "PETR4.SA"
    isin: varchar("isin", { length: 12 }), // ISO 6166: exactly 12 chars
    canonicalTypeId: varchar("canonical_type_id", { length: 30 })
      .notNull()
      .references(() => cachedAssetTypes.id),
    jurisdictionCode: varchar("jurisdiction_code", { length: 10 })
      .notNull()
      .references(() => cachedJurisdictions.code),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(), // 0.00 to 1.00
    source: varchar("source", { length: 50 }).notNull(), // e.g., "gemini-api", "manual"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_asset_identifiers_isin_idx").on(table.isin),
    index("cached_asset_identifiers_type_idx").on(table.canonicalTypeId),
    index("cached_asset_identifiers_jurisdiction_idx").on(table.jurisdictionCode),
    index("cached_asset_identifiers_source_idx").on(table.source),
  ]
);

/**
 * Cached Asset Aliases table - links assets across markets via ISIN
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.3: ISIN as Universal Key
 * AC-5.8.5: Multi-Jurisdiction Asset Linking
 * AC-5.8.9: Cache table naming convention with cached_ prefix
 *
 * Key design decisions:
 * - One record per symbol-jurisdiction combination
 * - ISIN links multiple symbols as equivalent instruments
 * - is_primary marks the "home market" listing
 * - Enables queries like "find all symbols for ISIN BRPETRACNOR9"
 */
export const cachedAssetAliases = pgTable(
  "cached_asset_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isin: varchar("isin", { length: 12 }).notNull(), // ISO 6166 ISIN
    symbol: varchar("symbol", { length: 20 }).notNull(), // e.g., "PETR4.SA", "PBR"
    jurisdictionCode: varchar("jurisdiction_code", { length: 10 })
      .notNull()
      .references(() => cachedJurisdictions.code),
    isPrimary: boolean("is_primary").notNull().default(false), // True for home market
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cached_asset_aliases_isin_idx").on(table.isin),
    index("cached_asset_aliases_symbol_idx").on(table.symbol),
    unique("cached_asset_aliases_symbol_jurisdiction_uniq").on(
      table.symbol,
      table.jurisdictionCode
    ),
  ]
);

// =============================================================================
// ASSET TYPE RELATIONS (Story 5.8)
// =============================================================================

export const cachedAssetTypesRelations = relations(cachedAssetTypes, ({ many }) => ({
  localizations: many(cachedAssetTypeLocalizations),
  assetIdentifiers: many(cachedAssetIdentifiers),
}));

export const cachedJurisdictionsRelations = relations(cachedJurisdictions, ({ many }) => ({
  localizations: many(cachedAssetTypeLocalizations),
  assetIdentifiers: many(cachedAssetIdentifiers),
  assetAliases: many(cachedAssetAliases),
}));

export const cachedAssetTypeLocalizationsRelations = relations(
  cachedAssetTypeLocalizations,
  ({ one }) => ({
    assetType: one(cachedAssetTypes, {
      fields: [cachedAssetTypeLocalizations.canonicalTypeId],
      references: [cachedAssetTypes.id],
    }),
    jurisdiction: one(cachedJurisdictions, {
      fields: [cachedAssetTypeLocalizations.jurisdictionCode],
      references: [cachedJurisdictions.code],
    }),
  })
);

export const cachedAssetIdentifiersRelations = relations(cachedAssetIdentifiers, ({ one }) => ({
  assetType: one(cachedAssetTypes, {
    fields: [cachedAssetIdentifiers.canonicalTypeId],
    references: [cachedAssetTypes.id],
  }),
  jurisdiction: one(cachedJurisdictions, {
    fields: [cachedAssetIdentifiers.jurisdictionCode],
    references: [cachedJurisdictions.code],
  }),
}));

export const cachedAssetAliasesRelations = relations(cachedAssetAliases, ({ one }) => ({
  jurisdiction: one(cachedJurisdictions, {
    fields: [cachedAssetAliases.jurisdictionCode],
    references: [cachedJurisdictions.code],
  }),
}));

// =============================================================================
// ASSET TYPE TYPE EXPORTS (Story 5.8)
// =============================================================================

export type CachedAssetType = typeof cachedAssetTypes.$inferSelect;
export type NewCachedAssetType = typeof cachedAssetTypes.$inferInsert;

export type CachedJurisdiction = typeof cachedJurisdictions.$inferSelect;
export type NewCachedJurisdiction = typeof cachedJurisdictions.$inferInsert;

export type CachedAssetTypeLocalization = typeof cachedAssetTypeLocalizations.$inferSelect;
export type NewCachedAssetTypeLocalization = typeof cachedAssetTypeLocalizations.$inferInsert;

export type CachedAssetIdentifier = typeof cachedAssetIdentifiers.$inferSelect;
export type NewCachedAssetIdentifier = typeof cachedAssetIdentifiers.$inferInsert;

export type CachedAssetAlias = typeof cachedAssetAliases.$inferSelect;
export type NewCachedAssetAlias = typeof cachedAssetAliases.$inferInsert;
