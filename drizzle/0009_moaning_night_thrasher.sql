CREATE TABLE "asset_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"open" numeric(19, 4),
	"high" numeric(19, 4),
	"low" numeric(19, 4),
	"close" numeric(19, 4) NOT NULL,
	"volume" numeric(19, 0),
	"currency" varchar(3) NOT NULL,
	"source" varchar(50) NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"price_date" date NOT NULL,
	"is_stale" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "asset_prices_symbol_date_uniq" UNIQUE("symbol","price_date")
);
--> statement-breakpoint
CREATE INDEX "asset_prices_symbol_idx" ON "asset_prices" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "asset_prices_fetched_at_idx" ON "asset_prices" USING btree ("fetched_at");