"use server"

import { db } from "@/lib/db"
import { autoscuole, pipelineStages, activities, users, commissionLines, documents, salesTerritories, contractRequests } from "@/lib/db/schema"
import { eq, and, ilike, or, desc, asc, sql, inArray } from "drizzle-orm"
import { REGIONI_PROVINCE } from "@/lib/constants"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getAutoscuole(filters?: {
  stageId?: string
  province?: string
  assignedTo?: string
  search?: string
}) {
  let conditions = []

  if (filters?.stageId) {
    conditions.push(eq(autoscuole.stageId, filters.stageId))
  }
  if (filters?.province) {
    conditions.push(eq(autoscuole.province, filters.province))
  }
  if (filters?.assignedTo) {
    conditions.push(eq(autoscuole.assignedTo, filters.assignedTo))
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(autoscuole.name, `%${filters.search}%`),
        ilike(autoscuole.town, `%${filters.search}%`)
      )
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return db
    .select({
      autoscuola: autoscuole,
      stage: pipelineStages,
      salesUser: users,
    })
    .from(autoscuole)
    .innerJoin(pipelineStages, eq(autoscuole.stageId, pipelineStages.id))
    .leftJoin(users, eq(autoscuole.assignedTo, users.id))
    .where(where)
    .orderBy(asc(autoscuole.name))
}

export async function getAutoscuola(id: string) {
  const [result] = await db
    .select({
      autoscuola: autoscuole,
      stage: pipelineStages,
      salesUser: users,
    })
    .from(autoscuole)
    .innerJoin(pipelineStages, eq(autoscuole.stageId, pipelineStages.id))
    .leftJoin(users, eq(autoscuole.assignedTo, users.id))
    .where(eq(autoscuole.id, id))
    .limit(1)

  return result
}

export async function updateAutoscuolaStage(id: string, stageId: string, opts?: { lostReason?: string }) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const [current] = await db
    .select({ stageId: autoscuole.stageId, trialStartAt: autoscuole.trialStartAt })
    .from(autoscuole)
    .where(eq(autoscuole.id, id))
  if (!current) throw new Error("Autoscuola non trovata")

  const update: Partial<typeof autoscuole.$inferInsert> = { stageId }

  const reason = opts?.lostReason?.trim()
  if (stageId === "non_chiuso") {
    if (!reason) throw new Error('La motivazione è obbligatoria per "Non chiuso"')
    update.lostReason = reason
  } else if (current.stageId === "non_chiuso") {
    // Uscendo da Non chiuso la colonna si azzera; la storia resta nell'attività
    update.lostReason = null
  }

  // Inizio mese di prova: primo passaggio a Cliente, mai sovrascritto
  if (stageId === "cliente" && !current.trialStartAt) {
    update.trialStartAt = new Date()
  }

  await db.update(autoscuole).set(update).where(eq(autoscuole.id, id))

  await db.insert(activities).values({
    autoscuolaId: id,
    userId: session.user.id,
    type: "stage_change",
    title: `Stage aggiornato`,
    body:
      stageId === "non_chiuso" && reason
        ? `Stage cambiato a "${stageId}" — Motivo: ${reason}`
        : `Stage cambiato a "${stageId}"`,
  })

  revalidatePath("/pipeline")
  revalidatePath(`/autoscuola/${id}`)
}

export async function updateAutoscuola(
  id: string,
  data: Partial<{
    name: string
    owner: string
    phone: string
    email: string
    notes: string
    address: string
    assignedTo: string | null
    interesseQuiz: boolean | null
    interesseRinnovo: boolean | null
    setter: string | null
    closer: string | null
    trialStartAt: Date | null
  }>
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.update(autoscuole).set(data).where(eq(autoscuole.id, id))

  revalidatePath(`/autoscuola/${id}`)
  revalidatePath("/pipeline")
  revalidatePath("/admin/assegnazioni")
}

export async function updateAutoscuolaInfo(id: string, info: Record<string, string>) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.update(autoscuole).set({ info }).where(eq(autoscuole.id, id))
  revalidatePath(`/autoscuola/${id}`)
}

