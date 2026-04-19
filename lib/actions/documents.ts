"use server"

import { db } from "@/lib/db"
import { documents, users } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { deleteObject } from "@/lib/storage/r2"

export async function getDocuments(autoscuolaId: string) {
  return db
    .select({
      document: documents,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(documents)
    .innerJoin(users, eq(documents.userId, users.id))
    .where(eq(documents.autoscuolaId, autoscuolaId))
    .orderBy(desc(documents.createdAt))
}

export async function deleteDocument(id: number) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!doc) throw new Error("Documento non trovato")

  await deleteObject(doc.key)
  await db.delete(documents).where(eq(documents.id, id))

  revalidatePath(`/autoscuola/${doc.autoscuolaId}`)
}
