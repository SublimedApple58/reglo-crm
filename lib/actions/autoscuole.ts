"use server"

import { db } from "@/lib/db"
import { autoscuole, pipelineStages, activities, users, commissionLines, documents, salesTerritories } from "@/lib/db/schema"
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

export async function updateAutoscuolaStage(id: string, stageId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.update(autoscuole).set({ stageId }).where(eq(autoscuole.id, id))

  await db.insert(activities).values({
    autoscuolaId: id,
    userId: session.user.id,
    type: "stage_change",
    title: `Stage aggiornato`,
    body: `Stage cambiato a "${stageId}"`,
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
  body?: string
  meetLink?: string | null
  calendarEventId?: string | null
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.insert(activities).values({
    autoscuolaId: data.autoscuolaId,
    type: data.type,
    title: data.title,
    body: data.body,
    meetLink: data.meetLink ?? null,
    calendarEventId: data.calendarEventId ?? null,
    userId: session.user.id,
  })

  revalidatePath(`/autoscuola/${data.autoscuolaId}`)
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

  // Cascade delete: commission lines referencing this autoscuola
  await db.delete(commissionLines).where(eq(commissionLines.autoscuolaId, id))
  // Delete documents
  await db.delete(documents).where(eq(documents.autoscuolaId, id))
  // Delete activities
  await db.delete(activities).where(eq(activities.autoscuolaId, id))
  // Delete autoscuola
  await db.delete(autoscuole).where(eq(autoscuole.id, id))

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
    // Create a Google Task (attività) for follow-up
    const { createGoogleTask } = await import("@/lib/actions/calendar")
    const [autoscuola] = await db
      .select({ name: autoscuole.name })
      .from(autoscuole)
      .where(eq(autoscuole.id, autoscuolaId))
      .limit(1)

    if (autoscuola) {
      let taskId: string | null = null
      try {
        taskId = await createGoogleTask({
          title: `Follow-up con ${autoscuola.name}`,
          notes: `Link: ${process.env.NEXTAUTH_URL ?? ""}/autoscuola/${autoscuolaId}`,
          dueDate: followUpAt,
        })
      } catch {
        // Google not connected or tasks scope not granted
      }

      await db.insert(activities).values({
        autoscuolaId,
        userId: session.user.id,
        type: "meeting",
        title: `Follow-up con ${autoscuola.name}`,
        scheduledAt: new Date(followUpAt),
        calendarEventId: taskId,
      })
    }
  } else {
    // Removing follow-up: cancel activity + delete Google Task
    const { deleteGoogleTask } = await import("@/lib/actions/calendar")
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
        try { await deleteGoogleTask(act.calendarEventId) } catch {}
      }
    }
  }

  revalidatePath(`/autoscuola/${autoscuolaId}`)
  revalidatePath("/pipeline")
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
