"use server"

import { db } from "@/lib/db"
import {
  users,
  autoscuole,
  activities,
  documents,
  commissions,
  contractRequests,
  news,
  resources,
  comments,
  newsReads,
  salesTerritories,
  oauthTokens,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function createUser(data: {
  name: string
  email: string
  password: string
  phone?: string
  role: "sales" | "admin" | "both"
  territory?: string
  color: string
  quota?: number
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const hashedPassword = await bcrypt.hash(data.password, 10)
  const id = `u_${Date.now()}`

  const avatar = data.role === "sales" ? "/papera-gialla.jpg" : "/papera-rosa.jpg"

  await db.insert(users).values({
    id,
    name: data.name,
    email: data.email,
    password: hashedPassword,
    phone: data.phone ?? null,
    role: data.role,
    territory: data.territory ?? null,
    color: data.color,
    avatar,
    active: true,
    quota: data.quota ?? 5000,
  })

  revalidatePath("/admin/gestione-sales")
  return id
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string
    email: string
    phone: string
    role: "sales" | "admin" | "both"
    territory: string
    color: string
    quota: number
  }>
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.update(users).set(data).where(eq(users.id, id))

  revalidatePath("/admin/gestione-sales")
}

export async function toggleUserActive(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) throw new Error("Utente non trovato")

  await db.update(users).set({ active: !user.active }).where(eq(users.id, id))

  revalidatePath("/admin/gestione-sales")
}

export async function deleteUser(id: string, reassignTo?: string | null) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  // L'utente è referenziato da molte tabelle (diverse con FK NOT NULL): vanno
  // tutte gestite prima della delete, altrimenti la delete viola un vincolo FK.
  const reassign = reassignTo ?? null
  // Le righe "di lavoro" con FK NOT NULL non possono restare orfane: le si
  // riassegna al sales indicato o, in mancanza, all'admin che sta eliminando,
  // così non si perde lo storico legato alle autoscuole.
  const owner = reassignTo ?? session.user.id

  // Autoscuole: riassegnate al nuovo sales o svincolate (colonne nullable)
  await db.update(autoscuole).set({ assignedTo: reassign }).where(eq(autoscuole.assignedTo, id))
  await db.update(autoscuole).set({ setter: reassign }).where(eq(autoscuole.setter, id))
  await db.update(autoscuole).set({ closer: reassign }).where(eq(autoscuole.closer, id))

  // Autore contenuti (nullable) → svincolato
  await db.update(news).set({ authorId: null }).where(eq(news.authorId, id))
  await db.update(resources).set({ authorId: null }).where(eq(resources.authorId, id))

  // Record di lavoro con FK NOT NULL → riassegnati per preservare lo storico
  await db.update(activities).set({ userId: owner }).where(eq(activities.userId, id))
  await db.update(documents).set({ userId: owner }).where(eq(documents.userId, id))
  await db.update(contractRequests).set({ requestedBy: owner }).where(eq(contractRequests.requestedBy, id))
  await db.update(commissions).set({ userId: owner }).where(eq(commissions.userId, id))

  // Dati personali/effimeri dell'utente → eliminati
  await db.delete(comments).where(eq(comments.userId, id))
  await db.delete(newsReads).where(eq(newsReads.userId, id))
  await db.delete(salesTerritories).where(eq(salesTerritories.userId, id))
  await db.delete(oauthTokens).where(eq(oauthTokens.userId, id))

  await db.delete(users).where(eq(users.id, id))

  revalidatePath("/admin/gestione-sales")
  revalidatePath("/pipeline")
  revalidatePath("/admin/assegnazioni")
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  if (newPassword.length < 8) {
    throw new Error("La password deve essere di almeno 8 caratteri")
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
  if (!user) throw new Error("Utente non trovato")
  if (!user.password) throw new Error("Questo account usa Google SSO. Non puoi cambiare la password da qui.")

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new Error("Password corrente non valida")

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id))

  return { success: true }
}

export async function updateAvatar(avatarUrl: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db.update(users).set({ avatar: avatarUrl }).where(eq(users.id, session.user.id))

  revalidatePath("/profilo")
  revalidatePath("/")
}

export async function getUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}
