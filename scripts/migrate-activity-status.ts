import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log("Running activity status + scheduledAt migration...")

  console.log("  1/2 ALTER activities ADD status...")
  await sql`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'scheduled' NOT NULL`

  console.log("  2/2 ALTER activities ADD scheduled_at...")
  await sql`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp`

  console.log("Done! All migrations applied successfully.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
