ALTER TABLE "autoscuole" ADD COLUMN "group_id" text;--> statement-breakpoint
ALTER TABLE "autoscuole" ADD COLUMN "is_group_primary" boolean DEFAULT false NOT NULL;