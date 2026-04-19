import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { generatePresignedDownloadUrl, deleteObject } from "@/lib/storage/r2"

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await props.params
  const documentId = parseInt(id, 10)

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)

  if (!doc) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 })
  }

  const url = await generatePresignedDownloadUrl(doc.key)
  return NextResponse.json({ url })
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await props.params
  const documentId = parseInt(id, 10)

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)

  if (!doc) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 })
  }

  await deleteObject(doc.key)
  await db.delete(documents).where(eq(documents.id, documentId))

  return NextResponse.json({ success: true })
}
