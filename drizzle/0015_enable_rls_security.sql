-- Migration: Enable Row Level Security (RLS) on all tables
-- Security Fix: Addresses 21 critical security advisories from Supabase
--
-- CONTEXT:
-- This application uses Drizzle ORM with a service role connection (DATABASE_URL).
-- Service role BYPASSES RLS by default, so this migration does not affect app functionality.
-- However, RLS blocks direct PostgREST access via anon/authenticated keys, preventing
-- unauthorized data access if Supabase keys are exposed.
--
-- TABLE CATEGORIES:
-- 1. User-owned tables: RLS enabled, no policies (service role only)
-- 2. Auth token tables: RLS enabled + explicit REVOKE (defense in depth)
-- 3. Shared data tables: RLS enabled with read-only policies for future flexibility
-- 4. System tables: RLS enabled, no policies (service role only)

-- =============================================================================
-- SECTION 1: AUTH TOKEN TABLES (Most Sensitive - Defense in Depth)
-- =============================================================================
-- These tables contain sensitive authentication data.
-- We enable RLS AND explicitly revoke PostgREST access.

ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;

-- Explicit revoke for defense in depth (belt and suspenders)
REVOKE ALL ON "refresh_tokens" FROM anon, authenticated;
REVOKE ALL ON "password_reset_tokens" FROM anon, authenticated;
REVOKE ALL ON "verification_tokens" FROM anon, authenticated;

-- =============================================================================
-- SECTION 2: USER-OWNED TABLES
-- =============================================================================
-- These tables have user_id foreign keys for multi-tenant isolation.
-- RLS enabled with no policies = blocked for anon/authenticated.
-- Service role (Drizzle) bypasses RLS and enforces isolation in application code.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_subclasses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "criteria_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommendations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommendation_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculation_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_preferences" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 3: SHARED DATA TABLES (Market Data)
-- =============================================================================
-- These tables contain market data shared across all users.
-- RLS enabled with read-only policies for authenticated users.
-- This allows future client-side read access if needed.

ALTER TABLE "asset_fundamentals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exchange_rates" ENABLE ROW LEVEL SECURITY;

-- Read-only policies for market data (authenticated users only)
CREATE POLICY "authenticated_read_asset_fundamentals"
  ON "asset_fundamentals"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_asset_prices"
  ON "asset_prices"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_exchange_rates"
  ON "exchange_rates"
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- SECTION 4: SYSTEM TABLES
-- =============================================================================
-- Admin/system tables - service role only.

ALTER TABLE "overnight_job_runs" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After running this migration, verify with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All tables should show rowsecurity = true
