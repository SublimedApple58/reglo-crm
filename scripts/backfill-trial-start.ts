// Backfill trial_start_at (REG-317): per le autoscuole già in stage "cliente" senza data,
// usa il createdAt della prima attività stage_change che le ha portate a "cliente".
// Run: npx tsx scripts/backfill-trial-start.ts
import { readFileSync } from "fs"
import { resolve } from "path"

// Load .env.local like lib/db/migrate.ts does
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)=["']?([^"']*)["']?$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {}

async function main() {
  const { db } = await import("../lib/db")
  const { autoscuole, activities } = await import("../lib/db/schema")
  const { eq, and, isNull, like, asc } = await import("drizzle-orm")

  const clienti = await db
    .select({ id: autoscuole.id, name: autoscuole.name })
    .from(autoscuole)
    .where(and(eq(autoscuole.stageId, "cliente"), isNull(autoscuole.trialStartAt)))

  let updated = 0
  let skipped = 0

  for (const a of clienti) {
    const [firstChange] = await db
      .select({ createdAt: activities.createdAt })
      .from(activities)
      .where(
        and(
          eq(activities.autoscuolaId, a.id),
          eq(activities.type, "stage_change"),
          like(activities.body, '%"cliente"%')
        )
      )
      .orderBy(asc(activities.createdAt))
      .limit(1)

    if (!firstChange) {
      console.log(`⏭️  ${a.name}: nessuno stage_change a "cliente" trovato, lasciata null`)
      skipped++
      continue
    }

    await db
      .update(autoscuole)
      .set({ trialStartAt: firstChange.createdAt })
      .where(eq(autoscuole.id, a.id))
    console.log(`✅ ${a.name}: trial_start_at = ${firstChange.createdAt.toISOString()}`)
    updated++
  }

  console.log(`\nDone. ${updated} aggiornate, ${skipped} senza storico (data impostabile a mano in Anagrafica).`)
}

main()
