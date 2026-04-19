"use server"

import { db } from "@/lib/db"
import { autoscuole, pipelineStages, activities, users, commissionLines, documents } from "@/lib/db/schema"
import { eq, and, ilike, or, desc, asc, sql } from "drizzle-orm"
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
  }>
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.update(autoscuole).set(data).where(eq(autoscuole.id, id))

  revalidatePath(`/autoscuola/${id}`)
  revalidatePath("/pipeline")
  revalidatePath("/admin/assegnazioni")
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
  await db.insert(autoscuole).values({
    id,
    ...data,
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
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.insert(activities).values({
    ...data,
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
