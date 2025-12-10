-- Fix FK constraint on score_history.criteria_version_id
-- Change from ON DELETE no action to ON DELETE restrict
-- This preserves historical integrity by preventing criteria deletion when history exists

ALTER TABLE "score_history" DROP CONSTRAINT "score_history_criteria_version_id_criteria_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_criteria_version_id_criteria_versions_id_fk" FOREIGN KEY ("criteria_version_id") REFERENCES "public"."criteria_versions"("id") ON DELETE restrict ON UPDATE no action;
