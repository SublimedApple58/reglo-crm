"use server"

import { db } from "@/lib/db"
import { users, autoscuole } from "@/lib/db/schema"
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

  // Reassign autoscuole
  if (reassignTo) {
    await db.update(autoscuole).set({ assignedTo: reassignTo }).where(eq(autoscuole.assignedTo, id))
  } else {
    await db.update(autoscuole).set({ assignedTo: null }).where(eq(autoscuole.assignedTo, id))
  }

  await db.delete(users).where(eq(users.id, id))

  revalidatePath("/admin/gestione-sales")
  revalidatePath("/pipeline")
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
