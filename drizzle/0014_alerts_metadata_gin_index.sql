-- Migration: Add GIN index for alerts metadata JSONB column
-- PR Review Enhancement: Improves query performance for JSONB metadata filtering
--
-- This index speeds up queries that filter on metadata fields:
-- - metadata->>'currentAssetId' (opportunity alerts deduplication)
-- - metadata->>'betterAssetId' (opportunity alerts deduplication/auto-dismiss)
-- - metadata->>'assetClassId' (drift alerts deduplication)

-- Add updatedAt column if missing (some alerts records may have been created before schema update)
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- Create GIN index for JSONB metadata queries
-- Using jsonb_path_ops for efficient containment and key-value queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "alerts_metadata_gin_idx" ON "alerts" USING gin ("metadata" jsonb_path_ops);
