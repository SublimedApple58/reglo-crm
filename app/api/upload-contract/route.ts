import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadToR2 } from "@/lib/storage/r2"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 })
  }

  const key = `contracts/${Date.now()}-${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadToR2(key, buffer, file.type)

  return NextResponse.json({ key, name: file.name, size: file.size })
}
