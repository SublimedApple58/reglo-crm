/**
 * Dedup Autoscuole Script
 *
 * Usage:
 *   npx tsx scripts/dedup-autoscuole.ts          # dry-run (solo report)
 *   npx tsx scripts/dedup-autoscuole.ts --apply   # esegue il merge
 *
 * Regole:
 * - Match: stesso nome + stessa provincia + stessa città
 * - Match extra: stesso nome + stessa provincia + coordinate < 500m
 * - Sopravvissuto: quello con stage più avanzato
 * - Si cancellano SOLO record con stage "da_chiamare" o "non_interessato"
 * - Se entrambi hanno stage attivi → skip, segnalato per review manuale
 * - Attività, documenti e commission lines vengono trasferiti al sopravvissuto
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(__dirname, "../.env.local") })

const sql = neon(process.env.DATABASE_URL!)
const APPLY = process.argv.includes("--apply")

// Stages that are "safe to delete" — the record hasn't been actively worked
const DELETABLE_STAGES = ["da_chiamare", "non_interessato"]

// Stage priority for choosing survivor (higher = more important to keep)
const STAGE_PRIORITY: Record<string, number> = {
  da_chiamare: 0,
  non_interessato: 1,
  follow_up: 10,
  email: 11,
  in_attesa: 12,
  appuntamento: 20,
  cliente: 30,
}

type Autoscuola = {
  id: string
  name: string
  province: string
  town: string
  stage_id: string
  assigned_to: string | null
  phone: string | null
  email: string | null
  lat: number | null
  lng: number | null
  pipeline_value: number | null
  activity_count: number
  doc_count: number
  commission_count: number
}

async function main() {
  console.log(APPLY ? "🔴 MODALITÀ APPLY — le modifiche verranno applicate!" : "🟡 DRY-RUN — nessuna modifica")
  console.log("")

  // 1. Load all autoscuole with counts
  const rows: Autoscuola[] = await sql`
    SELECT a.id, a.name, a.province, a.town, a.stage_id, a.assigned_to,
           a.phone, a.email, a.lat, a.lng, a.pipeline_value,
           (SELECT count(*)::int FROM activities WHERE autoscuola_id = a.id) as activity_count,
           (SELECT count(*)::int FROM documents WHERE autoscuola_id = a.id) as doc_count,
           (SELECT count(*)::int FROM commission_lines WHERE autoscuola_id = a.id) as commission_count
    FROM autoscuole a
    ORDER BY a.name, a.province, a.town
  `

  console.log(`Totale autoscuole: ${rows.length}`)

  // 2. Group by name + province + town (exact match)
  const groups = new Map<string, Autoscuola[]>()
  for (const row of rows) {
    const key = `${row.name}|||${row.province}|||${row.town}`
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }

  // 3. Also find coordinate-based dupes (same name + province, different town but < 500m)
  for (const row of rows) {
    if (!row.lat || !row.lng) continue
    for (const other of rows) {
      if (other.id >= row.id) continue // avoid double-counting
      if (other.name !== row.name || other.province !== row.province) continue
      if (other.town === row.town) continue // already in exact group
      if (!other.lat || !other.lng) continue
      const dlat = Math.abs(row.lat - other.lat)
      const dlng = Math.abs(row.lng - other.lng)
      if (dlat < 0.005 && dlng < 0.005) {
        // These are nearby — merge into same group
        const key1 = `${row.name}|||${row.province}|||${row.town}`
        const key2 = `${other.name}|||${other.province}|||${other.town}`
        const g1 = groups.get(key1) ?? [row]
        const g2 = groups.get(key2) ?? [other]
        // Merge g2 into g1
        for (const item of g2) {
          if (!g1.find((x) => x.id === item.id)) g1.push(item)
        }
        groups.set(key1, g1)
        groups.delete(key2)
      }
    }
  }

  // 4. Filter to groups with duplicates
  const dupeGroups = [...groups.values()].filter((g) => g.length > 1)
  console.log(`Gruppi con doppioni: ${dupeGroups.length}`)
  console.log("")

  let totalDeleted = 0
  let totalSkipped = 0
  let totalTransferredActivities = 0
  let totalTransferredDocs = 0
  let totalTransferredCommissions = 0
  const manualReview: { name: string; province: string; ids: string[]; stages: string[] }[] = []

  for (const group of dupeGroups) {
    // Sort by stage priority (highest first), then by activity count, then by doc count
    group.sort((a, b) => {
      const pa = STAGE_PRIORITY[a.stage_id] ?? 0
      const pb = STAGE_PRIORITY[b.stage_id] ?? 0
      if (pa !== pb) return pb - pa
      if (a.activity_count !== b.activity_count) return b.activity_count - a.activity_count
      if (a.doc_count !== b.doc_count) return b.doc_count - a.doc_count
      return 0
    })

    const survivor = group[0]
    const toDelete = group.slice(1)

    // Check: can we actually delete the others?
    const undeletable = toDelete.filter((d) => !DELETABLE_STAGES.includes(d.stage_id))
    if (undeletable.length > 0) {
      // Some duplicates have active stages — skip entire group
      manualReview.push({
        name: survivor.name,
        province: survivor.province,
        ids: group.map((g) => g.id),
        stages: group.map((g) => g.stage_id),
      })
      totalSkipped += undeletable.length
      // Still delete the ones that ARE deletable
      const deletable = toDelete.filter((d) => DELETABLE_STAGES.includes(d.stage_id))
      for (const dup of deletable) {
        await processDelete(survivor, dup)
        totalDeleted++
        totalTransferredActivities += dup.activity_count
        totalTransferredDocs += dup.doc_count
        totalTransferredCommissions += dup.commission_count
      }
      continue
    }

    // All duplicates are deletable
    for (const dup of toDelete) {
      await processDelete(survivor, dup)
      totalDeleted++
      totalTransferredActivities += dup.activity_count
      totalTransferredDocs += dup.doc_count
      totalTransferredCommissions += dup.commission_count
    }
  }

  console.log("")
  console.log("═══════════════════════════════════════")
  console.log(`Record ${APPLY ? "eliminati" : "da eliminare"}: ${totalDeleted}`)
  console.log(`Attività trasferite: ${totalTransferredActivities}`)
  console.log(`Documenti trasferiti: ${totalTransferredDocs}`)
  console.log(`Commission lines trasferite: ${totalTransferredCommissions}`)
  console.log(`Gruppi skippati (review manuale): ${manualReview.length}`)
  console.log(`Record non toccati (stage attivo): ${totalSkipped}`)
  console.log("═══════════════════════════════════════")

  if (manualReview.length > 0) {
    console.log("")
    console.log("⚠️  REVIEW MANUALE RICHIESTA:")
    for (const item of manualReview) {
      console.log(`  ${item.name} (${item.province}) — IDs: ${item.ids.join(", ")} — Stages: ${item.stages.join(", ")}`)
    }
  }
}

async function processDelete(survivor: Autoscuola, dup: Autoscuola) {
  const label = `  ${dup.name} (${dup.town}, ${dup.province}) [${dup.stage_id}] → sopravvive [${survivor.stage_id}]`

  if (dup.activity_count > 0 || dup.doc_count > 0 || dup.commission_count > 0) {
    console.log(`${label} | trasferisco ${dup.activity_count} att, ${dup.doc_count} doc, ${dup.commission_count} comm`)
  } else {
    console.log(`${label} | nessun dato da trasferire`)
  }

  if (!APPLY) return

  // Transfer activities
  if (dup.activity_count > 0) {
    await sql`UPDATE activities SET autoscuola_id = ${survivor.id} WHERE autoscuola_id = ${dup.id}`
  }

  // Transfer documents
  if (dup.doc_count > 0) {
    await sql`UPDATE documents SET autoscuola_id = ${survivor.id} WHERE autoscuola_id = ${dup.id}`
  }

  // Transfer commission lines
  if (dup.commission_count > 0) {
    await sql`UPDATE commission_lines SET autoscuola_id = ${survivor.id} WHERE autoscuola_id = ${dup.id}`
  }

  // Transfer comments
  await sql`UPDATE comments SET target_id = ${parseInt(survivor.id.replace(/\D/g, "").slice(-6))} WHERE target_type = 'autoscuola' AND target_id = ${parseInt(dup.id.replace(/\D/g, "").slice(-6))}`

  // Delete the duplicate
  await sql`DELETE FROM autoscuole WHERE id = ${dup.id}`
}

main().catch((e) => {
  console.error("Errore:", e.message)
  process.exit(1)
})
