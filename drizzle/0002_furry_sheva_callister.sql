ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "meet_link" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "calendar_event_id" text;