export async function createAutoscuola(data: {
  name: string
  owner?: string
  province: string
  town: string
  phone?: string
  email?: string
  stageId: string
  assignedTo?: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const id = `as_${Date.now()}`

  // Auto-assign: check if the province belongs to a region assigned to a sales
  let assignedTo = data.assignedTo ?? null
  if (!assignedTo) {
    const allTerritories = await db.select().from(salesTerritories)
    for (const t of allTerritories) {
      const provinces = REGIONI_PROVINCE[t.region] ?? []
      if (provinces.includes(data.province)) {
        assignedTo = t.userId
        break
      }
    }
  }

  await db.insert(autoscuole).values({
    id,
    ...data,
    assignedTo,
    pipelineValue: 0,
    students: 0,
    lastContact: 0,
  })

  revalidatePath("/pipeline")
  return id
}

export async function getActivities(autoscuolaId: string) {
  return db
    .select({
      activity: activities,
      user: users,
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.autoscuolaId, autoscuolaId))
    .orderBy(desc(activities.createdAt))
}

export async function createActivity(data: {
  autoscuolaId: string
  type: "call" | "email" | "meeting" | "note"
  title: string
  body?: string | null
  meetLink?: string | null
  calendarEventId?: string | null
  scheduledAt?: string | null
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.insert(activities).values({
    autoscuolaId: data.autoscuolaId,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    meetLink: data.meetLink ?? null,
    calendarEventId: data.calendarEventId ?? null,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    userId: session.user.id,
  })

  revalidatePath(`/autoscuola/${data.autoscuolaId}`)
}

export async function updateActivity(id: number, text: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")
  if (!text.trim()) throw new Error("Il testo non può essere vuoto")

  const [activity] = await db.select().from(activities).where(eq(activities.id, id))
  if (!activity) throw new Error("Attività non trovata")
  if (activity.type === "stage_change") throw new Error("I cambi di stage non sono modificabili")

  const u = session.user as Record<string, unknown>
  const isAdmin = u.role === "admin" || u.role === "both"
  if (!isAdmin && activity.userId !== session.user.id) throw new Error("Non autorizzato")

  // Il testo vive in body per call/email/meeting/note; nei task (body null) vive in title
  await db
    .update(activities)
    .set(activity.body !== null ? { body: text } : { title: text })
    .where(eq(activities.id, id))

  revalidatePath(`/autoscuola/${activity.autoscuolaId}`)
}

export async function getPipelineCounts() {
  const result = await db
    .select({
      stageId: autoscuole.stageId,
      count: sql<number>`count(*)::int`,
    })
    .from(autoscuole)
    .groupBy(autoscuole.stageId)

  return result
}

export async function bulkReassign(autoscuolaIds: string[], newSalesId: string | null) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  for (const id of autoscuolaIds) {
    await db.update(autoscuole).set({ assignedTo: newSalesId }).where(eq(autoscuole.id, id))
  }

  revalidatePath("/admin/assegnazioni")
  revalidatePath("/pipeline")
}

export async function deleteAutoscuola(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const [target] = await db
    .select({ groupId: autoscuole.groupId, isGroupPrimary: autoscuole.isGroupPrimary })
    .from(autoscuole)
    .where(eq(autoscuole.id, id))

  // Cascade delete: commission lines referencing this autoscuola
  await db.delete(commissionLines).where(eq(commissionLines.autoscuolaId, id))
  // Delete documents
  await db.delete(documents).where(eq(documents.autoscuolaId, id))
  // Delete activities
  await db.delete(activities).where(eq(activities.autoscuolaId, id))
  // Delete contract requests (FK notNull: senza questo il delete fallisce)
  await db.delete(contractRequests).where(eq(contractRequests.autoscuolaId, id))
  // Delete autoscuola
  await db.delete(autoscuole).where(eq(autoscuole.id, id))

  // Se apparteneva a un gruppo, sistema primary/dissoluzione
  if (target?.groupId) {
    await normalizeGroup(target.groupId)
  }

  revalidatePath("/pipeline")
  revalidatePath("/admin/assegnazioni")
}

export async function getRecentActivities(limit: number = 10) {
  return db
    .select({
      activity: activities,
      user: users,
      autoscuola: autoscuole,
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .innerJoin(autoscuole, eq(activities.autoscuolaId, autoscuole.id))
    .orderBy(desc(activities.createdAt))
    .limit(limit)
}

// ── Sales Territories ─────────────────────────────────────────────────

export async function getSalesTerritories(userId: string) {
  return db.select().from(salesTerritories).where(eq(salesTerritories.userId, userId))
}

export async function getAllSalesTerritories() {
  return db
    .select({ territory: salesTerritories, user: { id: users.id, name: users.name } })
    .from(salesTerritories)
    .innerJoin(users, eq(salesTerritories.userId, users.id))
}

export async function assignRegion(userId: string, region: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.insert(salesTerritories).values({ userId, region }).onConflictDoNothing()

  // Auto-assign all unassigned autoscuole in that region's provinces
  const provinces = REGIONI_PROVINCE[region] ?? []
  if (provinces.length > 0) {
    await db
      .update(autoscuole)
      .set({ assignedTo: userId })
      .where(
        and(
          inArray(autoscuole.province, provinces),
          sql`${autoscuole.assignedTo} IS NULL`
        )
      )
  }

  revalidatePath("/admin/assegnazioni")
  revalidatePath("/pipeline")
}

export async function unassignRegion(userId: string, region: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.delete(salesTerritories).where(
    and(eq(salesTerritories.userId, userId), eq(salesTerritories.region, region))
  )

  // Unassign all autoscuole in that region's provinces from this sales
  const provinces = REGIONI_PROVINCE[region] ?? []
  if (provinces.length > 0) {
    await db
      .update(autoscuole)
      .set({ assignedTo: null })
      .where(
        and(
          eq(autoscuole.assignedTo, userId),
          inArray(autoscuole.province, provinces)
        )
      )
  }

  revalidatePath("/admin/assegnazioni")
  revalidatePath("/pipeline")
}

export async function getAutoscuoleBySales(userId: string) {
  return db
    .select({
      autoscuola: autoscuole,
      stage: pipelineStages,
    })
    .from(autoscuole)
    .innerJoin(pipelineStages, eq(autoscuole.stageId, pipelineStages.id))
    .where(eq(autoscuole.assignedTo, userId))
    .orderBy(asc(autoscuole.name))
}

export async function setFollowUp(autoscuolaId: string, followUpAt: string | null) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db
    .update(autoscuole)
    .set({ followUpAt: followUpAt ? new Date(followUpAt) : null })
    .where(eq(autoscuole.id, autoscuolaId))

  if (followUpAt) {
    // Create a Google Calendar event (15 min, no Meet) for follow-up
    const { createCalendarEvent } = await import("@/lib/actions/calendar")
    const [autoscuola] = await db
      .select({ name: autoscuole.name })
      .from(autoscuole)
      .where(eq(autoscuole.id, autoscuolaId))
      .limit(1)

    if (autoscuola) {
      // followUpAt is a local time string like "2024-03-15T10:00" from the client.
      // Pass it without UTC conversion so Google Calendar interprets it
      // using timeZone: "Europe/Rome" specified in createCalendarEvent.
      const startLocal = followUpAt.length === 16 ? followUpAt + ":00" : followUpAt
      // Compute end time (+15 min) by parsing components to avoid UTC conversion
      const startDate = new Date(followUpAt)
      const endDate = new Date(startDate.getTime() + 15 * 60 * 1000)
      const pad = (n: number) => n.toString().padStart(2, "0")
      const endLocal = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`

      let eventId: string | null = null
      try {
        const result = await createCalendarEvent({
          title: `Follow-up con ${autoscuola.name}`,
          description: `Link CRM: ${process.env.NEXTAUTH_URL ?? ""}/autoscuola/${autoscuolaId}`,
          startDateTime: startLocal,
          endDateTime: endLocal,
          guests: [],
          addMeetLink: false,
          autoscuolaId,
        })
        eventId = result.eventId
      } catch {
        // Google not connected — still log activity locally
      }

      // createCalendarEvent already inserts an activity when autoscuolaId is provided,
      // so we only insert manually if the calendar call failed
      if (!eventId) {
        await db.insert(activities).values({
          autoscuolaId,
          userId: session.user.id,
          type: "meeting",
          title: `Follow-up con ${autoscuola.name}`,
          scheduledAt: startDate,
        })
      }

      // Move autoscuola to "follow_up" stage
      await db.update(autoscuole).set({ stageId: "follow_up" }).where(eq(autoscuole.id, autoscuolaId))
      await db.insert(activities).values({
        autoscuolaId,
        userId: session.user.id,
        type: "stage_change",
        title: "Stage aggiornato",
        body: 'Stage cambiato a "follow_up"',
      })
    }
  } else {
    // Removing follow-up: cancel activity + delete Google Calendar event
    const { deleteCalendarEvent } = await import("@/lib/actions/calendar")
    const followUpActivities = await db
      .select({ id: activities.id, calendarEventId: activities.calendarEventId })
      .from(activities)
      .where(
        and(
          eq(activities.autoscuolaId, autoscuolaId),
          eq(activities.type, "meeting"),
          eq(activities.status, "scheduled"),
          sql`${activities.title} LIKE 'Follow-up%'`
        )
      )
      .orderBy(desc(activities.createdAt))
      .limit(1)

    for (const act of followUpActivities) {
      await db.update(activities).set({ status: "cancelled" }).where(eq(activities.id, act.id))
      if (act.calendarEventId) {
        try { await deleteCalendarEvent(act.calendarEventId) } catch {}
      }
    }
  }

  revalidatePath(`/autoscuola/${autoscuolaId}`)
  revalidatePath("/pipeline")
}

// ── Gruppi multi-sede (Unisci sedi) ──────────────────────────────────
// Modello: gruppo "piatto" — le sedi condividono un groupId, una sola è primary.
// Nessuna FK viene riscritta: attività, documenti, contratti e commissioni restano per-sede.

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")
  const u = session.user as Record<string, unknown>
  if (u.role !== "admin" && u.role !== "both") throw new Error("Operazione riservata agli admin")
  return session
}

// Garantisce l'invariante del gruppo: 0 membri ok, 1 membro → dissolto, N membri → esattamente un primary
async function normalizeGroup(groupId: string) {
  const members = await db
    .select({ id: autoscuole.id, name: autoscuole.name, isGroupPrimary: autoscuole.isGroupPrimary })
    .from(autoscuole)
    .where(eq(autoscuole.groupId, groupId))
    .orderBy(asc(autoscuole.name))

  if (members.length === 0) return
  if (members.length === 1) {
    await db
      .update(autoscuole)
      .set({ groupId: null, isGroupPrimary: false })
      .where(eq(autoscuole.id, members[0].id))
    return
  }
  if (!members.some((m) => m.isGroupPrimary)) {
    await db.update(autoscuole).set({ isGroupPrimary: true }).where(eq(autoscuole.id, members[0].id))
  }
}

export async function mergeAutoscuole(ids: string[], primaryId: string) {
  const session = await requireAdmin()

  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length < 2) throw new Error("Seleziona almeno due sedi da unire")
  if (!unique.includes(primaryId)) throw new Error("La sede principale deve essere tra quelle selezionate")

  const rows = await db
    .select({ id: autoscuole.id, name: autoscuole.name, groupId: autoscuole.groupId })
    .from(autoscuole)
    .where(inArray(autoscuole.id, unique))
  if (rows.length !== unique.length) throw new Error("Una o più sedi non esistono")

  // Se un membro appartiene già a un gruppo, assorbi l'intero gruppo esistente
  const existingGroupIds = [...new Set(rows.map((r) => r.groupId).filter((g): g is string => Boolean(g)))]
  let allIds = [...unique]
  if (existingGroupIds.length > 0) {
    const absorbed = await db
      .select({ id: autoscuole.id })
      .from(autoscuole)
      .where(inArray(autoscuole.groupId, existingGroupIds))
    allIds = [...new Set([...allIds, ...absorbed.map((a) => a.id)])]
  }

  const groupId = `grp_${Date.now()}`
  await db.update(autoscuole).set({ groupId, isGroupPrimary: false }).where(inArray(autoscuole.id, allIds))
  await db.update(autoscuole).set({ isGroupPrimary: true }).where(eq(autoscuole.id, primaryId))

  const names = rows.map((r) => r.name.replace("Autoscuola ", "")).join(", ")
  for (const id of allIds) {
    await db.insert(activities).values({
      autoscuolaId: id,
      userId: session.user.id,
      type: "note",
      title: "Sedi unite",
      body: `Unita al gruppo multi-sede (${names})`,
    })
  }

  revalidatePath("/pipeline")
  for (const id of allIds) revalidatePath(`/autoscuola/${id}`)
  return groupId
}

export async function unmergeAutoscuola(id: string) {
  const session = await requireAdmin()

  const [row] = await db
    .select({ groupId: autoscuole.groupId, name: autoscuole.name })
    .from(autoscuole)
    .where(eq(autoscuole.id, id))
  if (!row?.groupId) return

  await db.update(autoscuole).set({ groupId: null, isGroupPrimary: false }).where(eq(autoscuole.id, id))
  await normalizeGroup(row.groupId)

  await db.insert(activities).values({
    autoscuolaId: id,
    userId: session.user.id,
    type: "note",
    title: "Sede scollegata",
    body: "Rimossa dal gruppo multi-sede",
  })

  revalidatePath("/pipeline")
  revalidatePath(`/autoscuola/${id}`)
}

export async function getGroupMembers(groupId: string) {
  const session = await auth()
  if (!session?.user) return []

  return db
    .select({
      id: autoscuole.id,
      name: autoscuole.name,
      town: autoscuole.town,
      province: autoscuole.province,
      stageId: autoscuole.stageId,
      isGroupPrimary: autoscuole.isGroupPrimary,
    })
    .from(autoscuole)
    .where(eq(autoscuole.groupId, groupId))
    .orderBy(desc(autoscuole.isGroupPrimary), asc(autoscuole.name))
}

// Mappa id → nome/telefono per arricchire le liste follow-up (Google Tasks non porta il telefono)
export async function getAutoscuolePhoneMap(ids: string[]) {
  const session = await auth()
  if (!session?.user) return {}
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return {}

  const rows = await db
    .select({ id: autoscuole.id, name: autoscuole.name, phone: autoscuole.phone })
    .from(autoscuole)
    .where(inArray(autoscuole.id, unique))

  const map: Record<string, { name: string; phone: string | null }> = {}
  for (const r of rows) map[r.id] = { name: r.name, phone: r.phone }
  return map
}

export async function searchAutoscuole(query: string) {
  if (!query || query.length < 2) return []

  return db
    .select({
      id: autoscuole.id,
      name: autoscuole.name,
      town: autoscuole.town,
      province: autoscuole.province,
      email: autoscuole.email,
    })
    .from(autoscuole)
    .where(
      or(
        ilike(autoscuole.name, `%${query}%`),
        ilike(autoscuole.town, `%${query}%`)
      )
    )
    .orderBy(asc(autoscuole.name))
    .limit(10)
}

export async function searchGlobal(query: string) {
  if (!query || query.length < 2) return { autoscuole: [], users: [] }

  const autoscuoleResults = await db
    .select({
      id: autoscuole.id,
      name: autoscuole.name,
      town: autoscuole.town,
      province: autoscuole.province,
    })
    .from(autoscuole)
    .where(
      or(
        ilike(autoscuole.name, `%${query}%`),
        ilike(autoscuole.town, `%${query}%`)
      )
    )
    .orderBy(asc(autoscuole.name))
    .limit(10)

  const usersResults = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(
      or(
        ilike(users.name, `%${query}%`),
        ilike(users.email, `%${query}%`)
      )
    )
    .orderBy(asc(users.name))
    .limit(5)

  return { autoscuole: autoscuoleResults, users: usersResults }
}
