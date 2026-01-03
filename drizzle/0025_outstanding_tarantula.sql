CREATE TABLE "dismissed_opportunity_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_asset_id" uuid NOT NULL,
	"better_asset_id" uuid NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_score_difference" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_preferences" ADD COLUMN "data_freshness_warnings_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dismissed_opportunity_pairs" ADD CONSTRAINT "dismissed_opportunity_pairs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dismissed_pairs_user_idx" ON "dismissed_opportunity_pairs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dismissed_pairs_unique_idx" ON "dismissed_opportunity_pairs" USING btree ("user_id","current_asset_id","better_asset_id");--> statement-breakpoint
CREATE INDEX "alerts_snoozed_until_idx" ON "alerts" USING btree ("snoozed_until");