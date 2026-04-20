ALTER TABLE "users" ADD COLUMN "avatar" text;
--> statement-breakpoint
UPDATE "users" SET "avatar" = '/papera-rosa.jpg' WHERE "role" IN ('admin', 'both');
--> statement-breakpoint
UPDATE "users" SET "avatar" = '/papera-gialla.jpg' WHERE "role" = 'sales';
