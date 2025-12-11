CREATE TABLE "asset_fundamentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"pe_ratio" numeric(10, 2),
	"pb_ratio" numeric(10, 2),
	"dividend_yield" numeric(8, 4),
	"market_cap" numeric(19, 0),
	"revenue" numeric(19, 2),
	"earnings" numeric(19, 2),
	"sector" varchar(100),
	"industry" varchar(100),
	"source" varchar(50) NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"data_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "asset_fundamentals_symbol_date_uniq" UNIQUE("symbol","data_date")
);
--> statement-breakpoint
CREATE INDEX "asset_fundamentals_symbol_idx" ON "asset_fundamentals" USING btree ("symbol");