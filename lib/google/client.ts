import { google } from "googleapis"
import { db } from "@/lib/db"
import { oauthTokens } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function getGoogleCalendarClient(userId: string) {
  const [token] = await db
    .select()
    .from(oauthTokens)
    .where(
      and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, "google"))
    )
    .limit(1)

  if (!token) return null

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
  })

  // Refresh if expired or expiring within 5 minutes
  const now = new Date()
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000)
  if (token.expiresAt && new Date(token.expiresAt) < fiveMinFromNow) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

      await db
        .update(oauthTokens)
        .set({
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token ?? token.refreshToken,
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        })
        .where(eq(oauthTokens.id, token.id))
    } catch (err: unknown) {
      // invalid_grant: token revoked or expired permanently
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes("invalid_grant")) {
        await db
          .delete(oauthTokens)
          .where(eq(oauthTokens.id, token.id))
        return null
      }
      throw err
    }
  }

  return google.calendar({ version: "v3", auth: oauth2Client })
}
