CREATE TABLE "score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"score" numeric(7, 4) NOT NULL,
	"criteria_version_id" uuid NOT NULL,
	"calculated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_criteria_version_id_criteria_versions_id_fk" FOREIGN KEY ("criteria_version_id") REFERENCES "public"."criteria_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "score_history_user_asset_date_idx" ON "score_history" USING btree ("user_id","asset_id","calculated_at");--> statement-breakpoint
CREATE INDEX "score_history_user_id_idx" ON "score_history" USING btree ("user_id");
