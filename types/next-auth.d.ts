import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: "sales" | "admin" | "both"
      territory: string
      avatar: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "sales" | "admin" | "both"
    territory: string
  }
}
