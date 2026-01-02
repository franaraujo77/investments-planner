CREATE TABLE "cached_asset_classifications" (
	"symbol" varchar(20) PRIMARY KEY NOT NULL,
	"gics_industry_id" char(6) NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"source" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_gics_industries" (
	"id" char(6) PRIMARY KEY NOT NULL,
	"industry_group_id" char(4) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_gics_industry_groups" (
	"id" char(4) PRIMARY KEY NOT NULL,
	"sector_id" char(2) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_gics_sectors" (
	"id" char(2) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cache_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cached_asset_classifications" ADD CONSTRAINT "cached_asset_classifications_gics_industry_id_cached_gics_industries_id_fk" FOREIGN KEY ("gics_industry_id") REFERENCES "public"."cached_gics_industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_gics_industries" ADD CONSTRAINT "cached_gics_industries_industry_group_id_cached_gics_industry_groups_id_fk" FOREIGN KEY ("industry_group_id") REFERENCES "public"."cached_gics_industry_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_gics_industry_groups" ADD CONSTRAINT "cached_gics_industry_groups_sector_id_cached_gics_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."cached_gics_sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cached_asset_classifications_gics_industry_id_idx" ON "cached_asset_classifications" USING btree ("gics_industry_id");--> statement-breakpoint
CREATE INDEX "cached_asset_classifications_source_idx" ON "cached_asset_classifications" USING btree ("source");--> statement-breakpoint
CREATE INDEX "cached_gics_industries_industry_group_id_idx" ON "cached_gics_industries" USING btree ("industry_group_id");--> statement-breakpoint
CREATE INDEX "cached_gics_industries_name_idx" ON "cached_gics_industries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cached_gics_industry_groups_sector_id_idx" ON "cached_gics_industry_groups" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "cached_gics_industry_groups_name_idx" ON "cached_gics_industry_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cached_gics_sectors_name_idx" ON "cached_gics_sectors" USING btree ("name");