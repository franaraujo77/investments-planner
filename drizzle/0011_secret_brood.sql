CREATE TABLE "recommendation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"score" numeric(7, 4) NOT NULL,
	"current_allocation" numeric(7, 4) NOT NULL,
	"target_allocation" numeric(7, 4) NOT NULL,
	"allocation_gap" numeric(7, 4) NOT NULL,
	"recommended_amount" numeric(19, 4) NOT NULL,
	"is_over_allocated" boolean DEFAULT false NOT NULL,
	"breakdown" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"contribution" numeric(19, 4) NOT NULL,
	"dividends" numeric(19, 4) NOT NULL,
	"total_investable" numeric(19, 4) NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"correlation_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_contribution" numeric(19, 4);--> statement-breakpoint
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_asset_id_portfolio_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."portfolio_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_items_recommendation_id_idx" ON "recommendation_items" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "recommendation_items_asset_id_idx" ON "recommendation_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "recommendations_user_id_idx" ON "recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recommendations_portfolio_id_idx" ON "recommendations" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "recommendations_correlation_id_idx" ON "recommendations" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "recommendations_status_idx" ON "recommendations" USING btree ("status");