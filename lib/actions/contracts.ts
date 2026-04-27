"use server"

import { db } from "@/lib/db"
import { contractRequests, autoscuole, users, commissions } from "@/lib/db/schema"
import { eq, desc, sql, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { deleteObject, generatePresignedDownloadUrl } from "@/lib/storage/r2"

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
  importoPreventivo?: number
  descrizioneServizio?: string
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
    importoPreventivo?: number
    descrizioneServizio?: string
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
  status: "pending" | "in_progress" | "done" | "rejected",
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

export async function rejectContractRequest(id: number, rejectionReason?: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") throw new Error("Solo admin")

  await db
    .update(contractRequests)
    .set({
      status: "rejected",
      rejectionReason: rejectionReason || null,
      updatedAt: new Date(),
    })
    .where(eq(contractRequests.id, id))

  // Get the autoscuolaId for revalidation
  const [req] = await db
    .select({ autoscuolaId: contractRequests.autoscuolaId })
    .from(contractRequests)
    .where(eq(contractRequests.id, id))

  revalidatePath("/admin/gestione-contratti")
  if (req) revalidatePath(`/autoscuola/${req.autoscuolaId}`)
}

export async function resubmitContractRequest(
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
    importoPreventivo?: number
    descrizioneServizio?: string
  }
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  await db
    .update(contractRequests)
    .set({
      ...data,
      status: "pending",
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(contractRequests.id, id))

  revalidatePath("/admin/gestione-contratti")

  const [req] = await db
    .select({ autoscuolaId: contractRequests.autoscuolaId })
    .from(contractRequests)
    .where(eq(contractRequests.id, id))

  if (req) revalidatePath(`/autoscuola/${req.autoscuolaId}`)
}

export async function completeContractRequest(
  id: number,
  data: {
    adminNotes?: string
    contractPdfKey?: string
    contractPdfName?: string
    invoicePdfKey?: string
    invoicePdfName?: string
  }
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") throw new Error("Solo admin")

  // Get the request to find the sales user
  const [req] = await db
    .select()
    .from(contractRequests)
    .where(eq(contractRequests.id, id))

  if (!req) throw new Error("Richiesta non trovata")

  // Update the request
  await db
    .update(contractRequests)
    .set({
      status: "done",
      adminNotes: data.adminNotes,
      contractPdfKey: data.contractPdfKey || null,
      contractPdfName: data.contractPdfName || null,
      invoicePdfKey: data.invoicePdfKey || null,
      invoicePdfName: data.invoicePdfName || null,
      updatedAt: new Date(),
    })
    .where(eq(contractRequests.id, id))

  // Increment commissions.contracts for the sales user (current month)
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [existing] = await db
    .select()
    .from(commissions)
    .where(
      and(
        eq(commissions.userId, req.requestedBy),
        eq(commissions.month, month),
        eq(commissions.year, year)
      )
    )

  if (existing) {
    await db
      .update(commissions)
      .set({ contracts: sql`${commissions.contracts} + 1` })
      .where(eq(commissions.id, existing.id))
  } else {
    await db.insert(commissions).values({
      userId: req.requestedBy,
      month,
      year,
      contracts: 1,
      gross: 0,
    })
  }

  revalidatePath("/admin/gestione-contratti")
  revalidatePath("/admin/gestione-sales")
  revalidatePath(`/autoscuola/${req.autoscuolaId}`)
}

export async function deleteContractRequest(id: number) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") throw new Error("Solo admin")

  // Get the request to find R2 keys
  const [req] = await db
    .select()
    .from(contractRequests)
    .where(eq(contractRequests.id, id))

  if (!req) throw new Error("Richiesta non trovata")

  // Delete R2 files if they exist
  if (req.contractPdfKey) await deleteObject(req.contractPdfKey)
  if (req.invoicePdfKey) await deleteObject(req.invoicePdfKey)

  // Delete the row
  await db.delete(contractRequests).where(eq(contractRequests.id, id))

  revalidatePath("/admin/gestione-contratti")
  revalidatePath(`/autoscuola/${req.autoscuolaId}`)
}

export async function getContractFileUrl(key: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  return generatePresignedDownloadUrl(key)
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
