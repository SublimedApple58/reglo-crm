import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log("Running Google SSO + Calendar migration...")

  // 1. Make password nullable
  console.log("  1/3 ALTER users.password DROP NOT NULL...")
  await sql`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`

  // 2. Add meet_link to activities
  console.log("  2/3 ALTER activities ADD meet_link...")
  await sql`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "meet_link" text`

  // 3. Add calendar_event_id to activities
  console.log("  3/3 ALTER activities ADD calendar_event_id...")
  await sql`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "calendar_event_id" text`

  console.log("Done! All migrations applied successfully.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
