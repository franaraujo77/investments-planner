CREATE TABLE "cached_asset_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isin" varchar(12) NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"jurisdiction_code" varchar(10) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cached_asset_aliases_symbol_jurisdiction_uniq" UNIQUE("symbol","jurisdiction_code")
);
--> statement-breakpoint
CREATE TABLE "cached_asset_identifiers" (
	"symbol" varchar(20) PRIMARY KEY NOT NULL,
	"isin" varchar(12),
	"canonical_type_id" varchar(30) NOT NULL,
	"jurisdiction_code" varchar(10) NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"source" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_asset_type_localizations" (
	"canonical_type_id" varchar(30) NOT NULL,
	"jurisdiction_code" varchar(10) NOT NULL,
	"local_name" varchar(100) NOT NULL,
	"local_code" varchar(10) NOT NULL,
	"regulatory_reference" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cached_asset_type_localizations_pk" UNIQUE("canonical_type_id","jurisdiction_code")
);
--> statement-breakpoint
CREATE TABLE "cached_asset_types" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(20) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_jurisdictions" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"country_iso" varchar(2) NOT NULL,
	"regulatory_body" varchar(50) NOT NULL,
	"currency_default" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cached_asset_aliases" ADD CONSTRAINT "cached_asset_aliases_jurisdiction_code_cached_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."cached_jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_asset_identifiers" ADD CONSTRAINT "cached_asset_identifiers_canonical_type_id_cached_asset_types_id_fk" FOREIGN KEY ("canonical_type_id") REFERENCES "public"."cached_asset_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_asset_identifiers" ADD CONSTRAINT "cached_asset_identifiers_jurisdiction_code_cached_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."cached_jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_asset_type_localizations" ADD CONSTRAINT "cached_asset_type_localizations_canonical_type_id_cached_asset_types_id_fk" FOREIGN KEY ("canonical_type_id") REFERENCES "public"."cached_asset_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_asset_type_localizations" ADD CONSTRAINT "cached_asset_type_localizations_jurisdiction_code_cached_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."cached_jurisdictions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cached_asset_aliases_isin_idx" ON "cached_asset_aliases" USING btree ("isin");--> statement-breakpoint
CREATE INDEX "cached_asset_aliases_symbol_idx" ON "cached_asset_aliases" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "cached_asset_identifiers_isin_idx" ON "cached_asset_identifiers" USING btree ("isin");--> statement-breakpoint
CREATE INDEX "cached_asset_identifiers_type_idx" ON "cached_asset_identifiers" USING btree ("canonical_type_id");--> statement-breakpoint
CREATE INDEX "cached_asset_identifiers_jurisdiction_idx" ON "cached_asset_identifiers" USING btree ("jurisdiction_code");--> statement-breakpoint
CREATE INDEX "cached_asset_identifiers_source_idx" ON "cached_asset_identifiers" USING btree ("source");--> statement-breakpoint
CREATE INDEX "cached_asset_type_localizations_type_idx" ON "cached_asset_type_localizations" USING btree ("canonical_type_id");--> statement-breakpoint
CREATE INDEX "cached_asset_type_localizations_jurisdiction_idx" ON "cached_asset_type_localizations" USING btree ("jurisdiction_code");--> statement-breakpoint
CREATE INDEX "cached_asset_types_category_idx" ON "cached_asset_types" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cached_asset_types_name_idx" ON "cached_asset_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cached_jurisdictions_country_idx" ON "cached_jurisdictions" USING btree ("country_iso");--> statement-breakpoint
CREATE INDEX "cached_jurisdictions_name_idx" ON "cached_jurisdictions" USING btree ("name");