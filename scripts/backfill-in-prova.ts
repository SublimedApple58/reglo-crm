// Backfill "In prova" (REG-414): le autoscuole già in stage "cliente" con un
// mese di prova ancora attivo (trial_start_at negli ultimi TRIAL_DAYS giorni)
// vengono rimesse in "in_prova", così il cron di auto-promozione le gestisce.
// I clienti con prova già scaduta restano in "cliente".
// Run: npx tsx scripts/backfill-in-prova.ts
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
  const { autoscuole } = await import("../lib/db/schema")
  const { eq, and, isNotNull, gt } = await import("drizzle-orm")
  const { TRIAL_DAYS } = await import("../lib/constants")

  const cutoff = new Date(Date.now() - TRIAL_DAYS * 86400000)

  const active = await db
    .select({ id: autoscuole.id, name: autoscuole.name, trialStartAt: autoscuole.trialStartAt })
    .from(autoscuole)
    .where(
      and(
        eq(autoscuole.stageId, "cliente"),
        isNotNull(autoscuole.trialStartAt),
        gt(autoscuole.trialStartAt, cutoff)
      )
    )

  let moved = 0
  for (const a of active) {
    await db.update(autoscuole).set({ stageId: "in_prova" }).where(eq(autoscuole.id, a.id))
    const daysLeft = TRIAL_DAYS - Math.floor((Date.now() - new Date(a.trialStartAt!).getTime()) / 86400000)
    console.log(`✅ ${a.name}: cliente → in_prova (Cliente tra ${daysLeft} giorni)`)
    moved++
  }

  console.log(`\nDone. ${moved} autoscuole rimesse in "In prova". I clienti con prova scaduta restano in "Cliente".`)
}

main()
