-- Migration: Enable RLS on Asset Type Classification Cache Tables
-- Story 5.8: Asset Type Classification Cache
--
-- These tables contain asset type reference data and classification mappings.
-- They are global cache data (not user-specific) so we enable RLS with
-- read-only policies for authenticated users.
--
-- TABLE CATEGORIES:
-- 1. Asset type reference tables: Read-only for all authenticated users
-- 2. Jurisdiction registry: Read-only for all authenticated users
-- 3. Localization overlay: Read-only for all authenticated users
-- 4. Asset identifiers/aliases cache: Read-only for all authenticated users

-- =============================================================================
-- SECTION 1: ASSET TYPE REFERENCE DATA
-- =============================================================================

ALTER TABLE "cached_asset_types" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_asset_types'
    AND policyname = 'authenticated_read_cached_asset_types'
  ) THEN
    CREATE POLICY "authenticated_read_cached_asset_types"
      ON "cached_asset_types"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: JURISDICTIONS REGISTRY
-- =============================================================================

ALTER TABLE "cached_jurisdictions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_jurisdictions'
    AND policyname = 'authenticated_read_cached_jurisdictions'
  ) THEN
    CREATE POLICY "authenticated_read_cached_jurisdictions"
      ON "cached_jurisdictions"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- SECTION 3: LOCALIZATION OVERLAY
-- =============================================================================

ALTER TABLE "cached_asset_type_localizations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_asset_type_localizations'
    AND policyname = 'authenticated_read_cached_asset_type_localizations'
  ) THEN
    CREATE POLICY "authenticated_read_cached_asset_type_localizations"
      ON "cached_asset_type_localizations"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: ASSET IDENTIFIERS CACHE
-- =============================================================================

ALTER TABLE "cached_asset_identifiers" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_asset_identifiers'
    AND policyname = 'authenticated_read_cached_asset_identifiers'
  ) THEN
    CREATE POLICY "authenticated_read_cached_asset_identifiers"
      ON "cached_asset_identifiers"
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- SECTION 5: ASSET ALIASES (ISIN LINKING)
-- =============================================================================

ALTER TABLE "cached_asset_aliases" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cached_asset_aliases'
    AND policyname = 'authenticated_read_cached_asset_aliases'
  ) THEN
    CREATE POLICY "authenticated_read_cached_asset_aliases"
      ON "cached_asset_aliases"
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
-- All cached_* tables should show rowsecurity = true
