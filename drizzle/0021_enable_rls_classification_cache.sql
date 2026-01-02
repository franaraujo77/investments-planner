-- Migration: Enable RLS on Classification Cache Tables
-- Story 5.7: Industry/Sector Classification Cache
--
-- These tables contain GICS reference data and asset classification mappings.
-- They are global cache data (not user-specific) so we enable RLS with
-- read-only policies for authenticated users.
--
-- TABLE CATEGORIES:
-- 1. GICS reference tables: Read-only for all authenticated users
-- 2. Asset classification cache: Read-only for all authenticated users

-- =============================================================================
-- SECTION 1: GICS REFERENCE DATA TABLES
-- =============================================================================
-- These tables contain static GICS (Global Industry Classification Standard)
-- reference data: sectors, industry groups, and industries.
-- All authenticated users can read this data.

ALTER TABLE "cached_gics_sectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cached_gics_industry_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cached_gics_industries" ENABLE ROW LEVEL SECURITY;

-- Read-only policies for GICS reference data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_gics_sectors'
    AND policyname = 'authenticated_read_cached_gics_sectors'
  ) THEN
    CREATE POLICY "authenticated_read_cached_gics_sectors"
      ON "cached_gics_sectors"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_gics_industry_groups'
    AND policyname = 'authenticated_read_cached_gics_industry_groups'
  ) THEN
    CREATE POLICY "authenticated_read_cached_gics_industry_groups"
      ON "cached_gics_industry_groups"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_gics_industries'
    AND policyname = 'authenticated_read_cached_gics_industries'
  ) THEN
    CREATE POLICY "authenticated_read_cached_gics_industries"
      ON "cached_gics_industries"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: ASSET CLASSIFICATION CACHE
-- =============================================================================
-- This table caches asset-to-GICS classification mappings.
-- All authenticated users can read this data.

ALTER TABLE "cached_asset_classifications" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_asset_classifications'
    AND policyname = 'authenticated_read_cached_asset_classifications'
  ) THEN
    CREATE POLICY "authenticated_read_cached_asset_classifications"
      ON "cached_asset_classifications"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After running this migration, verify with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'cached_%';
-- All 4 cached_* tables should show rowsecurity = true
