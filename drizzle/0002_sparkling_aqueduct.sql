CREATE TABLE "portfolio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100),
	"quantity" numeric(19, 8) NOT NULL,
	"purchase_price" numeric(19, 4) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"asset_class_id" uuid,
	"subclass_id" uuid,
	"is_ignored" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "portfolio_assets_portfolio_symbol_uniq" UNIQUE("portfolio_id","symbol")
);
--> statement-breakpoint
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_assets_portfolio_id_idx" ON "portfolio_assets" USING btree ("portfolio_id");