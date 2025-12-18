CREATE TABLE "overnight_job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"users_processed" integer DEFAULT 0,
	"users_failed" integer DEFAULT 0,
	"correlation_id" uuid NOT NULL,
	"error_details" jsonb,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "overnight_job_runs_correlation_id_idx" ON "overnight_job_runs" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "overnight_job_runs_status_idx" ON "overnight_job_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "overnight_job_runs_started_at_idx" ON "overnight_job_runs" USING btree ("started_at");