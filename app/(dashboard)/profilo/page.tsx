import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProfiloClient } from "@/components/pages/profilo-client"

export default async function ProfiloPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const u = session.user as Record<string, unknown>

  return (
    <ProfiloClient
      user={{
        id: u.id as string,
        name: (u.name as string) ?? "",
        email: (u.email as string) ?? "",
        role: (u.role as string) ?? "sales",
        territory: (u.territory as string) ?? "",
        avatar: (u.avatar as string) ?? null,
      }}
    />
  )
}
