import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { generateFileKey, uploadToR2 } from "@/lib/storage/r2"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const autoscuolaId = formData.get("autoscuolaId") as string | null

  if (!file || !autoscuolaId) {
    return NextResponse.json(
      { error: "Campi obbligatori mancanti" },
      { status: 400 }
    )
  }

  const key = generateFileKey(autoscuolaId, file.name)

  // Upload to R2 server-side
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadToR2(key, buffer, file.type)

  // Create DB record only after successful upload
  const [document] = await db
    .insert(documents)
    .values({
      autoscuolaId,
      userId: session.user.id,
      name: file.name,
      key,
      size: file.size,
      contentType: file.type,
    })
    .returning()

  return NextResponse.json({ document })
}
