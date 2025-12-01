import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
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
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  calculationEvents: many(calculationEvents),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const calculationEventsRelations = relations(
  calculationEvents,
  ({ one }) => ({
    user: one(users, {
      fields: [calculationEvents.userId],
      references: [users.id],
    }),
  })
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type CalculationEvent = typeof calculationEvents.$inferSelect;
export type NewCalculationEvent = typeof calculationEvents.$inferInsert;
