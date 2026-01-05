-- Migration: Add missing updated_at column to alerts table
-- Fix: Schema drift from migration 0013_lean_blob.sql
--
-- IMPORTANT: This migration is idempotent and safe to run on databases
-- that may already have the updated_at column (e.g., manually added).
-- Uses conditional logic to prevent errors if column already exists.
--
-- Issue: The alerts table was created in migration 0013 without the updated_at
-- column, but schema.ts includes it. This causes queries to fail with:
-- "column \"updated_at\" does not exist"

-- ==============================================================================
-- Add updated_at column if it doesn't exist
-- ==============================================================================
DO $$
BEGIN
  -- Check if the column already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alerts'
      AND column_name = 'updated_at'
  ) THEN
    -- Column doesn't exist, add it
    ALTER TABLE "alerts" ADD COLUMN "updated_at" timestamp DEFAULT now();

    RAISE NOTICE 'Added updated_at column to alerts table';
  ELSE
    -- Column already exists, skip
    RAISE NOTICE 'Column updated_at already exists in alerts table, skipping';
  END IF;
END $$;
