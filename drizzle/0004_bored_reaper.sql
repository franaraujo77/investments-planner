CREATE TABLE "asset_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"icon" varchar(10),
	"target_min" numeric(5, 2),
	"target_max" numeric(5, 2),
	"max_assets" numeric(10, 0),
	"min_allocation_value" numeric(19, 4),
	"sort_order" numeric(10, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_subclasses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"target_min" numeric(5, 2),
	"target_max" numeric(5, 2),
	"max_assets" numeric(10, 0),
	"min_allocation_value" numeric(19, 4),
	"sort_order" numeric(10, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"quantity" numeric(19, 8) NOT NULL,
	"price_per_unit" numeric(19, 4) NOT NULL,
	"total_amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"recommended_amount" numeric(19, 4),
	"invested_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "asset_classes" ADD CONSTRAINT "asset_classes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_subclasses" ADD CONSTRAINT "asset_subclasses_class_id_asset_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."asset_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_asset_id_portfolio_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."portfolio_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_classes_user_id_idx" ON "asset_classes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_subclasses_class_id_idx" ON "asset_subclasses" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "investments_user_id_idx" ON "investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investments_invested_at_idx" ON "investments" USING btree ("invested_at");--> statement-breakpoint
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_asset_class_id_asset_classes_id_fk" FOREIGN KEY ("asset_class_id") REFERENCES "public"."asset_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_subclass_id_asset_subclasses_id_fk" FOREIGN KEY ("subclass_id") REFERENCES "public"."asset_subclasses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investments_user_date_idx" ON "investments" USING btree ("user_id", "invested_at");