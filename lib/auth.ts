import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { users, oauthTokens } from "@/lib/db/schema"
import { eq, ilike, and } from "drizzle-orm"
import authConfig from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          hd: "reglo.it",
        },
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string
        const password = credentials.password as string
        if (!email || !password) return null

        const [user] = await db.select().from(users).where(ilike(users.email, email)).limit(1)
        if (!user) return null
        if (!user.active) return null
        if (!user.password) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          territory: user.territory,
          avatar: user.avatar,
        } as Record<string, unknown> as import("next-auth").User
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email
        if (!email || !email.endsWith("@reglo.it")) return false

        const [dbUser] = await db
          .select()
          .from(users)
          .where(ilike(users.email, email))
          .limit(1)
        if (!dbUser || !dbUser.active) return false

        // Upsert OAuth tokens
        const [existing] = await db
          .select()
          .from(oauthTokens)
          .where(
            and(
              eq(oauthTokens.userId, dbUser.id),
              eq(oauthTokens.provider, "google")
            )
          )
          .limit(1)

        const tokenData = {
          accessToken: account.access_token!,
          refreshToken: account.refresh_token ?? existing?.refreshToken ?? null,
          expiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
          scope: account.scope ?? null,
        }

        if (existing) {
          await db
            .update(oauthTokens)
            .set(tokenData)
            .where(eq(oauthTokens.id, existing.id))
        } else {
          await db.insert(oauthTokens).values({
            userId: dbUser.id,
            provider: "google",
            ...tokenData,
          })
        }

        // Update avatar from Google if not set
        if (!dbUser.avatar && user.image) {
          await db
            .update(users)
            .set({ avatar: user.image })
            .where(eq(users.id, dbUser.id))
        }

        return true
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        // Look up user in DB by email to populate token
        const [dbUser] = await db
          .select()
          .from(users)
          .where(ilike(users.email, token.email!))
          .limit(1)
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.territory = dbUser.territory
          token.avatar = dbUser.avatar ?? user?.image ?? null
        }
      } else if (user) {
        // Credentials provider
        token.id = user.id
        token.role = (user as Record<string, unknown>).role as string
        token.territory = (user as Record<string, unknown>).territory as string
        token.avatar = (user as Record<string, unknown>).avatar as string
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as unknown as Record<string, unknown>).role = token.role
        ;(session.user as unknown as Record<string, unknown>).territory = token.territory
        ;(session.user as unknown as Record<string, unknown>).avatar = token.avatar
      }
      return session
    },
  },
  session: { strategy: "jwt" },
})
