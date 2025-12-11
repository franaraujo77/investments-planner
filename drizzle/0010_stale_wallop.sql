CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"target_currency" varchar(3) NOT NULL,
	"rate" numeric(19, 8) NOT NULL,
	"source" varchar(50) NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"rate_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "exchange_rates_currencies_date_uniq" UNIQUE("base_currency","target_currency","rate_date")
);
--> statement-breakpoint
CREATE INDEX "exchange_rates_currencies_idx" ON "exchange_rates" USING btree ("base_currency","target_currency");