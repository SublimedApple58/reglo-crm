import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { generatePresignedUploadUrl, generateFileKey } from "@/lib/storage/r2"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const body = await request.json()
  const { autoscuolaId, filename, contentType, size } = body as {
    autoscuolaId: string
    filename: string
    contentType: string
    size: number
  }

  if (!autoscuolaId || !filename || !contentType || !size) {
    return NextResponse.json(
      { error: "Campi obbligatori mancanti" },
      { status: 400 }
    )
  }

  const key = generateFileKey(autoscuolaId, filename)
  const uploadUrl = await generatePresignedUploadUrl(key, contentType)

  const [document] = await db
    .insert(documents)
    .values({
      autoscuolaId,
      userId: session.user.id,
      name: filename,
      key,
      size,
      contentType,
    })
    .returning()

  return NextResponse.json({ uploadUrl, document })
}
