import type { NextAuthConfig } from "next-auth"

export default {
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = !nextUrl.pathname.startsWith("/sign-in")
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect to sign-in
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
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
  providers: [],
} satisfies NextAuthConfig
