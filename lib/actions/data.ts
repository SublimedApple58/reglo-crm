"use server"

import { db } from "@/lib/db"
import { news, commissions, commissionLines, resources, users, autoscuole, comments, newsReads, newsCategories, resourceCategories, homeCards } from "@/lib/db/schema"
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
  coverImage?: string | null
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
      coverImage: rest.coverImage ?? null,
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
  icon?: string
  coverImage?: string
  authorId: string
}) {
  const [result] = await db.insert(news).values(data).returning()
  revalidatePath("/bacheca")
  revalidatePath("/admin/gestione-news")
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
    icon: string | null
    coverImage: string | null
  }>
) {
  await db.update(news).set(data).where(eq(news.id, id))
  revalidatePath("/bacheca")
  revalidatePath("/admin/gestione-news")
}

export async function deleteNews(id: number) {
  await db.delete(newsReads).where(eq(newsReads.newsId, id))
  await db.delete(comments).where(and(eq(comments.targetType, "news"), eq(comments.targetId, id)))
  await db.delete(news).where(eq(news.id, id))
  revalidatePath("/bacheca")
  revalidatePath("/admin/gestione-news")
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

// ── Comments ──────────────────────────────────────────────────────────

export async function getComments(targetType: "news" | "resource", targetId: number) {
  return db
    .select({
      comment: comments,
      user: { id: users.id, name: users.name, color: users.color, avatar: users.avatar },
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId)))
    .orderBy(asc(comments.createdAt))
}

export async function createComment(data: {
  targetType: "news" | "resource"
  targetId: number
  body: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")
  const [result] = await db.insert(comments).values({ ...data, userId: session.user.id }).returning()
  revalidatePath("/bacheca")
  revalidatePath("/risorse")
  return result
}

export async function deleteComment(id: number) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")
  await db.delete(comments).where(eq(comments.id, id))
  revalidatePath("/bacheca")
  revalidatePath("/risorse")
}

// ── News Reads ────────────────────────────────────────────────────────

export async function markNewsAsRead(newsId: number) {
  const session = await auth()
  if (!session?.user) return
  await db
    .insert(newsReads)
    .values({ userId: session.user.id, newsId })
    .onConflictDoNothing()
}

export async function getUnreadNewsCount() {
  const session = await auth()
  if (!session?.user) return 0

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(news)
    .where(
      sql`${news.id} NOT IN (
        SELECT ${newsReads.newsId} FROM ${newsReads}
        WHERE ${newsReads.userId} = ${session.user.id}
      )`
    )

  return result?.count ?? 0
}

// ── News Categories ───────────────────────────────────────────────────

export async function getNewsCategories() {
  return db.select().from(newsCategories).orderBy(asc(newsCategories.label))
}

export async function upsertNewsCategory(data: { id?: number; label: string; color?: string; icon?: string }) {
  if (data.id) {
    const { id, ...rest } = data
    await db.update(newsCategories).set(rest).where(eq(newsCategories.id, id))
    return id
  }
  const [result] = await db.insert(newsCategories).values({
    label: data.label,
    color: data.color ?? null,
    icon: data.icon ?? null,
  }).returning()
  return result.id
}

export async function deleteNewsCategory(id: number) {
  await db.delete(newsCategories).where(eq(newsCategories.id, id))
}

// ── Resource Categories ───────────────────────────────────────────────

export async function getResourceCategories() {
  return db.select().from(resourceCategories).orderBy(asc(resourceCategories.label))
}

export async function upsertResourceCategory(data: { id?: number; label: string; color?: string; icon?: string }) {
  if (data.id) {
    const { id, ...rest } = data
    await db.update(resourceCategories).set(rest).where(eq(resourceCategories.id, id))
    revalidatePath("/risorse")
    revalidatePath("/admin/gestione-risorse")
    return id
  }
  const [result] = await db.insert(resourceCategories).values({
    label: data.label,
    color: data.color ?? null,
    icon: data.icon ?? null,
  }).returning()
  revalidatePath("/risorse")
  revalidatePath("/admin/gestione-risorse")
  return result.id
}

export async function deleteResourceCategory(id: number) {
  await db.delete(resourceCategories).where(eq(resourceCategories.id, id))
  revalidatePath("/risorse")
  revalidatePath("/admin/gestione-risorse")
}

// ── Home Cards ────────────────────────────────────────────────────────

export async function getHomeCards() {
  return db.select().from(homeCards).orderBy(asc(homeCards.order))
}

export async function upsertHomeCard(data: {
  id?: number
  title: string
  description?: string
  icon?: string
  color?: string
  link?: string
  order?: number
}) {
  if (data.id) {
    const { id, ...rest } = data
    await db.update(homeCards).set(rest).where(eq(homeCards.id, id))
    return id
  }
  const [result] = await db.insert(homeCards).values({
    title: data.title,
    description: data.description ?? null,
    icon: data.icon ?? null,
    color: data.color ?? null,
    link: data.link ?? null,
    order: data.order ?? 0,
  }).returning()
  return result.id
}

export async function deleteHomeCard(id: number) {
  await db.delete(homeCards).where(eq(homeCards.id, id))
}

export async function reorderHomeCards(ids: number[]) {
  for (let i = 0; i < ids.length; i++) {
    await db.update(homeCards).set({ order: i }).where(eq(homeCards.id, ids[i]))
  }
}
