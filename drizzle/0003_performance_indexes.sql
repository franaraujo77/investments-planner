-- Performance Indexes Migration
-- Epic 3 Retrospective Action Item: Add missing indexes for common query patterns
-- Created: 2025-12-04

-- =============================================================================
-- USER TABLE INDEXES
-- =============================================================================

-- Composite index for email + deleted_at queries (login, user lookup)
-- Used in: auth queries that filter by email AND check deleted_at IS NULL
CREATE INDEX IF NOT EXISTS "users_email_deleted_idx" ON "users" ("email", "deleted_at");

-- Index for email verification status checks
-- Used in: authentication flows that check if user email is verified
CREATE INDEX IF NOT EXISTS "users_email_verified_at_idx" ON "users" ("email_verified_at");

-- Index for soft delete queries
-- Used in: queries filtering out deleted users
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" ("deleted_at");

-- =============================================================================
-- VERIFICATION TOKENS INDEXES
-- =============================================================================

-- Composite index for token expiry + used status
-- Used in: verification flow checking valid (non-expired, non-used) tokens
CREATE INDEX IF NOT EXISTS "verification_tokens_expiry_idx" ON "verification_tokens" ("expires_at", "used_at");

-- =============================================================================
-- PASSWORD RESET TOKENS INDEXES
-- =============================================================================

-- Index for token expiry queries
-- Used in: password reset flow checking non-expired tokens
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" ("expires_at");

-- Composite index for expiry + used status
-- Used in: reset flow checking valid (non-expired, non-used) tokens
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expiry_used_idx" ON "password_reset_tokens" ("expires_at", "used_at");

-- =============================================================================
-- PORTFOLIO ASSETS INDEXES
-- =============================================================================

-- Index for ignored asset filtering
-- Used in: allocation calculations that exclude ignored assets
CREATE INDEX IF NOT EXISTS "portfolio_assets_is_ignored_idx" ON "portfolio_assets" ("is_ignored");

-- Composite index for portfolio + ignored status
-- Used in: queries fetching active (non-ignored) assets for a portfolio
CREATE INDEX IF NOT EXISTS "portfolio_assets_portfolio_ignored_idx" ON "portfolio_assets" ("portfolio_id", "is_ignored");

-- Note: INVESTMENTS INDEXES moved to 0004 migration (after table creation)
