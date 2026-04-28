import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { NodeHttpHandler } from "@smithy/node-http-handler"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${(process.env.R2_ACCOUNT_ID ?? "").trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: (process.env.R2_ACCESS_KEY_ID ?? "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY ?? "").trim(),
  },
  requestHandler: new NodeHttpHandler(),
})

export async function GET(
  _request: Request,
  props: { params: Promise<{ key: string[] }> }
) {
  const { key } = await props.params
  const objectKey = key.join("/")

  // Only allow editor/ prefix
  if (!objectKey.startsWith("editor/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const command = new GetObjectCommand({
      Bucket: (process.env.R2_BUCKET_NAME ?? "").trim(),
      Key: objectKey,
    })
    const response = await r2.send(command)
    const bytes = await response.Body!.transformToByteArray()

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
