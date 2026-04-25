"use server"

import { db } from "@/lib/db"
import { contractRequests, autoscuole, users } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getContractRequest(autoscuolaId: string) {
  const [result] = await db
    .select({
      request: contractRequests,
      user: { id: users.id, name: users.name },
      autoscuola: { id: autoscuole.id, name: autoscuole.name },
    })
    .from(contractRequests)
    .innerJoin(users, eq(contractRequests.requestedBy, users.id))
    .innerJoin(autoscuole, eq(contractRequests.autoscuolaId, autoscuole.id))
    .where(eq(contractRequests.autoscuolaId, autoscuolaId))
    .limit(1)

  return result ?? null
}

export async function createContractRequest(data: {
  autoscuolaId: string
  ragioneSociale?: string
  partitaIva?: string
  codiceFiscale?: string
  pecEmail?: string
  codiceSDI?: string
  indirizzoFatturazione?: string
  capFatturazione?: string
  cittaFatturazione?: string
  provinciaFatturazione?: string
  nomeLegale?: string
  cognomeLegale?: string
  telefonoLegale?: string
  emailLegale?: string
  iban?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const [result] = await db
    .insert(contractRequests)
    .values({
      ...data,
      requestedBy: session.user.id,
    })
    .returning()

  revalidatePath(`/autoscuola/${data.autoscuolaId}`)
  revalidatePath("/admin/gestione-contratti")
  return result
}

export async function updateContractRequest(
  id: number,
  data: {
    ragioneSociale?: string
    partitaIva?: string
    codiceFiscale?: string
    pecEmail?: string
    codiceSDI?: string
    indirizzoFatturazione?: string
    capFatturazione?: string
    cittaFatturazione?: string
    provinciaFatturazione?: string
    nomeLegale?: string
    cognomeLegale?: string
    telefonoLegale?: string
    emailLegale?: string
    iban?: string
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db
    .update(contractRequests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contractRequests.id, id))

  revalidatePath("/admin/gestione-contratti")
}

export async function updateContractRequestStatus(
  id: number,
  status: "pending" | "in_progress" | "done",
  adminNotes?: string
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") throw new Error("Solo admin")

  const updates: Record<string, unknown> = { status, updatedAt: new Date() }
  if (adminNotes !== undefined) updates.adminNotes = adminNotes

  await db
    .update(contractRequests)
    .set(updates)
    .where(eq(contractRequests.id, id))

  revalidatePath("/admin/gestione-contratti")
}

export async function getContractRequests() {
  return db
    .select({
      request: contractRequests,
      user: { id: users.id, name: users.name },
      autoscuola: { id: autoscuole.id, name: autoscuole.name, town: autoscuole.town, province: autoscuole.province },
    })
    .from(contractRequests)
    .innerJoin(users, eq(contractRequests.requestedBy, users.id))
    .innerJoin(autoscuole, eq(contractRequests.autoscuolaId, autoscuole.id))
    .orderBy(desc(contractRequests.createdAt))
}

export async function getPendingContractRequestsCount() {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contractRequests)
    .where(eq(contractRequests.status, "pending"))

  return result?.count ?? 0
}
