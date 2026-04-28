import { neon } from "@neondatabase/serverless"
import { readFileSync, readdirSync, existsSync } from "fs"
import { join } from "path"

// Load .env.local
const envPath = join(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log("🔄 Running migrations...")

  const migrationsDir = join(process.cwd(), "drizzle")
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  for (const file of files) {
    console.log(`\n📄 ${file}`)
    const migrationSQL = readFileSync(join(migrationsDir, file), "utf-8")

    // Split by drizzle-kit breakpoints first, then by semicolons for custom SQL files
    const rawBlocks = migrationSQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)

    const statements: string[] = []
    for (const block of rawBlocks) {
      // If block contains multiple statements (semicolons), split them
      const parts = block
        .split(/;\s*$/m)
        .map((s) => s.trim())
        .filter(Boolean)
      for (const part of parts) {
        statements.push(part.endsWith(";") ? part : part + ";")
      }
    }

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
  }

  console.log("\n✅ All migrations complete!")
}

migrate().catch(console.error)
