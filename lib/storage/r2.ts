import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NodeHttpHandler } from "@smithy/node-http-handler"

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID ?? "").trim()
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID ?? "").trim()
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim()
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME ?? "").trim()

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler(),
})

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await r2.send(command)
}

export async function generatePresignedDownloadUrl(
  key: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn: 3600 }) // 1 hour
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })
  await r2.send(command)
}

export function generateFileKey(
  autoscuolaId: string,
  filename: string
): string {
  const timestamp = Date.now()
  return `autoscuole/${autoscuolaId}/${timestamp}-${filename}`
}
