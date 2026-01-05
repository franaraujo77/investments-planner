-- Migration: Add strategic database indexes for alert queries
-- Story 7.13: Alert Query Performance Indexes
--
-- AC-7.13.1: Composite index for user_id + type filtering
-- AC-7.13.2: Partial index excludes dismissed alerts
-- AC-7.13.3: Snoozed alerts filtering index (upgrade to partial)
--
-- Query Pattern Optimization:
-- Most common query: SELECT * FROM alerts WHERE user_id = X AND type = Y AND is_dismissed = false
-- This composite index with partial filter optimizes this exact pattern.
--
-- Performance Target: Alert list queries <50ms for 500+ alerts per user

-- ==============================================================================
-- Story 7.13: AC-7.13.1, AC-7.13.2 - Composite index for user + type filtering
-- ==============================================================================
-- Covers most common alert query pattern with partial index for active alerts only
-- PostgreSQL can use this for:
-- - Queries with just user_id (index prefix)
-- - Queries with user_id + type (full index benefit)
-- Partial index reduces size by excluding dismissed alerts (rarely queried)
CREATE INDEX IF NOT EXISTS "alerts_user_type_idx"
ON "alerts"(user_id, type)
WHERE is_dismissed = false;

-- ==============================================================================
-- Story 7.13: AC-7.13.3 - Upgrade snoozed_until index to partial index
-- ==============================================================================
-- Drop existing non-partial index and replace with partial index
-- Only indexes alerts that are snoozed (reduces index size)
-- Most alerts are NOT snoozed (snoozed_until is NULL)
DROP INDEX IF EXISTS "alerts_snoozed_until_idx";

CREATE INDEX IF NOT EXISTS "alerts_snoozed_until_idx"
ON "alerts"(snoozed_until)
WHERE snoozed_until IS NOT NULL;

-- ==============================================================================
-- Story 7.13: AC-7.13.4 - Dismissed opportunity pairs indexes
-- ==============================================================================
-- NOTE: These indexes already exist in the schema (verified in schema.ts):
-- - dismissed_pairs_user_idx: Index on user_id
-- - dismissed_pairs_unique_idx: Unique index on (user_id, current_asset_id, better_asset_id)
-- Skipping creation as they are already present via previous migrations.
