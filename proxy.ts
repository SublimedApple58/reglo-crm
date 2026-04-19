import authConfig from "@/lib/auth.config"
import NextAuth from "next-auth"

const { auth } = NextAuth(authConfig)

export async function proxy(request: Request) {
  const session = await auth()
  const { pathname } = new URL(request.url)

  const isSignIn = pathname.startsWith("/sign-in")
  const isApi = pathname.startsWith("/api")
  const isStatic = pathname.startsWith("/_next") || pathname.includes(".")

  if (isStatic || isApi) return

  if (!session?.user && !isSignIn) {
    return Response.redirect(new URL("/sign-in", request.url))
  }

  if (session?.user && isSignIn) {
    return Response.redirect(new URL("/", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
