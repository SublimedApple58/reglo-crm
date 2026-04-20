"use server"

import { db } from "@/lib/db"
import { news, commissions, commissionLines, resources, users, autoscuole } from "@/lib/db/schema"
import { eq, desc, and, sql, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

export async function getNews() {
  return db.select().from(news).orderBy(desc(news.pinned), desc(news.createdAt))
}

export async function getCommissions(userId: string) {
  return db
    .select()
    .from(commissions)
    .where(eq(commissions.userId, userId))
    .orderBy(asc(commissions.year), asc(commissions.month))
}

export async function getCommissionLines(commissionId: number) {
  return db
    .select({
      line: commissionLines,
      autoscuola: autoscuole,
    })
    .from(commissionLines)
    .leftJoin(autoscuole, eq(commissionLines.autoscuolaId, autoscuole.id))
    .where(eq(commissionLines.commissionId, commissionId))
    .orderBy(desc(commissionLines.date))
}

export async function getResources(category?: string) {
  const condition = category ? eq(resources.category, category) : undefined
  return db
    .select()
    .from(resources)
    .where(condition)
    .orderBy(desc(resources.pinned), desc(resources.createdAt))
}

export async function getResource(id: number) {
  const [result] = await db.select().from(resources).where(eq(resources.id, id)).limit(1)
  return result
}

export async function upsertResource(data: {
  id?: number
  category: string
  title: string
  excerpt?: string
  html?: string
  tags?: string[]
  pinned?: boolean
  icon?: string
  color?: string
}) {
  if (data.id) {
    const { id, ...rest } = data
    await db.update(resources).set({
      ...rest,
      updatedAt: new Date(),
    }).where(eq(resources.id, id))
    return id
  } else {
    const session = await auth()
    const { id: _id, ...rest } = data
    const [result] = await db.insert(resources).values({
      category: rest.category,
      title: rest.title,
      excerpt: rest.excerpt ?? null,
      html: rest.html ?? null,
      tags: rest.tags ?? [],
      pinned: rest.pinned ?? false,
      icon: rest.icon ?? null,
      color: rest.color ?? null,
      authorId: session?.user?.id ?? null,
    }).returning()
    return result.id
  }
}

export async function deleteResource(id: number) {
  await db.delete(resources).where(eq(resources.id, id))
}

export async function getSalesTeam() {
  return db
    .select({
      user: users,
      autoscuoleCount: sql<number>`(SELECT count(*)::int FROM autoscuole WHERE autoscuole.assigned_to = users.id)`,
      contractsMtd: sql<number>`COALESCE((SELECT contracts FROM commissions WHERE commissions.user_id = users.id AND commissions.month = EXTRACT(MONTH FROM CURRENT_DATE) AND commissions.year = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::int`,
      commissionsMtd: sql<number>`COALESCE((SELECT gross FROM commissions WHERE commissions.user_id = users.id AND commissions.month = EXTRACT(MONTH FROM CURRENT_DATE) AND commissions.year = EXTRACT(YEAR FROM CURRENT_DATE)), 0)`,
    })
    .from(users)
    .where(sql`${users.role} IN ('sales', 'both')`)
    .orderBy(asc(users.name))
}

export async function createNews(data: {
  category: string
  title: string
  excerpt?: string
  body?: string
  pinned?: boolean
  authorId: string
}) {
  const [result] = await db.insert(news).values(data).returning()
  return result
}

export async function updateNews(
  id: number,
  data: Partial<{
    category: string
    title: string
    excerpt: string
    body: string
    pinned: boolean
  }>
) {
  await db.update(news).set(data).where(eq(news.id, id))
}

export async function deleteNews(id: number) {
  await db.delete(news).where(eq(news.id, id))
}

export async function toggleNewsPin(id: number) {
  const [item] = await db.select().from(news).where(eq(news.id, id)).limit(1)
  if (!item) return
  await db.update(news).set({ pinned: !item.pinned }).where(eq(news.id, id))
}

export async function getAdminStats() {
  const [activeSalesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(sql`${users.role} IN ('sales', 'both')`, eq(users.active, true)))

  const [autoscuoleResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(autoscuole)

  const [unassignedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(autoscuole)
    .where(sql`${autoscuole.assignedTo} IS NULL`)

  return {
    activeSales: activeSalesResult?.count ?? 0,
    totalAutoscuole: autoscuoleResult?.count ?? 0,
    unassigned: unassignedResult?.count ?? 0,
  }
}
