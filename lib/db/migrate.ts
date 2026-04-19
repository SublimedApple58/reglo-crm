import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log("🔄 Running migration...")

  const migrationSQL = readFileSync(
    join(process.cwd(), "drizzle/0000_colossal_richard_fisk.sql"),
    "utf-8"
  )

  // Split by statement-breakpoint and execute each statement
  const statements = migrationSQL
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    try {
      await sql.query(statement)
      console.log("  ✅", statement.slice(0, 60).replace(/\n/g, " ") + "...")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("already exists")) {
        console.log("  ⏭️  Already exists, skipping...")
      } else {
        console.error("  ❌", msg)
        throw err
      }
    }
  }

  console.log("\n✅ Migration complete!")
}

migrate().catch(console.error)
