"use server"

import { db } from "@/lib/db"
import { autoscuole, pipelineStages, activities, users } from "@/lib/db/schema"
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
