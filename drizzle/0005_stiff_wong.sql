CREATE TABLE "criteria_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"target_market" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"criteria" jsonb NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "criteria_versions" ADD CONSTRAINT "criteria_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "criteria_versions_user_id_idx" ON "criteria_versions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "criteria_versions_user_asset_type_idx" ON "criteria_versions" USING btree ("user_id","asset_type");--> statement-breakpoint
CREATE INDEX "criteria_versions_user_market_idx" ON "criteria_versions" USING btree ("user_id","target_market");