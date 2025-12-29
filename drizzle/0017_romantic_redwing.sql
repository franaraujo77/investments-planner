CREATE TABLE "portfolio_accepted_asset_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"asset_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "portfolio_accepted_asset_types_uniq" UNIQUE("portfolio_id","asset_type")
);
--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "base_currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "industry_sector" varchar(50) DEFAULT 'Other' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_accepted_asset_types" ADD CONSTRAINT "portfolio_accepted_asset_types_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_accepted_asset_types_portfolio_id_idx" ON "portfolio_accepted_asset_types" USING btree ("portfolio_id");--> statement-breakpoint
-- Enable RLS on new junction table (Story 2.1: AC-2.1.3)
ALTER TABLE "portfolio_accepted_asset_types" ENABLE ROW LEVEL SECURITY;