ALTER TABLE "autoscuole" ADD COLUMN IF NOT EXISTS "package" text;
--> statement-breakpoint
ALTER TABLE "autoscuole" ADD COLUMN IF NOT EXISTS "close_probability" real;
--> statement-breakpoint
ALTER TABLE "autoscuole" ADD COLUMN IF NOT EXISTS "commission_rate" real;
--> statement-breakpoint
ALTER TABLE "autoscuole" ADD COLUMN IF NOT EXISTS "expected_close_date" timestamp;
