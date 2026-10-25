CREATE TYPE "public"."extraction_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."race_session_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"status" "extraction_job_status" DEFAULT 'pending' NOT NULL,
	"stream_entry_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"blob_key" text NOT NULL,
	"status" "race_session_status" DEFAULT 'processing' NOT NULL,
	"file_size_bytes" integer,
	"frame_count" integer,
	"sample_rate_hz" integer,
	"duration_seconds" real,
	"car_code" integer,
	"lap_first" integer,
	"lap_last" integer,
	"phases" jsonb,
	"conditions" jsonb,
	"stats" jsonb,
	"evidence" jsonb,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"extracted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_race_session_id_race_sessions_id_fk" FOREIGN KEY ("race_session_id") REFERENCES "public"."race_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extraction_jobs_session_idx" ON "extraction_jobs" USING btree ("race_session_id");--> statement-breakpoint
CREATE INDEX "extraction_jobs_user_content_idx" ON "extraction_jobs" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "race_sessions_user_content_unique" ON "race_sessions" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX "race_sessions_user_id_idx" ON "race_sessions" USING btree ("user_id");