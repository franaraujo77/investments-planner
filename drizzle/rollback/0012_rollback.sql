-- Rollback script for 0012_concerned_monster_badoon.sql
-- Migration: Create overnight_job_runs table
--
-- WARNING: This will permanently delete all data in the overnight_job_runs table.
-- Ensure you have backed up any important audit data before executing.
--
-- Usage:
--   psql -d <database> -f drizzle/rollback/0012_rollback.sql
--
-- Or via drizzle-kit (manual):
--   1. Run this rollback SQL
--   2. Remove 0012 entry from drizzle/meta/_journal.json
--   3. Delete drizzle/meta/0012_snapshot.json
--   4. Delete drizzle/0012_concerned_monster_badoon.sql

-- Drop indexes first (reverse order of creation)
DROP INDEX IF EXISTS "overnight_job_runs_started_at_idx";
DROP INDEX IF EXISTS "overnight_job_runs_status_idx";
DROP INDEX IF EXISTS "overnight_job_runs_correlation_id_idx";

-- Drop the table
DROP TABLE IF EXISTS "overnight_job_runs" CASCADE;

-- Verification query (optional, run separately)
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables
--   WHERE table_name = 'overnight_job_runs'
-- ) AS table_exists;
