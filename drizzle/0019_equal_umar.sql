ALTER TABLE "portfolios" ALTER COLUMN "industry_sector" SET DEFAULT 'Other';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_tips_dismissed" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;