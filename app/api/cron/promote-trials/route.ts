import { NextResponse } from "next/server"
import { and, eq, inArray, isNotNull, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { autoscuole, activities, users } from "@/lib/db/schema"
import { TRIAL_DAYS } from "@/lib/constants"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

// Cron giornaliero (Vercel Cron): promuove automaticamente a "Cliente" le
// autoscuole rimaste in "In prova" oltre TRIAL_DAYS giorni. Chi viene spostato
// manualmente in un altro stage esce dalla query e non viene toccato.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get("authorization")
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - TRIAL_DAYS * 86400000)

  const due = await db
    .select({ id: autoscuole.id, assignedTo: autoscuole.assignedTo })
    .from(autoscuole)
    .where(
      and(
        eq(autoscuole.stageId, "in_prova"),
        isNotNull(autoscuole.trialStartAt),
        lte(autoscuole.trialStartAt, cutoff)
      )
    )

  if (due.length === 0) {
    return NextResponse.json({ promoted: 0 })
  }

  // Attore per l'attività di storico: il sales assegnato o, in mancanza, un admin.
  const [fallbackAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "both"]))
    .limit(1)

  for (const a of due) {
    await db.update(autoscuole).set({ stageId: "cliente" }).where(eq(autoscuole.id, a.id))

    const actor = a.assignedTo ?? fallbackAdmin?.id
    if (actor) {
      await db.insert(activities).values({
        autoscuolaId: a.id,
        userId: actor,
        type: "stage_change",
        title: "Passaggio automatico a Cliente",
        body: `Mese di prova completato (${TRIAL_DAYS} giorni): passaggio automatico a "cliente"`,
      })
    }
  }

  revalidatePath("/pipeline")

  return NextResponse.json({ promoted: due.length, ids: due.map((a) => a.id) })
}
